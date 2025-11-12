# Railway Documentation Summary - CORS & Deployment Issues

## Key Findings from Railway Documentation

### 1. Railway's Reverse Proxy Behavior

Railway uses a reverse proxy/load balancer in front of your application. This means:
- **All requests** go through Railway's proxy first
- The proxy **may handle OPTIONS requests** before they reach your Express server
- CORS headers **must be set by your application** - Railway doesn't add them automatically

### 2. Builder Configuration

Railway supports multiple builders:
- **Dockerfile** (preferred for full control)
- **Nixpacks** (auto-detection, can misidentify projects)
- **Next.js** (auto-detected if Next.js config found)

**To force Dockerfile usage:**
1. Create `railway.json` with `"builder": "DOCKERFILE"`
2. Create `nixpacks.toml` to prevent auto-detection
3. Ensure `Dockerfile` exists in project root

### 3. CORS Headers Must Be Set by Application

According to Railway's architecture:
- Railway's proxy **forwards all requests** to your application
- Your application **must set CORS headers** in responses
- Railway **does not strip headers** - if headers are missing, your app isn't setting them

### 4. OPTIONS Preflight Requests

**Important:** Railway's proxy forwards OPTIONS requests to your application. If OPTIONS requests aren't getting CORS headers:

1. **Check Railway Logs** - Look for "OPTIONS preflight request" in logs
   - If you see this log → Your middleware is running, headers should be set
   - If you DON'T see this log → OPTIONS requests aren't reaching your server

2. **Verify Middleware Order** - CORS middleware must run BEFORE other middleware
   - In Express: `app.use(corsMiddleware)` should be first
   - In our code: Universal CORS middleware is in constructor (runs first)

3. **Test Directly** - Use curl or browser console to test OPTIONS:
```bash
curl -X OPTIONS https://your-app.up.railway.app/api/v1/auth/login \
  -H "Origin: https://your-frontend.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

### 5. Railway Service Settings

**Check Railway Dashboard → Service → Settings:**

1. **Build & Deploy:**
   - Builder: Should be "Dockerfile"
   - Build Command: Should use Dockerfile (not Nixpacks)
   - Start Command: `node dist/api/index.js`

2. **Environment Variables:**
   - `CORS_ORIGIN=*` (or specific origin)
   - `CORS_CREDENTIALS=true`
   - `PORT` - **DO NOT SET** - Railway sets this automatically
   - `NODE_ENV=production`

3. **Networking:**
   - Railway doesn't have CORS settings at platform level
   - All CORS must be handled by your application

### 6. Common Issues & Solutions

#### Issue: "next start" error (Next.js detection)
**Solution:**
- Create `nixpacks.toml` with explicit Node.js configuration
- Set `railway.json` builder to "DOCKERFILE"
- Ensure no `next.config.js` exists

#### Issue: CORS headers missing
**Solution:**
- Verify CORS middleware runs FIRST (in constructor)
- Check Railway logs for "OPTIONS preflight request"
- Test with curl to see actual response headers
- Ensure middleware isn't being bypassed

#### Issue: npm cache lock
**Solution:**
- Use `npm ci --no-cache` in Dockerfile
- Clear cache before install: `RUN npm cache clean --force`

### 7. Railway Deployment Process

1. **Build Phase:**
   - Railway runs Dockerfile build commands
   - Installs dependencies
   - Builds TypeScript

2. **Deploy Phase:**
   - Railway starts container
   - Sets `PORT` environment variable automatically
   - Routes traffic through Railway proxy

3. **Runtime:**
   - Your app listens on `process.env.PORT`
   - Railway proxy forwards requests to your app
   - Your app must set CORS headers in responses

### 8. Debugging Checklist

- [ ] Latest code deployed (check Railway Deployments tab)
- [ ] Server started successfully (check logs for "Socrates API server started")
- [ ] CORS middleware initialized (check logs for "CORS configuration")
- [ ] OPTIONS requests reaching server (check logs for "OPTIONS preflight request")
- [ ] Headers being set (test with curl/browser console)
- [ ] Builder is Dockerfile (check Railway Settings)
- [ ] Environment variables set correctly (check Railway Settings)

### 9. Next Steps

If CORS still fails after verifying all above:

1. **Check Railway Logs** - Look for OPTIONS request logs
2. **Test with curl** - Verify headers are actually being sent
3. **Contact Railway Support** - If headers are set but still failing, Railway proxy might have an issue
4. **Consider Custom Domain** - Sometimes Railway's default domain has issues

## References

- Railway Deployments: https://docs.railway.com/reference/deployments
- Railway Dockerfile: https://docs.railway.com/deploy/dockerfiles
- Railway Environment Variables: https://docs.railway.com/develop/variables

