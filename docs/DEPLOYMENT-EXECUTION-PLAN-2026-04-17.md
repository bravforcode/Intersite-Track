# Deployment Execution Plan — Complete Production Deployment Guide
**Date:** 2026-04-17  
**Version:** 1.0 (Production Ready)  
**Status:** Ready for Deployment

---

## 📋 Table of Contents
1. [Pre-Deployment Verification](#pre-deployment-verification)
2. [Environment Configuration](#environment-configuration)
3. [SSL/TLS & Domain Setup](#ssltls--domain-setup)
4. [Database & Redis Configuration](#database--redis-configuration)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring & Alerting](#monitoring--alerting)

---

## Pre-Deployment Verification

### System Health Check (All Must Pass ✅)

```bash
# 1. Build Frontend
npm run build  # Must complete without errors

# 2. Build Backend
npm run build:be  # Must complete without errors

# 3. Run All Tests
npm test  # Must pass 57/57 tests

# 4. Run Lint Check
npm run lint  # Must show 0 errors

# 5. Check Dependencies for Vulnerabilities
npm audit --prod  # Must show no critical vulnerabilities

# 6. Verify Environment Variables
npm run validate:env  # Must confirm all required keys present
```

### Deployment Readiness Checklist

- [ ] All 57 tests passing ✅
- [ ] Backend builds cleanly ✅
- [ ] Frontend builds cleanly with Vite ✅
- [ ] TypeScript strict mode passes ✅
- [ ] No active security vulnerabilities
- [ ] All environment variables configured
- [ ] SSL certificates obtained or renewed
- [ ] Database backups created
- [ ] Firestore indexes deployed
- [ ] Redis deployment ready (if scaling)
- [ ] CDN configured
- [ ] Backup and rollback procedures documented

---

## Environment Configuration

### Production Environment Variables

Create `.env.production` with the following structure:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
FIREBASE_ADMIN_SDK_KEY=path_to_admin_sdk_json_or_base64_encoded

# Backend Server
NODE_ENV=production
PORT=3694
BACKEND_URL=https://api.yourdomain.com

# Frontend Configuration
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_APP_URL=https://yourdomain.com
VITE_E2E_MOCK=0

# Security
SESSION_SECRET=your_randomly_generated_64_char_secret
CSRF_SECRET=your_csrf_secret_key_64_chars
JWT_SECRET=your_jwt_secret_64_chars

# Rate Limiting
REDIS_URL=redis://username:password@redis_host:6379/0
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# LINE Integration
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_ACCESS_TOKEN=your_access_token

# Trello Integration (if used)
TRELLO_API_KEY=your_api_key
TRELLO_TOKEN=your_token

# Monitoring & Logging
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn_url

# Email Configuration (for notifications)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=noreply@yourdomain.com

# API Rate Limiting
PUBLIC_API_RATE_LIMIT=1000
AUTHENTICATED_API_RATE_LIMIT=5000
```

### Server Configuration

**nginx/reverse-proxy configuration** (for SSL termination):

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Certificate
    ssl_certificate /etc/ssl/certs/your_domain.crt;
    ssl_certificate_key /etc/ssl/private/your_domain.key;

    # SSL Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CORS Headers (for API)
    add_header Access-Control-Allow-Origin "https://yourdomain.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-CSRF-Token" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json;

    # Proxy to Backend
    location /api/ {
        proxy_pass http://localhost:3694;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static Files (from Frontend)
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Health Check Endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:3694/api/health;
    }
}

# HTTP to HTTPS Redirect
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## SSL/TLS & Domain Setup

### 1. Obtain SSL Certificate

**Option A: Let's Encrypt (Free)**

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --standalone -d api.yourdomain.com -d yourdomain.com

# Auto-renewal setup
sudo certbot renew --dry-run
```

**Option B: AWS Certificate Manager (if on AWS)**
- Navigate to ACM Console
- Request new certificate
- Validate domain ownership via DNS
- Use certificate in CloudFront/ALB configuration

### 2. Domain DNS Configuration

Point your DNS records to your server:

```dns
# A Records
yourdomain.com          A    YOUR_SERVER_IP
api.yourdomain.com      A    YOUR_SERVER_IP
www.yourdomain.com      A    YOUR_SERVER_IP

# AAAA Records (IPv6)
yourdomain.com          AAAA   YOUR_IPV6_ADDRESS
api.yourdomain.com      AAAA   YOUR_IPV6_ADDRESS

# MX Records (for email)
yourdomain.com          MX   10  mail.yourdomain.com

# TXT Records
yourdomain.com          TXT  "v=spf1 mx ~all"
yourdomain.com          TXT  "google-site-verification=YOUR_CODE"
```

### 3. Verify DNSSEC

```bash
# Check DNSSEC status
dig @8.8.8.8 yourdomain.com +dnssec +short

# Should show ad (authenticated) flag
```

### 4. SSL Certificate Verification

```bash
# Test SSL Configuration
openssl s_client -connect api.yourdomain.com:443 -tls1_2

# Verify certificate details
openssl x509 -in /etc/ssl/certs/your_domain.crt -text -noout

# Check certificate expiration
echo | openssl s_client -servername api.yourdomain.com -connect api.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Database & Redis Configuration

### Firestore Setup

```bash
# 1. Deploy Firestore indexes
firebase deploy --only firestore:indexes

# 2. Deploy Firestore security rules
firebase deploy --only firestore:rules

# 3. Verify rules deployment
firebase firestore:rules:list
```

### Firestore Security Rules Deployment

```bash
# Validate rules before deployment
cd c:\TaskAm-main\TaskAm-main
firebase firestore:rules validate

# Deploy production rules
firebase deploy --only firestore:rules --project production
```

### Redis Configuration (For Scaling)

```bash
# Option 1: AWS ElastiCache
# - Create ElastiCache cluster (Redis 7.x)
# - Configure VPC and security groups
# - Get connection string

# Option 2: Self-hosted Redis
sudo apt-get install redis-server

# Redis Configuration
cat > /etc/redis/redis.conf << EOF
# Security
requirepass your_redis_password_here
masterauth your_redis_password_here

# Memory Management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Replication (if master-slave setup)
replica-read-only yes

# Persistence
save 900 1
save 300 10
save 60 10000

# AOF (Append-Only File)
appendonly yes
appendfilename "appendonly.aof"
EOF

# Start Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Test connection
redis-cli -a your_redis_password PING
```

### Database Backups

```bash
# Firestore Export
gcloud firestore export gs://your-backup-bucket/backup-$(date +%Y%m%d-%H%M%S)

# Restore from backup
gcloud firestore import gs://your-backup-bucket/backup-timestamp/

# Redis Backup
redis-cli -a your_password BGSAVE
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d-%H%M%S).rdb
```

---

## Deployment Steps

### Step 1: Pre-Deployment

```bash
cd c:\TaskAm-main\TaskAm-main

# 1. Verify all tests pass
npm test

# 2. Build both frontend and backend
npm run build
npm run build:be

# 3. Create clean environment
rm -rf node_modules frontend/node_modules backend/node_modules
npm ci  # Clean install to ensure exact versions
```

### Step 2: Upload to Production Server

```bash
# Create deployment archive
tar --exclude='node_modules' --exclude='.git' --exclude='dist' \
    --exclude='uploads' -czf deployment.tar.gz .

# Upload to server (via SSH)
scp deployment.tar.gz user@your_server:/opt/taskam/

# SSH into server
ssh user@your_server

# Extract on server
cd /opt/taskam
tar -xzf deployment.tar.gz

# Install dependencies
npm install --omit=dev
npm install --workspace=backend --omit=dev
npm install --workspace=frontend --omit=dev
```

### Step 3: Database Migration & Setup

```bash
# 1. Backup existing Firestore
gcloud firestore export gs://your-backup-bucket/pre-deployment-$(date +%Y%m%d)

# 2. Deploy Firestore indexes
firebase deploy --only firestore:indexes

# 3. Deploy Firestore rules
firebase deploy --only firestore:rules

# 4. Run database migration scripts (if any)
node backend/scripts/migrate.js production
```

### Step 4: Start Application

```bash
# Using systemd (recommended for production)
sudo tee /etc/systemd/system/taskam-backend.service > /dev/null <<EOF
[Unit]
Description=TaskAm Backend Service
After=network.target

[Service]
Type=simple
User=taskam
WorkingDirectory=/opt/taskam
ExecStart=/usr/bin/node backend/dist/server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/taskam/backend.log
StandardError=append:/var/log/taskam/backend-error.log

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable taskam-backend
sudo systemctl start taskam-backend

# Check status
sudo systemctl status taskam-backend

# View logs
sudo journalctl -u taskam-backend -f
```

### Step 5: Verify Deployment

```bash
# 1. Check backend health
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
     https://api.yourdomain.com/api/health

# Expected response:
# {"status":"ok","timestamp":"2026-04-17T10:00:00Z"}

# 2. Check frontend accessibility
curl -I https://yourdomain.com

# 3. Check SSL certificate
openssl s_client -connect api.yourdomain.com:443 < /dev/null | grep -A2 "subject="

# 4. Run smoke tests
npm run test:smoke
```

---

## Post-Deployment Verification

### Functional Verification Checklist

- [ ] **Frontend loads**: https://yourdomain.com returns 200 OK
- [ ] **API accessible**: https://api.yourdomain.com/api/health returns health status
- [ ] **User registration works**: Can create new account
- [ ] **Login works**: Can authenticate with valid credentials
- [ ] **JWT tokens valid**: Tokens issued and accepted properly
- [ ] **File uploads work**: Can upload and retrieve files
- [ ] **Database queries work**: Firestore reads/writes functional
- [ ] **LINE integration**: Webhooks processed correctly
- [ ] **Rate limiting**: Enforced properly without false blocks
- [ ] **CSRF protection**: Token validation working
- [ ] **Security headers**: All headers present (CSP, HSTS, X-Frame-Options)
- [ ] **Audit logging**: Events logged to audit_logs collection

### Performance Verification

```bash
# 1. Measure page load time
curl -w "Time: %{time_total}s\n" https://yourdomain.com > /dev/null

# 2. Check API response time
curl -w "API Time: %{time_total}s\n" https://api.yourdomain.com/api/health > /dev/null

# 3. Monitor actual response times
# Use tools like: Google PageSpeed, GTmetrix, WebPageTest
```

### Security Verification

```bash
# 1. SSL Certificate Validation
openssl s_client -connect api.yourdomain.com:443 -tls1_2

# 2. Security Headers Check
curl -I https://api.yourdomain.com | grep -E "Strict-Transport-Security|X-Frame|X-Content-Type|CSP"

# 3. CORS Configuration Verification
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     https://api.yourdomain.com/api/auth/login -v

# Expected: Access-Control-Allow-Origin header present
```

---

## Rollback Procedures

### Immediate Rollback (If Critical Issues)

```bash
# 1. Stop current deployment
sudo systemctl stop taskam-backend

# 2. Restore previous version
cd /opt/taskam
tar -xzf deployment-previous.tar.gz

# 3. Install dependencies
npm ci --omit=dev

# 4. Restore database (if needed)
gcloud firestore import gs://your-backup-bucket/pre-deployment-timestamp/

# 5. Restart service
sudo systemctl start taskam-backend

# 6. Verify
curl https://api.yourdomain.com/api/health
```

### Firestore Rollback

```bash
# List available backups
gsutil ls gs://your-backup-bucket/

# Restore from backup
gcloud firestore import gs://your-backup-bucket/backup-2026-04-17/

# Verify restore
firebase firestore:describe
```

---

## Monitoring & Alerting

### Logging Setup

```javascript
// Backend logging configuration
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: '/var/log/taskam/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: '/var/log/taskam/combined.log' 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export { logger };
```

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Page Load Time (p95) | < 3s | > 5s |
| API Response Time (p95) | < 500ms | > 1s |
| Backend CPU Usage | < 40% | > 80% |
| Backend Memory Usage | < 60% | > 85% |
| Error Rate | < 0.1% | > 1% |
| Firestore Read Latency | < 100ms | > 500ms |
| Redis Connection Status | Connected | Any disconnection |
| SSL Certificate Expiry | > 30 days | < 14 days |

### Health Check Script

```bash
#!/bin/bash
# deployment-health-check.sh

BACKEND_URL="https://api.yourdomain.com"
FRONTEND_URL="https://yourdomain.com"
LOG_FILE="/var/log/taskam/health-checks.log"

check_health() {
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check backend health
    BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/api/health)
    
    # Check frontend accessibility
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)
    
    # Check SSL certificate expiry
    SSL_EXPIRY=$(echo | openssl s_client -servername yourdomain.com -connect api.yourdomain.com:443 2>/dev/null | \
                 openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    
    # Log results
    echo "[$TIMESTAMP] Backend: $BACKEND_STATUS | Frontend: $FRONTEND_STATUS | SSL Expires: $SSL_EXPIRY" >> $LOG_FILE
    
    # Alert if failures
    if [ "$BACKEND_STATUS" != "200" ] || [ "$FRONTEND_STATUS" != "200" ]; then
        echo "ALERT: Health check failed at $TIMESTAMP" | mail -s "TaskAm Health Check Alert" admin@yourdomain.com
    fi
}

# Run health check every 5 minutes
while true; do
    check_health
    sleep 300
done
```

### Automated Alerts Configuration

```yaml
# Prometheus alerting rules (if using Prometheus)
groups:
  - name: taskam-alerts
    rules:
      - alert: BackendDown
        expr: up{job="taskam-backend"} == 0
        for: 2m
        annotations:
          summary: "Backend Service Down"
          
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.01
        annotations:
          summary: "Error rate > 1%"
          
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, response_time) > 5
        annotations:
          summary: "p95 response time > 5 seconds"
```

---

## Post-Deployment Checklist

```
□ All tests passing (57/57)
□ Backend service running
□ Frontend accessible
□ SSL certificate valid
□ Database connected
□ Firestore rules deployed
□ Authentication working
□ File uploads functional
□ Rate limiting active
□ Audit logging operational
□ Security headers present
□ Monitoring configured
□ Logging active
□ Backups scheduled
□ Backup restoration tested
□ Documentation updated
□ Team notified of deployment
□ Performance within targets
□ No error rate spikes
```

---

## Support & Escalation

| Issue | Response Time | Escalation |
|-------|----------------|------------|
| Service Down | 15 minutes | DevOps Lead → System Admin |
| Critical Security Issue | 30 minutes | Security Team Lead |
| Performance Degradation | 1 hour | Performance Engineer |
| Database Issues | 30 minutes | DBA |
| SSL Certificate Issues | 2 hours | Network Ops |

---

**Deployment Completed:** ✅ Ready for production traffic

