import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test("debug endpoint is removed from server/routes/index.ts", () => {
  const routesFile = readFileSync(
    join(__dirname, "../../server/routes/index.ts"),
    "utf-8"
  );

  // Verify debug endpoint code is removed
  assert(
    !routesFile.includes("/debug/firebase"),
    "Debug endpoint /debug/firebase should not exist in routes/index.ts"
  );

  // Verify no debug output of Firebase credentials
  assert(
    !routesFile.includes("FIREBASE_PRIVATE_KEY"),
    "Firebase private key should not be exposed in routes"
  );
  assert(
    !routesFile.includes("FIREBASE_CLIENT_EMAIL"),
    "Firebase client email should not be exposed in routes"
  );
  assert(
    !routesFile.includes("FIREBASE_PROJECT_ID"),
    "Firebase project ID should not be exposed in routes"
  );
});
