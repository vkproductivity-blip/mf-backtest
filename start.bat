@echo off
echo MF Backtest local setup
echo.
echo Backend:
echo   cd backend
echo   uvicorn app:app --host 127.0.0.1 --port 8000
echo.
echo Frontend:
echo   cd frontend
echo   set NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
echo   npm install
echo   npm run dev
