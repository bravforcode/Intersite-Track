# ⚡ Vercel Environment Variables Configuration Guide

**Time Required:** 15-20 minutes  
**Prerequisites:** Vercel account, project deployed to Vercel

---

## Overview

You need to configure **26 environment variables** for production deployment.

---

## Step 1: Access Vercel Dashboard

1. Go to https://vercel.com
2. Login to your account
3. Select your project: **intersite-track**
4. Click **Settings** → **Environment Variables**

---

## Step 2: Application Variables

### NODE_ENV (CRITICAL)

```
Key: NODE_ENV
Value: production
Environment: ✅ Production
```

**⚠️ CRITICAL:** Must be exactly "production" (not "prod" or "Production")

### PORT

```
Key: PORT
Value: 3694
Environment: ✅ Production
```

### VITE_APP_ENV

```
Key: VITE_APP_ENV
Value: production
Environment: ✅ Production
```

### VITE_ENABLE_QUICK_LOGIN (CRITICAL)

```
Key: VITE_ENABLE_QUICK_LOGIN
Value: false
Environment: ✅ Production
```

**⚠️ CRITICAL:** Must be "false" in production for security

---

## Step 3: Firebase Backend (Admin SDK)

Get these from Firebase Console → Project Settings → Service Accounts

### FIREBASE_PROJECT_ID

```
Key: FIREBASE_PROJECT_ID
Value: your-project-id
Environment: ✅ Production
```

Example: `intersite-track02`

### FIREBASE_CLIENT_EMAIL

```
Key: FIREBASE_CLIENT_EMAIL
Value: firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
Environment: ✅ Production
```

### FIREBASE_PRIVATE_KEY

```
Key: FIREBASE_PRIVATE_KEY
Value: -----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n
Environment: ✅ Production
```

**Important:** 
- Keep the `\n` characters (they represent newlines)
- Include the BEGIN and END markers
- Wrap in quotes if using CLI

### FIREBASE_STORAGE_BUCKET

```
Key: FIREBASE_STORAGE_BUCKET
Value: your-project-id.firebasestorage.app
Environment: ✅ Production
```

---

## Step 4: Firebase Frontend (JS SDK)

Get these from Firebase Console → Project Settings → General → Your apps

### VITE_FIREBASE_API_KEY

```
Key: VITE_FIREBASE_API_KEY
Value: AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Environment: ✅ Production
```

### VITE_FIREBASE_AUTH_DOMAIN

```
Key: VITE_FIREBASE_AUTH_DOMAIN
Value: your-project-id.firebaseapp.com
Environment: ✅ Production
```

### VITE_FIREBASE_PROJECT_ID

```
Key: VITE_FIREBASE_PROJECT_ID
Value: your-project-id
Environment: ✅ Production
```

### VITE_FIREBASE_STORAGE_BUCKET

```
Key: VITE_FIREBASE_STORAGE_BUCKET
Value: your-project-id.firebasestorage.app
Environment: ✅ Production
```

### VITE_FIREBASE_MESSAGING_SENDER_ID

```
Key: VITE_FIREBASE_MESSAGING_SENDER_ID
Value: 123456789012
Environment: ✅ Production
```

### VITE_FIREBASE_APP_ID

```
Key: VITE_FIREBASE_APP_ID
Value: 1:123456789012:web:abcdef1234567890
Environment: ✅ Production
```

---

## Step 5: Security Secrets

**⚠️ CRITICAL:** Generate NEW values, don't reuse from development!

### Generate Secrets

```bash
# Run these commands to generate new secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('CSRF_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('CRON_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### JWT_SECRET

```
Key: JWT_SECRET
Value: <64-character-hex-string-from-above>
Environment: ✅ Production
```

### ENCRYPTION_KEY

```
Key: ENCRYPTION_KEY
Value: <64-character-hex-string-from-above>
Environment: ✅ Production
```

### CSRF_SECRET

```
Key: CSRF_SECRET
Value: <64-character-hex-string-from-above>
Environment: ✅ Production
```

### CRON_SECRET

```
Key: CRON_SECRET
Value: <64-character-hex-string-from-above>
Environment: ✅ Production
```

---

## Step 6: CORS Configuration

### ALLOWED_ORIGIN

```
Key: ALLOWED_ORIGIN
Value: https://your-domain.com,https://www.your-domain.com
Environment: ✅ Production
```

**Important:**
- Use your actual production domain
- Comma-separated for multiple domains
- No spaces between domains
- Must use HTTPS

Example: `https://intersite-track.vercel.app`

---

## Step 7: Redis (from Step 1)

### REDIS_URL

```
Key: REDIS_URL
Value: rediss://default:password@host:port
Environment: ✅ Production
```

Get this from Upstash dashboard (see REDIS-SETUP-GUIDE.md)

---

## Step 8: Vercel Blob Storage

### Get Blob Token

1. Go to Vercel Dashboard → Storage
2. Click on your Blob store (or create one)
3. Click **".env.local"** tab
4. Copy the `BLOB_READ_WRITE_TOKEN` value

### BLOB_READ_WRITE_TOKEN

