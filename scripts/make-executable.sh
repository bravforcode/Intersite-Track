#!/bin/bash

################################################################################
# MAKE ALL SCRIPTS EXECUTABLE
# Ensures all shell scripts have proper execute permissions
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Making scripts executable..."

declare -a SCRIPTS=(
    "deploy-production.sh"
    "performance-test-runner.sh"
    "cross-browser-test.sh"
    "functional-test.sh"
    "deploy-verify.sh"
    "complete-deployment-orchestrator.sh"
    "setup-production-env.sh"
    "security-validation.sh"
    "quickstart.sh"
)

for script in "${SCRIPTS[@]}"; do
    SCRIPT_PATH="$SCRIPT_DIR/$script"
    if [ -f "$SCRIPT_PATH" ]; then
        chmod +x "$SCRIPT_PATH"
        echo "✓ Made executable: $script"
    else
        echo "✗ Not found: $script"
    fi
done

echo ""
echo "All scripts are now executable!"
echo ""
echo "Quick commands:"
echo "  npm run deploy:production    - Full production deployment"
echo "  npm run test:e2e             - E2E/cross-browser tests"
echo "  npm run test:functional      - Functional tests"
echo "  npm run test:performance:load - Performance load test"
echo "  npm run verify:deployment    - Verify deployment"
echo "  npm run orchestrate:deployment - Complete orchestration"
echo ""
echo "Or use the interactive menu:"
echo "  bash scripts/quickstart.sh"
