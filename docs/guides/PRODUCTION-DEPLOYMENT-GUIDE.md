# 🚀 Production Deployment Guide

**Time Required:** 10-15 minutes  
**Difficulty:** Intermediate  
**Prerequisites:** Redis configured, Firestore indexes deployed, Vercel env vars set

---

## Overview

This guide covers the actual deployment process to production, including pre-deployment checks, deployment methods, and monitoring the deployment.

---

## Pre-Deployment Checklist

Before deploying, verify all previous steps are complete:

```bash
cd TaskAm-main

# 1. Verify Redis is configured
echo $REDIS_URL
# Should output: rediss://default:xxxxx@xxxxx.upstash.io:6379

# 2. Verify Firestore indexes are deployed
firebase firestore:indexes
# All indexes should show "ENABLED" status

# 3. Verify environment variables in Vercel
vercel env ls
# Should show all required variables for production
```

### Critical Environment Variables

Verify these are set in Vercel for PRODUCTION environment:

```bash
# Check in Vercel Dashboard:
# https://vercel.com/your-team/intersite-track/settings/environment-variables

✅ NODE_ENV=production (CRITICAL - exact match)
✅ VITE_ENABLE_QUICK_LOGIN=false (CRITICAL - security)
✅ REDIS_URL (starts with rediss://)
✅ FIREBASE_PROJECT_ID
✅ FIREBASE_PRIVATE_KEY
✅ JWT_SECRET (64 char hex)
✅ CSRF_SECRET (64 char hex)
✅ ALLOWED_ORIGIN (production domain with https://)
```

---

## Deployment Methods

### Method 1: Git Push (Recommended)

This is the recommended method as it provides automatic deployments and rollback capabilities.

#### Step 1: Commit Your Changes

```bash
cd TaskAm-main

# Check current status
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "chore: production configuration and deployment"

# View commit
git log -1
```

#### Step 2: Push to Main Branch

```bash
# Push to GitHub/GitLab
git push origin main

# Vercel will automatically detect the push and start deployment
```

#### Step 3: Monitor Deployment

```bash
# Watch deployment in terminal
vercel ls --follow

# Or open Vercel Dashboard
open https://vercel.com/your-team/intersite-track/deployments
```

---

### Method 2: Vercel CLI

Use this method for manual deployments or when you need more control.

#### Step 1: Login to Vercel

```bash
# Login (if not already logged in)
vercel login

# Verify login
vercel whoami
```

#### Step 2: Link Project

```bash
cd TaskAm-main

# Link to existing Vercel project
vercel link

# Follow prompts:
# ? Set up and deploy "~/TaskAm-main"? [Y/n] y
# ? Which scope do you want to deploy to? your-team
# ? Link to existing project? [Y/n] y
# ? What's the name of your existing project? intersite-track
```

#### Step 3: Deploy to Production

```bash
# Deploy to production
vercel --prod

# Output will show:
# 🔍  Inspect: https://vercel.com/your-team/intersite-track/xxxxx
# ✅  Production: https://your-domain.com
```

#### Step 4: Verify Deployment

```bash
# Check deployment status
vercel ls

# View logs
vercel logs --follow
```

---

## Monitoring Deployment Progress

### 1. Vercel Dashboard

Open the Vercel dashboard to monitor real-time progress:

```bash
open https://vercel.com/your-team/intersite-track/deployments
```

You'll see:
- Build logs
- Function logs
- Deployment status
- Preview URL

### 2. Build Logs

Watch for these stages:

```
✓ Building...
  ├─ Installing dependencies
  ├─ Running build script
  ├─ Optimizing assets
  └─ Generating static files

✓ Deploying...
  ├─ Uploading build output
  ├─ Configuring routes
  └─ Assigning domain

✓ Ready!
  Production: https://your-domain.com
```

### 3. Common Build Warnings (Safe to Ignore)

```
⚠ Some dependencies are outdated
⚠ Large bundle size detected
⚠ Unused exports found
```

These are warnings, not errors. Deployment will continue.

---

## Post-Deployment Verification

