# Comprehensive Performance Testing Plan — International Standards
**Date:** 2026-04-17  
**Version:** 1.0  
**Compliance:** WCAG 2.1, ISO/IEC 25010, Google PageSpeed CrUX

---

## Executive Summary

This document outlines a comprehensive performance testing framework covering:
- **Load Testing**: 10 → 100 → 1000 concurrent users
- **Stress Testing**: Breaking point identification
- **Spike Testing**: Traffic surge scenarios  
- **Endurance Testing**: 24-hour stability  
- **Real-World Scenarios**: 3G, 4G, 5G, WiFi conditions
- **Core Web Vitals**: LCP, FID, CLS compliance
- **Page Speed Insights**: 90+ score target

---

## Part 1: Performance Metrics & Targets

### Core Web Vitals (Google Standards)

| Metric | Abbreviation | Target | Good | Poor |
|--------|--------------|--------|------|------|
| **Largest Contentful Paint** | LCP | < 2.5s | 2.5s | > 4s |
| **First Input Delay** | FID | < 100ms | 100ms | > 300ms |
| **Cumulative Layout Shift** | CLS | < 0.1 | 0.1 | > 0.25 |
| **Time to First Byte** | TTFB | < 600ms | 600ms | > 1.8s |
| **First Contentful Paint** | FCP | < 1.8s | 1.8s | > 3s |
| **Total Blocking Time** | TBT | < 200ms | 200ms | > 600ms |

### Page Load Targets

| Connection | Target Load | Acceptable | Alert |
|------------|------------|-----------|-------|
| **WiFi** (high speed) | < 2s | < 3s | > 4s |
| **4G LTE** (strong) | < 3s | < 4s | > 5s |
| **4G LTE** (weak) | < 6s | < 8s | > 10s |
| **3G** (typical) | < 12s | < 15s | > 20s |
| **Mobile 5G** | < 1.5s | < 2s | > 3s |

### API Response Time Targets

| Endpoint Type | p50 | p90 | p95 | p99 |
|---------------|-----|-----|-----|-----|
| **Public API** | 50ms | 200ms | 500ms | 1000ms |
| **Authenticated API** | 100ms | 300ms | 800ms | 2000ms |
| **Database Query** | 20ms | 100ms | 300ms | 1000ms |
| **File Upload** | 500ms | 2000ms | 5000ms | 10000ms |

### Resource Size Targets

| Resource Type | Target | Acceptable | Alert |
|---------------|--------|-----------|-------|
| **Total HTML** | < 50KB | < 100KB | > 200KB |
| **CSS (minified)** | < 50KB | < 100KB | > 150KB |
| **JavaScript (minified)** | < 150KB | < 300KB | > 500KB |
| **Images (total)** | < 200KB | < 400KB | > 800KB |
| **Fonts** | < 100KB | < 200KB | > 300KB |
| **Total Page Size** | < 500KB | < 1MB | > 2MB |

---

## Part 2: Load Testing Framework

### K6 Load Test Script

**File:** `k6-tests/performance-baseline.js`

```javascript
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const successCount = new Counter('success_count');
const activeUsers = new Gauge('active_users');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const API_URL = __ENV.API_URL || 'http://localhost:3694';
const USERS = parseInt(__ENV.USERS || '10');
const DURATION = __ENV.DURATION || '5m';

export const options = {
  stages: [
    { duration: '2m', target: 10 },    // Ramp-up to 10 users
    { duration: '5m', target: 50 },    // Ramp-up to 50 users
    { duration: '5m', target: 100 },   // Ramp-up to 100 users
    { duration: '3m', target: 100 },   // Hold at 100 users
    { duration: '2m', target: 0 },     // Ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.1'],
    'errors': ['rate<0.05'],
  },
  ext: {
    loadimpact: {
      projectID: 3456789,
      name: 'Performance Baseline Test'
    }
  }
};

// Test execution
export default function () {
  activeUsers.add(1);

  group('Frontend - Page Load', function () {
    let res = http.get(BASE_URL);
    check(res, {
      'status is 200': (r) => r.status === 200,
      'page loads under 3s': (r) => r.timings.duration < 3000,
    });
    apiDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  });

  group('API - Health Check', function () {
    let res = http.get(`${API_URL}/api/health`);
    check(res, {
      'health check ok': (r) => r.status === 200,
      'response time < 100ms': (r) => r.timings.duration < 100,
    });
    apiDuration.add(res.timings.duration);
    successCount.add(res.status === 200 ? 1 : 0);
  });

  group('API - Concurrent Requests', function () {
    const requests = {
      'Get Users': 
        http.get(`${API_URL}/api/users`),
      'Get Tasks': 
        http.get(`${API_URL}/api/tasks`),
      'Get Notifications': 
        http.get(`${API_URL}/api/notifications`),
    };

    Object.entries(requests).forEach(([name, res]) => {
      check(res, {
        [`${name}: status 200`]: (r) => r.status === 200,
        [`${name}: duration < 500ms`]: (r) => r.timings.duration < 500,
      });
      apiDuration.add(res.timings.duration);
    });
  });

  sleep(1);
  activeUsers.add(-1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}
```

