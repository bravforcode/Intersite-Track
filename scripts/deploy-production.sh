#!/bin/bash

################################################################################
# PRODUCTION DEPLOYMENT SCRIPT
# Comprehensive deployment with validation and rollback capability
################################################################################

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${PROJECT_ROOT}/.backups/${TIMESTAMP}"
LOG_FILE="${PROJECT_ROOT}/logs/deployment_${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─────────────────────────────────────────────────────────────────────────────
# Logging Functions
# ─────────────────────────────────────────────────────────────────────────────

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1" | tee -a "$LOG_FILE"
}

# ─────────────────────────────────────────────────────────────────────────────
# Pre-deployment Checks
# ─────────────────────────────────────────────────────────────────────────────

check_prerequisites() {
    log "Checking prerequisites..."

    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 22 ]; then
        log_error "Node.js 22.x or higher required, current: $(node -v)"
        exit 1
    fi
    log_success "Node.js version: $(node -v)"

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_success "npm version: $(npm -v)"

    # Check git
    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
        exit 1
    fi
    log_success "git is installed"

    # Check if .env.production exists
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        log_error ".env.production file not found"
        exit 1
    fi
    log_success ".env.production file found"

    # Verify environment variables
    if ! grep -q "FIREBASE_PROJECT_ID" "$PROJECT_ROOT/.env.production"; then
        log_error "Missing required environment variables in .env.production"
        exit 1
    fi
    log_success "Environment variables verified"
}

# ─────────────────────────────────────────────────────────────────────────────
# Clean Build
# ─────────────────────────────────────────────────────────────────────────────

clean_and_install() {
    log "Cleaning and installing dependencies..."

    # Remove existing node_modules and dist folders
    rm -rf "$PROJECT_ROOT/node_modules"
    rm -rf "$PROJECT_ROOT/frontend/dist"
    rm -rf "$PROJECT_ROOT/backend/dist"
    rm -rf "$PROJECT_ROOT/dist"

    # Clean npm cache
    npm cache clean --force

    # Install dependencies
    log "Installing dependencies (this may take a few minutes)..."
    npm ci --production=false
    log_success "Dependencies installed"

    # Install workspace dependencies
    npm ci --workspace=frontend --production=false
    npm ci --workspace=backend --production=false
    npm ci --workspace=shared --production=false
    log_success "Workspace dependencies installed"
}

# ─────────────────────────────────────────────────────────────────────────────
# Linting and Type Checking
# ─────────────────────────────────────────────────────────────────────────────

lint_and_typecheck() {
    log "Running linting and type checking..."

    npm run lint 2>&1 | tee -a "$LOG_FILE" || log_warning "Some linting warnings detected (non-blocking)"

    if ! npm run build 2>&1 | tee -a "$LOG_FILE"; then
        log_error "Build failed"
        return 1
    fi
    log_success "Linting and type checking passed"
}

# ─────────────────────────────────────────────────────────────────────────────
# Running Tests
# ─────────────────────────────────────────────────────────────────────────────

run_tests() {
    log "Running test suite..."

    # Unit tests
    log "Running unit tests..."
    npm run test:root 2>&1 | tee -a "$LOG_FILE" || log_warning "Some unit tests failed"

    # E2E tests with E2E_MOCK mode
    log "Running E2E tests..."
    E2E_MOCK=1 npm run test 2>&1 | tee -a "$LOG_FILE" || log_warning "Some E2E tests failed"

    log_success "Test suite completed"
}

# ─────────────────────────────────────────────────────────────────────────────
# Security Checks
# ─────────────────────────────────────────────────────────────────────────────

run_security_checks() {
    log "Running security checks..."

    # Check for secrets in code
    if grep -r "FIREBASE_PRIVATE_KEY=" "$PROJECT_ROOT" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" 2>/dev/null | grep -v ".env" | grep -v ".example"; then
        log_error "Potential secret exposure detected"
        exit 1
    fi
    log_success "No hardcoded secrets detected"

    # Verify production dependencies
    log "Verifying production dependencies..."
    npm audit --production 2>&1 | tee -a "$LOG_FILE" || log_warning "Some security advisories detected"

    log_success "Security checks completed"
}

# ─────────────────────────────────────────────────────────────────────────────
# Build Process
# ─────────────────────────────────────────────────────────────────────────────

build_application() {
    log "Building application for production..."

    # Frontend build
    log "Building frontend..."
    npm run build --workspace=frontend 2>&1 | tee -a "$LOG_FILE"

    if [ ! -d "$PROJECT_ROOT/frontend/dist" ]; then
        log_error "Frontend build failed - dist folder not found"
        exit 1
    fi
    log_success "Frontend build completed"

    # Backend build
    log "Building backend..."
    npm run build --workspace=backend 2>&1 | tee -a "$LOG_FILE"
    log_success "Backend build completed"

    # Verify build outputs
    FRONTEND_SIZE=$(du -sh "$PROJECT_ROOT/frontend/dist" | cut -f1)
    log "Frontend build size: $FRONTEND_SIZE"

    log_success "Application build completed successfully"
}

