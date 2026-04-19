# 📚 Production Deployment Guides

Complete step-by-step guides for deploying the Intersite Track application to production.

---

## Quick Start

**New to deployment?** Start here:

👉 **[QUICK-START-PRODUCTION.md](../../QUICK-START-PRODUCTION.md)** - 30-45 minute overview

---

## Detailed Guides

### 1. Redis Setup Guide
**File:** `REDIS-SETUP-GUIDE.md`  
**Time:** 10-15 minutes  
**Covers:**
- Upstash account creation and configuration
- Redis Cloud alternative setup
- Connection string format and testing
- Environment variable configuration
- Troubleshooting connection issues

**When to use:** Before deploying to production, you need a Redis instance for caching and rate limiting.

---

### 2. Firestore Indexes Guide
**File:** `FIRESTORE-INDEXES-GUIDE.md`  
**Time:** 10-15 minutes  
**Covers:**
- Firebase CLI installation and setup
- Project selection and authentication
- Index deployment from firestore.indexes.json
- Verification in Firebase Console
- Troubleshooting index deployment

**When to use:** Required before production deployment to ensure all database queries work correctly.

---

### 3. Vercel Environment Variables Guide
**File:** `VERCEL-ENV-VARS-GUIDE.md`  
**Time:** 15-20 minutes  
**Covers:**
- All 26+ required environment variables
- Detailed explanations for each variable
- Example values and formats
- Common mistakes and how to avoid them
- Security best practices

**When to use:** Before deploying, you must configure all environment variables in Vercel.

---

### 4. Production Deployment Guide
**File:** `PRODUCTION-DEPLOYMENT-GUIDE.md`  
**Time:** 10-15 minutes  
**Covers:**
- Pre-deployment checklist
- Git push deployment method
- Vercel CLI deployment method
- Monitoring deployment progress
- Handling deployment errors
- Rollback procedures

**When to use:** When you're ready to deploy to production after completing setup steps.

---

### 5. Deployment Verification Guide
**File:** `DEPLOYMENT-VERIFICATION-GUIDE.md`  
**Time:** 15-20 minutes  
**Covers:**
- Automated health check script
- Infrastructure health verification
- Security verification (HTTPS, headers, CORS)
- Functional testing (login, tasks, files)
- Performance verification
- Error monitoring
- What to do if verification fails

**When to use:** Immediately after production deployment to ensure everything works correctly.

---

## Supporting Documentation

### Operations and Maintenance

**[PRODUCTION-OPERATIONS-GUIDE.md](../../PRODUCTION-OPERATIONS-GUIDE.md)**
- Architecture overview
- Monitoring and alerting
- Incident response procedures
- Performance optimization
- Security operations
- Backup and recovery
- Scaling guidelines
- Troubleshooting

**When to use:** Daily operations, incident response, and ongoing maintenance.

---

### Security

**[SECURITY-INCIDENT-RESPONSE.md](../../SECURITY-INCIDENT-RESPONSE.md)**
- Incident severity levels
- Response procedures
- Secret rotation
- Post-incident review
- Prevention measures

**When to use:** When security incidents occur or for regular secret rotation.

---

### Checklists

**[PRODUCTION-DEPLOYMENT-CHECKLIST.md](../../PRODUCTION-DEPLOYMENT-CHECKLIST.md)**
- Complete pre-deployment checklist
- Environment variable checklist
- Firebase configuration checklist
- Security audit checklist
- Post-deployment tasks

**When to use:** Before every production deployment to ensure nothing is missed.

---

## Deployment Flow

Follow this sequence for your first production deployment:

```
1. REDIS-SETUP-GUIDE.md
   ↓
2. FIRESTORE-INDEXES-GUIDE.md
   ↓
3. VERCEL-ENV-VARS-GUIDE.md
   ↓
4. PRODUCTION-DEPLOYMENT-GUIDE.md
   ↓
5. DEPLOYMENT-VERIFICATION-GUIDE.md
   ↓
6. PRODUCTION-OPERATIONS-GUIDE.md (ongoing)
```

---

## Time Estimates

| Task | Time Required |
|------|---------------|
| Redis Setup | 10-15 minutes |
| Firestore Indexes | 10-15 minutes |
| Environment Variables | 15-20 minutes |
| Production Deployment | 10-15 minutes |
| Deployment Verification | 15-20 minutes |
| **Total First Deployment** | **60-85 minutes** |

Subsequent deployments: 10-15 minutes (steps 4-5 only)

---

## Prerequisites

Before starting, ensure you have:

- [ ] Firebase account with Blaze plan
- [ ] Vercel account with project created
- [ ] Git repository connected to Vercel
- [ ] Node.js 18+ installed
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Access to production secrets (or ability to generate new ones)

---

## Quick Reference

### Essential Commands

```bash
# Health check
npm run health:check:prod

# Deploy Firestore indexes
npm run firestore:indexes

# Check Firestore quota
./scripts/check-firestore-quota.sh

# Deploy to production
vercel --prod

# Rollback deployment
vercel rollback

# View logs
vercel logs --follow

# Check environment variables
vercel env ls
```

### Essential URLs

```bash
# Vercel Dashboard
https://vercel.com/your-team/intersite-track

# Firebase Console
https://console.firebase.google.com/project/your-project-id

# Upstash Console
https://console.upstash.com

# Production Health Check
https://your-domain.com/api/health
```

---

## Troubleshooting

### Common Issues

**"Backend API did not become ready in time"**
- Check Firestore quota: `./scripts/check-firestore-quota.sh`
- Deploy indexes: `npm run firestore:indexes`
- Verify Blaze plan is active

**"Redis connection failed"**
- Test connection: `redis-cli -u $REDIS_URL ping`
- Verify REDIS_URL format: `rediss://...`
- Check Redis service status

**"CSRF token invalid"**
- Verify CSRF_SECRET is set: `vercel env ls`
- Check browser sends x-csrf-token header
- Verify ALLOWED_ORIGIN matches your domain

**"Environment variable not found"**
- Check variable is set: `vercel env ls`
- Verify environment (production/preview/development)
- Redeploy after adding variables

---

## Getting Help

### Documentation
- **Quick Start:** `../../QUICK-START-PRODUCTION.md`
- **Operations:** `../../PRODUCTION-OPERATIONS-GUIDE.md`
- **Security:** `../../SECURITY-INCIDENT-RESPONSE.md`
- **Checklist:** `../../PRODUCTION-DEPLOYMENT-CHECKLIST.md`

### External Resources
- **Vercel Docs:** https://vercel.com/docs
- **Firebase Docs:** https://firebase.google.com/docs
- **Upstash Docs:** https://docs.upstash.com

### Support Channels
- **Team Channel:** #engineering
- **Incident Channel:** #incidents
- **On-Call:** [Your contact]

---

## Contributing

Found an issue or have a suggestion? Please update the relevant guide and submit a pull request.

### Guide Template

Each guide should include:
1. Overview with time estimate
2. Prerequisites
3. Step-by-step instructions
4. Verification steps
5. Troubleshooting section
6. Next steps

---

## Version History

- **v1.0.0** (2026-04-19) - Initial comprehensive guide set
  - Redis Setup Guide
  - Firestore Indexes Guide
  - Vercel Environment Variables Guide
  - Production Deployment Guide
  - Deployment Verification Guide

---

**Last Updated:** 2026-04-19  
**Maintained by:** Engineering Team