```
Key: BLOB_READ_WRITE_TOKEN
Value: vercel_blob_rw_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Environment: ✅ Production
```

---

## Step 9: LINE Messaging API (Optional)

If you're using LINE notifications:

### Get LINE Credentials

1. Go to https://developers.line.biz/console/
2. Select your channel
3. Get Channel Access Token and Channel Secret

### LINE_CHANNEL_ACCESS_TOKEN

```
Key: LINE_CHANNEL_ACCESS_TOKEN
Value: YOUR_CHANNEL_ACCESS_TOKEN
Environment: ✅ Production
```

### LINE_CHANNEL_SECRET

```
Key: LINE_CHANNEL_SECRET
Value: YOUR_CHANNEL_SECRET
Environment: ✅ Production
```

### LINE_ADMIN_USER_ID

```
Key: LINE_ADMIN_USER_ID
Value: YOUR_LINE_USER_ID
Environment: ✅ Production
```

---

## Step 10: Optional Monitoring (Recommended)

### Sentry (Error Tracking)

```
Key: SENTRY_DSN
Value: https://xxxxx@sentry.io/xxxxx
Environment: ✅ Production
```

```
Key: SENTRY_ENVIRONMENT
Value: production
Environment: ✅ Production
```

### DataDog (Metrics)

```
Key: DATADOG_API_KEY
Value: YOUR_DATADOG_API_KEY
Environment: ✅ Production
```

```
Key: DATADOG_ENVIRONMENT
Value: production
Environment: ✅ Production
```

---

## Verification Checklist

After adding all variables, verify:

- [ ] Total: 26+ variables configured
- [ ] `NODE_ENV=production` (exact match)
- [ ] `VITE_ENABLE_QUICK_LOGIN=false`
- [ ] All Firebase credentials present
- [ ] All security secrets are NEW (not from .env)
- [ ] `REDIS_URL` starts with `rediss://` (with TLS)
- [ ] `ALLOWED_ORIGIN` uses your actual domain
- [ ] All variables set to "Production" environment

---

## Using Vercel CLI (Alternative Method)

### Install Vercel CLI

```bash
npm i -g vercel
vercel login
```

### Add Variables via CLI

```bash
# Add one variable
vercel env add VARIABLE_NAME production

# Paste value when prompted

# List all variables
vercel env ls

# Pull variables to local (for verification)
vercel env pull .env.production.local
```

### Bulk Import (Advanced)

Create `env-production.txt`:
```
NODE_ENV=production
PORT=3694
VITE_APP_ENV=production
...
```

Then:
```bash
# Import all at once
cat env-production.txt | while read line; do
  key=$(echo $line | cut -d'=' -f1)
  value=$(echo $line | cut -d'=' -f2-)
  echo "$value" | vercel env add "$key" production
done
```

---

## Security Best Practices

✅ **Never commit** `.env.production.local` to git  
✅ **Use different secrets** for dev and production  
✅ **Rotate secrets** every 90 days  
✅ **Limit access** to Vercel project settings  
✅ **Enable 2FA** on Vercel account  
✅ **Audit changes** regularly  

---

## Troubleshooting

### Issue: "Environment variable not found"

**Solution:**
1. Check spelling (case-sensitive)
2. Verify environment is set to "Production"
3. Redeploy after adding variables

### Issue: "Invalid Firebase credentials"

**Solution:**
1. Verify `FIREBASE_PRIVATE_KEY` has `\n` characters
2. Check no extra spaces or quotes
3. Regenerate service account key if needed

### Issue: "CORS error in production"

**Solution:**
1. Verify `ALLOWED_ORIGIN` matches your domain exactly
2. Include protocol (`https://`)
3. No trailing slash

### Issue: "Redis connection failed"

**Solution:**
1. Verify `REDIS_URL` starts with `rediss://` (TLS)
2. Test connection from local machine
3. Check Upstash dashboard shows "Active"

---

## Next Steps

After all variables are configured:

1. ✅ Redis configured
2. ✅ Firestore indexes deployed
3. ✅ Vercel env vars configured
4. ⏭️ Deploy to production
5. ⏭️ Verify deployment

---

## Quick Reference

### Required Variables (26)

**Application (4):**
- NODE_ENV
- PORT
- VITE_APP_ENV
- VITE_ENABLE_QUICK_LOGIN

**Firebase Backend (4):**
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- FIREBASE_STORAGE_BUCKET

**Firebase Frontend (6):**
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID

**Security (4):**
- JWT_SECRET
- ENCRYPTION_KEY
- CSRF_SECRET
- CRON_SECRET

**Infrastructure (2):**
- ALLOWED_ORIGIN
- REDIS_URL

**Storage (1):**
- BLOB_READ_WRITE_TOKEN

**LINE API (3, optional):**
- LINE_CHANNEL_ACCESS_TOKEN
- LINE_CHANNEL_SECRET
- LINE_ADMIN_USER_ID

**Monitoring (2, optional):**
- SENTRY_DSN
- DATADOG_API_KEY

---

**Last Updated:** 2026-04-19  
**Next:** [Deploy to Production](PRODUCTION-DEPLOYMENT-GUIDE.md)
