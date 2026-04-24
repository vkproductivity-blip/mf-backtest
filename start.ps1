# MF Backtest - One-Click Launcher
# Run this script to start the entire application

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  MF BACKTEST - Mutual Fund Backtester" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$VenvPath = Join-Path $ProjectRoot "venv\Scripts\Activate.ps1"
$BackendPath = Join-Path $ProjectRoot "backend"

# Activate virtual environment
Write-Host "Activating Python virtual environment..." -ForegroundColor Yellow
& $VenvPath

# Navigate to backend
Set-Location $BackendPath

# Start the server
Write-Host "`nStarting MF Backtest backend server..." -ForegroundColor Green
Write-Host "Opening: http://localhost:8000" -ForegroundColor Green
Write-Host "Press CTRL+C to stop the server`n" -ForegroundColor Yellow

# Start the backend
python app.py serve --host 0.0.0.0 --port 8000
