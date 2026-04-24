# MF Backtest local launcher

Write-Host ""
Write-Host "MF Backtest local setup" -ForegroundColor Cyan
Write-Host "1. Start the backend from backend/" -ForegroundColor Yellow
Write-Host "2. Start the frontend from frontend/ with NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend command:" -ForegroundColor Green
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  uvicorn app:app --host 127.0.0.1 --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "Frontend command:" -ForegroundColor Green
Write-Host "  cd frontend" -ForegroundColor White
Write-Host "  `$env:NEXT_PUBLIC_API_BASE_URL='http://127.0.0.1:8000'" -ForegroundColor White
Write-Host "  npm install" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
