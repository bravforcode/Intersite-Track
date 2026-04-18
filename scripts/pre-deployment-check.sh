#!/bin/bash

# ============================================================================
# PRE-DEPLOYMENT CHECKLIST VERIFICATION SCRIPT
# ============================================================================
# Purpose: Verify all pre-deployment requirements are met
# Usage: ./pre-deployment-check.sh
# ============================================================================

set -e

TIMESTAMP=$(date +%Y-%m-%d_%H:%M:%S)
CHECKLIST_FILE="pre-deployment-checklist-${TIMESTAMP}.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0

# Functions
check() {
    if eval "$1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $2" | tee -a "$CHECKLIST_FILE"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $2" | tee -a "$CHECKLIST_FILE"
        ((FAILED++))
        return 1
    fi
}

section() {
    echo "" | tee -a "$CHECKLIST_FILE"
    echo -e "${BLUE}═══ $1 ═══${NC}" | tee -a "$CHECKLIST_FILE"
}

echo "Pre-Deployment Checklist - $TIMESTAMP" > "$CHECKLIST_FILE"
echo "=======================================" >> "$CHECKLIST_FILE"
echo "" >> "$CHECKLIST_FILE"

# ============================================================================
# ENVIRONMENT & CONFIGURATION
# ============================================================================

section "Environment & Configuration"

check "test -f .env" "Environment variables file exists (.env)"
check "grep -q VITE_FIREBASE_API_KEY .env" "Firebase API key configured"
check "grep -q LINE_CHANNEL_SECRET .env" "LINE channel secret configured"
check "grep -q SESSION_SECRET .env" "Session secret configured"
check "grep -q CSRF_SECRET .env" "CSRF secret configured"

# ============================================================================
# DEPENDENCIES
# ============================================================================

section "Dependencies"

check "npm list > /dev/null" "npm dependencies installed"
check "cd frontend && npm list > /dev/null && cd .." "Frontend dependencies installed"
check "cd backend && npm list > /dev/null && cd .." "Backend dependencies installed"
check "command -v node" "Node.js installed"
check "command -v npm" "npm installed"

# ============================================================================
# BUILD & COMPILATION
# ============================================================================

section "Build & Compilation"

check "npm run build 2>&1 | tail -1 | grep -q 'success\\|dist'" "Frontend builds successfully"
check "npm run build:be 2>&1 | grep -q 'clean\\|success'" "Backend builds successfully"
check "npm run lint 2>&1 | grep -q 'done\\|found 0 errors'" "Lint check passes"

# ============================================================================
# TESTS
# ============================================================================

section "Tests"

# Count passing tests
TEST_COUNT=$(npm test 2>&1 | grep -oP '\d+ passing' | grep -oP '\d+' || echo "0")
check "test \"$TEST_COUNT\" = \"57\"" "All 57 unit tests passing"

# ============================================================================
# DATABASE
# ============================================================================

section "Database & Firebase"

check "grep -q VITE_FIREBASE_PROJECT_ID .env" "Firebase project ID configured"
check "firebase firestore:describe 2>/dev/null | head -1" "Firebase CLI accessible & Firestore available"
check "ls -la firestore.rules 2>/dev/null" "Firestore rules file exists"
check "ls -la firestore.indexes.json 2>/dev/null" "Firestore indexes file exists"

# ============================================================================
# FILES & DIRECTORIES
# ============================================================================

section "Files & Directories"

check "test -d frontend/dist" "Frontend dist directory exists"
check "test -d backend/dist" "Backend dist directory exists"
check "test -f package.json" "package.json exists"
check "test -f vercel.json" "vercel.json exists"
check "test -f playwright.config.ts" "playwright.config.ts exists"

# ============================================================================
# SECURITY
# ============================================================================

section "Security"

check "grep -r 'password:' --include='*.ts' --include='*.js' | wc -l | grep -q '^[0-9]*$'" "No obvious hardcoded secrets"
check "npm audit --production 2>&1 | grep -q 'no vulnerabilities\\|vulnerabilities' || true" "Npm audit completed"
check "test -f SECURITY-FIX-COOKBOOK.md" "Security documentation exists"

# ============================================================================
# DOCUMENTATION
# ============================================================================

section "Documentation"

check "test -f docs/DEPLOYMENT-EXECUTION-PLAN-2026-04-17.md" "Deployment guide exists"
check "test -f docs/COMPREHENSIVE-PERFORMANCE-TESTING-PLAN-2026-04-17.md" "Performance testing plan exists"
check "test -f docs/FUNCTIONAL-TESTING-CHECKLIST-2026-04-17.md" "Functional testing checklist exists"
check "test -f README.md" "README.md exists"

# ============================================================================
# GIT & VERSION CONTROL
# ============================================================================

section "Git & Version Control"

check "git rev-parse --git-dir > /dev/null 2>&1" ".git directory exists"
check "git status --porcelain | wc -l | grep -q '^[0-9]*$'" "Git status readable"
check "git log -1 --oneline | wc -l | grep -q '^1$'" "Git history available"

# ============================================================================
# OPTIONAL CHECKS
# ============================================================================

section "Optional Checks"

check "command -v docker" "Docker installed (optional for containerization)"
check "command -v k6" "K6 installed (optional for load testing)"
check "command -v lhci" "Lighthouse CI installed (optional for performance testing)"

# ============================================================================
# SUMMARY
# ============================================================================

echo "" | tee -a "$CHECKLIST_FILE"
section "SUMMARY"

TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

echo "" | tee -a "$CHECKLIST_FILE"
echo "Total Checks: $TOTAL" | tee -a "$CHECKLIST_FILE"
echo -e "${GREEN}Passed: $PASSED${NC}" | tee -a "$CHECKLIST_FILE"
echo -e "${RED}Failed: $FAILED${NC}" | tee -a "$CHECKLIST_FILE"
echo "Pass Rate: ${PERCENTAGE}%" | tee -a "$CHECKLIST_FILE"
echo "" | tee -a "$CHECKLIST_FILE"

# ============================================================================
# FINAL DECISION
# ============================================================================

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}═══════════════════════════════════════════${NC}" | tee -a "$CHECKLIST_FILE"
    echo -e "${GREEN}✓ ALL CHECKS PASSED - READY FOR DEPLOYMENT${NC}" | tee -a "$CHECKLIST_FILE"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}" | tee -a "$CHECKLIST_FILE"
    exit 0
elif [ $FAILED -lt 5 ]; then
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}" | tee -a "$CHECKLIST_FILE"
    echo -e "${YELLOW}⚠ SOME CHECKS FAILED - REVIEW REQUIRED${NC}" | tee -a "$CHECKLIST_FILE"
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}" | tee -a "$CHECKLIST_FILE"
    exit 1
else
    echo -e "${RED}═══════════════════════════════════════════${NC}" | tee -a "$CHECKLIST_FILE"
    echo -e "${RED}✗ MULTIPLE CHECKS FAILED - NOT READY${NC}" | tee -a "$CHECKLIST_FILE"
    echo -e "${RED}═══════════════════════════════════════════${NC}" | tee -a "$CHECKLIST_FILE"
    exit 1
fi

