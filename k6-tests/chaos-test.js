import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check, group, sleep } from 'k6';
import http from 'k6/http';

// ==============================================================================
// 1. CONFIGURATION: ความโหดระดับนรก (Hell Configuration)
// ==============================================================================
export const options = {
  // ปิดการตรวจสอบ SSL (เผื่อ Localhost ใบรับรองไม่ผ่าน)
  insecureSkipTLSVerify: true,

  // กำหนด Scenario หลายรูปแบบให้ทำงานพร้อมกัน (Mixed Workload)
  scenarios: {
    // 1.1 The Tsunami: กระชากคนใช้งานจาก 0 เป็น 200 ใน 10 วินาที (ทดสอบ Auto-scale)
    spike_attack: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 }, // กระชากขึ้นเร็วมาก!
        { duration: '1m', target: 200 },  // แช่แข็งไว้
        { duration: '10s', target: 0 },   // ลงเร็ว
      ],
      gracefulStop: '0s', // ไม่มีการปรานี หยุดคือหยุด
    },

    // 1.2 The Hammer: ยิงรัวๆ แบบคงที่ เพื่อกดดัน Database Connection Pool
    stress_constant: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1m30s',
      startTime: '30s', // เริ่มหลังจาก Tsunami เริ่มไปแป๊บนึง
    },
  },

  // เกณฑ์การผ่าน (ถ้าแย่กว่านี้ถือว่าระบบล่ม)
  thresholds: {
    'http_req_failed{expected_response:true}': ['rate<0.05'],
    'http_req_duration{expected_response:true}': ['p(95)<2000'],
  },
};

// ==============================================================================
// 2. DATA GENERATOR: คลังแสงขยะ (Nasty Payloads)
// ==============================================================================
// ข้อมูลที่จะใช้ Fuzzing เพื่อพยายามพัง Logic หรือ Database
const NASTY_PAYLOADS = [
  "' OR '1'='1",              // SQL Injection Classic
  "<script>alert(1)</script>", // XSS Injection
  "A".repeat(10000),           // Buffer Overflow / Large String
  "😂".repeat(500),            // Emoji Bomb (Test Encoding)
  null,                        // Null Value
  undefined,                   // Undefined
  -1,                          // Negative Number
  999999999999999,             // Integer Overflow
  "DROP TABLE users;",         // Destructive SQL
  "{{7*7}}",                   // Template Injection
];

const BASE_URL = (__ENV.K6_BASE_URL || 'http://127.0.0.1:3694').replace(/\/$/, '');
const BEARER_TOKEN = __ENV.K6_BEARER_TOKEN;

function pickNastyValue() {
  return NASTY_PAYLOADS[randomIntBetween(0, NASTY_PAYLOADS.length - 1)];
}

function getAuthHeaders() {
  if (!BEARER_TOKEN) return {};
  return { Authorization: `Bearer ${BEARER_TOKEN}` };
}

function ensureCsrfToken() {
  const res = http.get(`${BASE_URL}/api/csrf-token`, { headers: getAuthHeaders() });
  const csrfToken =
    res.headers['X-CSRF-Token'] ||
    res.headers['x-csrf-token'] ||
    res.headers['X-Csrf-Token'] ||
    res.headers['x-csrf-token'];

  return { res, csrfToken };
}

// ==============================================================================
// 3. TEST LOGIC: เริ่มปฏิบัติการ
// ==============================================================================
export default function () {

  // สุ่มเลือกพฤติกรรม (User Behavior)
  const behavior = randomIntBetween(1, 10);

  // --------------------------------------------------------------------------
  // Scenario A: GET Request ถล่ม Read (70% ของ Traffic)
  // --------------------------------------------------------------------------
  if (behavior <= 7) {
    group('API Read Storm', () => {
      const requests = [
        ['GET', `${BASE_URL}/api/health`],
      ];

      if (BEARER_TOKEN) {
        requests.push([
          'GET',
          `${BASE_URL}/api/tasks/workspace`,
          null,
          { headers: getAuthHeaders() },
        ]);
      }

      const responses = http.batch(requests);

      check(responses[0], {
        'GET /api/health 200': (r) => r.status === 200,
        'GET /api/health fast': (r) => r.timings.duration < 1000,
      });

      if (responses[1]) {
        check(responses[1], {
          'GET /api/tasks/workspace < 400': (r) => r.status > 0 && r.status < 400,
        });
      }
    });
  }

  // --------------------------------------------------------------------------
  // Scenario B: POST Request ถล่ม Write & Logic (30% ของ Traffic)
  // --------------------------------------------------------------------------
  else {
    group('API Write Chaos', () => {
      if (!BEARER_TOKEN) {
        const unauthenticated = http.post(`${BASE_URL}/api/tasks`, JSON.stringify({ title: 'unauth' }), {
          headers: { 'Content-Type': 'application/json' },
        });

        check(unauthenticated, {
          'POST /api/tasks without auth is rejected': (r) => r.status === 401 || r.status === 403,
        });
        return;
      }

      const { res: csrfBootstrap, csrfToken } = ensureCsrfToken();
      check(csrfBootstrap, {
        'GET /api/csrf-token 200': (r) => r.status === 200,
      });

      if (!csrfToken) {
        check(csrfBootstrap, {
          'CSRF header present': (r) => false,
        });
        return;
      }

      const payload = JSON.stringify({
        title: `Chaos ${Date.now()} ${String(pickNastyValue() ?? '').slice(0, 120)}`,
        description: String(pickNastyValue() ?? ''),
        priority: ['low', 'medium', 'high', 'urgent'][randomIntBetween(0, 3)],
      });

      const params = {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
      };

      const res = http.post(`${BASE_URL}/api/tasks`, payload, params);

      check(res, {
        'POST /api/tasks status is expected': (r) => [200, 201, 400, 401, 403, 429].includes(r.status),
        'Server survived crash': (r) => r.status !== 500 && r.status !== 502 && r.status !== 503,
      });
    });
  }

  // Random Sleep: พักบ้างไม่พักบ้าง ให้กราฟมันแกว่งแบบคาดเดาไม่ได้
  sleep(randomIntBetween(0.1, 1.5));
}
