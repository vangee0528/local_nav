@echo off
chcp 65001 >nul
echo ====================================
echo   本地IP监控系统 - 自动安装脚本
echo ====================================
echo.

echo [1/4] 检查Python环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未检测到Python环境
    echo 请先安装Python 3.7或更高版本
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo ✅ Python环境检查通过

echo.
echo [2/4] 创建虚拟环境...
if exist venv (
    echo 虚拟环境已存在，跳过创建
) else (
    python -m venv venv
    if errorlevel 1 (
        echo ❌ 创建虚拟环境失败
        pause
        exit /b 1
    )
    echo ✅ 虚拟环境创建成功
)

echo.
echo [3/4] 激活虚拟环境并安装依赖...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ 激活虚拟环境失败
    pause
    exit /b 1
)

pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ 安装依赖失败
    pause
    exit /b 1
)
echo ✅ 依赖安装成功

echo.
echo [4/4] 检查配置文件...
if not exist config.json (
    echo ⚠️  警告: 配置文件不存在，使用默认配置
    echo 请手动编辑 config.json 文件，配置GitHub信息
) else (
    echo ✅ 配置文件已存在
)

echo.
echo ====================================
echo 🎉 安装完成！
echo ====================================
echo.
echo 接下来的步骤：
echo 1. 编辑 config.json 文件，填入你的GitHub信息
echo 2. 运行 run.bat 启动监控服务
echo 3. 或者运行 python ip_monitor.py --once 进行单次测试
echo.
echo 需要帮助？请查看 README.md 文件
echo.

pause