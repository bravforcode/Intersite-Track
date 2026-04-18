# Security Audit Fix Guide - Implementation Cookbook

**Date:** April 13, 2026  
**Purpose:** Code templates and step-by-step implementation for identified issues  
**Target:** Developers fixing security issues (provide this as reference)

---

## FIX #1: Add CSRF Protection (CRITICAL)

### Step 1: Install Dependencies
```bash
npm install csurf cookie-parser uuid
npm install -D @types/csurf
```

### Step 2: Create CSRF Middleware (backend/src/middleware/csrf.middleware.ts)
```typescript
import csrf from "csurf";

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  },
  value: (req) => {
    // Accept token from multiple sources
    return req.body._csrf || req.query._csrf || req.get("x-csrf-token");
  },
});

export { csrfProtection };
```

### Step 3: Register in server.ts
```typescript
import cookieParser from "cookie-parser";
import { csrfProtection } from "./src/middleware/csrf.middleware.js";

// Add after body parsing middleware
app.use(cookieParser());

// Add CSRF token to all state-changing routes
// For GET: serve token
app.get("/api/csrf-token", (req, res) => {
  res.json({ 
    csrfToken: req.csrfToken(),
    expiresIn: 3600000 // 1 hour
  });
});
```

### Step 4: Protect Routes in auth.routes.ts
```typescript
// BEFORE
router.post("/auth/signup", signupRateLimiter, validate(SignUpSchema), signup);
router.put("/auth/me", requireAuth, validate(ProfileUpdateSchema), updateMyProfile);

// AFTER
router.post("/auth/signup", signupRateLimiter, csrfProtection, validate(SignUpSchema), signup);
router.put("/auth/me", csrfProtection, requireAuth, validate(ProfileUpdateSchema), updateMyProfile);
```

### Step 5: Protect All State-Changing Routes (task.routes.ts, etc.)
```typescript
import { csrfProtection } from "../middleware/csrf.middleware.js";

// Create
router.post("/", csrfProtection, requireAuth, createTaskHandler);

// Update
router.put("/:id", csrfProtection, requireAuth, updateTaskHandler);

// Delete
router.delete("/:id", csrfProtection, requireAuth, deleteTaskHandler);
```

### Step 6: Frontend Implementation (frontend/src/lib/api.ts)
```typescript
// Get CSRF token on app init
let csrfToken: string = "";

export async function initializeCSRFToken() {
  try {
    const res = await fetch("/api/csrf-token");
    const data = await res.json();
    csrfToken = data.csrfToken;
  } catch (err) {
    console.error("Failed to get CSRF token:", err);
  }
}

// Wrapper for authenticated requests
export async function apiRequest(
  url: string,
  options: RequestInit = {}
) {
  const headers = {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken,
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies
  });
}

// Usage in components
const response = await apiRequest("/api/tasks", {
  method: "POST",
  body: JSON.stringify({ title: "New Task" }),
});
```

### Step 7: Error Handling in Controllers
```typescript
// Add CSRF error handler (before other error handlers)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === "EBADCSRFTOKEN") {
    // CSRF token errors
    res.status(403).json({
      error: "Invalid CSRF token. Please refresh and try again.",
    });
    return;
  }
  next(err);
});
```

### Verify CSRF Protection
```bash
# Test: POST without CSRF token (should fail)
curl -X POST http://localhost:3694/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "test"}'
# Expected: 403 Forbidden

# Test: POST with CSRF token (should succeed)
CSRF_TOKEN=$(curl http://localhost:3694/api/csrf-token | jq -r .csrfToken)
curl -X POST http://localhost:3694/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "test"}'
# Expected: 200/201 Created
```

---

## FIX #2: Fix Email Coercion (CRITICAL)

### Location
- **File:** `backend/src/controllers/auth.controller.ts`
- **Functions:** `signup()`, `updateMyProfile()`

### BEFORE (Vulnerable)
```typescript
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // VULNERABLE: String() coercion
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "").trim();

    // Doesn't catch: email = {x:1}, password = null, etc.
  }
}
```

### AFTER (Fixed)
```typescript
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // STEP 1: Type validation
    if (typeof req.body?.email !== "string") {
      res.status(400).json({ error: "อีเมลต้องเป็นข้อความ" });
      return;
    }
    if (typeof req.body?.password !== "string") {
      res.status(400).json({ error: "รหัสผ่านต้องเป็นข้อความ" });
      return;
    }

    // STEP 2: Trim and normalize (NOW SAFE)
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password.trim();

    // STEP 3: Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      res.status(400).json({ error: "รูปแบบอีเมลไม่ถูกต้อง" });
      return;
    }

    // STEP 4: Validate password
    if (!password) {
      res.status(400).json({ error: "กรุณากรอกรหัสผ่าน" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
      return;
    }

    // Rest of function...
  }
}
```

