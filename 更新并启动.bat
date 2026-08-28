@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title TS3 Manager - 更新并启动

git --version >nul 2>&1
if errorlevel 1 goto :git_error

echo [1/4] 正在检查本地修改...
git diff --quiet
if errorlevel 1 (
  echo [提示] 检测到尚未提交的源码修改。
  echo 为避免覆盖定制界面，本次不会拉取远程代码，仅重新构建当前版本。
  goto :build
)
git diff --cached --quiet
if errorlevel 1 (
  echo [提示] 检测到尚未提交的暂存修改，本次跳过远程更新。
  goto :build
)

echo [2/4] 正在安全拉取上游更新...
git pull --ff-only
if errorlevel 1 (
  echo [错误] 无法进行快进更新。未覆盖任何本地文件。
  goto :failed
)

:build
echo [3/4] 正在重新构建并启动服务...
call "%~dp0一键启动.bat"
if errorlevel 1 goto :failed

echo [4/4] 更新与启动完成。
exit /b 0

:git_error
echo [错误] 未找到 Git，无法检查更新。
goto :failed

:failed
echo 操作未完成，请检查上方提示。
pause
exit /b 1
