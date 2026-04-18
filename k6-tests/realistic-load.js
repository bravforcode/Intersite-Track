import http from "k6/http";
import { check, sleep } from "k6";
import { buildHtmlReport } from "./lib/summary-report.js";

const BASE_URL = (__ENV.K6_BASE_URL || "http://localhost:3694").replace(/\/$/, "");
const API_BASE = `${BASE_URL}/api`;
const BEARER_TOKEN = __ENV.K6_BEARER_TOKEN;
const USER_ID = __ENV.K6_USER_ID;

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 50 },
    { duration: "2m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

export function setup() {
  return { ready: true };
}

export default function (data) {
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, {
    "health 200": (r) => r.status === 200,
  });

  if (BEARER_TOKEN) {
    const workspace = http.get(`${API_BASE}/tasks/workspace`, {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
    });
    check(workspace, {
      "workspace < 400": (r) => r.status > 0 && r.status < 400,
    });

    if (USER_ID) {
      const unreadCount = http.get(`${API_BASE}/notifications/${USER_ID}/unread-count`, {
        headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
      });
      check(unreadCount, {
        "unread-count < 400": (r) => r.status > 0 && r.status < 400,
      });
    }
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    "k6-summary.json": JSON.stringify(data, null, 2),
    "k6-report.html": buildHtmlReport(data),
  };
}