### Apply to updateMyProfile
```typescript
export async function updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Type validation - BEFORE using String()
    const fieldsToValidate: { name: string; type: string }[] = [
      { name: "username", type: "string" },
      { name: "first_name", type: "string" },
      { name: "last_name", type: "string" },
    ];

    for (const { name, type } of fieldsToValidate) {
      if (req.body?.[name] !== undefined) {
        if (typeof req.body[name] !== type) {
          res.status(400).json({ 
            error: `${name} ต้องเป็น${type}` 
          });
          return;
        }
      }
    }

    // NOW safe to use
    const username = req.body?.username?.trim() || "";
    const first_name = req.body?.first_name?.trim() || "";
    const last_name = req.body?.last_name?.trim() || "";
    
    // Validate lengths
    if (username && username.length > 50) {
      res.status(400).json({ error: "ชื่อผู้ใช้ต้องไม่เกิน 50 ตัวอักษร" });
      return;
    }

    // ... rest
  }
}
```

### Test Email Coercion Fix
```typescript
// Test cases
const testCases = [
  { email: "valid@example.com", should: "pass" },
  { email: 123, should: "fail" },
  { email: { a: 1 }, should: "fail" },
  { email: null, should: "fail" },
  { email: ["a@b.com"], should: "fail" },
  { email: "notanemail", should: "fail" },
  { email: "noat@domain", should: "fail" }, // Missing TLD
];

// Run tests
for (const test of testCases) {
  const request = { body: { email: test.email, password: "SecurePass123" } };
  // Would expect: fail cases get 400, pass cases proceed
}
```

---

## FIX #3: Remove Sensitive Data from Logs (CRITICAL)

### Step 1: Create Sanitizer Utility (backend/src/utils/logSanitizer.ts)
```typescript
import crypto from "crypto";

export function hashUserId(userId: string | undefined): string {
  if (!userId) return "anonymous";
  return crypto
    .createHash("sha256")
    .update(userId)
    .digest("hex")
    .substring(0, 8);
}

export function sanitizeError(err: Error): object {
  return {
    message: err.message,
    code: (err as any).code || "UNKNOWN",
    // Only in development
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  };
}

export function safeLogEntry(req: Request, metadata?: any) {
  return {
    method: req.method,
    path: req.path,
    user_hash: hashUserId(req.user?.id),
    timestamp: new Date().toISOString(),
    ...metadata,
  };
}

// NEVER log these patterns
export const REDACT_PATTERNS = [
  /password["\']?\s*[:=]/gi,
  /token["\']?\s*[:=]/gi,
  /secret["\']?\s*[:=]/gi,
  /api[_-]?key["\']?\s*[:=]/gi,
  /authorization["\']?\s*[:=]/gi,
];

export function redactSensitiveData(text: string): string {
  let result = text;
  for (const pattern of REDACT_PATTERNS) {
    result = result.replace(pattern, "***REDACTED***");
  }
  return result;
}
```

### Step 2: Fix auth.middleware.ts
```typescript
// BEFORE
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[AUTH] verifyIdToken FAILED: ${message}\n`);
  // ↑ May log sensitive token info
}

// AFTER
import { hashUserId, sanitizeError } from "../utils/logSanitizer.js";

catch (err: unknown) {
  const sanitized = sanitizeError(err instanceof Error ? err : new Error(String(err)));
  process.stderr.write(
    `[AUTH] Token verification failed: ${JSON.stringify(sanitized)}\n`
  );
  // ↑ Safe for logs
}
```

### Step 3: Fix error.middleware.ts
```typescript
// BEFORE
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;

  try {
    logger.error(err.message, {
      method: req.method,
      path: req.path,
      statusCode,
      stack: err.stack,      // ← File paths exposed
      user: req.user?.id,    // ← User ID exposed
    });
  }
}

// AFTER
import { hashUserId, sanitizeError, safeLogEntry } from "../utils/logSanitizer.js";

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;

  try {
    logger.error(sanitizeError(err).message, {
      ...safeLogEntry(req),  // Uses hashUserId internally
      statusCode,
    });
  } catch {
    process.stderr.write(`[ERROR] ${err.message}\n`);
  }
}
```

### Step 4: Audit Existing Logs
```bash
# Find all logger/stderr calls
grep -r "process.stderr.write\|logger.error\|console.log" backend/src \
  --include="*.ts" | grep -E "user|email|password|token"

