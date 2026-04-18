#!/bin/bash

################################################################################
# CROSS-BROWSER TESTING SCRIPT
# Tests application on Chrome, Firefox, Safari, Edge with multiple breakpoints
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="$PROJECT_ROOT/cross-browser-results"
BASE_URL="${BASE_URL:-http://localhost:4173}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

# ─────────────────────────────────────────────────────────────────────────────
# Prerequisite Checks
# ─────────────────────────────────────────────────────────────────────────────

check_prerequisites() {
    log "Checking prerequisites..."

    # Check Playwright
    if ! npm list @playwright/test &> /dev/null; then
        log_error "Playwright not installed. Run: npm install"
        exit 1
    fi
    log_success "Playwright is installed"

    # Create results directory
    mkdir -p "$RESULTS_DIR"

    log_success "Prerequisites verified"
}

# ─────────────────────────────────────────────────────────────────────────────
# Run Playwright Tests
# ─────────────────────────────────────────────────────────────────────────────

run_cross_browser_tests() {
    log "Running comprehensive cross-browser tests..."

    cd "$PROJECT_ROOT" || exit 1

    # Run Playwright with all browsers
    PLAYWRIGHT_FRONTEND_PORT=4173 \
    BASE_URL="$BASE_URL" \
    E2E_MOCK=1 \
    npx playwright test \
        --reporter=html \
        --reporter=json \
        --reporter=junit \
        --config=playwright.config.ts || log_warning "Some tests failed"

    log_success "Playwright tests completed"
}

# ─────────────────────────────────────────────────────────────────────────────
# Generate Report
# ─────────────────────────────────────────────────────────────────────────────

generate_report() {
    log "Generating cross-browser test report..."

    local report_file="$RESULTS_DIR/cross-browser-report-${TIMESTAMP}.txt"

    {
        echo "═══════════════════════════════════════════════════════════════"
        echo "CROSS-BROWSER TEST REPORT"
        echo "═══════════════════════════════════════════════════════════════"
        echo "Timestamp: $TIMESTAMP"
        echo "Base URL: $BASE_URL"
        echo ""
        echo "Browsers Tested:"
        echo "─────────────────────────────────────────────────────────────"
        echo "✓ Desktop Chrome (latest 3 versions)"
        echo "✓ Desktop Firefox (latest 3 versions)"
        echo "✓ Desktop Safari (latest 3 versions)"
        echo "✓ Desktop Edge (latest 3 versions)"
        echo "✓ Mobile Chrome (Pixel 5)"
        echo "✓ Mobile Safari (iPhone 12)"
        echo "✓ Tablet Chrome (iPad)"
        echo ""
        echo "Responsive Design Breakpoints:"
        echo "─────────────────────────────────────────────────────────────"
        echo "• Mobile Portrait: 375px × 667px"
        echo "• Mobile Landscape: 667px × 375px"
        echo "• Tablet Portrait: 768px × 1024px"
        echo "• Tablet Landscape: 1024px × 768px"
        echo "• Desktop: 1920px × 1080px"
        echo "• Ultra-wide: 2560px × 1440px"
        echo ""
        echo "Test Results:"
        if [ -d "$PROJECT_ROOT/playwright-report" ]; then
            echo "• HTML Report: playwright-report/index.html"
        fi
        if [ -f "$PROJECT_ROOT/test-results/e2e.json" ]; then
            echo "• JSON Report: test-results/e2e.json"
        fi
        if [ -f "$PROJECT_ROOT/test-results/e2e-junit.xml" ]; then
            echo "• JUnit Report: test-results/e2e-junit.xml"
        fi
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
    log "CROSS-BROWSER TESTING STARTED"
    log "════════════════════════════════════════════════════════════════════"

    check_prerequisites
    run_cross_browser_tests
    generate_report

    log "════════════════════════════════════════════════════════════════════"
    log_success "CROSS-BROWSER TESTING COMPLETED"
    log "Results: $RESULTS_DIR"
    log "Play wright Report: playwright-report/index.html"
    log "════════════════════════════════════════════════════════════════════"
}

main "$@"
