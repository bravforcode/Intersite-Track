import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQuickLoginAccounts,
  isQuickLoginEnabled,
} from "../../frontend/src/config/quickLogin.ts";

test("buildQuickLoginAccounts only returns accounts with both email and password", () => {
  const accounts = buildQuickLoginAccounts({
    VITE_QUICK_LOGIN_ADMIN_EMAIL: "ADMIN@TASKAM.LOCAL ",
    VITE_QUICK_LOGIN_ADMIN_PASSWORD: "admin123",
    VITE_QUICK_LOGIN_STAFF_EMAIL: "somchai@taskam.local",
  });

  assert.deepEqual(accounts, [{
    label: "แอดมิน (Admin)",
    subtitle: "admin@taskam.local",
    email: "admin@taskam.local",
    password: "admin123",
  }]);
});

test("quick login requires explicit enablement and a non-production environment", () => {
  assert.equal(
    isQuickLoginEnabled({
      appEnvironment: "development",
      flagEnabled: true,
      accountCount: 1,
    }),
    true
  );

  assert.equal(
    isQuickLoginEnabled({
      appEnvironment: "production",
      flagEnabled: true,
      accountCount: 1,
    }),
    false
  );

  assert.equal(
    isQuickLoginEnabled({
      appEnvironment: "development",
      flagEnabled: false,
      accountCount: 1,
    }),
    false
  );
});
