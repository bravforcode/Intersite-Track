# 🚨 SECURITY INCIDENT RESPONSE — IMMEDIATE ACTION REQUIRED

## Incident: Credentials Exposed in Audit Logs

**Date Detected:** 2026-04-19  
**Severity:** CRITICAL  
**Status:** REQUIRES IMMEDIATE ACTION

---

## 🔴 Exposed Credentials

The following credentials were found in `.audit/vercel-production.env` and MUST be rotated immediately:

### 1. Firebase Admin SDK
- **Project ID:** `internsite-f9cd7`
- **Service Account:** `firebase-adminsdk-fbsvc@internsite-f9cd7.iam.gserviceaccount.com`
- **Private Key:** EXPOSED (base64 encoded)
- **Action:** Generate new service account key

### 2. LINE Messaging API
- **Channel Access Token:** EXPOSED
- **Channel Secret:** `caf2ff9eae4846e4821f4085ea2de384`
- **Admin User ID:** `Ue6f844b01993a40329150aa655678b20`
- **Group ID:** `C675a1f9ed3cbb681f3b5d9651aaf0f80`
- **Action:** Regenerate channel access token

### 3. Trello API
- **API Key:** `[EXPOSED_TRELLO_API_KEY]`
- **Token:** `[EXPOSED_TRELLO_TOKEN]`
- **Board ID:** `[EXPOSED_BOARD_ID]`
- **Action:** Revoke and regenerate API token

### 4. Supabase (PostgreSQL)
- **Host:** `db.eezrhwiwwsmarkvejeoi.supabase.co`
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** `CRmXiGQNOzfaZFBb`
- **Service Role Key:** EXPOSED
- **Action:** Reset database password and regenerate service role key

### 5. Vercel Blob Storage
- **Token:** `vercel_blob_rw_fYCfKMZR1OoWFtf3_DVRRET77Lbu5Kk3F2GXRRTQsW8AwbO`
- **Action:** Regenerate blob storage token

---

## ✅ Immediate Actions (Complete in Order)

### Step 1: Rotate Firebase Credentials (15 minutes)

```bash
# 1. Go to Firebase Console
open https://console.firebase.google.com/project/internsite-f9cd7/settings/serviceaccounts/adminsdk

# 2. Delete the exposed service account key
# 3. Generate a new private key
# 4. Download the JSON file
# 5. Update Vercel environment variables:
vercel env rm FIREBASE_PRIVATE_KEY production
vercel env add FIREBASE_PRIVATE_KEY production
# Paste the new private key when prompted

# 6. Redeploy
vercel --prod
```

### Step 2: Rotate LINE Credentials (10 minutes)

```bash
# 1. Go to LINE Developers Console
open https://developers.line.biz/console/

# 2. Navigate to your channel
# 3. Issue new channel access token (long-lived)
# 4. Update Vercel:
vercel env rm LINE_CHANNEL_ACCESS_TOKEN production
vercel env add LINE_CHANNEL_ACCESS_TOKEN production

# 5. Redeploy
vercel --prod
```

### Step 3: Rotate Trello Credentials (5 minutes)

```bash
# 1. Revoke the exposed token
open https://trello.com/app-key

# 2. Generate new token
# 3. Update Vercel:
vercel env rm TRELLO_TOKEN production
vercel env add TRELLO_TOKEN production
```

### Step 4: Rotate Supabase Credentials (10 minutes)

```bash
# 1. Go to Supabase Dashboard
open https://supabase.com/dashboard/project/eezrhwiwwsmarkvejeoi/settings/database

# 2. Reset database password
# 3. Go to API settings and regenerate service_role key
# 4. Update Vercel:
vercel env rm DATABASE_URL production
vercel env rm SUPABASE_SERVICE_ROLE_KEY production
vercel env add DATABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# 5. Redeploy
vercel --prod
```

### Step 5: Rotate Vercel Blob Token (5 minutes)

```bash
# 1. Go to Vercel Dashboard
open https://vercel.com/phirawits-projects/intersite-track/stores

# 2. Regenerate blob storage token
# 3. Update environment:
vercel env rm BLOB_READ_WRITE_TOKEN production
vercel env add BLOB_READ_WRITE_TOKEN production

# 4. Redeploy
vercel --prod
```

### Step 6: Rotate Application Secrets (5 minutes)

```bash
# Generate new secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('CSRF_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('CRON_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Update Vercel
vercel env rm JWT_SECRET production
vercel env rm ENCRYPTION_KEY production
vercel env rm CSRF_SECRET production
vercel env rm CRON_SECRET production

vercel env add JWT_SECRET production
vercel env add ENCRYPTION_KEY production
vercel env add CSRF_SECRET production
vercel env add CRON_SECRET production

# Redeploy
vercel --prod
```

### Step 7: Secure Audit Logs (2 minutes)

```bash
# Delete exposed files
rm -rf .audit/vercel-production*.env

# Verify .gitignore
grep -q "^\.audit/" TaskAm-main/.gitignore && echo "✅ .audit/ is ignored" || echo "❌ Add .audit/ to .gitignore"

# Check git history
git log --all --full-history -- "*vercel-production.env"

# If found in history, use git-filter-repo or BFG Repo-Cleaner
# git filter-repo --path .audit/vercel-production.env --invert-paths
```

---

## 📊 Post-Incident Checklist

- [ ] All Firebase credentials rotated
- [ ] All LINE credentials rotated
- [ ] All Trello credentials rotated
- [ ] All Supabase credentials rotated
- [ ] All Vercel Blob tokens rotated
- [ ] All application secrets regenerated
- [ ] Exposed files deleted from filesystem
- [ ] Git history cleaned (if committed)
- [ ] Production deployment successful
- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] Incident documented
- [ ] Team notified
- [ ] Security audit scheduled

---

## 🔒 Prevention Measures

1. **Never log environment variables** in production
2. **Use Vercel Environment Variables UI** for all secrets
3. **Enable Vercel Secret Scanning** in repository settings
4. **Implement pre-commit hooks** to detect secrets
5. **Regular security audits** (quarterly)
6. **Principle of least privilege** for all credentials
7. **Rotate secrets** every 90 days

---

## 📞 Escalation

If you need assistance:
- **Security Team:** security@your-company.com
- **On-Call Engineer:** Use PagerDuty
- **Firebase Support:** https://firebase.google.com/support
- **Vercel Support:** https://vercel.com/support

---

**Last Updated:** 2026-04-19  
**Next Review:** 2026-05-19
