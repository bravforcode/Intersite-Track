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
    role: "admin",
    label: "แอดมิน (Admin)",
    subtitle: "admin@taskam.local",
    email: "admin@taskam.local",
    password: "admin123",
  }]);
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
      subtitle: "somchai@taskam.local",
      email: "somchai@taskam.local",
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
