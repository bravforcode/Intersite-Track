import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSuggestedPlaybook,
  generatePlaybookSuggestions,
  hasPlaybookCoverage,
} from "../../scripts/lib/playbook-suggester.ts";

test("hasPlaybookCoverage detects existing auth playbook coverage", () => {
  const signal = {
    name: "auth",
    score: 18,
    keywords: ["auth", "login", "token"],
    noteHints: ["auth", "login"],
    skillHints: ["security-best-practices"],
    categoryBoosts: { architecture: 10 },
  };
  const existing = [{
    name: "Auth Work",
    source: "test.md",
    matchTerms: ["auth", "login", "session"],
    skills: ["playwright"],
    rules: [],
    checklist: [],
    noteHints: [],
    categoryBoosts: {},
  }];

  assert.equal(hasPlaybookCoverage(existing, signal), true);
});

test("generatePlaybookSuggestions proposes uncovered backend playbook", () => {
  const signal = {
    name: "api-backend",
    score: 20,
    keywords: ["api", "route", "backend", "middleware"],
    noteHints: ["api", "backend"],
    skillHints: ["backend-patterns"],
    categoryBoosts: { architecture: 14 },
  };

  const suggestions = generatePlaybookSuggestions([
    {
      signal,
      documents: 3,
      totalScore: 30,
      evidence: ["Inspect backend route and middleware chain"],
      sources: ["Meta/agent-log/demo.md"],
    },
  ], []);

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].proposal.name, "API / Backend Work");
  assert.ok(suggestions[0].proposal.checklist.includes("Trace caller to route and handler"));
});

test("buildSuggestedPlaybook falls back to signal-derived defaults", () => {
  const playbook = buildSuggestedPlaybook({
    name: "custom-flow",
    score: 12,
    keywords: ["custom", "flow", "pipeline"],
    noteHints: ["custom"],
    skillHints: ["playwright"],
    categoryBoosts: { architecture: 8 },
  });

  assert.equal(playbook.name, "Custom Flow");
  assert.deepEqual(playbook.skills, ["playwright"]);
  assert.ok(playbook.checklist.length >= 3);
});
