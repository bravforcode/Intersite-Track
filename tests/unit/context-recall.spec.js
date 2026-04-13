import test from "node:test";
import assert from "node:assert/strict";
import {
  inferQuerySignals,
  parsePlaybooksFromMarkdown,
} from "../../scripts/lib/context-recall.ts";

test("inferQuerySignals detects stacked intent for auth bug fixes", () => {
  const signals = inferQuerySignals("fix auth bug in login flow");
  const names = signals.map((signal) => signal.name);

  assert.ok(names.includes("bug-fix"));
  assert.ok(names.includes("auth"));
});

test("parsePlaybooksFromMarkdown parses skills rules checklist and category boosts", () => {
  const markdown = `# Session Playbooks

## Auth Work
match: auth, login, token
skills:
- playwright
- security-best-practices
rules:
- Read backend auth flow first.
checklist:
- Inspect auth middleware
- Verify token refresh path
note-hints:
- auth
- login
category-boosts:
- architecture: 16
- agent-log: 8
`;

  const playbooks = parsePlaybooksFromMarkdown(markdown, "test.md");

  assert.equal(playbooks.length, 1);
  assert.deepEqual(playbooks[0].matchTerms, ["auth", "login", "token"]);
  assert.deepEqual(playbooks[0].skills, ["playwright", "security-best-practices"]);
  assert.deepEqual(playbooks[0].checklist, ["Inspect auth middleware", "Verify token refresh path"]);
  assert.equal(playbooks[0].categoryBoosts.architecture, 16);
  assert.equal(playbooks[0].categoryBoosts.agentLog, 8);
});
