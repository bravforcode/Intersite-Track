# Deployment Runbook - TaskAm

**Audience**: DevOps engineers, deployment managers
**Purpose**: Step-by-step operational procedures for deploying and troubleshooting TaskAm

---

## Pre-Deployment Checklist

### 1. Code Review ✅
- [ ] All PRs merged to main
- [ ] CI/CD tests passing in GitHub Actions
- [ ] No console errors in staging
- [ ] Security audit completed

### 2. Environment Verification ✅
- [ ] All required env vars set in Vercel secrets
- [ ] Firebase project is accessible
- [ ] Firestore backups configured
- [ ] Vercel project is linked to main branch

### 3. Database Preparation ✅
- [ ] Firestore indexes deployed (firestore.indexes.json)
- [ ] Firestore security rules updated
- [ ] Point-in-time restore backup created
- [ ] Database quota verified (>10GB remaining)

### 4. Staging Validation ✅
- [ ] E2E tests pass on staging
- [ ] Performance tests acceptable (<2s page loads)
- [ ] Authorization tests pass
- [ ] File upload/download working

---

## Deployment Procedure

### Step 1: Create Release Branch

```bash
git checkout -b release/v X.Y.Z
git push
```

### Step 2: Tag and Release

```bash
# Create git tag
git tag v X.Y.Z

# Push tag (triggers Vercel production deploy)
git push --tags
```

### Step 3: Monitor Deployment

```bash
# Watch Vercel logs in real-time
vercel logs --tail

# Expected output:
# ✓ Frontend build successful  
# ✓ Backend function initialized
# ✓ Health endpoint responds: { status: "ok" }
```

### Step 4: Post-Deployment Verification

```bash
# 1. Hit health endpoint
curl https://your-domain.com/api/health

# Expected: { status: "ok" }

# 2. Verify frontend loads
curl -I https://your-domain.com/

# Expected: 200 OK with HTML

# 3. Check error logs
vercel logs --target="production" --since="5m"

# 4. Run smoke tests
npm run test:e2e:production
```

### Step 5: Monitor for 24 Hours

During the first 24 hours, monitor:
- Error rates (< 1% acceptable)
- API latency (< 500ms p99)
- CORS issues  
- Firebase quota usage
- User reports

---

## Rollback Procedure

If deployment fails or critical issues found:

### Immediate Rollback

```bash
# Option 1: Revert to previous Vercel deployment
vercel rollback

# Option 2: Redeploy previous commit
git revert HEAD
git push

# Option 3: Manual rollback to specific commit
git reset --hard <previous-commit-hash>
git push --force-with-lease
```

### Database Rollback (if data corruption)

```bash
# Firestore point-in-time restore
# 1. Go to Firebase Console
# 2. Cloud Firestore → Datastore Mode (if not already)
# 3. Backups & Restores
# 4. Create restore to point before deployment
# 5. Verify data integrity before promoting
```

---

## Common Issues & Solutions

### Issue: "502 Bad Gateway" on /api routes

**Diagnosis**:
```bash
vercel logs --tail
# Look for: "Function timeout" or "Module not found"
```

**Solution**:
1. Check backend imports compile locally
2. Verify `backend/api/[...all].ts` is valid
3. Check environment variables set in Vercel
4. Redeploy if env vars recently changed

### Issue: "CORS error" in browser console

**Diagnosis**:
```bash
# Check CORS config in backend/server.ts
grep -A5 "cors(" src/server.ts
```

**Solution**:
1. Verify domain in `ALLOWED_ORIGIN` env var
2. Ensure includes `https://your-domain.com` (no trailing slash)
3. Redeploy after env var change

### Issue: Firestore connection timeout

**Diagnosis**:
```bash
# Check Firebase credentials
firebase projects describe

# Check indexing status
firebase firestore:indexes
```

**Solution**:
1. Verify `FIREBASE_PROJECT_ID` matches actual project
2. Verify `FIREBASE_PRIVATE_KEY` has correct format (with `\n`)
3. Check Firestore indexes are "ENABLED"
4. Wait for index creation (can take 30+ min for large collections)

### Issue: File uploads fail with "413 Payload Too Large"

**Diagnosis**: Body size exceeds server limit

**Solution**:
1. Check `express.json({ limit: "1mb" })` in server.ts
2. Update if needed (max recommended: 10mb)
3. Redeploy

### Issue: High latency on task queries

**Diagnosis**:
```bash
# Check if using full-collection scans
# Look for queries without .where() or .orderBy()

# Verify indexes exist
firebase firestore:indexes --verbose
```

**Solution**:
1. Ensure all required indexes are deployed
2. Check Firestore says indexes are "ENABLED"  
3. May take 30+ minutes for new indexes to be active

---

## Performance Tuning

### Monitor Query Performance

```bash
# Go to Firestore console
# Monitoring → Query Insights

# Red/yellow indicators mean indexes needed
# Create index via firestore.indexes.json if not present
```

### Monitor Function Performance

```bash
# Vercel Analytics Dashboard
# Filter for production environment
# Look at: Edge Response Time (p50, p99)
```

**Targets**:
- p50: <100ms
- p99: <500ms

If exceeding:
1. Check Firestore quota (may be throttled)
2. Check for N+1 queries (fetching task details for each task)
3. Enable query result caching in backend

---

## Documentation Updates

After each deployment, ensure these are updated:

- [ ] CHANGELOG.md - What changed
- [ ] docs/STATUS.txt - Current deployment status
- [ ] docs/IMPROVEMENT-ROADMAP-TO-100.md - Next improvements
- [ ] Release notes for customers

---

## Emergency Contacts

- **DevOps Lead**: [name/contact]
- **Firebase Support**: [link to support]
- **Vercel Support**: support@vercel.com

---

## Deployment Approval

**Deployed by**: ________________
**Approved by**: _________________
**Date**: ________________________
**Version**: ____________________

---

## Post-Deployment Success Criteria

✅ **All the following must be true**:

1. **Frontend**
   - Landing page loads in <3s
   - Login form displays
   - No console errors

2. **Backend**
   - `/api/health` returns 200
   - Firebase credentials valid
   - Firestore connected

3. **Authentication**
   - Users can login
   - Tokens validated correctly
   - Sessions persist

4. **Core Features**
   - Tasks page loads
   - Can create task
   - Can view task details
   - Can assign users
   - Can track time

5. **Error Handling**
   - 404s handled gracefully
   - Auth errors show login page
   - Network errors show retry prompt

6. **Monitoring**
   - Error rate <1%
   - Page load time <2s p95
   - API response <500ms p99
   - No unusual Firestore quota usage

**If all criteria met**: Deployment complete ✅
**If any criteria fail**: Execute rollback immediately 🔴
