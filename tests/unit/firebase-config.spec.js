import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("frontend Firebase config is sourced from Vite env", () => {
  const source = readFileSync(join(process.cwd(), "frontend/src/lib/firebase.ts"), "utf8");

  for (const key of [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
  ]) {
    assert.match(source, new RegExp(`readFirebaseEnv\\("${key}"\\)`));
  }

  assert.doesNotMatch(source, /projectId:\s*"intersite-track02"/);
  assert.doesNotMatch(source, /apiKey:\s*"AIza/);
});