# Review each match and apply sanitization
```

### Verify Log Sanitization
```bash
# Run app and trigger error
curl -X POST http://localhost:3694/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test", "password": "123"}'

# Check logs - should NOT reveal:
# - User email or ID in plaintext
# - Full file paths
# - Stack traces (production)
# - Request payloads with sensitive data

# Good log format:
# [ERROR] "Invalid email format" method=POST path=/api/auth/signup statusCode=400 user_hash=a1b2c3d4
```

---

## FIX #4: Add Redis Rate Limiting (CRITICAL)

### Step 1: Install Dependencies
```bash
npm install redis rate-limit-redis
```

### Step 2: Create Redis Client (backend/src/config/redis.ts)
```typescript
import redis from "redis";

const client = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries: number) => {
      if (retries > 10) return new Error("Redis reconnect attempts reached");
      return Math.min(retries * 50, 500);
    },
  },
});

client.on("error", (err) => {
  console.error("[REDIS] Error:", err.message);
});

client.on("connect", () => {
  console.log("[REDIS] Connected");
});

(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error("[REDIS] Failed to connect:", err);
  }
})();

export { client as redisClient };
```

### Step 3: Update rateLimit.middleware.ts
```typescript
// BEFORE
import rateLimit from "express-rate-limit";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  // ↑ Uses in-memory store (not shared across instances)
});

// AFTER
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redisClient } from "../config/redis.js";

// Tier 1: Authentication (very strict)
export const loginRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rate-limit:login:",
    sendCommand: async (cmd: string, args: string[]) => {
      return (redisClient as any)[cmd](...args);
    },
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true, // Only count failures
  message: { error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่" },
});

export const signupRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rate-limit:signup:",
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: "สร้างบัญชีบ่อยเกินไป กรุณารอสักครู่" },
});

// Tier 2: Data access (moderate)
export const dataRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rate-limit:data:",
  }),
  windowMs: 60 * 1000,
  max: 30, // 30 requests per minute
  message: { error: "ขอข้อมูลมากเกินไป กรุณารอสักครู่" },
});

// Tier 3: Expensive operations (very strict)
export const expensiveRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rate-limit:expensive:",
  }),
  windowMs: 60 * 1000,
  max: 5, // 5 expensive ops per minute
  message: { error: "ดำเนินการมากเกินไป กรุณารอสักครู่" },
});

// General API limiter (fallback)
export const apiRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rate-limit:api:",
  }),
  windowMs: 60 * 1000,
  max: 120,
});
```

### Step 4: Apply Tiered Limits to Routes
```typescript
// auth.routes.ts
router.post("/auth/signup", signupRateLimiter, validate(SignUpSchema), signup);
router.post("/auth/profile", loginRateLimiter, requireAuth, getProfile);

// task.routes.ts
router.get("/", dataRateLimiter, requireAuth, getTasks);
router.post("/", expensiveRateLimiter, requireAuth, createTaskHandler);
router.post("/export", expensiveRateLimiter, requireAuth, exportTasks);

// report.routes.ts
router.get("/export", expensiveRateLimiter, requireAuth, exportReport);
```

### Step 5: Test Rate Limiting
```bash
# Test: Exceed login limit
for i in {1..6}; do
  curl -X POST http://localhost:3694/api/auth/profile \
    -H "Authorization: Bearer INVALID_TOKEN"
done
# Result: 6th request should fail with 429 Too Many Requests

# Test: Normal request works
curl -X GET http://localhost:3694/api/tasks \
  -H "Authorization: Bearer VALID_TOKEN"
# Result: 200 OK
```

---

## FIX #5: Fix Role Cache TTL (HIGH)

### Location
- **File:** `backend/src/middleware/auth.middleware.ts:1-30`

### BEFORE (30-second window)
```typescript
const AUTH_CACHE_TTL_MS = 30_000;  // ← 30 seconds!

const authCache = new Map<
  string,
  {
    expiresAt: number;
    user: Express.Request["user"];
  }
>();
```

### AFTER (Immediate revocation)
```typescript
// Option 1: Reduce TTL to 5 seconds for critical operations
const AUTH_CACHE_TTL_MS = process.env.NODE_ENV === "production" 
  ? 5_000    // 5 seconds in production
  : 30_000;  // 30 seconds in development

// Option 2: Add role whitelist validation
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    // VALIDATE role is legitimate
    const VALID_ROLES = ["admin", "staff"];
    if (!VALID_ROLES.includes(req.user.role)) {
      process.stderr.write(
        `[AUTH] Invalid role detected: ${req.user.role} for uid=${req.user.id}\n`
      );
      res.status(403).json({ error: "คุณไม่มีสิทธิ์" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
      return;
    }

    next();
  };
}

