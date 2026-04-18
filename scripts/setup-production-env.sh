#!/bin/bash

################################################################################
# PRODUCTION ENVIRONMENT SETUP SCRIPT
# Sets up all necessary environment configurations for production deployment
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
# Generate Secret Keys
# ─────────────────────────────────────────────────────────────────────────────

generate_secrets() {
    log "Generating cryptographic secrets..."

    # Generate JWT_SECRET
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    log_success "JWT_SECRET generated (32 bytes)"

    # Generate ENCRYPTION_KEY
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    log_success "ENCRYPTION_KEY generated (32 bytes)"

    # Generate CSRF_SECRET
    CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    log_success "CSRF_SECRET generated (32 bytes)"

    # Generate CRON_SECRET
    CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    log_success "CRON_SECRET generated (32 bytes)"

    echo ""
    cat <<EOF

Add the following to your production environment variables (Vercel UI or .env.production):

JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
CSRF_SECRET=${CSRF_SECRET}
CRON_SECRET=${CRON_SECRET}

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# Verify Environment Configuration
# ─────────────────────────────────────────────────────────────────────────────

verify_environment() {
    log "Verifying environment configuration..."

    local env_file="$PROJECT_ROOT/.env.production"

    if [ ! -f "$env_file" ]; then
        log_error ".env.production file not found at $env_file"
        return 1
    fi

    local required_vars=(
        "FIREBASE_PROJECT_ID"
        "FIREBASE_CLIENT_EMAIL"
        "FIREBASE_PRIVATE_KEY"
        "FIREBASE_STORAGE_BUCKET"
        "VITE_FIREBASE_API_KEY"
        "VITE_FIREBASE_AUTH_DOMAIN"
        "ALLOWED_ORIGIN"
        "JWT_SECRET"
        "ENCRYPTION_KEY"
        "CSRF_SECRET"
    )

    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" "$env_file"; then
            if ! grep "^$var=\${.*}" "$env_file" > /dev/null; then
                log_success "Found: $var"
            else
                log_warning "Placeholder found for: $var (needs real value)"
                missing_vars+=("$var")
            fi
        else
            log_error "Missing: $var"
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -eq 0 ]; then
        log_success "All required environment variables are configured"
        return 0
    else
        log_error "Missing or placeholder variables: ${missing_vars[*]}"
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Setup SSL Certificate
# ─────────────────────────────────────────────────────────────────────────────

setup_ssl() {
    log "Checking SSL/TLS configuration..."

    if [ -n "${DOMAIN:-}" ]; then
        log "Domain: $DOMAIN"
        log_warning "For production, ensure you have a valid SSL certificate"
        log_warning "Use Let's Encrypt for free certificates: https://letsencrypt.org"
    else
        log_warning "DOMAIN environment variable not set"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Create Production Directories
# ─────────────────────────────────────────────────────────────────────────────

create_directories() {
    log "Creating production directories..."

    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/uploads"
    mkdir -p "$PROJECT_ROOT/.backups"
    mkdir -p "$PROJECT_ROOT/performance-results"
    mkdir -p "$PROJECT_ROOT/deployment-verification"

    log_success "Production directories created"
}

# ─────────────────────────────────────────────────────────────────────────────
# Setup Log Rotation
# ─────────────────────────────────────────────────────────────────────────────

setup_log_rotation() {
    log "Setting up log rotation configuration..."

    local logrotate_config="/etc/logrotate.d/intersite-track"

    if [ -w "/etc/logrotate.d/" ]; then
        cat > "$logrotate_config" <<'EOF'
/var/log/intersite-track/*.log {
  daily
  rotate 14
  compress
  delaycompress
  notifempty
  create 0640 nobody nogroup
  sharedscripts
  postrotate
    # Add any handlers here if needed
  endscript
}
EOF
        log_success "Log rotation configured at $logrotate_config"
    else
        log_warning "Cannot write to /etc/logrotate.d/ (may need sudo)"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Setup Monitoring & Alerts
# ─────────────────────────────────────────────────────────────────────────────

setup_monitoring() {
    log "Configuring monitoring and alerting..."

    log_warning "Ensure the following are configured:"
    echo "  • Health check endpoint: /api/live"
    echo "  • Error tracking: Sentry (optional)"
    echo "  • Performance monitoring: DataDog or similar"
    echo "  • Log aggregation: CloudWatch, ELK, or similar"
    echo "  • Uptime monitoring: StatusCake, Uptimerobot, or similar"
}

# ─────────────────────────────────────────────────────────────────────────────
# Setup Database Backups
# ─────────────────────────────────────────────────────────────────────────────

setup_backups() {
    log "Configuring backup strategy..."

    log_warning "Configure the following backups:"
    echo "  • Firestore automated backups (Firebase Console)"
    echo "  • Daily incremental exports to Cloud Storage"
    echo "  • Weekly full database snapshots"
    echo "  • Test restore procedures regularly"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main Setup
# ─────────────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║    PRODUCTION ENVIRONMENT SETUP                               ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    generate_secrets
    echo ""

    create_directories
    echo ""

    verify_environment || log_warning "Some environment variables need configuration"
    echo ""

    setup_ssl
    echo ""

    setup_log_rotation
    echo ""

    setup_monitoring
    echo ""

    setup_backups
    echo ""

    log_success "Production environment setup completed!"
    log "Next steps:"
    log "  1. Add generated secrets to your production environment"
    log "  2. Configure Firebase credentials"
    log "  3. Update ALLOWED_ORIGIN with your domain"
    log "  4. Test deployment with: npm run orchestrate:deployment"
}

main "$@"
