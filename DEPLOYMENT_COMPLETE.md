# 🌍 MF Backtest - Complete Deployment Guide

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  YOUR LOCAL MACHINE                                             │
│  ├─ frontend/ (Next.js) → Will deploy to VERCEL               │
│  ├─ backend/ (FastAPI)  → Will deploy to RAILWAY or RENDER    │
│  └─ database (SQLite)   → Stays on backend server             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                    AFTER DEPLOYMENT:

┌──────────────────────┐         ┌──────────────────────┐
│  USERS WORLDWIDE     │         │  YOUR DOMAIN         │
│                      │         │                      │
│  Open browser        │ ─────→  │  mf-backtest.vercel │
│  Type URL            │         │  .app                │
│                      │         │                      │
└──────────────────────┘         └─────────────┬────────┘
                                               │
                              ┌────────────────┴─────────────────┐
                              ↓                                  ↓
                    ┌─────────────────────┐        ┌──────────────────────┐
                    │   VERCEL FRONTEND   │        │  RAILWAY BACKEND     │
                    │  (React + Next.js)  │        │  (Python + FastAPI)  │
                    │                     │        │                      │
                    │ - UI with charts    │        │ - API endpoints      │
                    │ - Animations        │        │ - MFAPI integration  │
                    │ - Smooth fade-ins   │        │ - Database queries   │
                    │                     │        │                      │
                    └──────────┬──────────┘        └──────┬───────────────┘
                               │                          │
                               └──────────┬───────────────┘
                                          ↓
                              (API calls over HTTPS)
```

---

## 📋 Prerequisites

- [ ] Node.js & npm (already installed ✓)
- [ ] GitHub account (free at https://github.com)
- [ ] Vercel account (free at https://vercel.com)
- [ ] Railway or Render account (free tier available)

---

## 🎯 MAIN STEPS

### **PHASE 1: Setup Git & GitHub (2 minutes)**

#### 1.1 Install Git
If not installed:
- Download: https://git-scm.com/download/win
- Install with default options
- **Restart PowerShell** after installation

#### 1.2 Initialize Git Repository
Open PowerShell in your project root:
```powershell
cd "C:\Users\vaiib\OneDrive\Desktop\MF_Backtest"

# Configure Git
git config --global user.name "Your Full Name"
git config --global user.email "your.email@gmail.com"

# Initialize repo
git init
git add .
git commit -m "Initial commit: MF Backtest Application"
```

#### 1.3 Create GitHub Repository
1. Go to https://github.com/new
2. **Repository name**: `mf-backtest`
3. **Description**: "Interactive mutual fund backtesting dashboard"
4. Select **Public** (so anyone can access)
5. Click **"Create repository"**
6. You'll see instructions - copy the first HTTPS URL

#### 1.4 Push to GitHub
```powershell
git remote add origin https://github.com/YOUR_USERNAME/mf-backtest.git
git branch -M main
git push -u origin main
```

**✅ GitHub Step Complete!**

---

### **PHASE 2: Deploy Frontend to Vercel (3 minutes)**

#### 2.1 Connect Vercel to GitHub
1. Go to https://vercel.com
2. Click **"Sign Up"** → **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub account
4. You'll be redirected to Vercel dashboard

#### 2.2 Create New Vercel Project
1. Click **"New Project"**
2. Look for `mf-backtest` in your repositories
3. Click **"Import"**

#### 2.3 Configure Vercel Deployment
**Important Settings:**
- **Project Name**: `mf-backtest` (or custom)
- **Framework Preset**: Next.js (should auto-detect)
- **Root Directory**: Change to `./frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

#### 2.4 Deploy
1. Click **"Deploy"** button
2. **Wait 2-3 minutes** for deployment to complete
3. You'll see ✅ **"Congratulations"** when done
4. Click **"Visit"** to see your app live!
5. **Copy your URL** (e.g., `https://mf-backtest.vercel.app`)

**✅ Frontend Deployed!**

---

### **PHASE 3: Deploy Backend to Railway (3 minutes)**

#### 3.1 Setup Railway Account
1. Go to https://railway.app
2. Click **"Create"** → **"Login with GitHub"**
3. Authorize Railway
4. You'll be on Railway dashboard

#### 3.2 Deploy from GitHub
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Authorize Railway to access your repos
4. Select `mf-backtest` repository
5. Click **"Deploy Now"**

#### 3.3 Wait for Deployment
- Railway automatically:
  - Detects this is a Python project
  - Uses `railway.json` to build & deploy
  - Starts the backend service
  - **Wait 3-5 minutes** until you see a green checkmark

#### 3.4 Get Your Backend URL
1. In Railway dashboard, click your service
2. Click **"Settings"** tab
3. Look for **"Domain"** section
4. Copy the URL (e.g., `mf-backtest-production.up.railway.app`)
5. **Note this URL** - you'll need it in Step 4

**✅ Backend Deployed!**

