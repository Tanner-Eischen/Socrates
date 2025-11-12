# Railway 502 Bad Gateway Fix

## Issue
Server returning 502 Bad Gateway - Railway can't reach your application.

## Possible Causes

1. **Server not started** - Application crashed on startup
2. **Wrong port** - Application listening on wrong port
3. **Build failed** - Latest deployment didn't build successfully
4. **Server crashed** - Application started but then crashed

## Debugging Steps

### Step 1: Check Railway Deployment Status

1. Go to Railway Dashboard → Your Service → Deployments
2. Check latest deployment:
   - **Status**: Should be "Active" (green)
   - If "Building" → Wait for it to finish
   - If "Failed" → Check build logs for errors

### Step 2: Check Railway Logs

1. Railway Dashboard → Service → Logs
2. Look for:
   - ✅ `Socrates API server started` - Server is running
   - ✅ `port: <number>` - Server is listening on correct port
   - ❌ Any errors before "server started" - Server crashed
   - ❌ "Cannot find module" - Build issue
   - ❌ "Missing environment variables" - Config issue

### Step 3: Verify Server Started

Look for this in logs:
```
Socrates API server started {
  port: <port>,
  host: '0.0.0.0',
  environment: 'production',
  processId: <pid>
}
```

If you DON'T see this, the server didn't start.

### Step 4: Check Common Issues

#### Issue: Server Crashed on Startup
**Check logs for:**
- Missing environment variables (SESSION_SECRET, etc.)
- Database connection errors
- Module not found errors
- Port already in use

#### Issue: Wrong Port
**Verify:**
- Server uses `process.env.PORT` (Railway sets this automatically)
- Don't hardcode port in code
- Don't set PORT in Railway environment variables

#### Issue: Build Failed
**Check:**
- TypeScript compilation errors
- Missing dependencies
- Dockerfile build errors

### Step 5: Verify Environment Variables

Railway Dashboard → Service → Settings → Variables:

**Required:**
- `SESSION_SECRET` - Must be set
- `JWT_SECRET` - Must be set
- `JWT_REFRESH_SECRET` - Must be set
- `OPENAI_API_KEY` - Must be set (or app will use fallback)

**Should NOT be set:**
- `PORT` - Railway sets this automatically

### Step 6: Check Dockerfile Build

Look for in Railway build logs:
```
==========================
Using detected Dockerfile!
==========================
```

If you see this, Dockerfile is being used.

Look for:
- `npm ci --no-cache` - Installing dependencies
- `npm run build` - Building TypeScript
- `Successfully built` - Build completed

### Step 7: Test Health Endpoint

Once server is running, test:
```powershell
Invoke-WebRequest -Uri "https://socrateach-backend-production.up.railway.app/health"
```

Should return 200 with health status.

## Quick Fixes

### Fix 1: Redeploy
1. Railway Dashboard → Service → Settings
2. Click "Redeploy"
3. Watch logs for errors

### Fix 2: Check Latest Commit
1. Railway Dashboard → Service → Deployments
2. Verify latest commit is deployed
3. If old commit, trigger new deployment

### Fix 3: Check Environment Variables
1. Railway Dashboard → Service → Settings → Variables
2. Verify all required variables are set
3. Remove PORT if it's set manually

### Fix 4: Check Build Logs
1. Railway Dashboard → Service → Deployments
2. Click latest deployment
3. Check build logs for errors

## Expected Log Sequence

When server starts successfully, you should see:
1. `Initializing services...`
2. `CORS configuration { CORS_ORIGIN: '*', CORS_CREDENTIALS: true }`
3. `Socrates API server started { port: <port>, host: '0.0.0.0', ... }`

If you see errors before step 3, fix those first.

## Next Steps

1. **Check Railway logs** - Look for "Socrates API server started"
2. **If server started** - Check port configuration
3. **If server didn't start** - Fix errors shown in logs
4. **Test health endpoint** - Once server is running

