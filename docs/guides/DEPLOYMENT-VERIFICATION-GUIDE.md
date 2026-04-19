# ✅ Deployment Verification Guide

**Time Required:** 15-20 minutes  
**Difficulty:** Beginner to Intermediate  
**Prerequisites:** Production deployment completed

---

## Overview

This guide provides comprehensive verification steps to ensure your production deployment is working correctly and all systems are healthy.

---

## Quick Verification (5 Minutes)

### 1. Automated Health Check

Run the automated health check script:

```bash
cd TaskAm-main

# Check production health
npm run health:check:prod

# Or manually:
./scripts/health-check.sh https://your-domain.com
```

**Expected Output:**

```
═══════════════════════════════════════════════════════════════
  Health Check: https://your-domain.com
═══════════════════════════════════════════════════════════════

🔍 Running health checks...

Checking Root endpoint... ✅ PASS (HTTP 200)
Checking Liveness... ✅ PASS (HTTP 200)
Checking Health endpoint... ✅ PASS (HTTP 200)
Checking Firestore status... ✅ PASS (status = ok)
   Firestore is healthy
Checking Redis status... ✅ PASS (status = ok)
   Redis is healthy
Checking CSRF token... ✅ PASS (HTTP 200)

🔒 Checking security headers...

Checking HSTS header... ✅ PASS
Checking CSP header... ✅ PASS
Checking X-Frame-Options... ✅ PASS

═══════════════════════════════════════════════════════════════
  Summary
═══════════════════════════════════════════════════════════════

Total checks: 10
Passed: 10
Failed: 0

Success rate: 100%

✅ All checks passed!
```

### 2. Quick Manual Check

```bash
# Test health endpoint
curl https://your-domain.com/api/health | jq

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-04-19T10:30:00.000Z",
  "uptime": 3600,
  "dependencies": {
    "firestore": {
      "status": "ok",
      "latency": 45,
      "lastCheck": "2026-04-19T10:30:00.000Z"
    },
    "redis": {
      "status": "ok",
      "latency": 12,
      "lastCheck": "2026-04-19T10:30:00.000Z"
    }
  }
}
```

---

## Comprehensive Verification (15 Minutes)

### Step 1: Infrastructure Health

#### 1.1 Firestore Connection

```bash
# Check Firestore status
curl https://your-domain.com/api/health | jq '.dependencies.firestore'

# Expected:
{
  "status": "ok",
  "latency": 45,
  "lastCheck": "2026-04-19T10:30:00.000Z"
}
```

**Verify in Firebase Console:**

```bash
# Open Firebase Console
open https://console.firebase.google.com/project/your-project-id/firestore

# Check:
# ✅ Database is accessible
# ✅ Recent activity shows reads/writes
# ✅ No error messages
```

#### 1.2 Redis Connection

```bash
# Check Redis status
curl https://your-domain.com/api/health | jq '.dependencies.redis'

# Expected:
{
  "status": "ok",
  "latency": 12,
  "lastCheck": "2026-04-19T10:30:00.000Z"
}
```

**Verify in Redis Dashboard:**

```bash
# For Upstash:
open https://console.upstash.com/redis/your-redis-id

# Check:
# ✅ Connection count > 0
# ✅ Commands per second > 0
# ✅ No connection errors
```

#### 1.3 Vercel Deployment

```bash
# Check deployment status
vercel ls

# Expected output:
# Production: https://your-domain.com (Ready)
# Latest: <deployment-url> (Ready)

# Check function logs
vercel logs --follow
```

---

### Step 2: Security Verification

#### 2.1 HTTPS Enforcement

```bash
# Test HTTP redirect to HTTPS
curl -I http://your-domain.com

# Expected:
# HTTP/1.1 308 Permanent Redirect
# Location: https://your-domain.com
```

#### 2.2 Security Headers

```bash
# Check security headers
curl -I https://your-domain.com

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# Content-Security-Policy: default-src 'self'...
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin
```

#### 2.3 CORS Configuration

```bash
# Test CORS from allowed origin
curl -H "Origin: https://your-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://your-domain.com/api/tasks

# Expected:
# Access-Control-Allow-Origin: https://your-domain.com
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
# Access-Control-Allow-Credentials: true
```

