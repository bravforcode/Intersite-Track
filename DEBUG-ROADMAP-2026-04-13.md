# TaskAm Comprehensive Debug & Fix Roadmap
**Date:** April 13, 2026  
**Status:** 🚀 ACTIVE DEBUGGING PHASE  
**Target:** 100% Production-Ready System (All Bugs Fixed)

---

## 📊 Current Status Overview

| Category | Status | Details |
|----------|--------|---------|
| **Issues Found** | 21 Total | 9 previously fixed + 12 new |
| **Critical Issues** | 3 🔴 | Auth cache, rate limiting, Firestore rules |
| **High Priority** | 7 🟠 | CSRF, headers, logging, webhooks |
| **Medium Priority** | 2 🟡 | Notification overflow, pagination DOS |
| **Overall Progress** | 43% | 9/21 fixed, 12 remaining |
| **Production Ready** | ⚠️ BLOCKED | Must fix 3 critical + 7 high issues |

---

## 🎯 Implementation Plan: 3-Phase Approach

### PHASE 1: CRITICAL SECURITY FIXES (Today - 2 Hours)
**Must complete before any testing/deployment**

#### Critical Fix #1: Auth Cache Poisoning Vulnerability (Issue #10)
- **File:** `backend/src/middleware/auth.middleware.ts`
- **Severity:** CRITICAL (CWE-384)
- **Time:** 1 hour
- **Fix:** Replace in-memory cache with request-scoped validation
- **Test:** Unit test for cache bypass prevention
- **Impact:** Prevents admin account hijacking for 30 seconds post-logout

#### Critical Fix #2: Rate Limit Bypass in Serverless (Issue #11)
- **File:** `backend/src/middleware/rateLimit.middleware.ts`
- **Severity:** CRITICAL (CWE-770)
- **Time:** 1 hour
- **Fix:** Implement Redis-backed distributed rate limiting
- **Test:** Load test with k6 showing rate limit enforcement
- **Impact:** Prevents brute-force attacks across instances

#### Critical Fix #3: Firestore Rules Audit (Issue #12)
- **File:** `firestore.rules`
- **Severity:** CRITICAL (CWE-639)
- **Time:** 30-45 min
- **Fix:** Harden read/write permissions to auth-only + role checks
- **Test:** Direct API access test from client
- **Impact:** Prevents unauthorized direct data access

---

### PHASE 2: HIGH PRIORITY SECURITY FIXES (Next 3-4 Hours)
**Implement after Phase 1, required before staging deployment**

#### High Fix #1: Missing CSRF Protection (Issue #14)
- **File:** `backend/server.ts`, new `backend/src/middleware/csrf.middleware.ts`
- **Severity:** HIGH (CWE-352)
- **Time:** 1-2 hours
- **Fix:** Add csurf middleware to all state-changing routes
- **Test:** E2E CSRF token validation test
- **Impact:** Prevents cross-site request forgery attacks

#### High Fix #2: Missing XSS Security Headers (Issue #16)
- **File:** `backend/server.ts` (Helmet configuration)
- **Severity:** HIGH (CWE-79)
- **Time:** 30 min
- **Fix:** Enable X-Frame-Options, X-Content-Type-Options, CSP
- **Test:** Header validation test
- **Impact:** Prevents XSS and clickjacking attacks

#### High Fix #3: Missing Audit Logging (Issue #18)
- **File:** All controllers + new `backend/src/utils/auditLogger.ts`
- **Severity:** HIGH (CWE-778)
- **Time:** 1-2 hours
- **Fix:** Log all sensitive operations (auth, admin changes, file uploads)
- **Test:** Audit log generation test for each operation
- **Impact:** Compliance + forensics capability

#### High Fix #4: LINE Webhook Injection (Issue #15)
- **File:** `backend/src/controllers/lineWebhook.controller.ts`
- **Severity:** HIGH (CWE-94)
- **Time:** 1 hour
- **Fix:** Add HMAC signature validation for LINE webhooks
- **Test:** Webhook signature validation test
- **Impact:** Prevents webhook spoofing/replay attacks

