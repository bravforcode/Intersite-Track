# Security Audit - File Modification Matrix

**Date:** April 13, 2026  
**Purpose:** Quick reference for which files to modify and what changes are needed

---

## Files Requiring Changes

### PHASE 1: CRITICAL FIXES (Implement This Week)

#### 1. **backend/src/middleware/csrf.middleware.ts** (NEW FILE)
- **Status:** NEW - Create this file
- **Purpose:** CSRF token generation and verification
- **Code:** See SECURITY-FIX-COOKBOOK.md - FIX #1, Step 2

---

#### 2. **backend/src/config/redis.ts** (NEW FILE)
- **Status:** NEW - Create this file
- **Purpose:** Redis client initialization for rate limiting
- **Code:** See SECURITY-FIX-COOKBOOK.md - FIX #4, Step 2

---

#### 3. **backend/src/utils/logSanitizer.ts** (NEW FILE)
- **Status:** NEW - Create this file
- **Purpose:** Sanitize sensitive data in logs
- **Functions Required:**
  - `hashUserId()`
  - `sanitizeError()`
  - `safeLogEntry()`
  - `redactSensitiveData()`
- **Code:** See SECURITY-FIX-COOKBOOK.md - FIX #3, Step 1

---

#### 4. **backend/src/controllers/auth.controller.ts** (MODIFY)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **`signup()` function (Line 70-140)**
     - Add type validation before String() coercion
     - Add email format validation
     - Add password strength validation
  2. **`updateMyProfile()` function (Line 170-200)**
     - Add strict type validation for all fields
     - Add length validation for username
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #2
- **Breaking Changes:** None (stricter validation, error messages in Thai)

---

#### 5. **backend/src/middleware/auth.middleware.ts** (MODIFY)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **Import sanitizer** (Line 1)
     - Add: `import { hashUserId, sanitizeError } from "../utils/logSanitizer.js";`
  2. **Update error logging** (Line 55-70)
     - Replace raw error logs with sanitized versions
  3. **Add role validation** (Line 119-135 in `requireRole()`)
     - Add VALID_ROLES whitelist
     - Add role validation before proceeding
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #5
- **Breaking Changes:** None

---

#### 6. **backend/src/middleware/error.middleware.ts** (MODIFY)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **Import sanitizer** (Line 1)
     - Add: `import { hashUserId, sanitizeError, safeLogEntry } from "../utils/logSanitizer.js";`
  2. **Update errorHandler()** (Line 20-35)
     - Remove direct user ID logging
     - Use sanitizeError() for stack traces
     - Use safeLogEntry() for common fields
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #3, Step 2
- **Breaking Changes:** None (log format changes, adds user_hash field)

---

#### 7. **backend/src/middleware/rateLimit.middleware.ts** (MODIFY)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **Add Redis store** (Top of file)
     - Import RedisStore and redisClient
  2. **Replace all limiter definitions** (Line 1-50)
     - Convert from in-memory to Redis store
     - Add tiered limits (auth, data, expensive)
  3. **Update middleware exports**
     - Keep same names for backward compatibility
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #4, Step 3
- **Breaking Changes:** None (same API)

---

#### 8. **backend/server.ts** (MODIFY)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **Add cookie parser** (Around Line 15)
     - Import and register: `import cookieParser from "cookie-parser";`
     - Add: `app.use(cookieParser());`
  2. **Register CSRF middleware** (Around Line 60)
     - Import CSRF middleware
     - Add to all routes or specific post/put/delete routes
  3. **Add CORS error handler** (Near error.middleware.ts registration)
     - Handle "EBADCSRFTOKEN" errors
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #1, Steps 3 & 7
- **Breaking Changes:** None (error handling backward compatible)

---

#### 9. **backend/src/routes/auth.routes.ts** (MODIFY)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **Import CSRF middleware** (Line 1)
  2. **Add CSRF to POST/PUT endpoints** (Lines 15-30)
     - `router.post("/auth/signup", signupRateLimiter, csrfProtection, validate(...), signup);`
     - `router.put("/auth/me", csrfProtection, requireAuth, validate(...), updateMyProfile);`
     - `router.put("/users/:id/password", csrfProtection, requireAuth, validate(...), changePassword);`
  3. **Add CSRF token endpoint** (New)
     - `router.get("/auth/csrf-token", (req, res) => { ... });`
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #1, Step 4
- **Breaking Changes:** None (adds new endpoint, existing endpoints now require CSRF token)

---

#### 10. **backend/src/routes/index.ts** (MODIFY)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **Add CSRF token endpoint** (Near Line 40)
     - Export this endpoint before api routes
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #1, Step 6
- **Breaking Changes:** API consumers must now send CSRF tokens

---

---

### PHASE 2: HIGH-PRIORITY FIXES (Next Sprint)

#### 11. **backend/src/middleware/line.middleware.ts** (MODIFY)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **Add nonce cache** (Top of file)
     - `const WEBHOOK_NONCE_CACHE = new Map<string, number>();`
  2. **Update verifyLineSignature()** (Line 10-45)
     - Add replay detection logic
     - Check for duplicate payloads
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #6
- **Breaking Changes:** None (now rejects replays)

---

#### 12. **backend/src/controllers/task.controller.ts** (MODIFY)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **Update getTasks()** (Line 20-70)
     - Add strict type validation for query filters
     - Validate status/priority against ENUM values
     - Prevent prototype pollution
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #2 (similar pattern)
- **Breaking Changes:** None (stricter validation)

