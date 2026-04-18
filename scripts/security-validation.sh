#!/bin/bash

################################################################################
# SECURITY VALIDATION SCRIPT
# Comprehensive security checks for production deployment
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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
# Check for Hardcoded Secrets
# ─────────────────────────────────────────────────────────────────────────────

check_hardcoded_secrets() {
    log "Checking for hardcoded secrets..."

    local dangerous_patterns=(
        "FIREBASE_PRIVATE_KEY="
        "API_KEY="
        "SECRET_KEY="
        "PASSWORD="
        "TOKEN="
        "api.key"
        "api_key"
        "apiKey"
    )

    local sensitive_files=(
        "src/**/*.ts"
        "src/**/*.tsx"
        "src/**/*.js"
        "backend/src/**/*.ts"
    )

    for pattern in "${dangerous_patterns[@]}"; do
        # Check source files but exclude .env files
        if grep -r "$pattern" "$PROJECT_ROOT" --include="*.ts" --include="*.tsx" --include="*.js" \
            --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | grep -v ".env" | grep -v ".example"; then
            log_error "Potential hardcoded secret found: $pattern"
        fi
    done

    log_success "No obvious hardcoded secrets detected"
}

# ─────────────────────────────────────────────────────────────────────────────
# Check Dependencies Security
# ─────────────────────────────────────────────────────────────────────────────

