import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQuickLoginAccounts,
  isQuickLoginEnabled,
} from "../../frontend/src/config/quickLogin.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("buildQuickLoginAccounts preserves configured accounts and falls back for missing role shortcuts", () => {
  const accounts = buildQuickLoginAccounts({
    VITE_QUICK_LOGIN_ADMIN_EMAIL: "ADMIN@TASKAM.LOCAL ",
    VITE_QUICK_LOGIN_ADMIN_PASSWORD: "admin123",
    VITE_QUICK_LOGIN_STAFF_EMAIL: "staff@taskam.local",
  });

  assert.deepEqual(accounts, [
    {
      role: "admin",
      label: "แอดมิน (Admin)",
      subtitle: "admin@taskam.local",
      email: "admin@taskam.local",
      password: "admin123",
    },
    {
      role: "staff",
      label: "พนักงาน (Staff)",
      subtitle: "staff@taskam.local",
      email: "staff@taskam.local",
    },
  ]);
});

test("buildQuickLoginAccounts falls back to default role logins when env credentials are absent", () => {
  assert.deepEqual(buildQuickLoginAccounts({}), [
    {
      role: "admin",
      label: "แอดมิน (Admin)",
      subtitle: "admin@taskam.local",
      email: "admin@taskam.local",
    },
    {
      role: "staff",
      label: "พนักงาน (Staff)",
      subtitle: "staff@taskam.local",
      email: "staff@taskam.local",
    },
  ]);
});

test("quick login requires explicit enablement and at least one account", () => {
  assert.equal(
    isQuickLoginEnabled({
      flagEnabled: true,
      accountCount: 1,
    }),
    true
  );

  assert.equal(
    isQuickLoginEnabled({
      flagEnabled: true,
      accountCount: 0,
    }),
    false
  );

  assert.equal(
    isQuickLoginEnabled({
      flagEnabled: false,
      accountCount: 1,
    }),
    false
  );
});

test("quick role login honors the flag and normalizes Vercel line endings", () => {
  const backendSource = readFileSync(join(process.cwd(), "backend/src/controllers/auth.controller.ts"), "utf8");
  const frontendSource = readFileSync(join(process.cwd(), "frontend/src/config/features.ts"), "utf8");

  assert.match(backendSource, /replace\(\/\\\\r\|\\\\n\/g, ""\)\.trim\(\)\.toLowerCase\(\)/);
  assert.match(frontendSource, /replace\(\/\\\\r\|\\\\n\/g, ""\)\.trim\(\)\.toLowerCase\(\)/);
  assert.match(backendSource, /runtimeEnvironment\.includes\("production"\)\) return true/);
  assert.match(frontendSource, /isProductionApp \|\|/);
  assert.doesNotMatch(frontendSource, /!isProductionBuild &&/);
  assert.doesNotMatch(backendSource, /ENABLE_PRODUCTION_QUICK_ROLE_LOGIN/);
});
