import test from "node:test";
import assert from "node:assert/strict";
import { isNotificationSSEAuthFailureStatus } from "../../frontend/src/utils/notificationSse.ts";

test("notification SSE treats auth failures as non-retryable", () => {
  assert.equal(isNotificationSSEAuthFailureStatus(401), true);
  assert.equal(isNotificationSSEAuthFailureStatus(403), true);
  assert.equal(isNotificationSSEAuthFailureStatus(429), false);
  assert.equal(isNotificationSSEAuthFailureStatus(500), false);
});
