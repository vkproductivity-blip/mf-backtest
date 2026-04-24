@echo off
setlocal enabledelayedexpansion

REM MF Backtest - One-Click Launcher (Windows Batch)
REM This file allows users to double-click to start the app

cd /d "%~dp0"

REM Add Node.js to PATH (if installed)
set PATH=%PATH%;C:\Program Files\nodejs

REM Activate virtual environment and start server
echo.
echo ========================================
echo   MF BACKTEST - Mutual Fund Backtester
echo ========================================
echo.
echo Activating Python environment...
call venv\Scripts\activate.bat

cd backend
echo.
echo Starting MF Backtest server...
echo.
echo Opening: http://localhost:8000
echo.
echo Press CTRL+C to stop the server
echo.

python app.py serve --host 0.0.0.0 --port 8000

pause
