# Render Deployment Checklist

## Pre-Deployment

- [ ] Render account created
- [ ] GitHub repository connected to Render
- [ ] Environment variables copied from Railway
- [ ] `render.yaml` file created (optional but recommended)

## Deployment Steps

- [ ] Create new Web Service in Render
- [ ] Configure service settings:
  - [ ] Name: `socrateach-backend`
  - [ ] Environment: Docker
  - [ ] Dockerfile path: `Dockerfile`
  - [ ] Start command: `node dist/api/index.js`
- [ ] Set environment variables:
  - [ ] `NODE_ENV=production`
  - [ ] `OPENAI_API_KEY=...`
  - [ ] `JWT_SECRET=...`
  - [ ] `JWT_REFRESH_SECRET=...`
  - [ ] `SESSION_SECRET=...`
  - [ ] `CORS_ORIGIN=*`
  - [ ] `CORS_CREDENTIALS=true`
  - [ ] **DO NOT SET PORT**
- [ ] Deploy service
- [ ] Wait for build to complete
- [ ] Copy Render URL

## Frontend Updates

- [ ] Update Vercel environment variable:
  - [ ] Key: `VITE_API_BASE_URL`
  - [ ] Value: `https://your-render-url.onrender.com/api/v1`
- [ ] Redeploy Vercel frontend
- [ ] Verify frontend uses new API URL

## Testing

- [ ] Health endpoint: `curl https://your-render-url.onrender.com/health`
- [ ] CORS test in browser console
- [ ] Login functionality test
- [ ] Check browser Network tab for CORS headers
- [ ] Verify no CORS errors in console

## Post-Deployment

- [ ] Monitor Render logs for errors
- [ ] Test all major features
- [ ] Update documentation
- [ ] Consider upgrading to paid plan (always-on)
- [ ] (Optional) Shut down Railway service after confirming Render works

## Troubleshooting

If issues occur:
- [ ] Check Render build logs
- [ ] Check Render runtime logs
- [ ] Verify environment variables are set correctly
- [ ] Test health endpoint directly
- [ ] Check CORS configuration in logs

