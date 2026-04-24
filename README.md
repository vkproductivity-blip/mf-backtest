# MF Backtest

Mutual fund backtesting app with a FastAPI backend for Railway and a Next.js frontend for Vercel.

## Deployable Architecture

- `backend/`: Railway service
- `frontend/`: Vercel project

## Railway Setup

1. Deploy the repo root to Railway.
2. Keep the provided `railway.json` start command.
3. Optional: set `CORS_ALLOW_ORIGINS` to your Vercel domain and preview domains.

Example:

```text
https://your-app.vercel.app,https://your-app-git-main-your-team.vercel.app
```

4. After deploy, confirm:

```text
https://your-railway-domain.up.railway.app/health
https://your-railway-domain.up.railway.app/api/schemes/search?q=hdfc
```

## Vercel Setup

1. Import `frontend/` as the Vercel project root.
2. Set:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-railway-domain.up.railway.app
```

3. Redeploy.

## Local Run

Backend:

```powershell
cd backend
uvicorn app:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
$env:NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000"
npm install
npm run dev
```

## Fixed in this revision

- Added the missing `/api/schemes/search` backend route.
- Made SQLite load from the backend folder reliably on Railway.
- Added configurable CORS for public frontend domains.
- Restored a deployable Next.js frontend source tree.
- Removed the broken Vercel rewrite/static-export setup.
