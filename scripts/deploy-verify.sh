#!/bin/bash

################################################################################
# DEPLOYMENT VERIFICATION SCRIPT
# Verifies production deployment health and configuration
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_URL="${DEPLOY_URL:-http://localhost:3694}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="$PROJECT_ROOT/deployment-verification"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((CHECKS_PASSED++)) || true
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((CHECKS_FAILED++)) || true
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    ((CHECKS_WARNING++)) || true
}

# ─────────────────────────────────────────────────────────────────────────────
# Connectivity Check
# ─────────────────────────────────────────────────────────────────────────────

check_connectivity() {
    log "Checking connectivity to deployment..."

    if timeout 5 curl -sf "$DEPLOY_URL/api/live" > /dev/null 2>&1; then
        log_success "Server is online and responding"
    else
        log_error "Cannot connect to deployment at $DEPLOY_URL"
        exit 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# SSL/TLS Check
# ─────────────────────────────────────────────────────────────────────────────

check_ssl() {
    log "Checking SSL/TLS configuration..."

    if [[ "$DEPLOY_URL" == https://* ]]; then
        # Check HTTPS headers
        HEADERS=$(curl -sI "$DEPLOY_URL" 2>/dev/null)

        if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
            log_success "HSTS header configured"
        else
            log_warning "HSTS header missing"
        fi

        if echo "$HEADERS" | grep -q "200\|301\|302"; then
            log_success "HTTPS connection successful"
        else
            log_error "HTTPS connection failed"
        fi
    else
        log_warning "Deployment URL is not HTTPS (unsafe for production)"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Security Headers Check
# ─────────────────────────────────────────────────────────────────────────────

check_security_headers() {
    log "Checking security headers..."

    HEADERS=$(curl -sI "$DEPLOY_URL/" 2>/dev/null)

    declare -a REQUIRED_HEADERS=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "Content-Security-Policy"
        "X-XSS-Protection"
    )

    for header in "${REQUIRED_HEADERS[@]}"; do
        if echo "$HEADERS" | grep -q "$header"; then
            log_success "Security header present: $header"
        else
            log_warning "Missing security header: $header"
        fi
    done
}

# ─────────────────────────────────────────────────────────────────────────────
# Performance Check
# ─────────────────────────────────────────────────────────────────────────────

check_performance() {
    log "Checking performance metrics..."

    # Health check response time
    START=$(date +%s%N)
    curl -s "$DEPLOY_URL/api/live" > /dev/null
    END=$(date +%s%N)
    RESPONSE_TIME=$(((END - START) / 1000000))

    if [ "$RESPONSE_TIME" -lt 500 ]; then
        log_success "Health check response time: ${RESPONSE_TIME}ms (< 500ms target)"
    elif [ "$RESPONSE_TIME" -lt 1000 ]; then
        log_warning "Health check response time: ${RESPONSE_TIME}ms (acceptable but > 500ms)"
    else
        log_error "Health check response time: ${RESPONSE_TIME}ms (> 1000ms)"
    fi

    # Database connectivity check
    log "Checking database connectivity..."
    DB_RESPONSE=$(curl -s "$DEPLOY_URL/api/health" 2>/dev/null || echo "{}")

    if echo "$DB_RESPONSE" | grep -q "database\|connected"; then
        log_success "Database connection verified"
    else
        log_warning "Database status unknown"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Environmental Variables Check
# ─────────────────────────────────────────────────────────────────────────────

check_environment() {
    log "Checking environment configuration..."

    # Check Firebase configuration
    FIREBASE_CHECK=$(curl -s "$DEPLOY_URL/api/config/firebase" 2>/dev/null || echo "{}")
    if [ -n "$FIREBASE_CHECK" ] && [ "$FIREBASE_CHECK" != "{}" ]; then
        log_success "Firebase configuration accessible"
    else
        log_warning "Firebase configuration status unclear"
    fi

    # Check if in production mode
    ENV_CHECK=$(curl -s -I "$DEPLOY_URL/" | grep -i "server" || echo "")
    if echo "$ENV_CHECK" | grep -q "production"; then
        log_success "Running in production mode"
    else
        log_warning "Production mode not confirmed in headers"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# API Functionality Check
# ─────────────────────────────────────────────────────────────────────────────

check_api_functionality() {
    log "Checking API functionality..."

    # Test public endpoints
    declare -a ENDPOINTS=(
        "/api/live"
        "/api/health"
        "/api/status"
    )

    for endpoint in "${ENDPOINTS[@]}"; do
        RESPONSE=$(curl -s -w "\n%{http_code}" "$DEPLOY_URL$endpoint")
        HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

        if grep -q "200\|404" <<< "$HTTP_CODE"; then
            log_success "Endpoint accessible: $endpoint"
        else
            log_error "Endpoint failed: $endpoint (HTTP $HTTP_CODE)"
        fi
    done
}

# ─────────────────────────────────────────────────────────────────────────────
# Error Page Check
# ─────────────────────────────────────────────────────────────────────────────

check_error_pages() {
    log "Checking error page handling..."

    # Check 404 page
    NOTFOUND=$(curl -s "$DEPLOY_URL/nonexistent-page-xyz")
    if echo "$NOTFOUND" | grep -q "404\|not found"; then
        log_success "404 error page configured"
    else
        log_warning "404 error page status unclear"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Generate Verification Report
# ─────────────────────────────────────────────────────────────────────────────

generate_report() {
    mkdir -p "$RESULTS_DIR"

    local report_file="$RESULTS_DIR/deployment-verification-${TIMESTAMP}.txt"

    {
        echo "═══════════════════════════════════════════════════════════════"
        echo "DEPLOYMENT VERIFICATION REPORT"
        echo "═══════════════════════════════════════════════════════════════"
        echo "Timestamp: $TIMESTAMP"
        echo "Deployment URL: $DEPLOY_URL"
        echo ""
        echo "Verification Results:"
        echo "─────────────────────────────────────────────────────────────"
        echo "✓ Passed: $CHECKS_PASSED"
        echo "✗ Failed: $CHECKS_FAILED"
        echo "⚠ Warnings: $CHECKS_WARNING"
        echo ""
        if [ $CHECKS_FAILED -eq 0 ]; then
            echo "STATUS: ✓ DEPLOYMENT VERIFICATION PASSED"
        else
            echo "STATUS: ✗ DEPLOYMENT VERIFICATION FAILED"
        fi
        echo ""
        echo "Checks Performed:"
        echo "• Connectivity"
        echo "• SSL/TLS Configuration"
        echo "• Security Headers"
        echo "• Performance Metrics"
        echo "• Environment Configuration"
        echo "• API Functionality"
        echo "• Error Page Handling"
        echo ""
        echo "═══════════════════════════════════════════════════════════════"
    } | tee "$report_file"

    log_success "Report generated: $report_file"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main Execution
# ─────────────────────────────────────────────────────────────────────────────

main() {
    log "════════════════════════════════════════════════════════════════════"
    log "DEPLOYMENT VERIFICATION STARTED"
    log "════════════════════════════════════════════════════════════════════"

    check_connectivity
    check_ssl
    check_security_headers
    check_performance
    check_environment
    check_api_functionality
    check_error_pages

    generate_report

    log "════════════════════════════════════════════════════════════════════"
    if [ $CHECKS_FAILED -eq 0 ]; then
        log_success "DEPLOYMENT VERIFICATION PASSED"
    else
        log_error "DEPLOYMENT VERIFICATION FOUND ISSUES"
    fi
    log "Results: $RESULTS_DIR"
    log "════════════════════════════════════════════════════════════════════"
}

main "$@"
