import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("task routes register /global/activity before /:id", () => {
  const source = fs.readFileSync("backend/src/routes/task.routes.ts", "utf8");
  const globalIndex = source.indexOf('router.get("/global/activity"');
  const byIdIndex = source.indexOf('router.get("/:id"');

  assert.ok(globalIndex >= 0, "Expected /global/activity route");
  assert.ok(byIdIndex >= 0, "Expected /:id route");
  assert.ok(globalIndex < byIdIndex, "Expected /global/activity to be registered before /:id");
});
