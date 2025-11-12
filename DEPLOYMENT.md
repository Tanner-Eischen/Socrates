# Deployment Guide - SocraTeach

Quick deployment guide for Render (backend) + Vercel (frontend).

**Note:** This guide covers Render deployment. For Railway deployment (legacy), see `RAILWAY_DEPLOYMENT.md`.

## Prerequisites

- GitHub repository with your code
- OpenAI API key
- Render account (free tier available)
- Vercel account (free)

## Step 1: Deploy Backend to Render

### 1.1 Sign up and connect GitHub

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Select your repository

### 1.2 Configure Render Service

**Basic Settings:**
- **Name:** `socrateach-backend`
- **Region:** Choose closest to your users
- **Branch:** `main`
- **Root Directory:** Leave empty

**Build & Deploy:**
- **Environment:** `Docker`
- **Dockerfile Path:** `Dockerfile` (or leave empty if in root)
- **Start Command:** `node dist/api/index.js`

**OR use render.yaml (Recommended):**
- Render will auto-detect `render.yaml` in your repo
- Most settings configured automatically

### 1.3 Set Environment Variables

Go to Render Dashboard → Your Service → Environment

**Required Variables:**
```bash
NODE_ENV=production
OPENAI_API_KEY=your-openai-api-key-here
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
SESSION_SECRET=your-super-secret-session-key-change-this
CORS_ORIGIN=*
CORS_CREDENTIALS=true
```

**DO NOT SET PORT** - Render sets this automatically

**Generate secure secrets:**
```bash
# On your local machine:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.4 Deploy

1. Click "Create Web Service"
2. Render will build and deploy automatically
3. Wait 3-5 minutes for first deployment
4. Copy your Render URL (e.g., `https://socrateach-backend.onrender.com`)

### 1.5 Test Backend

```bash
# Health check
curl https://your-app.onrender.com/health

# Should return: {"status":"ok",...}
```

**Note:** Free tier services sleep after 15 minutes. First request may take ~30 seconds to wake up.

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Sign up and connect GitHub

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your GitHub repository

### 2.2 Configure Vercel

**Project Settings:**
- Framework Preset: Vite
- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Environment Variables:**
Add in Vercel dashboard → Settings → Environment Variables:

```bash
VITE_API_BASE_URL=https://your-render-url.onrender.com/api/v1
```

**Important:** Replace `your-render-url.onrender.com` with your actual Render service URL!

### 2.3 Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Vercel will give you a URL (e.g., `https://your-app.vercel.app`)

### 2.4 Update Backend CORS (if needed)

If you set `CORS_ORIGIN=*` in Render, CORS should work automatically.  
If you want to restrict to specific origin, update in Render Dashboard → Environment:

```bash
CORS_ORIGIN=https://your-app.vercel.app
```

Render will auto-redeploy on environment variable changes.

---

## Step 3: Verify Deployment

### Test Frontend
1. Visit your Vercel URL
2. Try logging in/registering
3. Test Socratic tutoring session

### Test Backend API
```bash
# Health check
curl https://your-render-url.onrender.com/health

# API docs
open https://your-render-url.onrender.com/api-docs
```

---

## Step 4: Fix API Key Issue (If Needed)

If Socratic engine is falling back:

1. **Check Render logs:**
   - Render dashboard → Your Service → Logs
   - Look for "OPENAI_API_KEY" errors

2. **Verify environment variable:**
   - Render dashboard → Environment
   - Ensure `OPENAI_API_KEY` is set correctly
   - No extra spaces or quotes

3. **Test API key:**
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

4. **Redeploy if needed:**
   - Render will auto-redeploy on env var changes
   - Or manually trigger redeploy from dashboard

---

## Step 5: Add Database (Optional - Later)

When ready for persistent storage:

1. **Render Dashboard:**
   - Click "New +" → "PostgreSQL"
   - Render creates database automatically

2. **Get Connection String:**
   - Render will provide `DATABASE_URL` automatically
   - Or use individual variables:
     - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

3. **Link to Web Service:**
   - In your web service settings → "Link Resource"
   - Select your PostgreSQL database
   - Render automatically adds `DATABASE_URL` to environment

4. **Redeploy:**
   - Render auto-redeploys
   - App will initialize schema automatically

---

## Troubleshooting

### Backend won't start
- Check Render logs for errors
- Verify `npm run build` succeeds locally
- Ensure `dist/api/index.js` exists after build
- Check Dockerfile is correct

### Frontend can't connect to backend
- Verify `VITE_API_BASE_URL` is set correctly in Vercel
- Check CORS_ORIGIN in Render (should be `*` or match Vercel URL)
- Test backend health endpoint directly
- Note: Free tier services sleep - first request may take 30 seconds

### API key not working
- Verify key is set in Render environment variables
- Check for typos or extra spaces
- Ensure key starts with `sk-` (OpenAI format)

### Build fails
- Check build logs in Render/Vercel
- Ensure all dependencies are in package.json
- Try building locally: `npm run build`
- Verify Dockerfile builds successfully

---

## Quick Reference

**Backend URL:** `https://your-app.onrender.com`  
**Frontend URL:** `https://your-app.vercel.app`  
**API Base:** `https://your-app.onrender.com/api/v1`  
**Health Check:** `https://your-app.onrender.com/health`  
**API Docs:** `https://your-app.onrender.com/api-docs`

---

## Cost Estimate

- **Render:** Free (sleeps after 15min) or $7/month (always-on)
- **Vercel:** Free (hobby plan)
- **OpenAI API:** Pay per use
- **Total:** Free (with sleep) or ~$7/month + API usage

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Deploy frontend to Vercel
3. ✅ Fix API key issue
4. ⏭️ Add PostgreSQL database
5. ⏭️ Upgrade to Render paid plan (always-on, recommended for production)
6. ⏭️ Set up custom domain (optional)
7. ⏭️ Configure monitoring/alerts

---

*Deployment guide created from brainstorming session insights*

