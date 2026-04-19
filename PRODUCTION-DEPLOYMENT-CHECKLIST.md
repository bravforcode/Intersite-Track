# 🚀 Production Deployment Checklist

## Pre-Deployment (Complete ALL items before deploying)

### 1. Environment Configuration ✅

#### Vercel Environment Variables (REQUIRED)

```bash
# Navigate to: https://vercel.com/your-team/intersite-track/settings/environment-variables

# Set these for PRODUCTION environment:
```

**Firebase (Backend - Admin SDK)**
- [ ] `FIREBASE_PROJECT_ID` - Your Firebase project ID
- [ ] `FIREBASE_CLIENT_EMAIL` - Service account email
- [ ] `FIREBASE_PRIVATE_KEY` - Private key (with \n preserved)
- [ ] `FIREBASE_STORAGE_BUCKET` - Storage bucket name

**Firebase (Frontend - JS SDK)**
- [ ] `VITE_FIREBASE_API_KEY` - Web API key
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` - Auth domain
- [ ] `VITE_FIREBASE_PROJECT_ID` - Project ID
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` - Storage bucket
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` - Sender ID
- [ ] `VITE_FIREBASE_APP_ID` - App ID

**Application**
- [ ] `NODE_ENV=production` (CRITICAL - must be exactly "production")
- [ ] `PORT=3694`
- [ ] `VITE_APP_ENV=production`
- [ ] `VITE_ENABLE_QUICK_LOGIN=false` (CRITICAL - must be false)

**Security (Generate with crypto.randomBytes(32).toString('hex'))**
- [ ] `JWT_SECRET` - 64 character hex string
- [ ] `ENCRYPTION_KEY` - 64 character hex string
- [ ] `CSRF_SECRET` - 64 character hex string
- [ ] `CRON_SECRET` - 64 character hex string

**CORS**
- [ ] `ALLOWED_ORIGIN` - Comma-separated production domains

**Redis (REQUIRED for production)**
- [ ] `REDIS_URL` - Redis connection string (rediss:// for TLS)

**Vercel Blob Storage**
- [ ] `BLOB_READ_WRITE_TOKEN` - Blob storage token

**LINE Messaging (if used)**
- [ ] `LINE_CHANNEL_ACCESS_TOKEN`
- [ ] `LINE_CHANNEL_SECRET`
- [ ] `LINE_ADMIN_USER_ID`

**Optional but Recommended**
- [ ] `SENTRY_DSN` - Error tracking
- [ ] `DATADOG_API_KEY` - Monitoring

---

### 2. Firebase Configuration ✅

#### Deploy Firestore Indexes
```bash
cd TaskAm-main
firebase use <your-project-id>
./scripts/deploy-firestore-indexes.sh
```

- [ ] Indexes deployed successfully
- [ ] Verified in Firebase Console
- [ ] All indexes show "Enabled" status (may take 5-10 minutes)

#### Firestore Security Rules
```bash
firebase deploy --only firestore:rules
```

- [ ] Rules deployed
- [ ] Tested with Firebase Emulator

#### Check Firestore Quota
```bash
./scripts/check-firestore-quota.sh
```

- [ ] Current usage reviewed
- [ ] Blaze plan enabled (pay-as-you-go)
- [ ] Billing alerts configured

---

### 3. Redis Setup ✅

**Recommended Providers:**
- Upstash (serverless-friendly): https://upstash.com
- Redis Cloud: https://redis.com/cloud
- AWS ElastiCache (if on AWS)

```bash
# Test Redis connection locally
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

- [ ] Redis instance provisioned
- [ ] TLS enabled (rediss:// protocol)
- [ ] Connection tested
- [ ] `REDIS_URL` added to Vercel

---

### 4. Security Audit ✅

#### Secrets Management
- [ ] All secrets rotated from development
- [ ] No secrets in `.env` files committed to git
- [ ] `.audit/` folder in `.gitignore`
- [ ] Git history cleaned of any exposed secrets

#### HTTPS/SSL
- [ ] Custom domain configured in Vercel
- [ ] SSL certificate auto-provisioned
- [ ] HSTS enabled (automatic with NODE_ENV=production)

#### CORS
- [ ] `ALLOWED_ORIGIN` set to production domains only
- [ ] No wildcards (*) in production

#### Rate Limiting
- [ ] Redis configured for distributed rate limiting
- [ ] Rate limits tested with load testing

---

### 5. Code Quality ✅

```bash
# Run all checks
npm run lint
npm run type-check
npm run test:unit
```

- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] All unit tests passing