#### 2.4 CSRF Protection

```bash
# Get CSRF token
TOKEN=$(curl -s https://your-domain.com/api/csrf-token | jq -r '.csrfToken')

# Test protected endpoint without token (should fail)
curl -X POST https://your-domain.com/api/tasks \
     -H "Content-Type: application/json" \
     -d '{"title":"Test"}'

# Expected: 403 Forbidden

# Test with token (should work if authenticated)
curl -X POST https://your-domain.com/api/tasks \
     -H "Content-Type: application/json" \
     -H "x-csrf-token: $TOKEN" \
     -d '{"title":"Test"}'
```

#### 2.5 Rate Limiting

```bash
# Test rate limiting (should block after threshold)
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/health
done

# Expected:
# First 50-100 requests: 200
# After threshold: 429 (Too Many Requests)
```

---

### Step 3: Functional Testing

#### 3.1 Frontend Loading

**Manual Test:**

```bash
# Open in browser
open https://your-domain.com
```

**Checklist:**
- [ ] Page loads within 2 seconds
- [ ] No console errors (F12 → Console)
- [ ] No network errors (F12 → Network)
- [ ] All images load correctly
- [ ] CSS styles applied correctly
- [ ] JavaScript executes without errors

**Performance Check:**

```bash
# Run Lighthouse audit
npx lighthouse https://your-domain.com --view

# Target scores:
# Performance: > 90
# Accessibility: > 90
# Best Practices: > 90
# SEO: > 90
```

#### 3.2 Authentication Flow

**Test Login:**

1. Navigate to login page
2. Enter valid credentials
3. Click "Login"
4. Verify redirect to dashboard
5. Check user profile displays correctly

**Test Logout:**

1. Click "Logout" button
2. Verify redirect to login page
3. Verify session cleared
4. Try accessing protected route
5. Verify redirect back to login

**Test Session Persistence:**

1. Login successfully
2. Refresh page (F5)
3. Verify still logged in
4. Close browser
5. Reopen and navigate to site
6. Verify still logged in (if "Remember me" was checked)

#### 3.3 Task Management

**Create Task:**

```bash
# Manual test:
1. Navigate to Tasks page
2. Click "Create Task" button
3. Fill in:
   - Title: "Test Task"
   - Description: "Verification test"
   - Due date: Tomorrow
4. Click "Save"
5. Verify task appears in list
6. Verify success notification
```

**Edit Task:**

```bash
# Manual test:
1. Click on created task
2. Click "Edit" button
3. Change title to "Updated Test Task"
4. Click "Save"
5. Verify changes reflected
6. Verify success notification
```

**Delete Task:**

```bash
# Manual test:
1. Click on task
2. Click "Delete" button
3. Confirm deletion
4. Verify task removed from list
5. Verify success notification
```

#### 3.4 File Upload

**Upload File:**

```bash
# Manual test:
1. Create or edit a task
2. Click "Upload File" button
3. Select a file (< 10MB)
4. Wait for upload
5. Verify file appears in list
6. Verify file size displayed
7. Verify upload date shown
```

**Download File:**

```bash
# Manual test:
1. Click on uploaded file
2. Verify download starts
3. Open downloaded file
4. Verify content is correct
```

**Delete File:**

```bash
# Manual test:
1. Click delete icon on file
2. Confirm deletion
3. Verify file removed
4. Verify success notification
```

#### 3.5 Search and Filter

**Search Tasks:**

```bash
# Manual test:
1. Enter search term in search box
2. Verify results update in real-time
3. Verify only matching tasks shown
4. Clear search
5. Verify all tasks shown again
```

**Filter Tasks:**

```bash
# Manual test:
1. Select filter (e.g., "Completed")
2. Verify only completed tasks shown
3. Select different filter
4. Verify results update
5. Clear filter
6. Verify all tasks shown
```

---

### Step 4: Performance Verification

#### 4.1 Response Times

```bash
# Test API response times
for endpoint in /api/health /api/csrf-token /api/live; do
  echo "Testing $endpoint"
  curl -w "\nTime: %{time_total}s\n" -o /dev/null -s https://your-domain.com$endpoint
done

# Expected:
# /api/health: < 0.5s
# /api/csrf-token: < 0.2s
# /api/live: < 0.1s
```

