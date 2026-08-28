@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title TS3 Manager - 一键停止

docker version >nul 2>&1
if errorlevel 1 goto :docker_error

echo 正在停止 TS3 Manager...
docker compose stop
if errorlevel 1 goto :failed
echo TS3 Manager 已停止。容器和配置均已保留。
timeout /t 3 /nobreak >nul
exit /b 0

:docker_error
echo [错误] Docker Desktop 未启动或不可用。
goto :failed

:failed
echo 操作失败，请检查上方提示。
pause
exit /b 1
