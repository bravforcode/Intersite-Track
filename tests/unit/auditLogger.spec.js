import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeAuditPayload } from "../../backend/src/utils/auditLogger.ts";

test("sanitizeAuditPayload removes undefined fields recursively", () => {
  const payload = sanitizeAuditPayload({
    title: "Task",
    task_type_name: undefined,
    nested: {
      keep: "yes",
      skip: undefined,
    },
    items: [
      { id: 1, note: undefined },
      undefined,
      "ok",
    ],
  });

  assert.deepEqual(payload, {
    title: "Task",
    nested: {
      keep: "yes",
    },
    items: [
      { id: 1 },
      null,
      "ok",
    ],
  });
});