#### High Fix #5: SQL Injection in Logging (Issue #17)
- **File:** `backend/src/utils/auditLogger.ts`
- **Severity:** HIGH (CWE-89)
- **Time:** 45 min
- **Fix:** Properly parameterize all SQL in log queries
- **Test:** Injection attack test
- **Impact:** Prevents SQL injection through logs

---

### PHASE 3: MEDIUM PRIORITY FIXES (45 Min - 1.5 Hours)
**Complete before production deployment**

#### Medium Fix #1: Notification Text Overflow (Issue #19)
- **File:** `backend/src/controllers/task.controller.ts`
- **Severity:** MEDIUM (CWE-400)
- **Time:** 15 min
- **Fix:** Cap notification text to 500 chars max
- **Test:** Overflow test

#### Medium Fix #2: Pagination Limit DoS (Issue #20)
- **File:** `backend/src/controllers/task.controller.ts`
- **Severity:** MEDIUM (CWE-20)
- **Time:** 15 min
- **Fix:** Enforce max limit=100, reject invalid limit values
- **Test:** DOS prevention test

#### Medium Fix #3: Missing Password Reset (Issue #13)
- **File:** `backend/src/controllers/auth.controller.ts`
- **Severity:** HIGH (CWE-640) - Actually high priority
- **Time:** 2-3 hours
- **Fix:** Implement secure password reset flow with email tokens
- **Test:** Password reset workflow test

#### Medium Fix #4: Missing XSS Headers (Issue #16) - DUPLICATE
- Already covered in Phase 2

---

## 📋 Detailed Implementation Checklist

### ✅ PHASE 1: CRITICAL FIXES (2 Hours Total)

- [ ] **FIX #10: Auth Cache Poisoning**
  - [ ] Read: `backend/src/middleware/auth.middleware.ts` (current implementation)
  - [ ] Replace cache logic with request-scoped verification
  - [ ] Write unit test: `backend/src/middleware/__tests__/auth.middleware.spec.ts`
  - [ ] Verify: `npm test -- auth.middleware.spec.ts`
  
- [ ] **FIX #11: Rate Limiting via Redis**
  - [ ] Read: `backend/src/middleware/rateLimit.middleware.ts`
  - [ ] Install redis + @types/redis
  - [ ] Swap in-memory cache → Redis with TTL
  - [ ] Write test: Rate limit bypass prevention
  - [ ] Verify: `npm test -- rateLimit.middleware.spec.ts`
  
- [ ] **FIX #12: Firestore Rules Hardening**
  - [ ] Read: `firestore.rules` (current rules)
  - [ ] Apply security audit recommendations
  - [ ] Test: `firebase emulator:start` + direct client API tests
  - [ ] Deploy rules: `firebase deploy --only firestore:rules`

- [ ] **ALL TESTS PASS:** `npm test && npm run build`

---

### ✅ PHASE 2: HIGH PRIORITY FIXES (4-5 Hours)

- [ ] **FIX #14: CSRF Protection**
  - [ ] Install csurf + cookie-parser
  - [ ] Create `backend/src/middleware/csrf.middleware.ts`
  - [ ] Add to server.ts and all POST/PUT/DELETE routes
  - [ ] Frontend: Update API client to send CSRF token
  - [ ] Write E2E test: CSRF token requirement
  - [ ] Verify: `npm test`

- [ ] **FIX #16: XSS Headers**
  - [ ] Update Helmet config in server.ts
  - [ ] Enable CSP, X-Frame-Options, X-Content-Type-Options
  - [ ] Write header validation test
  - [ ] Verify: Headers present in responses

- [ ] **FIX #18: Audit Logging**
  - [ ] Create `backend/src/utils/auditLogger.ts`
  - [ ] Add logging to: auth operations, admin actions, file uploads
  - [ ] Update all controllers
  - [ ] Write test: Audit log generation
  - [ ] Verify: Logs stored correctly

- [ ] **FIX #15: LINE Webhook Security**
  - [ ] Update `backend/src/controllers/lineWebhook.controller.ts`
  - [ ] Add HMAC signature validation using LINE secret
  - [ ] Write test: Webhook validation
  - [ ] Verify: Invalid signatures rejected

