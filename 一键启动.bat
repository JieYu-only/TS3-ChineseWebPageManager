@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title TS3 Manager - 一键启动

call :check_docker || goto :failed
call :prepare_env || goto :failed

echo [1/3] 正在构建并启动 TS3 Manager...
docker compose up -d --build
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
if errorlevel 1 (
  echo [错误] 当前 Docker 未提供 Compose 插件。
  exit /b 1
)
exit /b 0

:prepare_env
if not exist ".env" copy /y ".env.example" ".env" >nul
findstr /r /c:"^JWT_SECRET=..*" ".env" >nul 2>&1
if not errorlevel 1 exit /b 0
echo 正在生成本机专用的 JWT_SECRET...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)); $c=Get-Content -LiteralPath '.env'; $c=$c -replace '^JWT_SECRET=.*$',('JWT_SECRET='+$p); Set-Content -LiteralPath '.env' -Value $c -Encoding utf8"
if errorlevel 1 (
  echo [错误] 无法生成 .env 配置。
  exit /b 1
)
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
