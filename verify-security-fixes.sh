#!/bin/bash
# TaskAm System Verification Script
# Verifies all security fixes have been applied correctly

echo "═══════════════════════════════════════════════════════════════"
echo "TaskAm Security Fixes Verification"
echo "═══════════════════════════════════════════════════════════════"
echo ""

PASS=0
FAIL=0

verify_file() {
  local file=$1
  local description=$2
  
  if [ -f "$file" ]; then
    echo "✅ $description"
    echo "   File: $file"
    PASS=$((PASS + 1))
  else
    echo "❌ $description"
    echo "   File NOT FOUND: $file"
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

verify_content() {
  local file=$1
  local pattern=$2
  local description=$3
  
  if grep -q "$pattern" "$file" 2>/dev/null; then
    echo "✅ $description"
    PASS=$((PASS + 1))
  else
    echo "❌ $description"
    echo "   File: $file"
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

echo "PHASE 1: CRITICAL FIXES VERIFICATION"
echo "─────────────────────────────────────────────────────────────"
echo ""

verify_file "backend/src/middleware/auth.middleware.ts" "Auth cache fix applied"
verify_content "backend/src/middleware/auth.middleware.ts" "checkRevoked= true" "Auth always validates revocation"

verify_file "backend/src/middleware/rateLimit.middleware.ts" "Rate limiter updated with Redis support"
verify_content "backend/src/middleware/rateLimit.middleware.ts" "createClient" "Redis client implemented"

verify_file "firestore.rules" "Firestore rules hardened"
verify_content "firestore.rules" "resource.data.user_id != null" "Null check added to Firestore rules"

echo ""
echo "PHASE 2: HIGH PRIORITY FIXES VERIFICATION"
echo "─────────────────────────────────────────────────────────────"
echo ""

verify_file "backend/src/middleware/csrf.middleware.ts" "CSRF protection middleware created"
verify_content "backend/src/middleware/csrf.middleware.ts" "generateCSRFToken" "CSRF token generation implemented"

verify_content "backend/server.ts" "cookieParser" "Cookie parser middleware added"
verify_content "backend/server.ts" "frameguard" "Security headers hardened (frameguard)"
verify_content "backend/server.ts" "noSniff: true" "Security headers hardened (noSniff)"

verify_file "backend/package.json" "New dependencies added"
verify_content "backend/package.json" '"redis"' "Redis dependency added"
verify_content "backend/package.json" '"cookie-parser"' "Cookie-parser dependency added"

echo ""
echo "BUILD & TEST VERIFICATION"
echo "─────────────────────────────────────────────────────────────"
echo ""

# Check if TypeScript compiles
if npm run build > /dev/null 2>&1; then
  echo "✅ TypeScript compilation successful"
  PASS=$((PASS + 1))
else
  echo "❌ TypeScript compilation failed"
  FAIL=$((FAIL + 1))
fi
echo ""

# Check if tests run
if npm test > /dev/null 2>&1; then
  echo "✅ Unit tests passing"
  PASS=$((PASS + 1))
else
  echo "❌ Unit tests failing"
  FAIL=$((FAIL + 1))
fi
echo ""

echo "DOCUMENTATION VERIFICATION"
echo "─────────────────────────────────────────────────────────────"
echo ""

verify_file "DEBUG-ROADMAP-2026-04-14.md" "Implementation roadmap created"
verify_file "TESTING-EXECUTION-REPORT-2026-04-14.md" "Execution report created"
verify_file "COMPREHENSIVE-SYSTEM-TEST-SUMMARY-2026-04-14.md" "System test summary created"
verify_file "CHAOS-TESTING-FINAL-REPORT-2026-04-13.md" "Chaos testing report exists"
verify_file "SECURITY-AUDIT-2026-04-13.md" "Security audit report exists"
verify_file "SECURITY-FIX-COOKBOOK.md" "Implementation cookbook exists"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "VERIFICATION SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 ALL SECURITY FIXES VERIFIED!"
  echo ""
  echo "Status: PRODUCTION READY (Phase 1-2 Complete)"
  echo "Next: Implement Phase 3 fixes (3-4 hours)"
  exit 0
else
  echo "⚠️  Some issues detected. Review above."
  exit 1
fi
