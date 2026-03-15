# Railway Action Plan - Based on Official Documentation

## Key Findings from Railway Docs

### 1. Dockerfile Detection
Railway automatically detects `Dockerfile` in root directory. You should see in logs:
```
==========================
Using detected Dockerfile!
==========================
```

**Action:** Check Railway deployment logs for this message to confirm Dockerfile is being used.

### 2. CORS Headers Must Be Set by Application
According to Railway docs:
- Railway **does NOT strip CORS headers**
- Your application **must set CORS headers** in responses
- Railway's proxy forwards all requests (including OPTIONS) to your app

**Action:** Verify our CORS middleware is actually running and setting headers.

### 3. OPTIONS Requests
Railway forwards OPTIONS requests to your application. The docs recommend:
```javascript
app.options('*', cors());
```

**Action:** We already have this - verify it's working.

### 4. Port Configuration
Railway sets `PORT` automatically. Your app should use:
```javascript
const port = process.env.PORT || 3000;
app.listen(port, ...);
```

**Action:** Verify our server uses `config.PORT` which reads from `process.env.PORT`.

## Immediate Action Steps

### Step 1: Verify Railway is Using Dockerfile
1. Go to Railway Dashboard → Service → Deployments
2. Click latest deployment → View Logs
3. Look for: `========================== Using detected Dockerfile! ==========================`
4. If you DON'T see this, Railway might be using Nixpacks instead

### Step 2: Check Server Startup
In Railway logs, look for:
- ✅ `Socrates API server started` - Server is running
- ✅ `CORS configuration` - CORS middleware initialized
- ❌ Any errors before these messages

### Step 3: Test OPTIONS Request Directly
Use curl or browser console to test:
```bash
curl -X OPTIONS https://socrateach-backend-production.up.railway.app/api/v1/auth/login \
  -H "Origin: https://client-by00fnxwk-tannereischen-2720s-projects.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Look for these headers in response:
- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`
- `Access-Control-Allow-Credentials`

### Step 4: Check Railway Logs for OPTIONS Requests
If OPTIONS requests are reaching our server, logs should show:
- `OPTIONS preflight request` (from constructor middleware)
- OR `Catch-all OPTIONS handler` (from route handler)

**If you see these logs but browser still shows CORS error:**
- Headers might not be reaching browser
- Check Network tab → Headers → Response Headers
- Verify headers are actually present

### Step 5: Verify Environment Variables
Railway Dashboard → Service → Settings → Variables:
- `CORS_ORIGIN=*` (or specific origin)
- `CORS_CREDENTIALS=true`
- `PORT` - **DO NOT SET** (Railway sets automatically)
- `NODE_ENV=production`

### Step 6: Force Dockerfile Usage
If Railway isn't using Dockerfile:
1. Set environment variable: `RAILWAY_DOCKERFILE_PATH=./Dockerfile`
2. Or ensure `railway.json` has `"builder": "DOCKERFILE"`

## Debugging Checklist

- [ ] Railway logs show "Using detected Dockerfile!"
- [ ] Railway logs show "Socrates API server started"
- [ ] Railway logs show "CORS configuration"
- [ ] Railway logs show "OPTIONS preflight request" when testing
- [ ] curl test shows CORS headers in response
- [ ] Browser Network tab shows CORS headers
- [ ] Environment variables set correctly
- [ ] Latest code deployed (check commit hash)

## If Still Not Working

### Option 1: Railway Proxy Issue (Unlikely)
If Railway docs are correct, Railway doesn't strip headers. But if headers are set but not reaching browser:
1. Check Railway Settings → Networking
2. Look for any proxy/CORS settings
3. Contact Railway support

### Option 2: Headers Not Being Set
If OPTIONS requests reach server but headers aren't in response:
1. Check middleware order - CORS must be first
2. Verify `res.setHeader()` is actually being called
3. Check for errors in middleware that might prevent headers

### Option 3: Browser Caching
Clear browser cache and test in incognito mode.

## Next Steps

1. **Check Railway logs** for "Using detected Dockerfile!" and "OPTIONS preflight request"
2. **Test with curl** to see actual response headers
3. **Check browser Network tab** to see what headers are actually received
4. **Compare** what curl shows vs what browser shows

## Expected Behavior

Based on Railway docs:
- ✅ Railway detects Dockerfile automatically
- ✅ Railway forwards OPTIONS requests to your app
- ✅ Your app sets CORS headers
- ✅ Headers are returned to browser
- ✅ Browser allows request

If this flow is broken, identify which step is failing.