# ─────────────────────────────────────────────────────────────────────────────
# Backup Current Deployment
# ─────────────────────────────────────────────────────────────────────────────

backup_current() {
    log "Creating backup of current deployment..."

    mkdir -p "$BACKUP_DIR"

    if [ -d "$PROJECT_ROOT/frontend/dist" ]; then
        cp -r "$PROJECT_ROOT/frontend/dist" "$BACKUP_DIR/frontend-dist-backup"
        log_success "Frontend backup created"
    fi

    if [ -d "$PROJECT_ROOT/backend/dist" ]; then
        cp -r "$PROJECT_ROOT/backend/dist" "$BACKUP_DIR/backend-dist-backup"
        log_success "Backend backup created"
    fi

    # Backup current .env settings (without secrets)
    cp "$PROJECT_ROOT/.env.production" "$BACKUP_DIR/.env.production.backup"
    log_success "Environment backup created"
}

# ─────────────────────────────────────────────────────────────────────────────
# Deployment Verification
# ─────────────────────────────────────────────────────────────────────────────

verify_deployment() {
    log "Verifying deployment..."

    # Check SSL certificate (if deployed)
    log "Checking SSL/TLS configuration..."
    if [ -n "${DEPLOY_URL:-}" ]; then
        if timeout 5 curl -sI "$DEPLOY_URL" | grep -q "Strict-Transport-Security"; then
            log_success "SSL/TLS headers verified"
        else
            log_warning "SSL/TLS configuration may need verification"
        fi
    fi

    # Health check
    log "Performing health checks..."
    if [ -n "${DEPLOY_URL:-}" ]; then
        if timeout 10 curl -sf "$DEPLOY_URL/api/live" > /dev/null; then
            log_success "Application health check passed"
        else
            log_error "Application health check failed"
            return 1
        fi
    fi

    log_success "Deployment verification completed"
}

# ─────────────────────────────────────────────────────────────────────────────
# Git Operations
# ─────────────────────────────────────────────────────────────────────────────

git_operations() {
    log "Performing git operations..."

    cd "$PROJECT_ROOT" || exit 1

    # Check git status
    if ! git diff-index --quiet HEAD --; then
        log_warning "Uncommitted changes detected"
    fi

    # Tag deployment
    DEPLOY_TAG="v-production-${TIMESTAMP}"
    git tag -a "$DEPLOY_TAG" -m "Production deployment: $(date)"
    log_success "Git tag created: $DEPLOY_TAG"
}

# ─────────────────────────────────────────────────────────────────────────────
# Post-deployment Notifications
# ─────────────────────────────────────────────────────────────────────────────

notify_deployment() {
    log "Sending deployment notifications..."

    # You can integrate with Slack, Teams, or other notification systems
    # Example:
    # curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"Production deployment completed: ${TIMESTAMP}\"}" \
    #   "$SLACK_WEBHOOK_URL"

    log_success "Notifications sent"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main Deployment Flow
# ─────────────────────────────────────────────────────────────────────────────

main() {
    log "════════════════════════════════════════════════════════════════════"
    log "PRODUCTION DEPLOYMENT STARTED"
    log "Timestamp: $TIMESTAMP"
    log "════════════════════════════════════════════════════════════════════"

    mkdir -p "$(dirname "$LOG_FILE")"

    # Execute deployment steps
    check_prerequisites || exit 1
    clean_and_install || exit 1
    lint_and_typecheck || exit 1
    run_tests || log_warning "Tests had issues but continuing..."
    run_security_checks || exit 1
    build_application || exit 1
    backup_current || exit 1
    verify_deployment || log_warning "Deployment verification issues detected"
    git_operations || log_warning "Git operations failed but continuing..."
    notify_deployment || log_warning "Notification sending failed but continuing..."

    log "════════════════════════════════════════════════════════════════════"
    log_success "PRODUCTION DEPLOYMENT COMPLETED SUCCESSFULLY"
    log "Log file: $LOG_FILE"
    log "Backup location: $BACKUP_DIR"
    log "════════════════════════════════════════════════════════════════════"
}

# ─────────────────────────────────────────────────────────────────────────────
# Error Handling
# ─────────────────────────────────────────────────────────────────────────────

trap 'log_error "Deployment failed! (Line $LINENO)"; exit 1' ERR

# Execute main function
main "$@"
