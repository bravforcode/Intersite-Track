import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Counter, Gauge } from "k6/metrics";

// ═════════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE PERFORMANCE TEST SUITE
// Test scenarios: Load Testing, Stress Testing, Spike Testing, Endurance Testing
// ═════════════════════════════════════════════════════════════════════════════════

const BASE_URL = __ENV.BASE_URL || "http://localhost:3694";
const TEST_SCENARIO = __ENV.SCENARIO || "smoke";
const RAMP_UP_DURATION = "30s";
const STEADY_LOAD = "5m";
const RAMP_DOWN_DURATION = "30s";

// Custom metrics
const apiResponseTime = new Trend("api_response_time");
const apiErrors = new Counter("api_errors");
const activeConnections = new Gauge("active_connections");
const pageLoadTime = new Trend("page_load_time");
const authenticationTime = new Trend("auth_time");
const databaseQueryTime = new Trend("db_query_time");

export const options = {
  stages:
    TEST_SCENARIO === "smoke"
      ? [
          { duration: "1m", target: 5 },
          { duration: "1m", target: 0 },
        ]
      : TEST_SCENARIO === "load"
        ? [
            { duration: RAMP_UP_DURATION, target: 50 },
            { duration: STEADY_LOAD, target: 50 },
            { duration: RAMP_DOWN_DURATION, target: 0 },
          ]
        : TEST_SCENARIO === "stress"
          ? [
              { duration: "2m", target: 100 },
              { duration: "2m", target: 200 },
              { duration: "2m", target: 300 },
              { duration: "1m", target: 0 },
            ]
          : TEST_SCENARIO === "spike"
            ? [
                { duration: "1m", target: 50 },
                { duration: "10s", target: 500 },
                { duration: "1m", target: 50 },
                { duration: "10s", target: 0 },
              ]
            : // endurance
              [
                { duration: "2m", target: 25 },
                { duration: "20m", target: 25 },
                { duration: "2m", target: 0 },
              ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000", "max<2000"],
    http_req_failed: ["rate<0.1"],
    api_response_time: ["p(95)<500", "p(99)<1000"],
    api_errors: ["count<50"],
  },
  ext: {
    loadimpact: {
      projectID: 3478062,
      name: `${TEST_SCENARIO} test - ${new Date().toISOString()}`,
    },
  },
};

export function setup() {
  return {
    timestamp: new Date().toISOString(),
    scenario: TEST_SCENARIO,
  };
}

