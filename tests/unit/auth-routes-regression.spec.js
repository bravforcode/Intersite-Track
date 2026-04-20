import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("auth profile route is not throttled by login limiter", () => {
  const source = readFileSync(join(process.cwd(), "backend/src/routes/auth.routes.ts"), "utf8");

  assert.match(source, /router\.post\("\/auth\/profile",\s*requireAuth,\s*getProfile\);/);
  assert.doesNotMatch(source, /router\.post\("\/auth\/profile",\s*loginRateLimiter/);
});