### Running Load Tests

```bash
# Baseline test (10-100 users, 15 minutes)
k6 run k6-tests/performance-baseline.js \
  --vus=10 \
  --duration=15m

# Stress test (100-500 users)
k6 run k6-tests/performance-baseline.js \
  --stage="5m:0,5m:100,5m:200,5m:300,5m:400,5m:500,5m:0"

# Spike test (100 → 1000 users instantly)
k6 run k6-tests/performance-baseline.js \
  --stage="2m:100,1s:1000,2m:1000,1s:0"

# Endurance test (24 hours at 50% capacity)
k6 run k6-tests/performance-baseline.js \
  --stage="24h:50"

# With output to file
k6 run k6-tests/performance-baseline.js \
  --out=json=k6-detailed-results.json \
  --out=html=k6-report.html
```

---

## Part 3: Browser Performance Testing

### Lighthouse CI Integration

**File:** `lighthouse.config.js`

```javascript
module.exports = {
  ci: {
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-results',
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.85 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
      }
    },
    collect: {
      numberOfRuns: 3,
      staticDistDir: './frontend/dist',
      url: ['http://localhost:5173/'],
      settings: {
        configPath: './lighthouse-config.json'
      }
    }
  }
};
```

**File:** `lighthouse-config.json`

```json
{
  "extends": "lighthouse:default",
  "settings": {
    "formFactor": "mobile",
    "throttling": {
      "rttMs": 40,
      "throughputKbps": 11_000,
      "requestLatencyMs": 0,
      "downloadThroughputKbps": 11_000,
      "uploadThroughputKbps": 3_000
    },
    "emulatedUserAgentType": "mobile"
  }
}
```

### Running Lighthouse Tests

```bash
# Single desktop audit
lighthouse https://yourdomain.com --view

# Mobile audit
lighthouse https://yourdomain.com --form-factor=mobile

# CI mode with multiple runs
lhci autorun

# Compare against baseline
lhci upload --basicAuth=username:password

# Generate report
lhci report
```

---

## Part 4: Real-World Network Condition Testing

### Playwright Network Throttling

**File:** `tests/performance/network-conditions.spec.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('Performance Under Network Conditions', () => {
  
  test('Load on WiFi (150 Mbps)', async ({ browser }) => {
    const context = await browser.newContext({
      offline: false,
    });
    const page = await context.newPage();
    
    // Simulate WiFi
    await page.route('**/*', async (route) => {
      const delay = 0; // WiFi has minimal latency
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('https://yourdomain.com');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000); // < 2 seconds for WiFi
    await context.close();
  });

  test('Load on 4G LTE (Strong)', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Simulate 4G LTE strong condition (20 latency, 4Mbps)
    await page.route('**/*', async (route) => {
      const delay = 20;
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('https://yourdomain.com');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // < 3 seconds for 4G strong
    await context.close();
  });

  test('Load on 4G LTE (Weak)', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Simulate 4G LTE weak (100 latency, 1Mbps)
    await page.route('**/*', async (route) => {
      const delay = 100;
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('https://yourdomain.com', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(8000); // < 8 seconds for 4G weak
    await context.close();
  });

  test('Load on 3G', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Simulate 3G (400 latency, 400kbps download)
    await page.route('**/*', async (route) => {
      const delay = 400;
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('https://yourdomain.com', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(15000); // < 15 seconds for 3G
    await context.close();
  });

  test('Load on 5G', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 5G: minimal latency (5ms), high throughput (100Mbps+)
    const startTime = Date.now();
    await page.goto('https://yourdomain.com');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(1500); // < 1.5 seconds for 5G
    await context.close();
  });
});
```

---

## Part 5: Resource Optimization Testing

### CSS & JavaScript Bundle Analysis

```bash
# Analyze bundle sizes
npm run build

# Detailed breakdown with webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer

# Generate report
webpack-bundle-analyzer frontend/dist/stats.json
```

### Image Optimization Testing

