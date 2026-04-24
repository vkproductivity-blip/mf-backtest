# MF Backtest - Deployment Guide

## 🎯 Deployment Overview

This guide covers deploying your MF Backtest app to the internet using:
- **Frontend**: Vercel (Next.js optimized)
- **Backend**: Railway or Render (Python FastAPI)

---

## 📦 STEP 1: Initialize Git Repository

### 1.1 Install Git (if not already installed)
- Download from: https://git-scm.com/download/win
- Install with default options
- Restart PowerShell after installation

### 1.2 Initialize Git in your project
```bash
cd C:\Users\vaiib\OneDrive\Desktop\MF_Backtest
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"
git add .
git commit -m "Initial commit: MF Backtest application"
```

### 1.3 Create GitHub Repository
1. Go to https://github.com/new
2. Create repo named `mf-backtest` (or any name)
3. Run these commands:
```bash
git remote add origin https://github.com/YOUR_USERNAME/mf-backtest.git
git branch -M main
git push -u origin main
```

---

## 🌐 STEP 2: Deploy Frontend to Vercel

### 2.1 Connect Vercel to GitHub
1. Go to https://vercel.com/signup
2. Sign up with GitHub account
3. Click "New Project"
4. Select your `mf-backtest` repository
5. Configure settings:
   - **Root Directory**: `./frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
6. Click "Deploy"

### 2.2 Set Environment Variables in Vercel
After deployment starts:
1. Go to **Settings** → **Environment Variables**
2. Add:
   ```
   NEXT_PUBLIC_API_BASE_URL = https://your-backend-url.railway.app
   ```
   (Update with your actual backend URL after Step 3)

---

## ⚙️ STEP 3: Deploy Backend to Railway

### 3.1 Prepare Backend for Railway

#### Create `railway.json` in project root:
```json
{
  "build": {
    "builder": "nixpacks",
    "buildCommand": "pip install -r backend/requirements.txt"
  },
  "deploy": {
    "startCommand": "cd backend && python app.py serve --host 0.0.0.0 --port $PORT"
  }
}
```

#### Update `backend/requirements.txt`:
Make sure it includes:
```
requests
numpy
fastapi
pydantic
uvicorn
```

### 3.2 Deploy to Railway
1. Go to https://railway.app
2. Sign up with GitHub
3. Create new project → "Deploy from GitHub repo"
4. Select `mf-backtest` repository
5. Railway auto-detects and deploys
6. Wait for deployment to complete

### 3.3 Get Your Backend URL
1. In Railway dashboard, go to your project
2. Click the service (backend)
3. Go to **Settings** → **Domains**
4. Copy the auto-generated URL (e.g., `mf-backtest-production.up.railway.app`)

### 3.4 Update Vercel Environment Variable
1. Go back to Vercel project settings
2. Update `NEXT_PUBLIC_API_BASE_URL` with your Railway backend URL
3. Trigger a redeploy

---

## 🗄️ STEP 4: Database Setup

### Option A: Use Railway's PostgreSQL (Recommended for Production)
If you want persistent data beyond SQLite:
1. In Railway project, add **PostgreSQL** service
2. Update backend to use PostgreSQL instead of SQLite
3. Connect Railway services automatically

### Option B: Keep SQLite (Current Setup)
- SQLite will work but data resets when Railway restarts
- For production, migrate to PostgreSQL

---

## 🔗 Alternative: Deploy Backend to Render

If you prefer Render instead of Railway:

### Step 1: Prepare `requirements.txt`
```bash
# Already done, just verify
cd backend
```

### Step 2: Create `Procfile` in project root:
```
web: cd backend && python app.py serve --host 0.0.0.0 --port $PORT
```

### Step 3: Deploy to Render
1. Go to https://render.com
2. Sign up with GitHub
3. Create new **Web Service**
4. Connect your repository
5. Configure:
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && python app.py serve --host 0.0.0.0 --port $PORT`
6. Deploy

### Step 4: Get URL and Update Vercel
Same as Railway - copy the service URL and update Vercel environment variables

---

## ✅ Testing Your Deployment

1. Open your Vercel frontend URL
2. Check that:
   - UI loads with Vanta background ✓
   - Sidebar with popular funds visible ✓
   - Dropdown search works ✓
   - Charts load and display ✓
   - Backtest runs successfully ✓

---

## 🚨 Troubleshooting

### Frontend loads but says "Cannot reach backend"
- Check `NEXT_PUBLIC_API_BASE_URL` in Vercel settings
- Ensure backend URL is correct and includes `https://`
- Wait 5 minutes for DNS propagation

### Backend deployment failed
- Check logs in Railway/Render dashboard
- Verify `requirements.txt` has all dependencies
- Ensure `app.py` runs without errors locally

### Database errors after deployment
- Migrate to PostgreSQL (Railway provides this)
- Or accept that data resets on platform restarts

---

## 📊 Cost Breakdown (Free Tier)

| Service | Free Tier |
|---------|-----------|
| Vercel Frontend | ✓ Unlimited |
| Railway Backend | ✓ $5/month free credit (usually enough) |
| Render Backend | ✓ Unlimited (with ~15 min sleep on inactivity) |
| Database (PostgreSQL on Railway) | ✓ Free tier available |

---

## 🎉 Your App is Live!

Once deployed:
- Share your Vercel URL: `https://your-project.vercel.app`
- Anyone can access it without installation
- Works on mobile and desktop
- Automatic HTTPS/SSL
- Global CDN for fast loading

---

## 📝 Next Steps (Optional)

1. Add custom domain
2. Set up monitoring/alerts
3. Add authentication (if needed)
4. Migrate to PostgreSQL for production
5. Add CI/CD pipeline for auto-deployments

