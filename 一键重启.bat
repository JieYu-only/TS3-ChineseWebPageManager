@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title TS3 Manager - 一键重启

docker version >nul 2>&1
if errorlevel 1 goto :docker_error

echo 正在重启 TS3 Manager...
docker compose restart ts3-manager
if errorlevel 1 (
  echo 未找到已创建的容器，改为执行首次启动...
  call "%~dp0一键启动.bat"
  if errorlevel 1 exit /b 1
  exit /b 0
)
echo TS3 Manager 已重启。
timeout /t 3 /nobreak >nul
exit /b 0

:docker_error
echo [错误] Docker Desktop 未启动或不可用。
pause
exit /b 1