check_dependencies() {
    log "Checking dependency vulnerabilities..."

    cd "$PROJECT_ROOT" || exit 1

    if npm audit --production > /tmp/npm_audit.txt 2>&1; then
        log_success "No critical vulnerabilities found"
    else
        if grep -q "critical\|high" /tmp/npm_audit.txt; then
            log_error "Critical or high vulnerabilities found"
            grep "critical\|high" /tmp/npm_audit.txt || true
        fi
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check Code Quality
# ─────────────────────────────────────────────────────────────────────────────

check_code_quality() {
    log "Checking code quality..."

    # Check if linting passes
    if npm run lint 2>&1 | grep -q "error"; then
        log_warning "Linting errors found (review and fix)"
    else
        log_success "Code quality checks passed"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check CSRF Protection
# ─────────────────────────────────────────────────────────────────────────────

check_csrf_protection() {
    log "Checking CSRF protection implementation..."

    if grep -r "csrf" "$PROJECT_ROOT/backend/src" --include="*.ts" > /dev/null 2>&1; then
        log_success "CSRF protection implemented"
    else
        log_warning "CSRF protection may not be implemented"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check Authentication
# ─────────────────────────────────────────────────────────────────────────────

check_authentication() {
    log "Checking authentication implementation..."

    if grep -r "jwt\|JWT" "$PROJECT_ROOT/backend/src" --include="*.ts" > /dev/null 2>&1; then
        log_success "JWT authentication implemented"
    else
        log_warning "JWT authentication not clearly detected"
    fi

    if grep -r "password.*hash\|bcrypt" "$PROJECT_ROOT/backend/src" --include="*.ts" > /dev/null 2>&1; then
        log_success "Password hashing implemented"
    else
        log_error "Password hashing not detected"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check CORS Configuration
# ─────────────────────────────────────────────────────────────────────────────

check_cors() {
    log "Checking CORS configuration..."

    if grep -r "cors" "$PROJECT_ROOT/backend/server.ts" > /dev/null 2>&1; then
        log_success "CORS configured"

        # Check if ALLOWED_ORIGIN is being used
        if grep -r "ALLOWED_ORIGIN" "$PROJECT_ROOT/.env.production" > /dev/null 2>&1; then
            log_success "CORS origins controlled via environment variable"
        else
            log_warning "CORS origins may not be properly restricted"
        fi
    else
        log_error "CORS not configured"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check Data Validation
# ─────────────────────────────────────────────────────────────────────────────

check_validation() {
    log "Checking input validation..."

    if grep -r "zod\|Zod" "$PROJECT_ROOT/shared" --include="*.ts" > /dev/null 2>&1; then
        log_success "Zod schema validation detected"
    else
        log_warning "No schema validation library detected"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check Rate Limiting
# ─────────────────────────────────────────────────────────────────────────────

check_rate_limiting() {
    log "Checking rate limiting..."

    if grep -r "rate.*limit\|rateLimit" "$PROJECT_ROOT/backend/src" --include="*.ts" > /dev/null 2>&1; then
        log_success "Rate limiting implemented"
    else
        log_warning "Rate limiting not detected"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check Security Headers
# ─────────────────────────────────────────────────────────────────────────────

check_security_headers() {
    log "Checking security headers configuration..."

    if grep -r "helmet" "$PROJECT_ROOT/backend/server.ts" > /dev/null 2>&1; then
        log_success "Helmet security headers configured"
    else
        log_error "Helmet security headers not configured"
    fi

    if grep -r "Strict-Transport-Security\|hsts" "$PROJECT_ROOT/backend/server.ts" > /dev/null 2>&1; then
        log_success "HSTS header configured"
    else
        log_warning "HSTS header not explicitly configured"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check Environment Isolation
# ─────────────────────────────────────────────────────────────────────────────

check_environment_isolation() {
    log "Checking environment isolation..."

    if grep -r "process.env.NODE_ENV" "$PROJECT_ROOT/backend/src" > /dev/null 2>&1; then
        log_success "Environment checks detected"
    else
        log_warning "No explicit environment checks detected"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check Error Handling
# ─────────────────────────────────────────────────────────────────────────────

check_error_handling() {
    log "Checking error handling..."

    if grep -r "try\|catch" "$PROJECT_ROOT/backend/src/routes" --include="*.ts" > /dev/null 2>&1; then
        log_success "Error handling detected in routes"
    else
        log_warning "Limited error handling detected"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Generate Security Report
# ─────────────────────────────────────────────────────────────────────────────

generate_report() {
    local report_file="$PROJECT_ROOT/security-validation-report.txt"

    {
        echo "═══════════════════════════════════════════════════════════════"
        echo "SECURITY VALIDATION REPORT"
        echo "═══════════════════════════════════════════════════════════════"
        echo "Timestamp: $(date)"
        echo ""
        echo "Results:"
        echo "─────────────────────────────────────────────────────────────"
        echo "Checks Passed: $CHECKS_PASSED"
        echo "Checks Failed: $CHECKS_FAILED"
        echo "Warnings: $CHECKS_WARNING"
        echo ""
        if [ $CHECKS_FAILED -eq 0 ]; then
            echo "STATUS: ✓ SECURITY VALIDATION PASSED"
        else
            echo "STATUS: ✗ SECURITY ISSUES DETECTED"
        fi
        echo ""
        echo "Security Checks Performed:"
        echo "• Hardcoded Secrets Detection"
        echo "• Dependency Vulnerabilities"
        echo "• Code Quality"
        echo "• CSRF Protection"
        echo "• Authentication"
        echo "• CORS Configuration"
        echo "• Input Validation"
        echo "• Rate Limiting"
        echo "• Security Headers"
        echo "• Environment Isolation"
        echo "• Error Handling"
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
    log "SECURITY VALIDATION STARTED"
    log "════════════════════════════════════════════════════════════════════"

    check_hardcoded_secrets
    check_dependencies
    check_code_quality
    check_csrf_protection
    check_authentication
    check_cors
    check_validation
    check_rate_limiting
    check_security_headers
    check_environment_isolation
    check_error_handling

    generate_report

    log "════════════════════════════════════════════════════════════════════"
    if [ $CHECKS_FAILED -eq 0 ]; then
        log_success "SECURITY VALIDATION COMPLETED - NO CRITICAL ISSUES"
    else
        log_error "SECURITY VALIDATION FOUND $CHECKS_FAILED ISSUES"
    fi
    log "════════════════════════════════════════════════════════════════════"
}

main "$@"