**File:** `tests/performance/image-optimization.spec.js`

```javascript
import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('Image Optimization', () => {
  test('should serve WebP for supported browsers', async ({ browser }) => {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Chrome) WebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0'
    });
    const page = await context.newPage();

    let imageFormat = null;
    page.on('response', response => {
      if (response.url().includes('.webp') || response.contentType()?.includes('webp')) {
        imageFormat = 'webp';
      }
    });

    await page.goto('https://yourdomain.com');
    expect(imageFormat).toBe('webp');
    await context.close();
  });

  test('image sizes should be under 100KB each', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const imageSizes = [];
    page.on('response', response => {
      if (response.url().match(/\.(jpg|jpeg|png|webp)$/i)) {
        imageSizes.push({
          url: response.url(),
          size: response.headers()['content-length']
        });
      }
    });

    await page.goto('https://yourdomain.com');
    
    imageSizes.forEach(({ url, size }) => {
      expect(parseInt(size)).toBeLessThan(102400); // 100KB
    });

    await context.close();
  });
});
```

---

## Part 6: Stress & Endurance Testing

### Stress Test Script

```bash
#!/bin/bash
# stress-test.sh - Progressive load increase to breaking point

BASE_URL="http://localhost:5173"
API_URL="http://localhost:3694"
LOG_FILE="stress-test-results.log"

echo "Starting Stress Test - $(date)" > $LOG_FILE

for USERS in 10 50 100 250 500 750 1000 1250 1500; do
  echo "Testing with $USERS concurrent users..." | tee -a $LOG_FILE
  
  k6 run k6-tests/performance-baseline.js \
    --vus=$USERS \
    --duration=5m \
    --out=json=stress-test-$USERS-users.json \
    | tee -a $LOG_FILE
  
  # Extract summary
  ERRORS=$(grep -o '"http_req_failed":[^,]*' stress-test-$USERS-users.json | grep -o '[0-9.]*$')
  DURATION=$(grep -o '"http_req_duration":[^,}]*' stress-test-$USERS-users.json | tail -1)
  
  echo "Result: $USERS users - Errors: $ERRORS - $DURATION" >> $LOG_FILE
  
  # If error rate exceeds 5%, we've found our limit
  if (( $(echo "$ERRORS > 0.05" | bc -l) )); then
    echo "Breaking point reached at $USERS users" | tee -a $LOG_FILE
    break
  fi
done

echo "Stress test complete" >> $LOG_FILE
```

### 24-Hour Endurance Test

```bash
# Run continuous load for 24 hours at 50 users
k6 run k6-tests/performance-baseline.js \
  --vus=50 \
  --duration=24h \
  --out=json=endurance-test-24h.json
```

---

## Part 7: Functional Testing Automation

### Test Execution Checklist

