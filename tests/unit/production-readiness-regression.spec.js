import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { csrfProtection, generateCSRFToken } from "../../backend/src/middleware/csrf.middleware.ts";
import { optionalAuth } from "../../backend/src/middleware/auth.middleware.ts";

const repoRoot = process.cwd();

function readRepoFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

test("vercel config maps routes and documents production env names without legacy env secrets", () => {
  const config = JSON.parse(readRepoFile("vercel.json"));
  const envExample = readRepoFile(".env.example");

  assert.equal(config.$schema, "https://openapi.vercel.sh/vercel.json");
  assert.equal(config.framework, "vite");
  assert.equal(config.outputDirectory, "frontend/dist");
  assert.equal(config.envs, undefined, "vercel.json must not use the invalid envs key");
  assert.equal(config.env, undefined, "use Vercel Environment Variables UI/CLI instead of legacy vercel.json env");
  assert.equal(config.build, undefined, "use Vercel Environment Variables UI/CLI instead of legacy vercel.json build.env");
  assert.equal(config.builds, undefined, "avoid legacy builds in vercel.json");
  assert.equal(config.functions["api/[...all].ts"].maxDuration, 60);
  assert.doesNotMatch(JSON.stringify(config), /nodeVersion/i, "avoid pinning nodeVersion in vercel.json");

  for (const key of [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_STORAGE_BUCKET",
    "JWT_SECRET",
    "ENCRYPTION_KEY",
    "BLOB_READ_WRITE_TOKEN",
    "CRON_SECRET",
    "ALLOWED_ORIGIN",
    "LINE_CHANNEL_ACCESS_TOKEN",
    "LINE_CHANNEL_SECRET",
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
    "VITE_ENABLE_QUICK_LOGIN",
  ]) {
    assert.match(envExample, new RegExp(`^${key}=`, "m"), `missing env checklist entry for ${key}`);
  }

  const assetRoute = config.routes.find((route) => String(route.src).includes("woff2"));
  assert.ok(assetRoute, "missing static asset route");
  assert.match(assetRoute.src, /\\\.\(.*js\|css/s);
  assert.equal(assetRoute.dest, undefined);
  assert.equal(assetRoute.headers["Cache-Control"], "public, max-age=31536000, immutable");

  const apiRoute = config.routes.find((route) => route.src === "/api/(.*)");
  assert.ok(apiRoute, "missing api route");
  assert.equal(apiRoute.dest, "/api/[...all].ts");

  const spaFallbackRoute = config.routes.find((route) => route.dest === "/index.html");
  assert.ok(spaFallbackRoute, "missing spa fallback route");

  assert.ok(Array.isArray(config.crons), "missing Vercel Cron Jobs");
  assert.equal(config.crons.length, 2, "keep cron count hobby-compatible");
  assert.ok(config.crons.some((cron) => cron.path === "/api/cron/daily-morning"));
  assert.ok(config.crons.some((cron) => cron.path === "/api/cron/daily-evening"));
  assert.ok(config.crons.every((cron) => /\d+\s+\d+\s+\*\s+\*\s+\*/.test(cron.schedule)));
});

test("vercel environment artifacts are not kept in source control", () => {
  const gitignore = readRepoFile(".gitignore");

  assert.equal(existsSync(join(repoRoot, ".vercel-prod-check.env")), false);
  assert.match(gitignore, /^\.vercel-prod-check\.env$/m);
});

test("production runtime validation rejects missing required secrets", async () => {
  const runtimeUrl = pathToFileURL(join(repoRoot, "backend/src/config/runtime.ts")).href;
  const runtime = await import(`${runtimeUrl}?case=${Date.now()}`);
  const previous = { ...process.env };

  try {
    process.env.NODE_ENV = "production";
    for (const key of [
      "JWT_SECRET",
      "ENCRYPTION_KEY",
      "BLOB_READ_WRITE_TOKEN",
      "CRON_SECRET",
      "ALLOWED_ORIGIN",
    ]) {
      delete process.env[key];
    }

    assert.throws(
      () => runtime.validateProductionRuntimeEnv(),
      /Missing required production environment variables/
    );
  } finally {
    process.env = previous;
  }
});

test("production runtime does not hard-require REDIS_URL", async () => {
  const runtimeUrl = pathToFileURL(join(repoRoot, "backend/src/config/runtime.ts")).href;
  const runtime = await import(`${runtimeUrl}?case=redis-${Date.now()}`);
  const previous = { ...process.env };

  try {
    process.env.NODE_ENV = "production";
    process.env.FIREBASE_PROJECT_ID = "demo-project";
    process.env.FIREBASE_PRIVATE_KEY = "x".repeat(40);
    process.env.FIREBASE_CLIENT_EMAIL = "demo@example.com";
    process.env.FIREBASE_STORAGE_BUCKET = "demo.firebasestorage.app";
    process.env.JWT_SECRET = "j".repeat(32);
    process.env.ENCRYPTION_KEY = "e".repeat(32);
    process.env.BLOB_READ_WRITE_TOKEN = "b".repeat(32);
    process.env.CRON_SECRET = "c".repeat(32);
    process.env.ALLOWED_ORIGIN = "https://example.com";
    delete process.env.REDIS_URL;

    assert.doesNotThrow(() => runtime.validateProductionRuntimeEnv());
  } finally {
    process.env = previous;
  }
});

test("csrf protection is stateless and HMAC signed", () => {
  const source = readRepoFile("backend/src/middleware/csrf.middleware.ts");
  const serverSource = readRepoFile("backend/server.ts");
  const apiSource = readRepoFile("backend/api/[...all].ts");
  const initDbSource = readRepoFile("backend/src/database/init.ts");
  const cronRouteSource = readRepoFile("backend/src/routes/cron.routes.ts");
  const taskQuerySource = readRepoFile("backend/src/database/queries/task.queries.ts");

  assert.match(source, /createHmac/);
  assert.doesNotMatch(source, /new Map<|activeTokens/);
  assert.match(source, /timingSafeEqual/);
  assert.match(serverSource, /app\.get\("\/api\/csrf-token",\s*optionalAuth,\s*csrfProtection\.token/s);
  assert.match(apiSource, /app\.get\("\/api\/csrf-token",\s*optionalAuth,\s*csrfProtection\.token/s);
  assert.doesNotMatch(initDbSource, /process\.exit\s*\(/);
  assert.match(serverSource, /app\.get\("\/api\/live"/);
  assert.match(apiSource, /app\.get\("\/api\/live"/);
  assert.match(serverSource, /dependencies:\s*\{\s*firestore\s*\}/s);
  assert.match(apiSource, /dependencies:\s*\{\s*firestore\s*\}/s);
  assert.match(cronRouteSource, /probeDatabaseHealth/);
  assert.match(taskQuerySource, /export async function findActiveTasks/);
  assert.doesNotMatch(taskQuerySource, /findAllTasks\(\);\s*const activeTasks/s);
});

function runCsrfValidation({ token, cookieToken = token, userId = "admin", method = "POST" }) {
  const req = {
    method,
    headers: { "x-csrf-token": token },
    cookies: { "csrf-token": cookieToken },
    body: {},
    path: "/api/auth/profile",
    ip: "127.0.0.1",
    user: userId ? { id: userId } : undefined,
  };
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;

  csrfProtection.validate(req, res, () => {
    nextCalled = true;
  });

  return { statusCode: res.statusCode, body: res.body, nextCalled };
}

test("csrf validation binds tokens to the authenticated user subject", () => {
  const previousSecret = process.env.CSRF_SECRET;
  const previousConsoleError = console.error;
  process.env.CSRF_SECRET = "unit-test-csrf-secret-with-32-chars";
  console.error = () => {};

  try {
    const anonymousToken = generateCSRFToken("anonymous");
    const adminToken = generateCSRFToken("admin");

    const mismatch = runCsrfValidation({ token: anonymousToken, userId: "admin" });
    assert.equal(mismatch.nextCalled, false);
    assert.equal(mismatch.statusCode, 403);
    assert.match(mismatch.body.error, /session mismatch/);

    const valid = runCsrfValidation({ token: adminToken, userId: "admin" });
    assert.equal(valid.statusCode, 200);
    assert.equal(valid.nextCalled, true);

    const tampered = runCsrfValidation({ token: adminToken, cookieToken: anonymousToken, userId: "admin" });
    assert.equal(tampered.nextCalled, false);
    assert.equal(tampered.statusCode, 403);
    assert.match(tampered.body.error, /mismatch/);
  } finally {
    console.error = previousConsoleError;
    if (previousSecret === undefined) {
      delete process.env.CSRF_SECRET;
    } else {
      process.env.CSRF_SECRET = previousSecret;
    }
  }
});

test("optional auth ignores CRON_SECRET bearer tokens on cron routes", async () => {
  const previousSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "cron-secret-for-tests";

  const req = {
    path: "/cron/daily-morning",
    originalUrl: "/api/cron/daily-morning",
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  };
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  let nextCalled = false;
  await optionalAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, undefined);

  if (previousSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = previousSecret;
  }
});

test("private Vercel Blob downloads are streamed through the authenticated endpoint", () => {
  const source = readRepoFile("backend/src/routes/file.routes.ts");

  assert.match(source, /get\(file\.blob_url,\s*{\s*access:\s*"private"/s);
  assert.match(source, /Readable\.fromWeb/);
  assert.doesNotMatch(source, /res\.redirect\(file\.blob_url\)/);
});

test("production server uploads stay within Vercel request body limits", () => {
  const source = readRepoFile("backend/src/routes/task.routes.ts");

  assert.match(source, /VERCEL_SERVER_UPLOAD_LIMIT_BYTES\s*=\s*4\s*\*\s*1024\s*\*\s*1024/);
  assert.match(source, /validateFileUpload\(file,\s*{\s*maxSizeBytes:\s*maxUploadBytes/s);
});
