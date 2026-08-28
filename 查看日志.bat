@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title TS3 Manager - 实时日志

echo 正在显示 TS3 Manager 日志，按 Ctrl+C 退出日志查看。
echo.
if exist "console.log" (
  powershell -NoProfile -Command "Get-Content -LiteralPath 'console.log' -Tail 200 -Wait"
  exit /b 0
)

docker version >nul 2>&1
if errorlevel 1 (
  echo [提示] 尚未生成 Windows 原生版日志，并且 Docker Desktop 不可用。
  pause
  exit /b 1
)
docker inspect ts3-manager >nul 2>&1
if errorlevel 1 (
  echo [提示] 尚未创建名为 ts3-manager 的容器，请先运行“一键启动.bat”。
  pause
  exit /b 1
)

docker logs --tail 200 -f ts3-manager
if errorlevel 1 (
  echo.
  echo [错误] 无法读取容器日志，请确认 Docker Desktop 和容器状态正常。
  pause
  exit /b 1
)