export default function (data) {
  activeConnections.add(1);

  try {
    // ─────────────────────────────────────────────────────────────────────
    // Test 1: Health Check & API Availability
    // ─────────────────────────────────────────────────────────────────────
    group("Health Check", () => {
      const res = http.get(`${BASE_URL}/api/live`, {
        tags: { name: "HealthCheck" },
        timeout: "10s",
      });

      const healthCheckStart = Date.now();
      check(res, {
        "Health check status 200": (r) => r.status === 200,
        "Health check responds": (r) => r.body.length > 0,
        "Health check under 500ms": (r) => r.timings.duration < 500,
      });
      apiResponseTime.add(Date.now() - healthCheckStart);
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 2: Authentication Flow
    // ─────────────────────────────────────────────────────────────────────
    group("Authentication", () => {
      const authStart = Date.now();

      const loginRes = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({
          email: `testuser${Math.random()}@test.com`,
          password: "Password123!@#",
        }),
        {
          headers: { "Content-Type": "application/json" },
          tags: { name: "Login" },
          timeout: "10s",
        }
      );

      check(loginRes, {
        "Login response valid": (r) =>
          r.status === 200 || r.status === 201 || r.status === 401,
        "Login response time < 1s": (r) => r.timings.duration < 1000,
      });

      authenticationTime.add(Date.now() - authStart);

      if (loginRes.status === 200 || loginRes.status === 201) {
        const token = loginRes.json("token") || loginRes.cookies.auth?.value;

        // ─────────────────────────────────────────────────────────────────────
        // Test 3: Authenticated API Requests
        // ─────────────────────────────────────────────────────────────────────
        group("API Operations (Authenticated)", () => {
          const apiStart = Date.now();

          // GET user profile
          const profileRes = http.get(`${BASE_URL}/api/user/profile`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            tags: { name: "GetProfile" },
            timeout: "10s",
          });

          check(profileRes, {
            "Profile fetch status 200": (r) => r.status === 200,
            "Profile response under 300ms": (r) => r.timings.duration < 300,
          });

          apiResponseTime.add(Date.now() - apiStart);
        });

        // ─────────────────────────────────────────────────────────────────────
        // Test 4: Database Query Performance
        // ─────────────────────────────────────────────────────────────────────
        group("Database Operations", () => {
          const dbStart = Date.now();

          const dbRes = http.get(`${BASE_URL}/api/data/list?limit=10`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            tags: { name: "DatabaseQuery" },
            timeout: "10s",
          });

          check(dbRes, {
            "Database query status 200": (r) => r.status === 200,
            "Database query under 1s": (r) => r.timings.duration < 1000,
          });

          databaseQueryTime.add(Date.now() - dbStart);
        });

        // ─────────────────────────────────────────────────────────────────────
        // Test 5: File Upload Performance
        // ─────────────────────────────────────────────────────────────────────
        group("File Upload", () => {
          const uploadStart = Date.now();

          const testFile = JSON.stringify({
            filename: `test_${Date.now()}.txt`,
            content: "x".repeat(1024 * 10), // 10KB
          });

          const uploadRes = http.post(`${BASE_URL}/api/files/upload`, testFile, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            tags: { name: "FileUpload" },
            timeout: "15s",
          });

          check(uploadRes, {
            "Upload status success": (r) =>
              r.status === 200 || r.status === 201,
            "Upload under 2s": (r) => r.timings.duration < 2000,
          });

          apiResponseTime.add(Date.now() - uploadStart);
        });

        // ─────────────────────────────────────────────────────────────────────
        // Test 6: Concurrent API Calls
        // ─────────────────────────────────────────────────────────────────────
        group("Concurrent Operations", () => {
          const concurrentStart = Date.now();

          const requests = [
            {
              method: "GET",
              url: `${BASE_URL}/api/data/summary`,
              headers: { Authorization: `Bearer ${token}` },
              tags: { name: "ConcurrentSummary" },
            },
            {
              method: "GET",
              url: `${BASE_URL}/api/stats`,
              headers: { Authorization: `Bearer ${token}` },
              tags: { name: "ConcurrentStats" },
            },
            {
              method: "GET",
              url: `${BASE_URL}/api/notifications`,
              headers: { Authorization: `Bearer ${token}` },
              tags: { name: "ConcurrentNotifications" },
            },
          ];

          const responses = http.batch(requests);

          responses.forEach((res, idx) => {
            check(res, {
              "Concurrent request status 200": (r) => r.status === 200,
              "Concurrent request under 500ms": (r) =>
                r.timings.duration < 500,
            });
          });

          apiResponseTime.add(Date.now() - concurrentStart);
        });

        // ─────────────────────────────────────────────────────────────────────
        // Test 7: Logout
        // ─────────────────────────────────────────────────────────────────────
        group("Logout", () => {
          const logoutRes = http.post(
            `${BASE_URL}/api/auth/logout`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              tags: { name: "Logout" },
              timeout: "10s",
            }
          );

          check(logoutRes, {
            "Logout status 200": (r) => r.status === 200,
          });
        });
      }
    });
  } catch (error) {
    apiErrors.add(1);
    console.error(`Error in test: ${error}`);
  } finally {
    activeConnections.add(-1);
    sleep(Math.random() * 2 + 1); // 1-3 seconds between requests
  }
}

export function teardown(data) {
  console.log(`
    ════════════════════════════════════════════════════════════════════════════
    PERFORMANCE TEST SUMMARY
    ════════════════════════════════════════════════════════════════════════════
    Scenario: ${data.scenario}
    Timestamp: ${data.timestamp}
    ════════════════════════════════════════════════════════════════════════════
  `);
}
