# 🔥 Firestore Indexes Deployment Guide

**Time Required:** 5-10 minutes  
**Prerequisites:** Firebase CLI installed, Firebase project created

---

## Step 1: Install Firebase CLI

### Windows (PowerShell)

```powershell
# Install via npm
npm install -g firebase-tools

# Verify installation
firebase --version
```

### Mac/Linux

```bash
# Install via npm
npm install -g firebase-tools

# Or via curl
curl -sL https://firebase.tools | bash

# Verify installation
firebase --version
```

---

## Step 2: Login to Firebase

```bash
# Login with your Google account
firebase login

# This will open a browser window
# Sign in with the Google account that has access to your Firebase project
```

If you're already logged in:
```bash
# Check current user
firebase login:list

# Use specific account
firebase login:use your-email@gmail.com
```

---

## Step 3: Select Your Firebase Project

```bash
cd TaskAm-main

# List available projects
firebase projects:list

# Select your project
firebase use YOUR_PROJECT_ID

# Example:
# firebase use intersite-track02
```

Verify selection:
```bash
firebase use

# Should show:
# Active Project: YOUR_PROJECT_ID
```

---

## Step 4: Review Indexes Configuration

Check `firestore.indexes.json`:

```bash
# View the file
cat firestore.indexes.json

# Or open in editor
code firestore.indexes.json
```

The file should contain indexes for:
- Tasks (by status, priority, assignees, project_id, due_date)
- Notifications (by user_id, is_read, created_at)
- Task-related collections (checklists, updates, comments, etc.)

---

## Step 5: Deploy Indexes

### Using Our Script (Recommended)

```bash
# Make script executable (Mac/Linux)
chmod +x scripts/deploy-firestore-indexes.sh

# Run the script
./scripts/deploy-firestore-indexes.sh

# Or on Windows with Git Bash
bash scripts/deploy-firestore-indexes.sh
```

### Using Firebase CLI Directly

```bash
# Deploy only indexes
firebase deploy --only firestore:indexes

# Expected output:
# === Deploying to 'YOUR_PROJECT_ID'...
# 
# i  firestore: reading indexes from firestore.indexes.json...
# ✔  firestore: deployed indexes in firestore.indexes.json successfully
```

---

## Step 6: Verify Deployment

### Via Firebase Console

1. Go to https://console.firebase.google.com
2. Select your project
3. Navigate to **Firestore Database** → **Indexes**
4. You should see all indexes listed

### Check Index Status

Indexes can be in different states:
- 🟢 **Enabled** - Ready to use
- 🟡 **Building** - Currently being created (may take 5-10 minutes)
- 🔴 **Error** - Failed to create

**Note:** Large collections may take longer to index.

---

## Step 7: Monitor Index Creation

### Via Firebase Console

1. Go to Firestore → Indexes
2. Watch the status column
3. Wait for all indexes to show "Enabled"

### Via CLI

```bash
# List all indexes
firebase firestore:indexes

# Check specific index status
firebase firestore:indexes --project YOUR_PROJECT_ID
```

---

## Step 8: Test Queries

After indexes are enabled, test your queries:

```bash
# Start your development server
npm run dev

# Check backend logs for query errors
# Should no longer see "The query requires an index" errors
```

---

## Common Index Configurations

### Tasks Collection

```json
{
  "collectionGroup": "tasks",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "created_at", "order": "DESCENDING" }
  ]
}
```

This index supports queries like:
```javascript
db.collection('tasks')
  .where('status', '==', 'in_progress')
  .orderBy('created_at', 'desc')
  .limit(20)
```

### Notifications Collection

```json
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "user_id", "order": "ASCENDING" },
    { "fieldPath": "is_read", "order": "ASCENDING" },
    { "fieldPath": "created_at", "order": "DESCENDING" }
  ]
}
```

---

## Troubleshooting

### Issue: "Firebase CLI not found"

**Solution:**
```bash
# Reinstall Firebase CLI
npm install -g firebase-tools

# Or use npx
npx firebase-tools --version
```

### Issue: "Permission denied"

**Solution:**
```bash
# Login again
firebase logout
firebase login

# Ensure you're using the correct account
firebase login:list
```

### Issue: "Project not found"

**Solution:**
```bash
# List available projects
firebase projects:list

# Use correct project ID
firebase use YOUR_CORRECT_PROJECT_ID
```

### Issue: "Index creation failed"

**Causes:**
- Invalid field names
- Conflicting indexes
- Quota exceeded

**Solution:**
1. Check `firestore.indexes.json` for typos
2. Delete conflicting indexes in Firebase Console
3. Check Firestore quota in Firebase Console

### Issue: "Index already exists"

**Solution:**
This is normal. Firebase will skip existing indexes.

---

## Index Management

### View All Indexes

```bash
firebase firestore:indexes
```

### Delete an Index

Via Firebase Console:
1. Go to Firestore → Indexes
2. Find the index
3. Click the three dots (⋮)
4. Click "Delete"

### Update an Index

1. Modify `firestore.indexes.json`
2. Run `firebase deploy --only firestore:indexes`
3. Old index will be replaced

---

## Performance Tips

### Index Optimization

✅ **Only create indexes you need** - Each index costs storage  
✅ **Use composite indexes** for multi-field queries  
✅ **Monitor index usage** in Firebase Console  
✅ **Remove unused indexes** to save quota  

### Query Optimization

```javascript
// ❌ Bad: Requires index for every possible combination
db.collection('tasks')
  .where('status', '==', 'active')
  .where('priority', '==', 'high')
  .where('assignees', 'array-contains', userId)
  .orderBy('created_at', 'desc')

// ✅ Better: Simplify query or create specific index
db.collection('tasks')
  .where('assignees', 'array-contains', userId)
  .where('status', '==', 'active')
  .orderBy('created_at', 'desc')
```

---

## Firestore Quota Limits

### Free Tier (Spark Plan)
- **Reads:** 50,000 per day
- **Writes:** 20,000 per day
- **Deletes:** 20,000 per day
- **Storage:** 1 GB

### Blaze Plan (Pay-as-you-go)
- **Reads:** $0.06 per 100,000 documents
- **Writes:** $0.18 per 100,000 documents
- **Deletes:** $0.02 per 100,000 documents
- **Storage:** $0.18 per GB/month

**Recommendation:** Upgrade to Blaze plan for production

---

## Monitoring Index Usage

### Via Firebase Console

1. Go to Firestore → Usage
2. Check "Index entries" metric
3. Monitor growth over time

### Set Up Alerts

1. Go to Firebase Console → Usage
2. Click "Set budget alert"
3. Configure threshold (e.g., $50/month)
4. Add email for notifications

---

## Next Steps

After indexes are deployed:

1. ✅ Redis configured
2. ✅ Firestore indexes deployed
3. ⏭️ Configure remaining Vercel env vars
4. ⏭️ Deploy to production
5. ⏭️ Verify deployment

---

## Additional Resources

- [Firestore Indexes Documentation](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Index Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Query Optimization](https://firebase.google.com/docs/firestore/query-data/queries)

---

**Last Updated:** 2026-04-19  
**Next:** [Configure Vercel Environment Variables](VERCEL-ENV-VARS-GUIDE.md)