**File:** `tests/functional/complete-test-suite.spec.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('Complete Functional Test Suite', () => {
  
  test.describe('Authentication Flow', () => {
    test('User Registration → Login → Logout', async ({ page }) => {
      // Navigate to registration
      await page.goto('https://yourdomain.com/register');
      
      // Fill registration form
      await page.fill('input[name="email"]', `user-${Date.now()}@test.com`);
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
      await page.fill('input[name="displayName"]', 'Test User');
      
      // Submit registration
      await page.click('button[type="submit"]');
      
      // Wait for redirect to dashboard
      await page.waitForURL('**/dashboard');
      expect(page.url()).toContain('dashboard');
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Verify redirect to login
      await page.waitForURL('**/login');
    });

    test('Login with invalid credentials shows error', async ({ page }) => {
      await page.goto('https://yourdomain.com/login');
      
      await page.fill('input[name="email"]', 'invalid@test.com');
      await page.fill('input[name="password"]', 'WrongPassword');
      await page.click('button[type="submit"]');
      
      // Wait for error message
      const errorMessage = await page.locator('[role="alert"]').textContent();
      expect(errorMessage).toContain('Invalid credentials');
    });
  });

  test.describe('CRUD Operations', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('https://yourdomain.com/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('Create new task', async ({ page }) => {
      await page.click('[data-testid="new-task-button"]');
      
      const modal = page.locator('[role="dialog"]');
      await modal.fill('input[name="title"]', 'Test Task');
      await modal.fill('textarea[name="description"]', 'This is a test task');
      await modal.click('button:has-text("Create")');
      
      // Verify task appears in list
      const taskTitle = await page.locator('text=Test Task');
      await expect(taskTitle).toBeVisible();
    });

    test('Update task', async ({ page }) => {
      // Click on an existing task
      const tasks = await page.locator('[data-testid="task-item"]');
      await tasks.first().click();
      
      // Edit modal opens
      const modal = page.locator('[role="dialog"]');
      await modal.fill('input[name="title"]', 'Updated Task Title');
      await modal.click('button:has-text("Save")');
      
      // Verify update
      await expect(page.locator('text=Updated Task Title')).toBeVisible();
    });

    test('Delete task', async ({ page }) => {
      const taskItem = page.locator('[data-testid="task-item"]').first();
      await taskItem.hover();
      
      const deleteButton = taskItem.locator('[data-testid="delete-button"]');
      await deleteButton.click();
      
      // Confirm deletion
      await page.click('button:has-text("Confirm")');
      
      // Verify task is removed
      await expect(taskItem).not.toBeVisible();
    });

    test('Read/List all tasks', async ({ page }) => {
      await page.goto('https://yourdomain.com/dashboard');
      
      const taskList = page.locator('[data-testid="task-list"]');
      const taskCount = await taskList.locator('[data-testid="task-item"]').count();
      
      expect(taskCount).toBeGreaterThan(0);
    });
  });

  test.describe('API Endpoints', () => {
    test('GET /api/tasks returns 200', async ({ request }) => {
      const response = await request.get('https://api.yourdomain.com/api/tasks', {
        headers: { 'Authorization': `Bearer ${process.env.TEST_TOKEN}` }
      });
      
      expect(response.status()).toBe(200);
    });

    test('POST /api/tasks creates new task', async ({ request }) => {
      const response = await request.post('https://api.yourdomain.com/api/tasks', {
        headers: { 'Authorization': `Bearer ${process.env.TEST_TOKEN}` },
        data: {
          title: 'API Test Task',
          description: 'Created via API',
          priority: 'high'
        }
      });
      
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.id).toBeTruthy();
    });

    test('PUT /api/tasks/:id updates task', async ({ request }) => {
      const response = await request.put('https://api.yourdomain.com/api/tasks/task-id', {
        headers: { 'Authorization': `Bearer ${process.env.TEST_TOKEN}` },
        data: { title: 'Updated via API' }
      });
      
      expect(response.status()).toBe(200);
    });

    test('DELETE /api/tasks/:id removes task', async ({ request }) => {
      const response = await request.delete('https://api.yourdomain.com/api/tasks/task-id', {
        headers: { 'Authorization': `Bearer ${process.env.TEST_TOKEN}` }
      });
      
      expect(response.status()).toBe(204);
    });
  });

  test.describe('Error Handling', () => {
    test('Network error is handled gracefully', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true);
      
      await page.goto('https://yourdomain.com');
      
      // Should show error message
      const errorElement = await page.locator('[role="alert"]').isVisible();
      expect(errorElement).toBeTruthy();
      
      // Go back online
      await page.context().setOffline(false);
    });

    test('API error shows user-friendly message', async ({ page }) => {
      // Simulate API returning error
      await page.route('**/api/tasks', route => {
        route.abort('failed');
      });
      
      await page.goto('https://yourdomain.com/dashboard');
      
      const errorMessage = await page.locator('[role="alert"]').textContent();
      expect(errorMessage).toContain('Unable to load');
    });
  });

  test.describe('File Upload', () => {
    test('Upload file and verify storage', async ({ page }) => {
      await page.goto('https://yourdomain.com/dashboard');
      
      // Find upload input
      const fileInput = page.locator('input[type="file"]').first();
      
      // Upload file
      await fileInput.setInputFiles({
        name: 'test-file.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('PDF test content')
      });
      
      // Wait for upload completion
      await page.waitForSelector('[data-testid="upload-success"]');
      
      // Verify file appears in list
      const uploadedFile = await page.locator('text=test-file.pdf');
      await expect(uploadedFile).toBeVisible();
    });
  });
});
```

---

## Part 8: Security Testing

### Security Headers Verification

```javascript
test.describe('Security Headers', () => {
  test('should have all required security headers', async ({ page }) => {
    const response = await page.goto('https://yourdomain.com');
    
    const headers = response.headers();
    
    expect(headers['strict-transport-security']).toContain('max-age=31536000');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-xss-protection']).toContain('1; mode=block');
    expect(headers['content-security-policy']).toBeTruthy();
  });

  test('should have CORS configured properly', async ({ page, context }) => {
    // Test CORS headers
    const corsResponse = await context.request.options('https://api.yourdomain.com/api/tasks', {
      headers: { 'Origin': 'https://yourdomain.com' }
    });
    
    const corsHeader = corsResponse.headers()['access-control-allow-origin'];
    expect(corsHeader).toBe('https://yourdomain.com');
  });
});
```