### Immediate Checks (First 5 Minutes)

#### 1. Health Endpoint

```bash
# Check health endpoint
curl https://your-domain.com/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-04-19T...",
  "dependencies": {
    "firestore": {
      "status": "ok",
      "latency": 45
    },
    "redis": {
      "status": "ok",
      "latency": 12
    }
  }
}
```

#### 2. Frontend Loading

```bash
# Open in browser
open https://your-domain.com

# Should see:
# ✅ Page loads within 2 seconds
# ✅ No console errors
# ✅ Login form visible
```

#### 3. API Endpoints

```bash
# Test CSRF token endpoint
curl https://your-domain.com/api/csrf-token

# Expected response:
{
  "csrfToken": "xxxxx..."
}

# Test liveness endpoint
curl https://your-domain.com/api/live

# Expected response:
{
  "status": "ok"
}
```

### Functional Tests (Next 10 Minutes)

#### 1. Login Flow

```bash
# Manual test in browser:
1. Open https://your-domain.com
2. Click "Login"
3. Enter credentials
4. Verify redirect to dashboard
5. Check user profile loads
```

#### 2. Task Creation

```bash
# Manual test:
1. Navigate to Tasks page
2. Click "Create Task"
3. Fill in task details
4. Submit form
5. Verify task appears in list
```

#### 3. File Upload

```bash
# Manual test:
1. Create or edit a task
2. Upload a file
3. Verify file appears
4. Download file
5. Verify file content
```

---

## Handling Deployment Errors

### Error: "Build Failed"

**Symptoms:**
```
❌ Build failed
Error: Command "npm run build" exited with 1
```

**Solutions:**

```bash
# 1. Check build locally
npm run build

# 2. Fix any TypeScript errors
npm run type-check

# 3. Fix any linting errors
npm run lint

# 4. Commit fixes and redeploy
git add .
git commit -m "fix: build errors"
git push origin main
```

### Error: "Function Timeout"

**Symptoms:**
```
❌ Function execution timed out
Error: Task timed out after 10.00 seconds
```

**Solutions:**

```bash
# 1. Check Firestore indexes
firebase firestore:indexes

# 2. Optimize slow queries
# Review backend logs for slow operations

# 3. Increase function timeout in vercel.json
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### Error: "Environment Variable Missing"

**Symptoms:**
```
❌ Deployment failed
Error: Missing required environment variable: FIREBASE_PROJECT_ID
```

**Solutions:**

```bash
# 1. Check environment variables
vercel env ls

# 2. Add missing variable
vercel env add FIREBASE_PROJECT_ID production

# 3. Redeploy
vercel --prod
```

### Error: "Domain Not Found"

**Symptoms:**
```
❌ 404: NOT_FOUND
```

**Solutions:**

```bash
# 1. Check domain configuration
vercel domains ls

# 2. Add domain if missing
vercel domains add your-domain.com

# 3. Verify DNS settings
# Add A record or CNAME as instructed by Vercel
```

---

## Rollback Procedures

### Quick Rollback (Instant)

If the deployment has critical issues:

```bash
# Method 1: Via CLI
vercel rollback

# This will:
# 1. List recent deployments
# 2. Prompt you to select which to rollback to
# 3. Instantly switch production to that deployment

# Method 2: Via Dashboard
# 1. Go to https://vercel.com/your-team/intersite-track/deployments
# 2. Find the last working deployment
# 3. Click "..." menu
# 4. Click "Promote to Production"
```

### Rollback with Fix

If you need to fix and redeploy:

```bash
# 1. Revert the problematic commit
git log --oneline -10
git revert <commit-hash>

# 2. Push revert
git push origin main

# 3. Vercel will auto-deploy the reverted code
```

### Emergency Rollback

If everything is broken:

```bash
# 1. Find last known good commit
git log --oneline -20

# 2. Hard reset to that commit
git reset --hard <good-commit-hash>

# 3. Force push (CAUTION: This rewrites history)
git push origin main --force

