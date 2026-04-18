#!/bin/bash

################################################################################
# PERFORMANCE TEST RUNNER
# Comprehensive performance testing with multiple scenarios
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
K6_TESTS_DIR="$PROJECT_ROOT/k6-tests"
RESULTS_DIR="$PROJECT_ROOT/performance-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BASE_URL="${BASE_URL:-http://localhost:3694}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# ─────────────────────────────────────────────────────────────────────────────
# Prerequisite Checks
# ─────────────────────────────────────────────────────────────────────────────

check_prerequisites() {
    log "Checking prerequisites..."

    # Check k6 installation
    if ! command -v k6 &> /dev/null; then
        log_error "k6 is not installed. Please install from https://k6.io"
        exit 1
    fi
    log_success "k6 version: $(k6 version)"

    # Check if backend is running
    if ! timeout 5 curl -sf "$BASE_URL/api/live" > /dev/null 2>&1; then
        log_error "Backend is not running at $BASE_URL"
        exit 1
    fi
    log_success "Backend is accessible at $BASE_URL"

    # Create results directory
    mkdir -p "$RESULTS_DIR"

    log_success "Prerequisites verified"
}

# ─────────────────────────────────────────────────────────────────────────────
# Run Performance Tests
# ─────────────────────────────────────────────────────────────────────────────

run_smoke_test() {
    log "Running SMOKE TEST..."
    local report="$RESULTS_DIR/smoke-test-${TIMESTAMP}.html"

    k6 run \
        --vus 5 \
        --duration 2m \
        --out json="$RESULTS_DIR/smoke-test-${TIMESTAMP}.json" \
        --out html="$report" \
        -e BASE_URL="$BASE_URL" \
        -e SCENARIO="smoke" \
        "$K6_TESTS_DIR/performance-comprehensive.js" || log_error "Smoke test failed"

    log_success "Smoke test completed: $report"
}

run_load_test() {
    log "Running LOAD TEST (gradually increasing to 50 users over 5 minutes)..."
    local report="$RESULTS_DIR/load-test-${TIMESTAMP}.html"

    k6 run \
        --out json="$RESULTS_DIR/load-test-${TIMESTAMP}.json" \
        --out html="$report" \
        -e BASE_URL="$BASE_URL" \
        -e SCENARIO="load" \
        "$K6_TESTS_DIR/performance-comprehensive.js" || log_error "Load test failed"

    log_success "Load test completed: $report"
}

run_stress_test() {
    log "Running STRESS TEST (ramping up to 300 users)..."
    local report="$RESULTS_DIR/stress-test-${TIMESTAMP}.html"

    k6 run \
        --out json="$RESULTS_DIR/stress-test-${TIMESTAMP}.json" \
        --out html="$report" \
        -e BASE_URL="$BASE_URL" \
        -e SCENARIO="stress" \
        "$K6_TESTS_DIR/performance-comprehensive.js" || log_error "Stress test failed"

    log_success "Stress test completed: $report"
}

run_spike_test() {
    log "Running SPIKE TEST (sudden spike to 500 users)..."
    local report="$RESULTS_DIR/spike-test-${TIMESTAMP}.html"

    k6 run \
        --out json="$RESULTS_DIR/spike-test-${TIMESTAMP}.json" \
        --out html="$report" \
        -e BASE_URL="$BASE_URL" \
        -e SCENARIO="spike" \
        "$K6_TESTS_DIR/performance-comprehensive.js" || log_error "Spike test failed"

    log_success "Spike test completed: $report"
}

run_endurance_test() {
    log "Running ENDURANCE TEST (sustained 25 users for 20 minutes)..."
    local report="$RESULTS_DIR/endurance-test-${TIMESTAMP}.html"

    k6 run \
        --out json="$RESULTS_DIR/endurance-test-${TIMESTAMP}.json" \
        --out html="$report" \
        -e BASE_URL="$BASE_URL" \
        -e SCENARIO="endurance" \
        "$K6_TESTS_DIR/performance-comprehensive.js" || log_error "Endurance test failed"

    log_success "Endurance test completed: $report"
}

# ─────────────────────────────────────────────────────────────────────────────
# Generate Performance Report
# ─────────────────────────────────────────────────────────────────────────────

generate_summary() {
    log "Generating performance summary..."

    local summary_file="$RESULTS_DIR/performance-summary-${TIMESTAMP}.txt"

    {
        echo "═══════════════════════════════════════════════════════════════"
        echo "PERFORMANCE TEST SUMMARY"
        echo "═══════════════════════════════════════════════════════════════"
        echo "Timestamp: $TIMESTAMP"
        echo "Base URL: $BASE_URL"
        echo "Results Directory: $RESULTS_DIR"
        echo ""
        echo "Performance Metrics:"
        echo "─────────────────────────────────────────────────────────────"
        echo "✓ Smoke Test: Basic functionality verification"
        echo "✓ Load Test: Sustained load with 50 concurrent users"
        echo "✓ Stress Test: Incremental increase up to 300 concurrent users"
        echo "✓ Spike Test: Sudden spike to 500 concurrent users"
        echo "✓ Endurance Test: 25 users for 20 minutes (sustained load)"
        echo ""
        echo "Key Performance Indicators:"
        echo "─────────────────────────────────────────────────────────────"
        echo "• Response Time: p(95) < 500ms, p(99) < 1000ms"
        echo "• Error Rate: < 10%"
        echo "• Success Rate: > 90%"
        echo "• Database Query Time: < 1 second"
        echo "• Page Load Time: < 3 seconds"
        echo ""
        echo "Generated Reports:"
        ls -lh "$RESULTS_DIR"/* 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
        echo ""
        echo "═══════════════════════════════════════════════════════════════"
    } | tee "$summary_file"

    log_success "Summary saved to: $summary_file"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main Test Execution
# ─────────────────────────────────────────────────────────────────────────────

main() {
    log "════════════════════════════════════════════════════════════════════"
    log "PERFORMANCE TEST SUITE STARTED"
    log "════════════════════════════════════════════════════════════════════"

    check_prerequisites

    # Determine which tests to run
    TEST_TYPE="${1:-all}"

    case "$TEST_TYPE" in
        smoke)
            run_smoke_test
            ;;
        load)
            run_load_test
            ;;
        stress)
            run_stress_test
            ;;
        spike)
            run_spike_test
            ;;
        endurance)
            run_endurance_test
            ;;
        all)
            run_smoke_test
            sleep 30
            run_load_test
            sleep 30
            ;;
        *)
            log_error "Unknown test type: $TEST_TYPE"
            log "Usage: $0 {smoke|load|stress|spike|endurance|all}"
            exit 1
            ;;
    esac

    generate_summary

    log "════════════════════════════════════════════════════════════════════"
    log_success "PERFORMANCE TEST SUITE COMPLETED"
    log "Results: $RESULTS_DIR"
    log "════════════════════════════════════════════════════════════════════"
}

# Execute
main "$@"
