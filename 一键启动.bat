@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title TS3 Manager - 一键启动

call :check_docker || goto :failed
call :prepare_env || goto :failed

echo [1/3] 正在构建并启动 TS3 Manager...
if defined COMPOSE_COMMAND (
  %COMPOSE_COMMAND% up -d --build
) else (
  call :start_with_docker
)
if errorlevel 1 goto :failed

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
set "BUILD_ATTEMPT=1"
:build_image
echo Docker 镜像构建尝试 %BUILD_ATTEMPT%/3...
docker build -t ts3-manager-custom:latest .
if not errorlevel 1 goto :build_complete
if %BUILD_ATTEMPT% GEQ 3 (
  echo.
  echo [错误] 连续 3 次无法构建镜像。
  echo 如果提示 registry-1.docker.io 超时，请在 Docker Desktop 中配置代理或镜像加速器后重试。
  exit /b 1
)
set /a BUILD_ATTEMPT+=1
echo 构建失败，10 秒后重试...
timeout /t 10 /nobreak >nul
goto :build_image

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
echo 可以关闭此窗口，容器会继续在后台运行。
timeout /t 3 /nobreak >nul
exit /b 0