- [ ] **FIX #17: SQL Injection Prevention**
  - [ ] Review `backend/src/utils/auditLogger.ts`
  - [ ] Ensure all DB queries use parameterized statements
  - [ ] Write injection test
  - [ ] Verify: `npm test`

- [ ] **ALL TESTS PASS:** `npm test && npm run build`

---

### ✅ PHASE 3: MEDIUM PRIORITY FIXES (1-2 Hours)

- [ ] **FIX #19: Notification Text Limit**
  - [ ] Update task.controller.ts
  - [ ] Add text.substring(0, 500)
  - [ ] Write test: Overflow handling
  
- [ ] **FIX #20: Pagination Limit**
  - [ ] Add validation: if (limit > 100) limit = 100
  - [ ] Add validation: if (limit < 1) limit = 10
  - [ ] Write test: DOS prevention
  
- [ ] **FIX #13: Password Reset (OPTIONAL - can defer)**
  - [ ] Implement reset token generation
  - [ ] Implement email sending
  - [ ] Write flow test
  
- [ ] **FINAL VERIFICATION:** `npm test && npm run build`

---

## 🧪 Testing Strategy

### Unit Tests (Per Fix)
- Each fix requires minimum 1 passing unit test
- Target: 80%+ code coverage
- Run: `npm test`

### Integration Tests
- API contract tests for modified endpoints
- Database operation tests
- External service mocking (LINE, Firebase)
- Run: `npm run test:integration` (if available)

### E2E Tests (Critical Flows)
- Authentication + CSRF flow
- File upload with CSRF
- Task CRUD with rate limiting
- Admin operations with audit logging
- Run: `npx playwright test`

### Chaos/Load Testing
- Rate limiting under load (k6)
- Concurrent requests
- Large payload injection
- Run: `k6 run k6-tests/chaos-test.js`

### Security Validation
- No sensitive data in logs
- All inputs validated
- All outputs encoded
- Security headers present
- Run: Custom security validation script

---

## 📅 Timeline & Milestones

### Day 1 (Today - April 14)
- ✅ Complete PHASE 1: Critical fixes (2 hours)
- ✅ All unit tests passing
- ✅ Commit with message: "CRITICAL: Fix auth cache + rate limiting + Firestore rules"

### Day 2 (April 15)
- ✅ Complete PHASE 2: High priority fixes (4-5 hours)
- ✅ All tests passing: unit + integration + E2E
- ✅ Commit: "SECURITY: Add CSRF + audit logging + webhook validation"
- ✅ Stage deployment prep

### Day 3 (April 16)
- ✅ Complete PHASE 3: Medium fixes (1-2 hours)
- ✅ Full test suite + chaos testing
- ✅ Final security review
- ✅ Ready for production deployment

### Day 4 (April 17)
- ✅ Peer code review (all changes)
- ✅ Staging deployment test
- ✅ Final validation + sign-off
- ✅ Production deployment

---

## 🔗 Related Documentation

- **Chaos Testing Report:** CHAOS-TESTING-FINAL-REPORT-2026-04-13.md
- **Security Audit:** SECURITY-AUDIT-2026-04-13.md
- **Fix Cookbook:** SECURITY-FIX-COOKBOOK.md
- **File Matrix:** SECURITY-FILE-MATRIX.md
- **Quick Reference:** CHAOS-TESTING-QUICK-REFERENCE-2026-04-13.md

---

## ✨ Success Criteria

- [ ] All 21 issues identified in report
- [ ] 12 new issues fixed (CRITICAL + HIGH + MEDIUM)
- [ ] 9 previously fixed issues verified working
- [ ] 100% of unit tests passing
- [ ] E2E tests covering critical flows
- [ ] Chaos tests showing stable performance
- [ ] No security vulnerabilities remaining
- [ ] Ready for production deployment: **April 17-18, 2026**

---

**Status:** 🚀 **READY FOR IMPLEMENTATION**
**Next Step:** Execute PHASE 1 immediately
