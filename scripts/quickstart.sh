#!/bin/bash

################################################################################
# DEPLOYMENT QUICK START GUIDE
# Execute deployment and testing tasks
################################################################################

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$PROJECT_ROOT/scripts"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_menu() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║      DEPLOYMENT & TESTING QUICKSTART MENU                    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "DEPLOYMENT:"
    echo "  1. Setup production environment (generates secrets, creates dirs)"
    echo "  2. Run complete deployment (build + all tests)"
    echo "  3. Deploy to production"
    echo "  4. Verify deployment"
    echo ""
    echo "TESTING:"
    echo "  5. Run functional tests"
    echo "  6. Run cross-browser tests (E2E)"
    echo "  7. Run performance tests (smoke)"
    echo "  8. Run performance tests (load)"
    echo "  9. Run performance tests (stress)"
    echo "  10. Run security validation"
    echo ""
    echo "UTILITIES:"
    echo "  11. Clean all build artifacts"
    echo "  12. Show deployment logs"
    echo "  0. Exit"
    echo ""
    echo -n "Select option: "
}

# ─────────────────────────────────────────────────────────────────────────────
# Command Execution
# ─────────────────────────────────────────────────────────────────────────────

execute_option() {
    case $1 in
        1)
            echo "Setting up production environment..."
            bash "$SCRIPT_DIR/setup-production-env.sh"
            ;;
        2)
            echo "Running complete deployment orchestration..."
            bash "$SCRIPT_DIR/complete-deployment-orchestrator.sh"
            ;;
        3)
            echo "Deploying to production..."
            bash "$SCRIPT_DIR/deploy-production.sh"
            ;;
        4)
            echo "Verifying deployment..."
            bash "$SCRIPT_DIR/deploy-verify.sh"
            ;;
        5)
            echo "Running functional tests..."
            bash "$SCRIPT_DIR/functional-test.sh"
            ;;
        6)
            echo "Running cross-browser E2E tests..."
            bash "$SCRIPT_DIR/cross-browser-test.sh"
            ;;
        7)
            echo "Running smoke performance tests..."
            bash "$SCRIPT_DIR/performance-test-runner.sh" smoke
            ;;
        8)
            echo "Running load performance tests..."
            bash "$SCRIPT_DIR/performance-test-runner.sh" load
            ;;
        9)
            echo "Running stress performance tests..."
            bash "$SCRIPT_DIR/performance-test-runner.sh" stress
            ;;
        10)
            echo "Running security validation..."
            bash "$SCRIPT_DIR/security-validation.sh"
            ;;
        11)
            echo "Cleaning build artifacts..."
            cd "$PROJECT_ROOT"
            npm run clean
            rm -rf playwright-report
            rm -rf performance-results
            rm -rf functional-test-results
            rm -rf deployment-verification
            echo "Clean completed!"
            ;;
        12)
            echo "Recent deployment logs:"
            ls -lht "$PROJECT_ROOT/logs/" | head -10
            ;;
        0)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo "Invalid option"
            ;;
    esac
}

# ─────────────────────────────────────────────────────────────────────────────
# Main Loop
# ─────────────────────────────────────────────────────────────────────────────

main() {
    while true; do
        print_menu
        read -r option
        execute_option "$option"
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Execute
main "$@"
