import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeContent } from "../../scripts/lib/security-sanitizer.ts";

test("sanitizeContent redacts sensitive env values", () => {
  const result = sanitizeContent("JWT_SECRET=super-secret-value\nPORT=3694");

  assert.match(result, /JWT_SECRET=\[REDACTED\]/);
  assert.match(result, /PORT=3694/);
});

test("sanitizeContent does not redact vscode file links", () => {
  const input = "[Open](vscode://file/C:/TaskAm-main/TaskAm-main/src/services/authService.ts:43)";
  const result = sanitizeContent(input);

  assert.equal(result, input);
});
