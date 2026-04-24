# 🚀 MF Backtest - Quick Deployment Summary

## Fastest Path to Live (5-10 minutes)

### ✅ STEP 1: GitHub (2 min)
```bash
# Install Git first if needed from: https://git-scm.com/download/win
cd C:\Users\vaiib\OneDrive\Desktop\MF_Backtest

# Initialize Git
git init
git config user.name "Your Name"
git config user.email "your@email.com"
git add .
git commit -m "Initial commit"

# Create repo on GitHub: https://github.com/new → mf-backtest
# Then run:
git remote add origin https://github.com/YOUR_USERNAME/mf-backtest.git
git branch -M main
git push -u origin main
```

---

### ✅ STEP 2: Deploy Frontend to Vercel (3 min)

**OPTION A: Using Vercel Dashboard (Easiest)**
1. Go to https://vercel.com/signup → Sign in with GitHub
2. Click "New Project"
3. Select your `mf-backtest` repo
4. Root Directory: `./frontend`
5. Click "Deploy" (takes 2-3 min)
6. Copy your Vercel URL (e.g., `https://mf-backtest.vercel.app`)

**OPTION B: Using Vercel CLI**
```bash
npm install -g vercel
cd frontend
vercel --prod
```

---

### ✅ STEP 3: Deploy Backend (2-3 min)

**RECOMMENDED: Railway**
1. Go to https://railway.app → Sign in with GitHub
2. Create new project
3. Select "Deploy from GitHub repo"
4. Choose `mf-backtest`
5. Railway auto-deploys (waits 2-3 min)
6. Get your backend URL from Railway dashboard

**ALTERNATIVE: Render**
1. Go to https://render.com → Sign up with GitHub
2. Create "New Web Service"
3. Connect repo, follow prompts
4. Get your backend URL

---

### ✅ STEP 4: Connect Frontend to Backend (1 min)

1. In Vercel dashboard → Project Settings
2. Go to "Environment Variables"
3. Add new variable:
   - **Name**: `NEXT_PUBLIC_API_BASE_URL`
   - **Value**: `https://your-railway-url.railway.app` (or Render URL)
4. Click "Save"
5. Click "Redeploy" (auto rebuilds with new env var)

---

### ✅ STEP 5: Test! ✓
- Open your Vercel URL
- Try searching for a fund
- Run a backtest
- Verify graphs display correctly

---

## 🎉 **DONE! Your app is live!**

Share your Vercel URL: `https://mf-backtest.vercel.app`

---

## 📊 Costs
- **Vercel**: Free ✓
- **Railway**: ~$5/month free tier (enough for your needs)
- **Render**: Free (sleeps after 15 min inactivity on free tier)

**Total: $0-5/month** 🎊

---

## 🔗 Useful Links
- Vercel Dashboard: https://vercel.com/dashboard
- Railway Dashboard: https://railway.app
- Render Dashboard: https://render.com

---

## ⚠️ If Something Goes Wrong

### Frontend not loading
- Clear browser cache (Ctrl+Shift+Delete)
- Check Vercel deployment logs

### Backend not responding
- Check Railway/Render logs
- Verify `NEXT_PUBLIC_API_BASE_URL` is correct
- Wait 5 min for DNS propagation

### "Cannot reach API" error
- Go to Vercel settings → Environment Variables
- Make sure `NEXT_PUBLIC_API_BASE_URL` includes `https://`
- Redeploy after updating

---

## 📚 Full Guide
See `DEPLOYMENT.md` for detailed instructions with troubleshooting