#### 4.2 Database Query Performance

```bash
# Check Firestore latency
curl -s https://your-domain.com/api/health | jq '.dependencies.firestore.latency'

# Expected: < 100ms

# Check Redis latency
curl -s https://your-domain.com/api/health | jq '.dependencies.redis.latency'

# Expected: < 50ms
```

#### 4.3 Frontend Performance

**Web Vitals Check:**

```bash
# Open Chrome DevTools
# Navigate to: https://your-domain.com
# Open Console and run:

web-vitals.getCLS(console.log); // Target: < 0.1
web-vitals.getFID(console.log); // Target: < 100ms
web-vitals.getLCP(console.log); // Target: < 2.5s
```

**Bundle Size:**

```bash
# Check bundle size in Vercel dashboard
open https://vercel.com/your-team/intersite-track/analytics

# Target:
# Initial JS: < 200KB
# Initial CSS: < 50KB
# Total page size: < 1MB
```

---

### Step 5: Error Monitoring

#### 5.1 Check Error Logs

```bash
# View recent logs
vercel logs --follow

# Look for:
# ❌ Errors (should be 0)
# ⚠️  Warnings (review if any)
# ℹ️  Info (normal operation)
```

#### 5.2 Sentry Dashboard (if configured)

```bash
# Open Sentry
open https://sentry.io/organizations/your-org/issues/

# Check:
# ✅ No new errors in last hour
# ✅ Error rate < 1%
# ✅ No critical issues
```

#### 5.3 Firebase Console

```bash
# Open Firebase Console
open https://console.firebase.google.com/project/your-project-id

# Check:
# ✅ No errors in Functions logs
# ✅ No errors in Firestore logs
# ✅ Quota usage normal
```

---

### Step 6: Monitoring Setup Verification

#### 6.1 Uptime Monitoring

```bash
# Verify UptimeRobot (or similar) is configured
# Check:
# ✅ Monitor is active
# ✅ Check interval: 5 minutes
# ✅ Alert contacts configured
# ✅ Current status: UP
```

#### 6.2 Alert Configuration

```bash
# Verify alerts are configured for:
# ✅ API downtime
# ✅ High error rate
# ✅ Slow response times
# ✅ Firestore quota exceeded
# ✅ Redis connection failures
```

#### 6.3 Test Alerts

```bash
# Send test alert (if supported by your monitoring tool)
# Verify:
# ✅ Alert received via email
# ✅ Alert received via Slack/Discord
# ✅ Alert contains relevant information
```

---

## Verification Checklist

### Infrastructure
- [ ] Health endpoint returns 200 OK
- [ ] Firestore status: "ok"
- [ ] Redis status: "ok"
- [ ] Vercel deployment: "Ready"
- [ ] No errors in logs

### Security
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] CORS configured correctly
- [ ] CSRF protection working
- [ ] Rate limiting active
- [ ] No exposed secrets

### Functionality
- [ ] Frontend loads correctly
- [ ] Login works
- [ ] Logout works
- [ ] Session persistence works
- [ ] Task creation works
- [ ] Task editing works
- [ ] Task deletion works
- [ ] File upload works
- [ ] File download works
- [ ] Search works
- [ ] Filters work

### Performance
- [ ] API response times < 500ms
- [ ] Firestore latency < 100ms
- [ ] Redis latency < 50ms
- [ ] Page load time < 2s
- [ ] Lighthouse score > 90

### Monitoring
- [ ] Error tracking configured
- [ ] Uptime monitoring active
- [ ] Alerts configured
- [ ] Logs accessible
- [ ] Metrics dashboard available

---

## What to Do If Verification Fails

### Issue: Health Check Fails

**Symptoms:**
```
❌ FAIL (HTTP 500)
```

**Actions:**

1. **Check logs immediately:**
   ```bash
   vercel logs --follow
   ```

2. **Identify the error:**
   - Firestore connection failure?
   - Redis connection failure?
   - Missing environment variable?

3. **Fix based on error:**
   ```bash
   # If Firestore issue:
   ./scripts/check-firestore-quota.sh
   
   # If Redis issue:
   redis-cli -u $REDIS_URL ping
   
   # If env var issue:
   vercel env ls
   ```