# 4. Notify team of force push
```

---

## Deployment Checklist

Use this checklist for every production deployment:

### Pre-Deployment
- [ ] All tests passing locally
- [ ] Build succeeds locally
- [ ] Redis configured and tested
- [ ] Firestore indexes deployed
- [ ] Environment variables verified
- [ ] Secrets rotated (if needed)
- [ ] Team notified of deployment

### During Deployment
- [ ] Deployment initiated
- [ ] Build logs monitored
- [ ] No critical errors in logs
- [ ] Deployment completed successfully

### Post-Deployment
- [ ] Health endpoint returns 200 OK
- [ ] Frontend loads without errors
- [ ] Login flow works
- [ ] Task creation works
- [ ] File upload works
- [ ] No spike in error rates
- [ ] Performance metrics normal

### Monitoring (First Hour)
- [ ] Check error rates in Sentry
- [ ] Monitor Vercel function logs
- [ ] Check Firestore quota usage
- [ ] Verify Redis connections
- [ ] Review user feedback

---

## Deployment Best Practices

### 1. Deploy During Low Traffic

```bash
# Check analytics for low-traffic periods
# Typically: Early morning or late evening in your timezone
```

### 2. Use Feature Flags

```typescript
// Enable features gradually
const FEATURE_FLAGS = {
  newTaskUI: process.env.VITE_FEATURE_NEW_TASK_UI === 'true',
  advancedSearch: process.env.VITE_FEATURE_ADVANCED_SEARCH === 'true',
};
```

### 3. Gradual Rollout

```bash
# Deploy to preview first
vercel

# Test preview URL
# If successful, promote to production
vercel --prod
```

### 4. Monitor Closely

```bash
# Watch logs for first 30 minutes
vercel logs --follow

# Check error rates
# Check performance metrics
# Monitor user feedback
```

### 5. Have Rollback Plan Ready

```bash
# Know your rollback commands
# Have last good deployment URL saved
# Keep team on standby
```

---

## Continuous Deployment Setup

### Automatic Deployments

Vercel automatically deploys when you push to main:

```bash
# .github/workflows/deploy.yml (optional)
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run build
```

### Preview Deployments

Every pull request gets a preview deployment:

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and push
git push origin feature/new-feature

# Create PR on GitHub
# Vercel will automatically create preview deployment
# Test on preview URL before merging
```

---

## Troubleshooting

### Issue: Deployment Stuck

**Symptoms:** Deployment shows "Building..." for >10 minutes

**Solutions:**
```bash
# 1. Cancel deployment
vercel cancel

# 2. Check for large files
du -sh node_modules/
du -sh dist/

# 3. Clean and rebuild
rm -rf node_modules dist
npm install
npm run build

# 4. Redeploy
vercel --prod
```

### Issue: 502 Bad Gateway

**Symptoms:** Production URL returns 502 error

**Solutions:**
```bash
# 1. Check function logs
vercel logs --follow

# 2. Common causes:
# - Function timeout (increase in vercel.json)
# - Unhandled promise rejection
# - Database connection failure

# 3. Rollback if critical
vercel rollback
```

### Issue: Static Assets Not Loading

**Symptoms:** CSS/JS files return 404

**Solutions:**
```bash
# 1. Check build output
ls -la dist/

# 2. Verify vercel.json routes
cat vercel.json

# 3. Clear Vercel cache
vercel --prod --force
```

---

## Next Steps

After successful deployment:

1. **Run Verification Guide**
   - See `DEPLOYMENT-VERIFICATION-GUIDE.md`
   - Complete all verification steps

2. **Set Up Monitoring**
   - Configure alerts
   - Set up uptime monitoring
   - Enable error tracking

3. **Document Deployment**
   - Record deployment time
   - Note any issues encountered
   - Update team documentation

4. **Monitor Performance**
   - Check Vercel Analytics
   - Review error rates
   - Monitor user feedback

---

## Support

- **Vercel Documentation:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support
- **Team Channel:** #engineering
- **Incident Response:** See `SECURITY-INCIDENT-RESPONSE.md`

---

**Last Updated:** 2026-04-19  
**Version:** 1.0.0