---

### 6. Build Verification ✅

```bash
# Test production build locally
npm run build
npm run preview
```

- [ ] Build completes without errors
- [ ] Preview server starts successfully
- [ ] Manual smoke test passed

---

## Deployment Steps

### 1. Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Or via Git (recommended)
git push origin main
```

- [ ] Deployment initiated
- [ ] Build logs reviewed
- [ ] No build errors

### 2. Post-Deployment Verification

#### Health Checks
```bash
# Check health endpoint
curl https://your-domain.com/api/health

# Expected response:
# {
#   "status": "ok",
#   "dependencies": {
#     "firestore": { "status": "ok", ... },
#     "redis": { "status": "ok", ... }
#   }
# }
```

- [ ] `/api/health` returns 200 OK
- [ ] Firestore status: "ok"
- [ ] Redis status: "ok"

#### Functional Tests
- [ ] Homepage loads
- [ ] Login works
- [ ] Dashboard displays
- [ ] Task creation works
- [ ] File upload works
- [ ] Notifications work

#### Security Tests
- [ ] HTTPS enforced
- [ ] HSTS header present
- [ ] CSP headers present
- [ ] CSRF protection working
- [ ] Rate limiting active

---

## Monitoring Setup

### 1. Vercel Analytics
- [ ] Enabled in Vercel dashboard
- [ ] Web Vitals tracking active

### 2. Error Tracking (Sentry)
```bash
# If using Sentry
vercel env add SENTRY_DSN production
```

- [ ] Sentry project created
- [ ] DSN configured
- [ ] Test error sent and received

### 3. Uptime Monitoring
- [ ] UptimeRobot or similar configured
- [ ] Monitoring `/api/health` endpoint
- [ ] Alert notifications configured

### 4. Firebase Monitoring
- [ ] Firebase Console monitoring enabled
- [ ] Quota alerts configured
- [ ] Performance monitoring enabled

---

## Rollback Plan

If deployment fails:

```bash
# Rollback to previous deployment
vercel rollback

# Or redeploy specific commit
vercel --prod --force
```

- [ ] Previous deployment URL saved
- [ ] Rollback procedure tested
- [ ] Team notified of rollback

---

## Post-Deployment Tasks

### Immediate (within 1 hour)
- [ ] Monitor error rates in Sentry
- [ ] Check Vercel logs for errors
- [ ] Verify Firebase quota usage
- [ ] Test critical user flows

### Within 24 hours
- [ ] Review performance metrics
- [ ] Check Redis memory usage
- [ ] Verify cron jobs running
- [ ] Review security logs

### Within 1 week
- [ ] Analyze user feedback
- [ ] Review cost metrics
- [ ] Optimize slow queries
- [ ] Update documentation

---

## Emergency Contacts

- **On-Call Engineer:** [Your contact]
- **Firebase Support:** https://firebase.google.com/support
- **Vercel Support:** https://vercel.com/support
- **Redis Support:** [Your provider support]

---

## Compliance Checklist

- [ ] GDPR compliance reviewed (if applicable)
- [ ] Data retention policies configured
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Cookie consent implemented (if required)

---

## Performance Benchmarks

Expected metrics after deployment:

- **Time to First Byte (TTFB):** < 200ms
- **First Contentful Paint (FCP):** < 1.5s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Cumulative Layout Shift (CLS):** < 0.1
- **First Input Delay (FID):** < 100ms

Monitor these in Vercel Analytics and Google PageSpeed Insights.

---

## Sign-Off

- [ ] Technical Lead approval
- [ ] Security review completed
- [ ] Stakeholder notification sent
- [ ] Documentation updated
- [ ] Deployment logged

**Deployed by:** _______________  
**Date:** _______________  
**Version:** _______________  
**Deployment URL:** _______________

---

**Last Updated:** 2026-04-19  
**Next Review:** Before each production deployment
