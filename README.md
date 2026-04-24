# MF Backtest

Professional mutual fund backtesting platform built with Python FastAPI backend and Next.js interactive frontend.

## ⚡ Quick Start

### Option 1: PowerShell (Recommended)
```powershell
$env:PATH += ";C:\Program Files\nodejs"
.\start.ps1
```

### Option 2: Double-Click
Run `start.bat` in Windows Explorer.

Then open: **http://localhost:8000**

---

## 📦 What's Inside

- **Backend**: FastAPI + SQLite with 37,500+ mutual fund schemes
- **Frontend**: Next.js + React with Vanta animated background
- **Features**:
  - Scheme search with autocomplete
  - Backtest simulator (lump-sum & SIP)
  - Interactive charts and analytics
  - Risk metrics (Sharpe, max drawdown, volatility)
  - CAGR and performance tracking

---

## 🚀 Development

The app is ready to run out-of-the-box. If you need to rebuild the frontend:

```powershell
$env:PATH += ";C:\Program Files\nodejs"
cd frontend
npm install
npm run build
```

---

## 📖 Full Deployment Guide

See [DEPLOY.md](DEPLOY.md) for:
- Troubleshooting
- Cloud deployment
- Advanced configuration

---

## 🛠️ Tech Stack

- **Backend**: Python 3.13, FastAPI, SQLite, NumPy
- **Frontend**: Next.js 14, React 18, Chart.js, Vanta.js
- **Data**: Free MFAPI (no auth required)

---

## ⚙️ System Requirements

- Python 3.13+
- Node.js 18+ (for frontend development only)
- Windows / Mac / Linux
