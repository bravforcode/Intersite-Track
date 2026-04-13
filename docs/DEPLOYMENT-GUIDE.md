# Deployment Guide - TaskAm to Vercel

## Prerequisites

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Ensure environment variables are configured in .env.local
NODE_ENV=production
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=project.appspot.com
TRELLO_API_KEY=your-trello-key
TRELLO_TOKEN=your-trello-token
LINE_BOT_TOKEN=your-line-bot-token
LINE_CHANNEL_SECRET=your-line-channel-secret
```

## Vercel Deployment

### Option 1: Deploy from Git (Recommended)

```bash
# 1. Push code to GitHub/GitLab
git push origin main

# 2. In Vercel Dashboard:
#    - Import repository
#    - Select "Other" framework
#    - Set Root Directory: .
#    - Add Environment Variables from .env.production
#    - Deploy
```

### Option 2: Deploy from CLI

```bash
# 1. Link project (first time only)
vercel

# 2. Set environment variables
vercel env add DATABASE_URL
vercel env add FIREBASE_PROJECT_ID
# ... (add all required vars)

# 3. Deploy to preview
vercel

# 4. Deploy to production
vercel --prod
```

## Environment Variables Setup

**Required for Production**:

| Variable | Source | Example |
|----------|--------|---------|
| `NODE_ENV` | Set to | `production` |
| `FIREBASE_PROJECT_ID` | Firebase Console | `my-project-123` |
| `FIREBASE_PRIVATE_KEY` | Service Account JSON | (long string) |
| `FIREBASE_CLIENT_EMAIL` | Service Account JSON | `firebase-adminsdk@*.iam.gserviceaccount.com` |
| `FIREBASE_STORAGE_BUCKET` | Firebase Console | `my-project-123.appspot.com` |
| `TRELLO_API_KEY` | Trello Developer Portal | (32-char string) |
| `TRELLO_TOKEN` | Trello Developer Portal | (64-char string) |
| `LINE_BOT_TOKEN` | LINE Developers Console | (43-char string) |
| `LINE_CHANNEL_SECRET` | LINE Developers Console | (32-char string) |

**How to Get Firebase Credentials**:
1. Go to Firebase Console → Project Settings
2. Service Accounts tab → Generate New Private Key
3. Download JSON file
4. Use the JSON values for the env vars above

## Build & Deploy Process

```bash
# 1. Build locally to verify
npm run build

# Expected output:
# ✓ Frontend built to frontend/dist/
# ✓ Backend types checked

# 2. Test locally
npm run dev

# 3. Deploy
vercel --prod

# 4. Monitor deployment
vercel logs --tail
```

## Vercel Configuration Explained

The `vercel.json` configures:

1. **Frontend Build**: Static HTML/CSS/JS from Vite
   - Build command: `npm run build --workspace=frontend`
   - Output directory: `frontend/dist/`
   - Deployed as: Static files + index.html SPA fallback

2. **Backend API**: Node.js serverless functions
   - Entry: `backend/api/[...all].ts`
   - Routes to: `/api/*`
   - Max memory: 1024 MB
   - Max timeout: 60 seconds

3. **Routing**:
   - `/api/*` → Serverless backend function
   - `/*.js|css|etc` → Static files with 1-year cache
   - `/*` → index.html (SPA routing)

## Verification Checklist

After deployment:

```bash
# 1. Check frontend loads
curl -I https://your-deployment.vercel.app/
# Should return 200

# 2. Check backend API responds
curl -I https://your-deployment.vercel.app/api/health
# Should return 200 with { status: "ok" }

# 3. Check Firebase connection
curl https://your-deployment.vercel.app/api/health -v
# Should show successful auth headers

# 4. Monitor logs
vercel logs --tail

# 5. Run smoke tests
npm run test:e2e:production
```

## Troubleshooting

### "Cannot find module" errors at runtime

**Problem**: Backend serverless function can't import `../src/routes`

**Solution**:
```json
// vercel.json
"config": {
  "includeFiles": "backend/src/**",
  "excludeFiles": "**/node_modules/**"
}
```

### Firestore connection timeout

**Problem**: Backend can't connect to Firestore (503 error)

**Solution**:
1. Verify `FIREBASE_PROJECT_ID` is correct
2. Check `FIREBASE_PRIVATE_KEY` format (should include `\n`)
3. Verify Firestore Database exists (not Datastore)
4. Check IP allowlist (Vercel IPs must be allowed)

### Frontend can't reach backend API

**Problem**: CORS error when frontend calls `/api/`

**Solution**:
1. Verify `vercel.json` routes correctly
2. Check backend CORS config in `server.ts`
3. Ensure domain is in `ALLOWED_ORIGIN` env var

```javascript
// backend/server.ts
const allowedOrigins = [
  'https://your-deployment.vercel.app',
  'http://localhost:5173',
];
```

## Production Monitoring

```bash
# View real-time logs
vercel logs --tail

# Check deployment status
vercel status

# View analytics
vercel analytics

# Check performance
# Dashboard → Deployments → Select deployment → Performance
```

## Rollback

If deployment has issues:

```bash
# Revert to previous version
vercel rollback

# Or redeploy specific commit
vercel deploy --git main
```

## Performance Optimization

### Frontend
- ✅ Code splitting enabled (Vite automatic)
- ✅ CSS minification enabled
- ✅ Static assets cached 1 year
- ⚠️ Consider: Image optimization (WebP format)

### Backend
- ✅ Rate limiting enabled
- ✅ Helmet security headers
- ✅ Compression middleware
- ⚠️ Consider: Query indexing (see Firestore docs)

## Security Checklist

Before production:

- [ ] All environment variables set (no .env file deployed)
- [ ] CORS properly configured
- [ ] CSP headers enabled
- [ ] Rate limiting active
- [ ] Firestore security rules deployed
- [ ] Firebase Auth email verification enabled
- [ ] Line Channel Secret configured
- [ ] Trello integration tested

