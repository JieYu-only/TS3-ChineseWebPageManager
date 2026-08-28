@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
title TS3 Manager - 一键停止

if exist ".ts3-manager.pid" (
  set /p TS3_PID=<".ts3-manager.pid"
  echo 正在停止 Windows 原生版 TS3 Manager...
  taskkill /pid !TS3_PID! /t >nul 2>&1
  del /q ".ts3-manager.pid" >nul 2>&1
  echo TS3 Manager 已停止。
  timeout /t 3 /nobreak >nul
  exit /b 0
)

docker version >nul 2>&1
if errorlevel 1 (
  echo [提示] 未发现正在运行的 Windows 原生版或 Docker 容器。
  timeout /t 3 /nobreak >nul
  exit /b 0
)

echo 正在停止 TS3 Manager...
docker inspect ts3-manager >nul 2>&1
if errorlevel 1 (
  echo [提示] 尚未创建名为 ts3-manager 的容器。
  timeout /t 3 /nobreak >nul
  exit /b 0
)
docker stop ts3-manager
if errorlevel 1 goto :failed
echo TS3 Manager 已停止。容器和配置均已保留。
timeout /t 3 /nobreak >nul
exit /b 0

:failed
echo 操作失败，请检查上方提示。
pause
exit /b 1