4. **Rollback if critical:**
   ```bash
   vercel rollback
   ```

### Issue: Frontend Not Loading

**Symptoms:**
- Blank page
- Console errors
- 404 for assets

**Actions:**

1. **Check browser console:**
   - F12 → Console
   - Look for errors

2. **Check network tab:**
   - F12 → Network
   - Look for failed requests

3. **Common fixes:**
   ```bash
   # Clear Vercel cache
   vercel --prod --force
   
   # Check build output
   vercel logs
   
   # Verify environment variables
   vercel env ls
   ```

### Issue: Authentication Not Working

**Symptoms:**
- Login fails
- Session not persisting
- Redirect loops

**Actions:**

1. **Check Firebase configuration:**
   ```bash
   # Verify env vars
   echo $FIREBASE_PROJECT_ID
   echo $FIREBASE_API_KEY
   ```

2. **Check browser console:**
   - Look for Firebase errors
   - Check network requests

3. **Verify CORS:**
   ```bash
   # Check ALLOWED_ORIGIN
   vercel env get ALLOWED_ORIGIN production
   ```

### Issue: High Error Rate

**Symptoms:**
- Multiple errors in Sentry
- Failed requests in logs

**Actions:**

1. **Identify error pattern:**
   ```bash
   # Check Sentry
   open https://sentry.io/organizations/your-org/issues/
   
   # Group by error type
   # Identify most common error
   ```

2. **Fix and redeploy:**
   ```bash
   # Fix the issue
   git add .
   git commit -m "fix: <error description>"
   git push origin main
   ```

3. **Monitor after fix:**
   ```bash
   # Watch error rate decrease
   vercel logs --follow
   ```

---

## Post-Verification Tasks

### Immediate (Within 1 Hour)

1. **Document deployment:**
   ```bash
   # Record in deployment log:
   - Deployment time
   - Version deployed
   - Verification results
   - Any issues encountered
   ```

2. **Notify team:**
   ```
   ✅ Production deployment successful
   Version: v2.0.0
   Deployed at: 2026-04-19 10:30 UTC
   All verification checks passed
   ```

3. **Monitor closely:**
   ```bash
   # Watch logs for 1 hour
   vercel logs --follow
   
   # Check error rates every 15 minutes
   # Check performance metrics
   ```

### Within 24 Hours

1. **Review metrics:**
   - Error rates
   - Response times
   - User activity
   - Resource usage

2. **Gather feedback:**
   - Check user reports
   - Review support tickets
   - Monitor social media

3. **Optimize if needed:**
   - Slow queries
   - High memory usage
   - Large bundle sizes

### Within 1 Week

1. **Performance analysis:**
   - Review Vercel Analytics
   - Check Lighthouse scores
   - Analyze user behavior

2. **Cost review:**
   - Firestore usage
   - Redis usage
   - Vercel bandwidth
   - Set budget alerts

3. **Documentation update:**
   - Update runbooks
   - Document lessons learned
   - Update deployment guide

---

## Success Criteria

Your deployment is successful if:

✅ All automated health checks pass  
✅ All manual functional tests pass  
✅ No critical errors in logs  
✅ Performance metrics meet targets  
✅ Security headers present  
✅ Monitoring and alerts configured  
✅ Team notified and documentation updated

---

## Next Steps

1. **Read Operations Guide:**
   - See `PRODUCTION-OPERATIONS-GUIDE.md`
   - Familiarize with incident response

2. **Set Up Regular Monitoring:**
   - Daily: Check error rates
   - Weekly: Review performance
   - Monthly: Security audit

3. **Plan Next Deployment:**
   - Document lessons learned
   - Improve deployment process
   - Update automation

---

## Support

- **Operations Guide:** `PRODUCTION-OPERATIONS-GUIDE.md`
- **Incident Response:** `SECURITY-INCIDENT-RESPONSE.md`
- **Team Channel:** #engineering
- **On-Call:** [Your contact]

---

**Congratulations! Your production deployment is verified and ready! 🎉**

---

**Last Updated:** 2026-04-19  
**Version:** 1.0.0
