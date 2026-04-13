import test from "node:test";
import assert from "node:assert/strict";
import { resolveAuthBootstrapDecision } from "../../frontend/src/utils/authBootstrap.ts";

test("fetches profile only during initial auth bootstrap when no stored user exists", () => {
  const decision = resolveAuthBootstrapDecision({
    initialAuthResolved: false,
    hasFirebaseUser: true,
    hasStoredUser: false,
    hasInMemoryUser: false,
    profileRequestInFlight: false,
  });

  assert.equal(decision, "fetch-profile");
});

test("reuses stored session instead of fetching profile again on initial auth bootstrap", () => {
  const decision = resolveAuthBootstrapDecision({
    initialAuthResolved: false,
    hasFirebaseUser: true,
    hasStoredUser: true,
    hasInMemoryUser: false,
    profileRequestInFlight: false,
  });

  assert.equal(decision, "reuse-stored-user");
});

test("does not refetch profile after the initial auth state has been resolved", () => {
  const decision = resolveAuthBootstrapDecision({
    initialAuthResolved: true,
    hasFirebaseUser: true,
    hasStoredUser: false,
    hasInMemoryUser: false,
    profileRequestInFlight: false,
  });

  assert.equal(decision, "noop");
});
