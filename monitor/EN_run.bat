@echo off
chcp 65001 >nul
title Local IP Monitor Service

echo ====================================
echo   Local IP Monitor - Startup Script
echo ====================================
echo.

REM Check if virtual environment exists
if not exist "..\venv" (
    echo Error: Virtual environment not found
    echo Please run setup.bat first
    pause
    exit /b 1
)

REM Check config file
if not exist config.json (
    echo Error: Config file not found
    echo Please configure config.json first
    pause
    exit /b 1
)

REM Activate virtual environment
echo [1/3] Activating virtual environment...
call "..\venv\Scripts\activate.bat"
if errorlevel 1 (
    echo Failed to activate virtual environment
    pause
    exit /b 1
)
echo Virtual environment activated

echo.
echo [2/3] Checking configuration...
findstr "YOUR_GITHUB_TOKEN" config.json >nul
if not errorlevel 1 (
    echo Warning: Default config detected, please check GitHub settings
    echo Press any key to continue or Ctrl+C to cancel...
    pause >nul
)

echo.
echo [3/3] Starting IP monitor service...
echo Service starting, press Ctrl+C to stop monitoring
echo.
echo ====================================
echo Monitor Status
echo ====================================

python ip_monitor.py

echo.
echo Service stopped
pause