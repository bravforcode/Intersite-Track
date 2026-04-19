#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# Comprehensive Health Check Script
# ═══════════════════════════════════════════════════════════════════════════════
# 
# This script performs a comprehensive health check of the application
# and all its dependencies.
#
# USAGE:
#   ./scripts/health-check.sh [URL]
#
# EXAMPLES:
#   ./scripts/health-check.sh                          # Check localhost
#   ./scripts/health-check.sh https://your-domain.com  # Check production
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="${1:-http://localhost:3694}"
TIMEOUT=10
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Health Check: ${BASE_URL}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Helper functions
check_endpoint() {
    local name="$1"
    local endpoint="$2"
    local expected_status="${3:-200}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "Checking ${name}... "
    
    response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "${BASE_URL}${endpoint}" 2>/dev/null || echo "000")
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $status_code)"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $status_code, expected $expected_status)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        if [ -n "$body" ] && [ "$body" != "000" ]; then
            echo -e "${YELLOW}   Response: ${body:0:200}${NC}"
        fi
        return 1
    fi
}

check_json_field() {
    local name="$1"
    local endpoint="$2"
    local field="$3"
    local expected_value="$4"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "Checking ${name}... "
    
    response=$(curl -s --max-time $TIMEOUT "${BASE_URL}${endpoint}" 2>/dev/null || echo "{}")
    
    if command -v jq &> /dev/null; then
        actual_value=$(echo "$response" | jq -r "$field" 2>/dev/null || echo "null")
    else
        # Fallback without jq
        actual_value=$(echo "$response" | grep -o "\"$field\":\"[^\"]*\"" | cut -d'"' -f4 || echo "null")
    fi
    
    if [ "$actual_value" = "$expected_value" ]; then
        echo -e "${GREEN}✅ PASS${NC} ($field = $actual_value)"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} ($field = $actual_value, expected $expected_value)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Start health checks
echo -e "${BLUE}🔍 Running health checks...${NC}"
echo ""

# 1. Basic connectivity
check_endpoint "Root endpoint" "/" 200

# 2. Liveness check
check_endpoint "Liveness" "/api/live" 200

# 3. Health check
check_endpoint "Health endpoint" "/api/health" 200

# 4. Health check details
if check_json_field "Firestore status" "/api/health" ".dependencies.firestore.status" "ok"; then
    echo -e "${GREEN}   Firestore is healthy${NC}"
else
    echo -e "${YELLOW}   ⚠️  Firestore may be degraded${NC}"
fi

if check_json_field "Redis status" "/api/health" ".dependencies.redis.status" "ok"; then
    echo -e "${GREEN}   Redis is healthy${NC}"
else
    echo -e "${YELLOW}   ⚠️  Redis may be unavailable (will use in-memory fallback)${NC}"
fi

# 5. CSRF token endpoint
check_endpoint "CSRF token" "/api/csrf-token" 200

# 6. Static assets (if production)
if [[ "$BASE_URL" != *"localhost"* ]]; then
    check_endpoint "Frontend assets" "/" 200
fi

# 7. Security headers
echo ""
echo -e "${BLUE}🔒 Checking security headers...${NC}"
echo ""

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "Checking HSTS header... "
hsts_header=$(curl -s -I --max-time $TIMEOUT "${BASE_URL}/" 2>/dev/null | grep -i "strict-transport-security" || echo "")
if [ -n "$hsts_header" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  WARN${NC} (HSTS header not found)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "Checking CSP header... "
csp_header=$(curl -s -I --max-time $TIMEOUT "${BASE_URL}/" 2>/dev/null | grep -i "content-security-policy" || echo "")
if [ -n "$csp_header" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  WARN${NC} (CSP header not found)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "Checking X-Frame-Options... "
xfo_header=$(curl -s -I --max-time $TIMEOUT "${BASE_URL}/" 2>/dev/null | grep -i "x-frame-options" || echo "")
if [ -n "$xfo_header" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  WARN${NC} (X-Frame-Options header not found)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Total checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo ""

# Calculate success rate
if [ $TOTAL_CHECKS -gt 0 ]; then
    success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo "Success rate: ${success_rate}%"
    echo ""
    
    if [ $success_rate -eq 100 ]; then
        echo -e "${GREEN}✅ All checks passed!${NC}"
        exit 0
    elif [ $success_rate -ge 80 ]; then
        echo -e "${YELLOW}⚠️  Some checks failed, but system is operational${NC}"
        exit 0
    else
        echo -e "${RED}❌ Critical issues detected${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ No checks were performed${NC}"
    exit 1
fi