---

### **PHASE 4: Connect Frontend to Backend (1 minute)**

#### 4.1 Add Environment Variable to Vercel
1. Go to your Vercel project: https://vercel.com/dashboard
2. Click on `mf-backtest` project
3. Go to **"Settings"** → **"Environment Variables"**
4. Click **"Add New"**
5. Fill in:
   - **Name**: `NEXT_PUBLIC_API_BASE_URL`
   - **Value**: `https://your-railway-url.railway.app` (from Step 3.4)
   - **Environments**: Select all (Production, Preview, Development)
6. Click **"Save"**

#### 4.2 Redeploy Frontend
1. Go to **"Deployments"** tab
2. Click the three dots on latest deployment
3. Select **"Redeploy"**
4. **Wait 1-2 minutes** for new deployment with env variable

**✅ Everything Connected!**

---

## 🎉 TEST YOUR LIVE APP

Your app is now LIVE! 

**Visit**: `https://mf-backtest.vercel.app` (your Vercel URL)

### Test Checklist:
- [ ] Page loads with Vanta black background
- [ ] Sidebar shows popular funds
- [ ] Search dropdown works (type "hdfc", "axis", etc.)
- [ ] Select a fund and run backtest
- [ ] Charts display with smooth animations
- [ ] Hover over chart shows data points
- [ ] Metrics tabs are clickable

**If any issue, see Troubleshooting section below**

---

## 🔗 SHARE YOUR APP

Your live URL: `https://mf-backtest.vercel.app`

Send this link to anyone and they can:
- ✓ Access from any device
- ✓ Use without installation
- ✓ Works on mobile and desktop
- ✓ Automatic HTTPS/SSL secure

---

## ⚠️ TROUBLESHOOTING

### ❌ Frontend loads but "Cannot reach API"
**Solution:**
1. Check Vercel Environment Variables
2. Make sure `NEXT_PUBLIC_API_BASE_URL` is correct
3. Includes `https://` not `http://`
4. Redeploy on Vercel
5. Clear browser cache (Ctrl+Shift+Delete)
6. Wait 5 minutes for DNS

### ❌ Backend deployment failed
**Solution:**
1. Check Railway deployment logs
2. Click project → Logs tab
3. Look for error messages
4. Common issues:
   - Port not specified correctly (Railway uses `$PORT`)
   - Dependencies missing from requirements.txt
   - Python version incompatibility

### ❌ Database errors
**Current**: Using SQLite (resets when Railway restarts)
**Better**: Migrate to PostgreSQL (Railway offers free tier)
- Railway will add PostgreSQL to your project automatically
- Database persists between restarts

### ❌ Cannot access GitHub repo
**Solution:**
- Install Git from https://git-scm.com/download/win
- Restart PowerShell after installation
- Try pushing again with `git push -u origin main`

---

## 💰 COSTS

| Service | Free Tier | Cost |
|---------|-----------|------|
| **Vercel** (Frontend) | Unlimited | $0 |
| **Railway** (Backend) | $5/month credit | ~$0-5/mo |
| **Total** | - | **FREE** 🎉 |

Railway's free tier includes:
- Free credits for first month
- Usually enough for small projects
- Automatic sleep after inactivity saves credits

---

## 🔄 NEXT DEPLOYMENTS (Updates)

After you make changes locally:
```powershell
cd "C:\Users\vaiib\OneDrive\Desktop\MF_Backtest"

# Commit changes
git add .
git commit -m "Update: Fixed bug XYZ"

# Push to GitHub
git push origin main

# Vercel & Railway auto-redeploy! ✅
```

**Both platforms automatically redeploy when you push to GitHub!**

---

## 📚 ALTERNATIVE: Deploy Backend to Render

If you prefer Render instead of Railway:

#### 1. Create Render Account
- Go to https://render.com
- Sign up with GitHub

#### 2. Create New Web Service
- Click "Create" → "Web Service"
- Select your repository
- Name: `mf-backtest-api`

#### 3. Configure
- **Runtime**: Python 3
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `cd backend && python app.py serve --host 0.0.0.0 --port $PORT`

#### 4. Get URL and Update Vercel
- Copy service URL from Render dashboard
- Update `NEXT_PUBLIC_API_BASE_URL` in Vercel
- Redeploy

**Note**: Render free tier sleeps after 15 minutes inactivity

---

## 📖 USEFUL REFERENCES

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Render Docs**: https://render.com/docs
- **Next.js Deployment**: https://nextjs.org/learn/basics/deploying-nextjs-app

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Git initialized and pushed to GitHub
- [ ] Vercel frontend deployed and working
- [ ] Railway backend deployed and running
- [ ] Environment variable set in Vercel
- [ ] Frontend redeployed with env variable
- [ ] Tested live app
- [ ] Share URL with others
- [ ] Monitor logs for errors

---

**🎊 Congratulations! Your MF Backtest is now LIVE on the internet!**

