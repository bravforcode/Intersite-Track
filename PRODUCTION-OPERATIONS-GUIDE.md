# 📚 Production Operations Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Monitoring & Alerting](#monitoring--alerting)
3. [Incident Response](#incident-response)
4. [Performance Optimization](#performance-optimization)
5. [Security Operations](#security-operations)
6. [Backup & Recovery](#backup--recovery)
7. [Scaling Guidelines](#scaling-guidelines)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel Edge                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   CDN      │  │   WAF      │  │   DDoS     │            │
│  │  (Global)  │  │ Protection │  │ Protection │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │   Frontend (React)   │  │  Backend (Express)   │        │
│  │   - Vite Build       │  │  - TypeScript        │        │
│  │   - Static Assets    │  │  - API Routes        │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Firestore │  │  Redis   │  │  Vercel  │  │ Firebase │   │
│  │   (DB)   │  │ (Cache)  │  │   Blob   │  │  Storage │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  LINE    │  │  Sentry  │  │ DataDog  │                  │
│  │Messaging │  │  (Errors)│  │(Metrics) │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** Google Cloud Firestore
- **Cache:** Redis (Upstash recommended)
- **Storage:** Vercel Blob, Firebase Storage
- **Hosting:** Vercel (Serverless)
- **Auth:** Firebase Authentication
- **Monitoring:** Sentry, DataDog (optional)

---

## Monitoring & Alerting

### Key Metrics to Monitor

#### Application Metrics
- **Response Time:** P50, P95, P99 latencies
- **Error Rate:** 4xx and 5xx responses
- **Request Rate:** Requests per second
- **Availability:** Uptime percentage

#### Infrastructure Metrics
- **Firestore:**
  - Read/Write operations per second
  - Quota usage (daily limits)
  - Query latency
  - Index usage

- **Redis:**
  - Memory usage
  - Hit/Miss ratio
  - Connection count
  - Latency

- **Vercel:**
  - Function execution time
  - Cold start frequency
  - Bandwidth usage
  - Build time

#### Business Metrics
- **User Activity:**
  - Active users (DAU/MAU)
  - Login success rate
  - Task creation rate
  - File upload success rate

### Setting Up Alerts

#### Critical Alerts (Page immediately)
```yaml
- name: "API Down"
  condition: "Health check fails for 2 minutes"
  action: "Page on-call engineer"

- name: "Error Rate Spike"
  condition: "Error rate > 5% for 5 minutes"
  action: "Page on-call engineer"

- name: "Firestore Quota Exhausted"
  condition: "Quota usage > 90%"
  action: "Page on-call engineer"
```

#### Warning Alerts (Notify team)
```yaml
- name: "Slow Response Time"
  condition: "P95 latency > 1s for 10 minutes"
  action: "Notify team channel"

- name: "Redis Memory High"
  condition: "Memory usage > 80%"
  action: "Notify team channel"

- name: "High Error Rate"
  condition: "Error rate > 1% for 10 minutes"
  action: "Notify team channel"
```

### Monitoring Tools Setup

#### 1. Vercel Analytics
```bash
# Enable in Vercel Dashboard
# Settings → Analytics → Enable
```

#### 2. Sentry (Error Tracking)
```bash
# Add to Vercel environment variables
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

#### 3. UptimeRobot (Uptime Monitoring)
```
Monitor URL: https://your-domain.com/api/health
Check Interval: 5 minutes
Alert Contacts: team@your-company.com
```

#### 4. Firebase Console
- Monitor quota usage daily
- Set up budget alerts
- Review performance metrics

---

## Incident Response

### Incident Severity Levels

**SEV-1 (Critical):** Complete service outage
- Response Time: Immediate
- Example: API completely down, database unavailable

**SEV-2 (High):** Major functionality impaired
- Response Time: Within 30 minutes
- Example: Login broken, file uploads failing

**SEV-3 (Medium):** Minor functionality impaired
- Response Time: Within 4 hours
- Example: Slow response times, non-critical feature broken

**SEV-4 (Low):** Cosmetic issues
- Response Time: Next business day
- Example: UI glitch, typo

### Incident Response Procedure

#### 1. Detection & Triage (0-5 minutes)
```bash
# Check health endpoint
curl https://your-domain.com/api/health

# Check Vercel deployment status
vercel ls

# Check error logs
vercel logs --follow
```

#### 2. Communication (5-10 minutes)
- Create incident channel: `#incident-YYYY-MM-DD-description`
- Post status update
- Notify stakeholders

#### 3. Investigation (10-30 minutes)
```bash
# Check recent deployments
vercel ls --limit 10

# Check Firestore status
# Visit: https://status.firebase.google.com

# Check Redis status
redis-cli -u $REDIS_URL ping

# Review error logs in Sentry
# Visit: https://sentry.io/organizations/your-org/issues/
```

#### 4. Mitigation (30-60 minutes)
```bash
# Option 1: Rollback deployment
vercel rollback

# Option 2: Hotfix deployment
git revert <commit-hash>
git push origin main

# Option 3: Scale resources
# Upgrade Redis plan, Firestore quota, etc.
```

#### 5. Resolution & Post-Mortem
- Document root cause
- Implement permanent fix
- Update runbooks
- Schedule post-mortem meeting

### Common Incidents & Solutions

#### Firestore Quota Exhausted
```bash
# Immediate: Upgrade to Blaze plan
# Long-term: Optimize queries, add caching

# Check quota usage
./scripts/check-firestore-quota.sh

# Deploy missing indexes
./scripts/deploy-firestore-indexes.sh
```

#### Redis Connection Failures
```bash
# Check Redis status
redis-cli -u $REDIS_URL ping

# Restart Redis (if self-hosted)
# Or contact provider support

# Temporary: App falls back to in-memory store
```

#### High Error Rate
```bash
# Check Sentry for error patterns
# Common causes:
# - Invalid environment variables
# - Missing Firebase credentials
# - CORS misconfiguration
# - Rate limiting triggered
```

---

## Performance Optimization

### Database Optimization

#### Firestore Best Practices
```typescript
// ❌ Bad: Fetching entire collection
const tasks = await db.collection('tasks').get();

// ✅ Good: Pagination with limit
const tasks = await db.collection('tasks')
  .orderBy('created_at', 'desc')
  .limit(20)
  .get();

// ✅ Better: With cursor-based pagination
const tasks = await db.collection('tasks')
  .orderBy('created_at', 'desc')
  .startAfter(lastDoc)
  .limit(20)
  .get();
```

#### Index Optimization
```bash
# Deploy all indexes
firebase deploy --only firestore:indexes

# Monitor index usage in Firebase Console
# Remove unused indexes to save quota
```

### Caching Strategy

#### Redis Caching Patterns
```typescript
// Cache frequently accessed data
const cacheKey = `user:${userId}:profile`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await fetchFromFirestore();
await redis.setex(cacheKey, 3600, JSON.stringify(data)); // 1 hour TTL
return data;
```

#### Cache Invalidation
```typescript
// Invalidate on update
await redis.del(`user:${userId}:profile`);

// Pattern-based invalidation
const keys = await redis.keys(`user:${userId}:*`);
if (keys.length > 0) {
  await redis.del(...keys);
}
```

### Frontend Optimization

#### Code Splitting
```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./components/dashboard/DashboardPage'));
const Tasks = lazy(() => import('./components/tasks/TasksPage'));
```

#### Asset Optimization
```bash
# Optimize images
npm run optimize:images

# Analyze bundle size
npm run build -- --analyze
```

---

## Security Operations

### Security Checklist

#### Daily
- [ ] Review security logs
- [ ] Check for failed login attempts
- [ ] Monitor rate limiting effectiveness

#### Weekly
- [ ] Review access logs
- [ ] Check for suspicious activity
- [ ] Update dependencies

#### Monthly
- [ ] Rotate secrets
- [ ] Security audit
- [ ] Penetration testing
- [ ] Review user permissions

### Secret Rotation Procedure

```bash
# Generate new secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update in Vercel
vercel env rm JWT_SECRET production
vercel env add JWT_SECRET production

# Redeploy
vercel --prod
```

### Security Incident Response

1. **Identify breach scope**
2. **Revoke compromised credentials**
3. **Rotate all secrets**
4. **Notify affected users**
5. **Document incident**
6. **Implement preventive measures**

---

## Backup & Recovery

### Firestore Backup

```bash
# Export Firestore data
gcloud firestore export gs://your-bucket/backups/$(date +%Y%m%d)

# Schedule daily backups
# Use Cloud Scheduler or cron job
```

### Recovery Procedures

#### Restore from Backup
```bash
# Import Firestore data
gcloud firestore import gs://your-bucket/backups/20260419
```

#### Point-in-Time Recovery
- Firestore supports automatic backups
- Recovery window: 7 days
- Contact Firebase support for assistance

---

## Scaling Guidelines

### Horizontal Scaling

Vercel automatically scales serverless functions. No manual intervention needed.

### Vertical Scaling

#### Redis Scaling
```bash
# Monitor memory usage
redis-cli -u $REDIS_URL INFO memory

# Upgrade plan when usage > 80%
```

#### Firestore Scaling
- Upgrade to Blaze plan (pay-as-you-go)
- No manual scaling needed
- Costs scale with usage

### Cost Optimization

#### Firestore
- Use indexes efficiently
- Implement caching
- Paginate queries
- Clean up old data

#### Vercel
- Optimize function execution time
- Use edge caching
- Minimize bandwidth usage

---

## Troubleshooting

### Common Issues

#### "Backend API did not become ready in time"
**Cause:** Firestore quota exhausted or connection timeout  
**Solution:**
```bash
./scripts/check-firestore-quota.sh
./scripts/deploy-firestore-indexes.sh
```

#### "CSRF token invalid"
**Cause:** Token not sent or expired  
**Solution:** Check frontend sends `x-csrf-token` header

#### "Rate limit exceeded"
**Cause:** Too many requests from single IP  
**Solution:** Implement exponential backoff in client

#### "Redis connection failed"
**Cause:** Redis unavailable or credentials invalid  
**Solution:** Check `REDIS_URL` and Redis service status

### Debug Commands

```bash
# Check deployment logs
vercel logs --follow

# Check environment variables
vercel env ls

# Test health endpoint
curl -v https://your-domain.com/api/health

# Test Redis connection
redis-cli -u $REDIS_URL ping

# Check Firestore connection
firebase firestore:indexes
```

---

## Contact & Support

- **On-Call Engineer:** [Your contact]
- **Team Channel:** #engineering
- **Incident Channel:** #incidents
- **Firebase Support:** https://firebase.google.com/support
- **Vercel Support:** https://vercel.com/support

---

**Last Updated:** 2026-04-19  
**Next Review:** Monthly or after major incidents
