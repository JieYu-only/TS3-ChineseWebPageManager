@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
title TS3 Manager - 一键启动

call :prepare_env || goto :failed

if exist "%~dp0TS3-ChineseWebPageManager.exe" (
  call :start_with_exe || goto :failed
  goto :started
)

echo [提示] 未找到 Windows 定制版 EXE，将尝试使用 Docker。
call :check_docker || goto :failed

echo [1/3] 正在构建并启动 TS3 Manager...
if defined COMPOSE_COMMAND (
  %COMPOSE_COMMAND% up -d --build
) else (
  call :start_with_docker
)
if errorlevel 1 goto :failed

:started
echo [2/3] 正在等待管理页面启动...
timeout /t 5 /nobreak >nul

for /f "tokens=2 delims==" %%P in ('findstr /b "WEB_PORT=" .env') do set "WEB_PORT=%%P"
if not defined WEB_PORT set "WEB_PORT=8080"

echo [3/3] 启动完成：http://localhost:%WEB_PORT%
start "" "http://localhost:%WEB_PORT%"
goto :success

:check_docker
docker version >nul 2>&1
if errorlevel 1 (
  echo [错误] Docker Desktop 未安装、未启动，或当前用户无法访问 Docker。
  exit /b 1
)
set "DOCKER_OS_TYPE="
for /f "usebackq delims=" %%O in (`docker info --format "{{.OSType}}" 2^>nul`) do set "DOCKER_OS_TYPE=%%O"
if /i "%DOCKER_OS_TYPE%"=="windows" (
  echo [ERROR] Docker is currently using Windows containers.
  echo This project requires Linux containers.
  echo Open the Docker Desktop tray menu and select "Switch to Linux containers".
  echo Then wait for Docker Desktop to restart and run this file again.
  exit /b 1
)
docker compose version >nul 2>&1
if not errorlevel 1 (
  set "COMPOSE_COMMAND=docker compose"
  exit /b 0
)
docker-compose version >nul 2>&1
if not errorlevel 1 (
  set "COMPOSE_COMMAND=docker-compose"
  exit /b 0
)
echo [提示] 未找到 Docker Compose，将使用原生 Docker 启动。
set "COMPOSE_COMMAND="
exit /b 0

:start_with_exe
for /f "tokens=2 delims==" %%P in ('findstr /b "WEB_PORT=" .env') do set "WEB_PORT=%%P"
if not defined WEB_PORT set "WEB_PORT=8080"
if exist ".ts3-manager.pid" (
  set /p OLD_PID=<".ts3-manager.pid"
  tasklist /fi "PID eq !OLD_PID!" 2>nul | findstr /r /c:"[ ]!OLD_PID![ ]" >nul
  if not errorlevel 1 (
    echo [提示] TS3 Manager 已经在运行。
    exit /b 0
  )
  del /q ".ts3-manager.pid" >nul 2>&1
)
echo [1/3] 正在启动 Windows 原生版 TS3 Manager...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $env:PORT='%WEB_PORT%'; $p=Start-Process -FilePath (Join-Path $PWD 'TS3-ChineseWebPageManager.exe') -WorkingDirectory $PWD -RedirectStandardOutput (Join-Path $PWD 'console.log') -RedirectStandardError (Join-Path $PWD 'console-error.log') -PassThru; Set-Content -LiteralPath '.ts3-manager.pid' -Value $p.Id -Encoding ascii"
if errorlevel 1 exit /b 1
exit /b 0

:prepare_env
if not exist ".env" copy /y ".env.example" ".env" >nul
findstr /r /c:"^JWT_SECRET=..*" ".env" >nul 2>&1
if not errorlevel 1 exit /b 0
echo 正在生成本机专用的 JWT_SECRET...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; try { $bytes=New-Object byte[] 32; $rng=[Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($bytes); $rng.Dispose(); $p=($bytes | ForEach-Object { $_.ToString('x2') }) -join ''; $c=Get-Content -LiteralPath '.env'; $c=$c -replace '^JWT_SECRET=.*$',('JWT_SECRET='+$p); Set-Content -LiteralPath '.env' -Value $c -Encoding utf8; exit 0 } catch { Write-Error $_; exit 1 }"
if errorlevel 1 (
  echo [错误] 无法生成 .env 配置。
  exit /b 1
)
findstr /r /c:"^JWT_SECRET=..*" .env >nul 2>&1
if errorlevel 1 (
  echo [错误] JWT_SECRET 生成后校验失败。
  exit /b 1
)
exit /b 0

:start_with_docker
for /f "tokens=2 delims==" %%P in ('findstr /b "WEB_PORT=" .env') do set "WEB_PORT=%%P"
for /f "tokens=2 delims==" %%P in ('findstr /b "JWT_SECRET=" .env') do set "JWT_SECRET=%%P"
for /f "tokens=2,* delims==" %%P in ('findstr /b "WHITELIST=" .env') do set "WHITELIST=%%P"
if not defined WEB_PORT set "WEB_PORT=8080"

echo 正在构建本地镜像...
echo Docker 镜像构建尝试 1/3（Docker Hub）...
docker build -t ts3-manager-custom:latest .
if not errorlevel 1 goto :build_complete
echo Docker Hub 连接失败，5 秒后改用 DaoCloud 公共镜像...
timeout /t 5 /nobreak >nul

echo Docker 镜像构建尝试 2/3（DaoCloud）...
docker build --build-arg BUILD_IMAGE=m.daocloud.io/docker.io/library/node:16 --build-arg RUNTIME_IMAGE=m.daocloud.io/docker.io/library/node:22-alpine -t ts3-manager-custom:latest .
if not errorlevel 1 goto :build_complete
echo 镜像构建失败，10 秒后重试...
timeout /t 10 /nobreak >nul

echo Docker 镜像构建尝试 3/3（DaoCloud）...
docker build --build-arg BUILD_IMAGE=m.daocloud.io/docker.io/library/node:16 --build-arg RUNTIME_IMAGE=m.daocloud.io/docker.io/library/node:22-alpine -t ts3-manager-custom:latest .
if not errorlevel 1 goto :build_complete
echo.
echo [ERROR] Docker image build failed after 3 attempts.
echo Please check the Docker Desktop network or proxy settings and try again.
exit /b 1

:build_complete

docker inspect ts3-manager >nul 2>&1
if not errorlevel 1 (
  echo 正在替换旧容器...
  docker rm -f ts3-manager >nul
  if errorlevel 1 exit /b 1
)

echo 正在创建容器...
docker run -d --name ts3-manager --restart unless-stopped -p %WEB_PORT%:8080 -e PORT=8080 -e JWT_SECRET="%JWT_SECRET%" -e WHITELIST="%WHITELIST%" ts3-manager-custom:latest >nul
if errorlevel 1 exit /b 1
exit /b 0

:failed
echo.
echo 启动失败，请检查上方提示。可双击“查看日志.bat”查看服务日志。
pause
exit /b 1

:success
echo.
echo 可以关闭此窗口，TS3 Manager 会继续在后台运行。
timeout /t 3 /nobreak >nul
exit /b 0
