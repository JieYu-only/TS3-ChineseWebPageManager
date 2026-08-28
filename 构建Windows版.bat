@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title TS3 Manager - 构建 Windows 版

node --version >nul 2>&1
if errorlevel 1 (
  echo [错误] 未安装 Node.js，请先安装 Node.js 16 或更高版本。
  pause
  exit /b 1
)
npm --version >nul 2>&1
if errorlevel 1 (
  echo [错误] 未找到 npm。
  pause
  exit /b 1
)

echo [1/3] 正在安装项目依赖...
call npm install
if errorlevel 1 goto :failed

echo [2/3] 正在构建管理页面...
set "NODE_OPTIONS=--openssl-legacy-provider"
call npm run ui:build
if errorlevel 1 goto :failed
set "NODE_OPTIONS="

echo [3/3] 正在生成 Windows x64 可执行文件...
call npm exec --workspace=@ts3-manager/server -- pkg . --target node16-win-x64 --output ../../TS3-ChineseWebPageManager.exe
if errorlevel 1 goto :failed

echo.
echo 构建完成：TS3-ChineseWebPageManager.exe
pause
exit /b 0

:failed
echo.
echo 构建失败，请检查上方提示。
pause
exit /b 1
