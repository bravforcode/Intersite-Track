# 🔴 Redis Setup Guide - Upstash

**Time Required:** 10 minutes  
**Cost:** Free tier available (10,000 commands/day)

---

## Step 1: Create Upstash Account

1. Go to https://upstash.com
2. Click "Sign Up" or "Get Started"
3. Sign up with GitHub, Google, or Email
4. Verify your email if required

---

## Step 2: Create Redis Database

1. After login, click **"Create Database"**

2. Configure your database:
   ```
   Name: intersite-track-prod
   Type: Regional (recommended) or Global
   Region: Select closest to your users
           - For Thailand/Asia: ap-southeast-1 (Singapore)
           - For US: us-east-1 (Virginia)
           - For Europe: eu-west-1 (Ireland)
   
   TLS: ✅ Enabled (required for security)
   Eviction: ✅ Enabled (recommended)
   ```

3. Click **"Create"**

---

## Step 3: Get Connection String

1. After creation, you'll see your database dashboard

2. Click on **"Details"** tab

3. Find **"REST API"** section and copy:
   - **Endpoint URL** (starts with `https://`)
   - **Token**

4. Or find **"Redis"** section and copy:
   - **Connection String** (starts with `rediss://`)
   
   Format: `rediss://default:YOUR_PASSWORD@YOUR_HOST:PORT`

---

## Step 4: Test Connection Locally

### Option A: Using Redis CLI

```bash
# Install redis-cli if not installed
# Windows: Download from https://github.com/microsoftarchive/redis/releases
# Mac: brew install redis
# Linux: sudo apt-get install redis-tools

# Test connection
redis-cli -u "rediss://default:YOUR_PASSWORD@YOUR_HOST:PORT" ping

# Expected output: PONG
```

### Option B: Using Node.js Script

Create `test-redis.js`:

```javascript
import { createClient } from 'redis';

const client = createClient({
  url: 'rediss://default:YOUR_PASSWORD@YOUR_HOST:PORT'
});

client.on('error', (err) => console.error('Redis Error:', err));

await client.connect();
console.log('✅ Connected to Redis');

const pong = await client.ping();
console.log('✅ Ping response:', pong);

await client.set('test-key', 'Hello from Intersite Track!');
const value = await client.get('test-key');
console.log('✅ Test value:', value);

await client.del('test-key');
await client.quit();
console.log('✅ Connection closed');
```

Run:
```bash
node test-redis.js
```

---

## Step 5: Add to Vercel Environment Variables

### Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/your-team/intersite-track/settings/environment-variables

2. Click **"Add New"**

3. Fill in:
   ```
   Key: REDIS_URL
   Value: rediss://default:YOUR_PASSWORD@YOUR_HOST:PORT
   Environment: Production
   ```

4. Click **"Save"**

### Via Vercel CLI

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login
vercel login

# Add environment variable
vercel env add REDIS_URL production

# Paste your Redis URL when prompted
# rediss://default:YOUR_PASSWORD@YOUR_HOST:PORT
```

---

## Step 6: Add to Local Development (Optional)

Add to `TaskAm-main/.env`:

```bash
# Redis (Upstash)
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_HOST:PORT
```

**Note:** For local development, you can also use local Redis:
```bash
# Local Redis (if installed)
REDIS_URL=redis://localhost:6379
```

---

## Step 7: Verify Configuration

### Check Upstash Dashboard

1. Go to your database in Upstash
2. Click **"Data Browser"** tab
3. You should see it's ready to accept connections

### Check Vercel Environment Variables

```bash
vercel env ls

# Should show:
# REDIS_URL (Production)
```

---

## Upstash Free Tier Limits

- **Commands:** 10,000 per day
- **Bandwidth:** 1 GB per month
- **Max Data Size:** 256 MB
- **Max Request Size:** 1 MB
- **Concurrent Connections:** 100

**For production with high traffic, consider upgrading to:**
- **Pay-as-you-go:** $0.2 per 100K commands
- **Pro Plan:** $120/month (unlimited commands)

---

## Monitoring Redis Usage

### Via Upstash Dashboard

1. Go to your database
2. Click **"Metrics"** tab
3. Monitor:
   - Commands per second
   - Bandwidth usage
   - Memory usage
   - Hit rate

### Via Application Logs

After deployment, check logs:

```bash
vercel logs --follow

# Look for:
# ✅ [REDIS] Connected and ready
# ✅ [REDIS] Connection verified
```

---

## Troubleshooting

### Issue: "Connection timeout"

**Cause:** Firewall or incorrect URL

**Solution:**
1. Verify URL format: `rediss://` (with double 's' for TLS)
2. Check Upstash dashboard shows "Active"
3. Verify no firewall blocking port 6379

### Issue: "Authentication failed"

**Cause:** Incorrect password in connection string

**Solution:**
1. Copy connection string again from Upstash dashboard
2. Ensure no extra spaces or characters
3. URL encode special characters if any

### Issue: "Max connections reached"

**Cause:** Too many open connections

**Solution:**
1. Check application properly closes connections
2. Upgrade Upstash plan
3. Implement connection pooling (already done in our code)

---

## Security Best Practices

✅ **Always use TLS** (`rediss://` not `redis://`)  
✅ **Never commit Redis URL** to git  
✅ **Rotate password** every 90 days  
✅ **Monitor access logs** in Upstash dashboard  
✅ **Set up alerts** for unusual activity  
✅ **Use environment variables** only  

---

## Next Steps

After Redis is configured:

1. ✅ Redis URL added to Vercel
2. ⏭️ Deploy Firestore indexes
3. ⏭️ Configure remaining Vercel env vars
4. ⏭️ Deploy to production
5. ⏭️ Verify deployment

---

## Alternative: Redis Cloud

If you prefer Redis Cloud instead of Upstash:

1. Go to https://redis.com/try-free/
2. Create account
3. Create subscription (free tier: 30MB)
4. Create database
5. Copy connection string
6. Add to Vercel as `REDIS_URL`

---

**Last Updated:** 2026-04-19  
**Next:** [Deploy Firestore Indexes](FIRESTORE-INDEXES-GUIDE.md)
