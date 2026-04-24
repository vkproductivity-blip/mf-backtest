# MF Backtest - Quick Start & Deployment Guide

## ⚡ Quick Start (One Command)

Open PowerShell in the project root and run:

```powershell
$env:PATH += ";C:\Program Files\nodejs"
.\start.ps1
```

Then open your browser to:
```
http://localhost:8000
```

---

## 📦 What's Included

### Backend
- **Framework**: FastAPI + Uvicorn
- **Database**: SQLite (mfdata.sqlite3)
- **API Endpoints**:
  - `GET /api/schemes/search?q=...` — Search mutual funds
  - `POST /api/backtest` — Run backtest with results

### Frontend
- **Framework**: Next.js 14 + React 18
- **UI**: Vanta.js animated background + Chart.js
- **Features**:
  - Scheme autocomplete search
  - Live performance metrics
  - Interactive charts (portfolio growth, daily returns)
  - Risk & performance analytics
  - Tabbed detailed metrics view

---

## 🚀 Deployment Steps

### Step 1: Prepare the Build
The frontend is already built in `frontend/out/`. If you make changes:

```powershell
$env:PATH += ";C:\Program Files\nodejs"
cd frontend
npm install
npm run build
```

### Step 2: Start the Server
```powershell
cd C:\Users\vaiib\OneDrive\Desktop\MF_Backtest
& .\start.ps1
```

### Step 3: Access the App
Open browser: `http://localhost:8000`

### Step 4: (Optional) Deploy to Server
If deploying to a cloud server (AWS, Azure, etc.):

1. Copy the entire `MF_Backtest` folder to your server
2. Ensure Python 3.13+ is installed
3. Create a virtual environment: `python -m venv venv`
4. Install dependencies: `pip install -r backend/requirements.txt`
5. Run: `python backend/app.py serve --host 0.0.0.0 --port 8000`

---

## 🔧 Troubleshooting

**App not loading?**
- Ensure backend is running (check terminal shows "Uvicorn running on...")
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)

**Port 8000 already in use?**
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Need to rebuild frontend?**
```powershell
$env:PATH += ";C:\Program Files\nodejs"
cd frontend
npm run build
```

---

## 📊 Using the App

1. **Search for a scheme** — Type mutual fund name or code
2. **Select dates** — Choose start and end dates for backtest
3. **Choose investment type** — Lump Sum or SIP (Systematic Investment Plan)
4. **Enter amount** — Investment amount or monthly SIP amount
5. **Run Backtest** — Click "Run Backtest" to see results

Results include:
- Portfolio growth chart
- Daily returns chart
- CAGR, max drawdown, Sharpe ratio
- Volatility and performance metrics

---

## 📝 Notes

- Database synced with 37,500+ mutual fund schemes
- NAV data available for backtesting
- No external API keys needed (uses free MFAPI)
- App runs entirely on localhost (no internet required after initial data sync)