---

#### 13. **backend/src/routes/task.routes.ts** (MODIFY)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **Add CSRF protection** to all POST/PUT/DELETE endpoints
     - `router.post("/", csrfProtection, requireAuth, createTaskHandler);`
     - `router.put("/:id", csrfProtection, requireAuth, updateTaskHandler);`
     - `router.delete("/:id", csrfProtection, requireAuth, deleteTaskHandler);`
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #1, Step 5
- **Breaking Changes:** API consumers must send CSRF tokens

---

#### 14. **backend/src/controllers/department.controller.ts** (MODIFY)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **Update updateDepartment()** (Line 25-30)
     - Add type validation: `typeof req.body?.name === "string"`
     - Add length validation: `name.length <= 255`
     - Add trim: `name.trim()`
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #2 (similar pattern)
- **Breaking Changes:** None (stricter validation)

---

#### 15. **backend/src/controllers/report.controller.ts** (MODIFY)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **Update getStats()** (Line 35-45)
     - Add date format validation: `isValidDate(dateStr)`
     - Add date range validation
     - Add max query window limit (90 days)
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #2 (similar pattern)
- **Breaking Changes:** None (stricter validation, rejects invalid dates)

---

#### 16. **backend/server.ts** (MODIFY)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **Update CORS configuration** (Line 55-60)
     - Replace `cors(true)` in dev with origin whitelist
     - Add allowed origins check
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #4.2
- **Breaking Changes:** Requires ALLOWED_ORIGINS env var

---

#### 17. **backend/src/routes/*.routes.ts** (MULTIPLE - MODIFY)
- **Status:** ALL state-changing routes need CSRF protection
- **Files Affected:**
  - `user.routes.ts`
  - `project.routes.ts`
  - `department.routes.ts`
  - `taskType.routes.ts`
  - `holiday.routes.ts`
  - `saturdaySchedule.routes.ts`
  - `approval.routes.ts`
  - `timeEntry.routes.ts`
  - `template.routes.ts`
  - `trello.routes.ts`
  - `lineLink.routes.ts`
  - `notification.routes.ts`
  - `comment.routes.ts`
- **Changes Required:**
  - Add `csrfProtection` middleware to all POST/PUT/DELETE routes
- **Code Reference:** SECURITY-FIX-COOKBOOK.md - FIX #1, Step 5
- **Breaking Changes:** API consumers must send CSRF tokens

---

### PHASE 3: MEDIUM-PRIORITY FIXES (Next Release)

#### 18. **package.json** (MODIFY - All Phases)
- **Status:** EXISTING - Needs changes
- **Changes Required:**
  1. **Add dependencies:**
     - `npm install csurf cookie-parser redis rate-limit-redis`
     - `npm install -D @types/csurf`
- **When:** Before Phase 1 implementation

---

## ENV VARIABLES TO ADD

### .env
```env
# Rate Limiting
REDIS_URL=redis://localhost:6379

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3694

# Authentication
AUTH_CACHE_TTL_MS=5000  # Reduced for production
```

### .env.production
```env
REDIS_URL=redis://production-redis:6379
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
AUTH_CACHE_TTL_MS=5000
NODE_ENV=production
```

---

## DEPLOYMENT CHECKLIST

- [ ] All new files created
- [ ] All existing files modified
- [ ] dependencies installed: `npm install`
- [ ] TypeScript compiles: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] Redis server running (for rate limiting)
- [ ] Environment variables set
- [ ] Frontend updated to send CSRF tokens
- [ ] CORS origins configured
- [ ] Rate limiting tiers applied to all routes
- [ ] Security headers verified
- [ ] SSL/TLS certificate installed (production)

---

## TIMELINE ESTIMATE

| Phase | Duration | Files | Complexity |
|---|---|---|---|
| **Phase 1 (Critical)** | 3-5 days | 10 | High |
| **Phase 2 (High)** | 3-5 days | 7 | Medium |
| **Phase 3 (Medium)** | 2-3 days | 3 | Medium |
| **Testing** | 2-3 days | All | High |
| **TOTAL** | **2-3 weeks** | **20** | |

---

## ROLLBACK PLAN

If issues occur after deployment:

1. **CSRF issues**: Temporarily disable CSRF checks (not recommended)
   ```typescript
   // Disable CSRF temporarily
   app.use("/api", (req, res, next) => {
     (req as any).csrfToken = () => "temp-disabled";
     next();
   });
   ```

2. **Rate limiting issues**: Increase limits or bypass temporarily
   ```typescript
   // Temporarily increase limits
   export const apiRateLimiter = rateLimit({
     max: 1000, // temporary
   });
   ```

3. **Validation issues**: Check logs for validation failures
   ```bash
   tail -f logs/error.log | grep "Validation"
   ```

4. **Redis issues**: Fall back to in-memory store
   ```typescript
   // Switch to in-memory if Redis down
   const store = process.env.REDIS_URL 
     ? new RedisStore({ client: redisClient })
     : undefined; // Use default in-memory
   ```

---

## Questions?

Reference the full security audit: [SECURITY-AUDIT-2026-04-13.md](./SECURITY-AUDIT-2026-04-13.md)  
Reference fix cookbook: [SECURITY-FIX-COOKBOOK.md](./SECURITY-FIX-COOKBOOK.md)
