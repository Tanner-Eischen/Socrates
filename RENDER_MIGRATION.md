# Migration Guide: Railway → Render

## Quick Migration Steps

### 1. Create Render Account & Service

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Select the repository

### 2. Configure Render Service

**Basic Settings:**
- **Name:** `socrateach-backend`
- **Region:** Choose closest to your users (US East recommended)
- **Branch:** `main`
- **Root Directory:** Leave empty (root)

**Build & Deploy:**
- **Environment:** `Docker`
- **Dockerfile Path:** `Dockerfile` (or leave empty if in root)
- **Build Command:** `npm ci --no-cache && npm run build` (optional, Dockerfile handles this)
- **Start Command:** `node dist/api/index.js`

**OR use render.yaml:**
- Render will auto-detect `render.yaml` in your repo
- Most settings will be configured automatically

### 3. Set Environment Variables

Go to Render Dashboard → Your Service → Environment

**Required Variables:**
```bash
NODE_ENV=production
OPENAI_API_KEY=your-openai-api-key-here
JWT_SECRET=your-jwt-secret-from-railway
JWT_REFRESH_SECRET=your-refresh-secret-from-railway
SESSION_SECRET=your-session-secret-from-railway
CORS_ORIGIN=*
CORS_CREDENTIALS=true
```

**DO NOT SET:**
- `PORT` - Render sets this automatically

**To get values from Railway:**
1. Railway Dashboard → Service → Variables
2. Copy each value
3. Paste into Render Environment Variables

### 4. Deploy

1. Click "Create Web Service"
2. Render will build and deploy automatically
3. Wait 3-5 minutes for first deployment
4. Copy your Render URL (e.g., `https://socrateach-backend.onrender.com`)

### 5. Update Frontend API URL

**Option A: Vercel Environment Variable (Recommended)**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://your-render-url.onrender.com/api/v1`
   - **Environment:** Production, Preview, Development
3. Redeploy frontend (or wait for auto-deploy)

**Option B: Update client/src/api.ts**

If you want to hardcode (not recommended):
```typescript
baseURL: 'https://your-render-url.onrender.com/api/v1',
```

### 6. Test Deployment

**Health Check:**
```bash
curl https://your-render-url.onrender.com/health
```

**Test CORS:**
Open browser console on Vercel frontend:
```javascript
fetch('https://your-render-url.onrender.com/api/v1/auth/login', {
  method: 'OPTIONS',
  headers: {
    'Origin': window.location.origin,
    'Access-Control-Request-Method': 'POST'
  }
}).then(r => console.log('CORS Headers:', {
  'Access-Control-Allow-Origin': r.headers.get('Access-Control-Allow-Origin')
}));
```

**Test Login:**
- Try logging in from frontend
- Check browser Network tab for CORS headers
- Verify no CORS errors in console

### 7. Update Documentation

After successful migration:
- Update `README.md` with Render deployment instructions
- Update `DEPLOYMENT.md` with Render steps
- Remove Railway-specific documentation (optional)

## Troubleshooting

### Build Fails

**Issue:** Build timeout or npm errors
**Fix:**
- Check Render logs for specific errors
- Verify Dockerfile is correct
- Ensure `package.json` has correct build script

### CORS Still Not Working

**Issue:** CORS errors persist
**Fix:**
- Verify `CORS_ORIGIN=*` is set in Render environment variables
- Check Render logs for "CORS configuration" message
- Test OPTIONS request directly with curl

### Service Goes to Sleep (Free Tier)

**Issue:** Service takes 30+ seconds to respond
**Fix:**
- Free tier services sleep after 15 minutes of inactivity
- First request wakes them up (takes ~30 seconds)
- Upgrade to paid plan for always-on service

### Port Errors

**Issue:** "Port already in use" or connection refused
**Fix:**
- **DO NOT** set PORT environment variable
- Render sets it automatically
- Verify server uses `process.env.PORT`

## Render vs Railway Comparison

| Feature | Railway | Render |
|---------|---------|--------|
| Free Tier | Yes (limited) | Yes (sleeps after 15min) |
| Always-On | Paid | Paid ($7/month) |
| Docker Support | Yes | Yes |
| Auto-Deploy | Yes | Yes |
| Environment Variables | Yes | Yes |
| Logs | Yes | Yes |
| Reliability | Issues with proxy | More reliable |

## Cost Comparison

**Render Free Tier:**
- Services sleep after 15 minutes
- 750 hours/month free
- Good for development/testing

**Render Paid ($7/month):**
- Always-on service
- No sleep delays
- Better for production

**Railway:**
- $5/month minimum
- Similar features
- Current proxy issues

## Next Steps After Migration

1. ✅ Test all functionality
2. ✅ Monitor Render logs for errors
3. ✅ Update frontend API URL in Vercel
4. ✅ Document new deployment process
5. ⚠️ Consider upgrading to paid Render plan for production

## Rollback Plan

If Render doesn't work:
1. Keep Railway service running (don't delete yet)
2. Revert frontend API URL to Railway
3. Try Google Cloud Run (see `GOOGLE_CLOUD_MIGRATION.md`)