---

## Part 9: Accessibility Testing

### WCAG 2.1 Compliance

```javascript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility (WCAG 2.1)', () => {
  test('homepage should be accessible', async ({ page }) => {
    await page.goto('https://yourdomain.com');
    
    // Inject axe-core into page
    await injectAxe(page);
    
    // Check for violations
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true
      }
    });
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('https://yourdomain.com/dashboard');
    
    const h1Count = (await page.locator('h1').all()).length;
    expect(h1Count).toBe(1); // Only one h1 per page
  });

  test('should have proper alt text on images', async ({ page }) => {
    await page.goto('https://yourdomain.com');
    
    const images = await page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy(); // All images should have alt text
    }
  });

  test('should have properly labeled form inputs', async ({ page }) => {
    await page.goto('https://yourdomain.com/login');
    
    const inputs = await page.locator('input');
    const count = await inputs.count();
    
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const label = await input.getAttribute('aria-label') || 
                    await page.locator(`label[for="${await input.getAttribute('id')}"]`);
      expect(label).toBeTruthy();
    }
  });
});
```

---

## Part 10: Test Reporting & Metrics

### Consolidated Test Report

```javascript
// tests/performance/generate-report.js

import Table from 'cli-table3';
import chalk from 'chalk';
import fs from 'fs';

export function generatePerformanceReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.TEST_ENV || 'staging',
    tests: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      skipped: results.filter(r => r.skipped).length
    },
    metrics: {
      averagePageLoadTime: calculateAverage(results.map(r => r.pageLoadTime)),
      averageApiResponseTime: calculateAverage(results.map(r => r.apiResponseTime)),
      errorRate: (results.filter(r => r.error).length / results.length) * 100,
      p95LoadTime: calculatePercentile(results.map(r => r.pageLoadTime), 95),
      p99LoadTime: calculatePercentile(results.map(r => r.pageLoadTime), 99),
    },
    results: results
  };

  // Console output
  console.log(chalk.cyan('\n╔══════════════════════════════════════╗'));
  console.log(chalk.cyan('║  Performance Test Report  ║'));
  console.log(chalk.cyan('╚══════════════════════════════════════╝\n'));

  const table = new Table({
    head: ['Metric', 'Value', 'Status'],
    style: { head: [] }
  });

  table.push(['Page Load Time (Avg)', `${report.metrics.averagePageLoadTime}ms`, 
    report.metrics.averagePageLoadTime < 3000 ? chalk.green('✓') : chalk.red('✗')]);
  table.push(['API Response Time (Avg)', `${report.metrics.averageApiResponseTime}ms`,
    report.metrics.averageApiResponseTime < 500 ? chalk.green('✓') : chalk.red('✗')]);
  table.push(['Error Rate', `${report.metrics.errorRate.toFixed(2)}%`,
    report.metrics.errorRate < 1 ? chalk.green('✓') : chalk.red('✗')]);
  table.push(['p95 Load Time', `${report.metrics.p95LoadTime}ms`,
    report.metrics.p95LoadTime < 5000 ? chalk.green('✓') : chalk.red('✗')]);

  console.log(table.toString());

  // Save detailed report
  fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
  
  return report;
}

function calculateAverage(values) {
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function calculatePercentile(values, percentile) {
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}
```

---

## Execution Schedule

### Daily Testing
- **09:00** - Smoke tests and health checks
- **14:00** - Functional test suite
- **18:00** - Performance baseline

### Weekly Testing
- **Monday 08:00** - Full regression test suite
- **Wednesday 10:00** - Cross-browser testing
- **Friday 15:00** - Load testing (100 users)

### Monthly Testing
- **1st of month** - Stress testing (1000+ users)
- **15th of month** - Endurance testing (24 hours)
- **End of month** - Security audit and compliance check

---

## Success Criteria

✅ **All tests passing** - 100% test pass rate  
✅ **Performance targets met** - All Core Web Vitals in "Good" range  
✅ **No critical bugs** - Zero P1/Critical severity issues  
✅ **Security compliance** - All security headers present  
✅ **Accessibility standards** - WCAG 2.1 AA compliance  
✅ **Load capacity** - Can handle 1000+ concurrent users  
✅ **Error recovery** - Graceful handling of all failure scenarios  

---

**Testing Status:** ✅ Ready for Production  
**Last Updated:** 2026-04-17  
**Next Review:** 2026-05-17

