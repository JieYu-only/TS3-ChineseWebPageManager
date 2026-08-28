@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title TS3 Manager - 实时日志

docker version >nul 2>&1
if errorlevel 1 (
  echo [错误] Docker Desktop 未启动或不可用。
  pause
  exit /b 1
)

echo 正在显示 TS3 Manager 日志，按 Ctrl+C 退出日志查看。
echo.
docker compose logs --tail 200 -f ts3-manager
if errorlevel 1 (
  echo.
  echo [提示] 尚未创建容器，请先运行“一键启动.bat”。
  pause
)