// Option 3: Add cache invalidation endpoint (for admins)
export function invalidateAllAuthCaches() {
  authCache.clear(); // Clears all cached auth tokens
}

// Call when user role changes
router.put("/api/users/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    // ... update user
    
    // Invalidate their sessions
    invalidateAllAuthCaches(); // Or invalidate specific user's tokens
    
    res.json({ success: true });
  } catch (err) { next(err); }
});
```

---

## FIX #6: Add LINE Webhook Replay Protection (HIGH)

### Location
- **File:** `backend/src/middleware/line.middleware.ts`

### Implementation
```typescript
import crypto from "node:crypto";
import { Request, Response, NextFunction } from "express";

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

// Keep track of recent payloads to detect replays
const WEBHOOK_NONCE_CACHE = new Map<string, number>();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Cleanup old nonces every minute
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, timestamp] of WEBHOOK_NONCE_CACHE.entries()) {
    if (timestamp < now - NONCE_TTL_MS) {
      WEBHOOK_NONCE_CACHE.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    process.stderr.write(`[LINE] Cleaned ${cleaned} old webhook nonces\n`);
  }
}, 60_000).unref();

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyLineSignature(req: Request, res: Response, next: NextFunction): void {
  if (!LINE_CHANNEL_SECRET) {
    res.status(500).json({ error: "Webhook not configured" });
    return;
  }

  const signature = req.get("x-line-signature") ?? "";
  if (!signature) {
    res.status(401).json({ error: "Missing X-Line-Signature" });
    return;
  }

  if (!req.rawBody) {
    res.status(400).json({ error: "Invalid request format" });
    return;
  }

  // STEP 1: Verify signature
  const expected = crypto
    .createHmac("sha256", LINE_CHANNEL_SECRET)
    .update(req.rawBody)
    .digest("base64");

  if (!safeEquals(signature, expected)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // STEP 2: Detect replay attacks
  const payloadHash = crypto
    .createHash("sha256")
    .update(req.rawBody)
    .digest("hex");

  if (WEBHOOK_NONCE_CACHE.has(payloadHash)) {
    // Duplicate payload detected - likely replay
    process.stderr.write(
      `[LINE] Replay attack detected: payload=${payloadHash} from=${req.ip}\n`
    );
    // Return OK to not make LINE retry, but don't process
    res.status(200).json({ status: "ok" });
    return;
  }

  // Record this payload
  WEBHOOK_NONCE_CACHE.set(payloadHash, Date.now());

  next();
}
```

### Test Webhook Replay Protection
```bash
# 1. Capture a valid webhook signature
VALID_WEBHOOK='{"events":[{"type":"message","source":{"type":"user","userId":"U123"},"message":{"type":"text","text":"link ABC123"},"replyToken":"REPLY123"}]}'

SIGNATURE=$(echo -n "$VALID_WEBHOOK" | openssl dgst -sha256 -hmac "$LINE_CHANNEL_SECRET" -binary | base64)

# 2. Send it once (should succeed - processed)
curl -X POST http://localhost:3694/api/line/webhook \
  -H "x-line-signature: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$VALID_WEBHOOK"
# Result: 200 OK, message processed

# 3. Send same payload again (should fail - replay detected)
curl -X POST http://localhost:3694/api/line/webhook \
  -H "x-line-signature: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$VALID_WEBHOOK"
# Result: 200 OK, but message NOT processed (replay detected)
```

---

## VERIFICATION CHECKLIST

After implementing all Critical fixes, verify:

- [ ] CSRF token blocks unsigned POST requests (403)
- [ ] Email validation rejects objects, null, arrays
- [ ] Logs don't contain user IDs in plaintext
- [ ] Rate limiting works across multiple instances (test with Redis)
- [ ] Role changes immediately revoke permissions
- [ ] LINE webhook doesn't process duplicate payloads
- [ ] All tests still pass: `npm test`
- [ ] TypeScript compiles without errors: `npm run build`

---

## Common Implementation Questions

**Q: Do I need to implement all 12 fixes at once?**  
A: No, prioritize as: CRITICAL (Phase 1) → HIGH (Phase 2) → MEDIUM (Phase 3)

**Q: How long will fixes take?**  
A: 1-2 weeks for all fixes if done in phases

**Q: Can I deploy with unfixed HIGH-priority issues?**  
A: Only if rate limiting is fixed and CSRF is implemented

**Q: Should users be notified?**  
A: Yes, security fixes should mention "security improvements" in release notes

---

