@echo off
chcp 65001 >nul
title 本地IP监控服务

echo ====================================
echo   本地IP监控系统 - 启动脚本
echo ====================================
echo.

REM 检查虚拟环境是否存在
if not exist venv (
    echo ❌ 错误: 虚拟环境不存在
    echo 请先运行 setup.bat 进行安装
    pause
    exit /b 1
)

REM 检查配置文件
if not exist config.json (
    echo ❌ 错误: 配置文件不存在
    echo 请先配置 config.json 文件
    pause
    exit /b 1
)

REM 激活虚拟环境
echo [1/3] 激活虚拟环境...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ 激活虚拟环境失败
    pause
    exit /b 1
)
echo ✅ 虚拟环境已激活

echo.
echo [2/3] 检查配置文件...
findstr "YOUR_GITHUB_TOKEN" config.json >nul
if not errorlevel 1 (
    echo ⚠️  警告: 检测到默认配置，请确认已正确配置GitHub信息
    echo 按任意键继续，或Ctrl+C取消...
    pause >nul
)

echo.
echo [3/3] 启动IP监控服务...
echo ✅ 服务启动中，按Ctrl+C停止监控
echo.
echo ====================================
echo 📊 监控状态显示
echo ====================================

python ip_monitor.py

echo.
echo 📱 服务已停止
pause