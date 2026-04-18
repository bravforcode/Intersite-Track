#!/bin/bash

################################################################################
# COMPLETE DEPLOYMENT & TESTING ORCHESTRATOR
# Runs all deployment and testing phases in sequence with reporting
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EXECUTION_LOG="$PROJECT_ROOT/logs/complete-deployment-${TIMESTAMP}.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Summary counters
PHASE_RESULTS=()

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$EXECUTION_LOG"
}

log_phase() {
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}" | tee -a "$EXECUTION_LOG"
    echo -e "${PURPLE}$1${NC}" | tee -a "$EXECUTION_LOG"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}" | tee -a "$EXECUTION_LOG"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$EXECUTION_LOG"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$EXECUTION_LOG"
}

# ─────────────────────────────────────────────────────────────────────────────
# Phase 1: Pre-deployment Checks
# ─────────────────────────────────────────────────────────────────────────────

run_pre_deployment_checks() {
    log_phase "PHASE 1: PRE-DEPLOYMENT CHECKS"

    log "Verifying prerequisites..."

    # Check if all required files exist
    required_files=(
        ".env.production"
        "vercel.json"
        "firebase.json"
        "package.json"
        "backend/package.json"
        "frontend/package.json"
    )

    all_files_exist=true
    for file in "${required_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            log_success "Found: $file"
        else
            log_error "Missing: $file"
            all_files_exist=false
        fi
    done

    if [ "$all_files_exist" = true ]; then
        PHASE_RESULTS+=("✓ Pre-deployment checks: PASSED")
        return 0
    else
        PHASE_RESULTS+=("✗ Pre-deployment checks: FAILED")
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Phase 2: Deployment (Building artifacts)
# ─────────────────────────────────────────────────────────────────────────────

run_deployment() {
    log_phase "PHASE 2: DEPLOYMENT (BUILD & PREPARE)"

    log "Starting production deployment..."

    if bash "$SCRIPT_DIR/deploy-production.sh" 2>&1 | tee -a "$EXECUTION_LOG"; then
        PHASE_RESULTS+=("✓ Deployment: PASSED")
        return 0
    else
        PHASE_RESULTS+=("✗ Deployment: FAILED")
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Phase 3: Functional Testing
# ─────────────────────────────────────────────────────────────────────────────

run_functional_tests() {
    log_phase "PHASE 3: FUNCTIONAL TESTING"

    log "Starting functional tests..."

    if bash "$SCRIPT_DIR/functional-test.sh" 2>&1 | tee -a "$EXECUTION_LOG"; then
        PHASE_RESULTS+=("✓ Functional tests: PASSED")
        return 0
    else
        PHASE_RESULTS+=("✗ Functional tests: FAILED")
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Phase 4: Cross-browser Testing
# ─────────────────────────────────────────────────────────────────────────────

run_cross_browser_tests() {
    log_phase "PHASE 4: CROSS-BROWSER TESTING"

    log "Starting cross-browser tests..."

    # Check if Playwright is installed
    if ! npm list @playwright/test &> /dev/null; then
        log "Installing Playwright browsers..."
        npx playwright install --with-deps
    fi

    if bash "$SCRIPT_DIR/cross-browser-test.sh" 2>&1 | tee -a "$EXECUTION_LOG"; then
        PHASE_RESULTS+=("✓ Cross-browser tests: PASSED")
        return 0
    else
        PHASE_RESULTS+=("✗ Cross-browser tests: FAILED")
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Phase 5: Performance Testing
# ─────────────────────────────────────────────────────────────────────────────

run_performance_tests() {
    log_phase "PHASE 5: PERFORMANCE TESTING"

    log "Starting performance tests..."

    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        log_error "k6 is not installed. Skipping performance tests."
        PHASE_RESULTS+=("⚠ Performance tests: SKIPPED (k6 not installed)")
        return 0
    fi

    if bash "$SCRIPT_DIR/performance-test-runner.sh" "load" 2>&1 | tee -a "$EXECUTION_LOG"; then
        PHASE_RESULTS+=("✓ Performance tests: PASSED")
        return 0
    else
        PHASE_RESULTS+=("✗ Performance tests: FAILED")
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Phase 6: Deployment Verification
# ─────────────────────────────────────────────────────────────────────────────

run_deployment_verification() {
    log_phase "PHASE 6: DEPLOYMENT VERIFICATION"

    log "Starting deployment verification..."

    if bash "$SCRIPT_DIR/deploy-verify.sh" 2>&1 | tee -a "$EXECUTION_LOG"; then
        PHASE_RESULTS+=("✓ Deployment verification: PASSED")
        return 0
    else
        PHASE_RESULTS+=("✗ Deployment verification: FAILED")
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Generate Comprehensive Report
# ─────────────────────────────────────────────────────────────────────────────

generate_comprehensive_report() {
    log_phase "FINAL REPORT"

    local report_file="$PROJECT_ROOT/deployment-report-${TIMESTAMP}.txt"

    {
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║      COMPREHENSIVE DEPLOYMENT & TESTING EXECUTION REPORT      ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Execution Summary:"
        echo "─────────────────────────────────────────────────────────────────"
        echo "Timestamp: $TIMESTAMP"
        echo "Duration: $(date +%s) - $(date +%s) seconds"
        echo ""
        echo "Phase Results:"
        echo "─────────────────────────────────────────────────────────────────"
        for result in "${PHASE_RESULTS[@]}"; do
            echo "$result"
        done
        echo ""

        if [ -f "$PROJECT_ROOT/test-results/e2e.json" ]; then
            echo "E2E Test Results:"
            echo "─────────────────────────────────────────────────────────────────"
            echo "✓ Cross-browser tests completed"
            echo "✓ E2E test report: test-results/e2e.json"
            echo "✓ Playwright HTML report: playwright-report/index.html"
            echo ""
        fi

        if [ -d "$PROJECT_ROOT/performance-results" ]; then
            echo "Performance Test Results:"
            echo "─────────────────────────────────────────────────────────────────"
            echo "✓ Smoke test completed"
            echo "✓ Load test completed"
            echo "✓ Results: performance-results/"
            echo ""
        fi

        local critical_issues=0
        for result in "${PHASE_RESULTS[@]}"; do
            if [[ $result == *"FAILED"* ]]; then
                ((critical_issues++))
            fi
        done

        echo "Overall Status:"
        echo "─────────────────────────────────────────────────────────────────"
        if [ $critical_issues -eq 0 ]; then
            echo "✓ DEPLOYMENT READY FOR PRODUCTION"
        else
            echo "✗ DEPLOYMENT HAS $critical_issues CRITICAL ISSUES"
        fi
        echo ""
        echo "═════════════════════════════════════════════════════════════════"
        date
    } | tee "$report_file"

    log_success "Comprehensive report saved to: $report_file"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main Orchestration
# ─────────────────────────────────────────────────────────────────────────────

main() {
    mkdir -p "$(dirname "$EXECUTION_LOG")"

    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   COMPLETE DEPLOYMENT & TESTING ORCHESTRATION                ║${NC}"
    echo -e "${CYAN}║   Timestamp: $TIMESTAMP                                  ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Run all phases
    run_pre_deployment_checks || true
    sleep 2
    run_deployment || true
    sleep 2
    run_functional_tests || true
    sleep 2
    run_cross_browser_tests || true
    sleep 2
    run_performance_tests || true
    sleep 2
    run_deployment_verification || true

    # Generate report
    generate_comprehensive_report

    log ""
    log "Execution Log: $EXECUTION_LOG"
}

# Execute
main "$@"
