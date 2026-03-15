# Test CORS Directly

## Test OPTIONS Request

Run this in your browser console on the Vercel frontend:

```javascript
fetch('https://socrateach-backend-production.up.railway.app/api/v1/auth/login', {
  method: 'OPTIONS',
  headers: {
    'Origin': window.location.origin,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type, Authorization'
  }
}).then(r => {
  console.log('Status:', r.status);
  console.log('Headers:', {
    'Access-Control-Allow-Origin': r.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': r.headers.get('Access-Control-Allow-Methods'),
    'Access-Control-Allow-Headers': r.headers.get('Access-Control-Allow-Headers'),
    'Access-Control-Allow-Credentials': r.headers.get('Access-Control-Allow-Credentials')
  });
  return r.text();
}).then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err));
```

## Check Railway Logs

Railway Dashboard → Service → Logs

Look for:
- "OPTIONS preflight request" - confirms handler is being called
- "Socrates API server started" - confirms server is running
- Any errors

## Verify Deployment

Railway Dashboard → Deployments

Latest commit should be: `1e02da1` or `ee36360`
Look for: "Use universal CORS middleware" or "Switch Railway to use Dockerfile"

## If Still Not Working

Railway might be using a proxy that strips CORS headers. Check:
1. Railway Settings → Networking → Check if there's a proxy/load balancer
2. Railway might need CORS configured at the platform level
3. Check if Railway has a "CORS" setting in the dashboard

