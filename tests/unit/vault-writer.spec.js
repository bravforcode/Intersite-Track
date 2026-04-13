import test from "node:test";
import assert from "node:assert/strict";
import {
  autoMarkerEnd,
  autoMarkerStart,
  upsertAutoSectionContent,
} from "../../scripts/lib/vault-writer.ts";

test("upsertAutoSectionContent appends named marker block when missing", () => {
  const existing = "---\ntitle: Demo\n---\n\n# Notes\n\nManual content.\n";
  const updated = upsertAutoSectionContent(existing, "Auto body", "gracia-playbooks");

  assert.ok(updated.includes("Manual content."));
  assert.ok(updated.includes(autoMarkerStart("gracia-playbooks")));
  assert.ok(updated.includes("Auto body"));
  assert.ok(updated.includes(autoMarkerEnd("gracia-playbooks")));
});

test("upsertAutoSectionContent replaces only the targeted named marker block", () => {
  const existing = [
    "# Title",
    autoMarkerStart("gracia-playbooks"),
    "Old body",
    autoMarkerEnd("gracia-playbooks"),
    "",
    autoMarkerStart("other-section"),
    "Keep me",
    autoMarkerEnd("other-section"),
    "",
  ].join("\n");

  const updated = upsertAutoSectionContent(existing, "New body", "gracia-playbooks");

  assert.ok(updated.includes("New body"));
  assert.ok(!updated.includes("Old body"));
  assert.ok(updated.includes("Keep me"));
});

test("upsertAutoSectionContent preserves legacy generic marker behavior", () => {
  const existing = "# Title\n<!-- AUTO-SYNC:START -->\nOld\n<!-- AUTO-SYNC:END -->\n";
  const updated = upsertAutoSectionContent(existing, "New");

  assert.ok(updated.includes("New"));
  assert.ok(!updated.includes("Old"));
  assert.ok(updated.includes("<!-- AUTO-SYNC:START -->"));
  assert.ok(updated.includes("<!-- AUTO-SYNC:END -->"));
});
