import fs from "node:fs";
import path from "node:path";
import { config } from "../config/sync.config.js";
import {
  inferQuerySignals,
  parsePlaybooksFromMarkdown,
  type PlaybookDefinition,
  type QuerySignal,
} from "./context-recall.js";
import { updateAutoSection } from "./vault-writer.js";

interface HistoryDocument {
  file: string;
  content: string;
}

export interface ObservedSignal {
  signal: QuerySignal;
  documents: number;
  totalScore: number;
  evidence: string[];
  sources: string[];
}

export interface PlaybookSuggestion {
  signalName: string;
  confidence: number;
  documents: number;
  totalScore: number;
  evidence: string[];
  sources: string[];
  proposal: PlaybookDefinition;
}

const SUGGESTION_TEMPLATES: Record<string, Partial<PlaybookDefinition>> = {
  "api-backend": {
    name: "API / Backend Work",
    skills: ["backend-patterns"],
    rules: ["Read backend map and related routes before editing server-side behavior."],
    checklist: [
      "Trace caller to route and handler",
      "Check middleware, validation, and error path",
      "Verify response shape or contract after changes",
    ],
    noteHints: ["api", "backend", "route", "middleware"],
    categoryBoosts: { architecture: 14, task: 6, resource: 4 },
  },
  testing: {
    name: "Testing / Verification Work",
    skills: ["tdd-workflow", "playwright"],
    rules: ["Add or update verification close to the changed behavior."],
    checklist: [
      "Identify current coverage gap",
      "Add or update the smallest useful test",
      "Run targeted verification before broader checks",
    ],
    noteHints: ["test", "spec", "verify", "agent-log"],
    categoryBoosts: { task: 12, agentLog: 10, architecture: 4 },
  },
  payments: {
    name: "Payments / Billing Work",
    skills: ["stripe-best-practices", "payments"],
    rules: ["Read payment flow, webhook, and security constraints before editing billing logic."],
    checklist: [
      "Identify checkout or billing entrypoint",
      "Trace webhook or confirmation path",
      "Check idempotency, auth, and error handling",
    ],
    noteHints: ["payment", "billing", "checkout", "stripe"],
    categoryBoosts: { architecture: 14, security: 8, resource: 8 },
  },
  documentation: {
    name: "Documentation / ADR Work",
    skills: ["doc"],
    rules: ["Update durable docs when behavior or architecture changes materially."],
    checklist: [
      "Identify stale docs or missing ADR context",
      "Capture final behavior and constraints",
      "Link docs to source notes or code paths",
    ],
    noteHints: ["guide", "manual", "adr", "readme"],
    categoryBoosts: { resource: 12, architecture: 8, overview: 4 },
  },
  deployment: {
    name: "Release / Deploy Work",
    skills: ["vercel-deploy", "render-deploy", "netlify-deploy"],
    rules: ["Check infra manifest and environment keys before running a deploy."],
    checklist: [
      "Verify env keys and deploy target",
      "Run build locally or in CI-equivalent mode",
      "Check preview/runtime logs after release",
    ],
    noteHints: ["deploy", "infra", "preview", "health"],
    categoryBoosts: { resource: 14, health: 12, architecture: 6 },
  },
};

export function suggestPlaybooksFromHistory(limit = 5): string {
  const documents = collectHistoryDocuments();
  const existingPlaybooks = loadExistingPlaybooks();
  const observedSignals = observeSignals(documents);
  const suggestions = generatePlaybookSuggestions(observedSignals, existingPlaybooks).slice(0, limit);
  const rendered = renderSuggestions(documents, observedSignals, suggestions, existingPlaybooks);

  updateAutoSection(config.vaultPaths.playbookSuggestions, rendered, "gracia-playbooks");
  console.log(`✅ Analyzed ${documents.length} history document(s) and suggested ${suggestions.length} playbook(s)`);
  return rendered;
}

export function generatePlaybookSuggestions(
  observedSignals: ObservedSignal[],
  existingPlaybooks: PlaybookDefinition[],
): PlaybookSuggestion[] {
  return observedSignals
    .filter((item) => item.documents >= 2 || item.totalScore >= 18)
    .filter((item) => !hasPlaybookCoverage(existingPlaybooks, item.signal))
    .map<PlaybookSuggestion>((item) => {
      const proposal = buildSuggestedPlaybook(item.signal);
      const confidence = Math.min(95, 40 + item.documents * 12 + Math.floor(item.totalScore / 3));

      return {
        signalName: item.signal.name,
        confidence,
        documents: item.documents,
        totalScore: item.totalScore,
        evidence: item.evidence.slice(0, 4),
        sources: item.sources.slice(0, 4),
        proposal,
      };
    })
    .sort((left, right) => right.confidence - left.confidence || left.proposal.name.localeCompare(right.proposal.name));
}

export function hasPlaybookCoverage(existingPlaybooks: PlaybookDefinition[], signal: QuerySignal): boolean {
  const signalTerms = new Set<string>([
    ...signal.keywords.map((term) => term.toLowerCase()),
    ...signal.name.split("-").map((term) => term.toLowerCase()),
  ]);

  return existingPlaybooks.some((playbook) => {
    let overlap = 0;

    for (const term of playbook.matchTerms) {
      const normalized = term.toLowerCase();
      if (signalTerms.has(normalized)) {
        overlap += 1;
        continue;
      }

      if ([...signalTerms].some((candidate) => normalized.includes(candidate) || candidate.includes(normalized))) {
        overlap += 1;
      }
    }

    const nameLower = playbook.name.toLowerCase();
    if ([...signalTerms].some((term) => nameLower.includes(term))) {
      overlap += 1;
    }

    return overlap >= 2;
  });
}

export function buildSuggestedPlaybook(signal: QuerySignal): PlaybookDefinition {
  const template = SUGGESTION_TEMPLATES[signal.name];
  const title = template?.name ?? toTitle(signal.name);

  return {
    name: title,
    source: "auto-suggestion",
    matchTerms: unique(signal.keywords.slice(0, 6).map((term) => term.toLowerCase())),
    skills: unique(template?.skills ?? signal.skillHints),
    rules: unique(template?.rules ?? ["Read the most relevant architecture and rules notes before editing."]),
    checklist: unique(template?.checklist ?? [
      "Identify the affected surface area",
      "Trace the current implementation path",
      "Verify the final behavior after changes",
    ]),
    noteHints: unique((template?.noteHints ?? signal.noteHints).map((term) => term.toLowerCase())),
    categoryBoosts: template?.categoryBoosts ?? signal.categoryBoosts,
  };
}

function collectHistoryDocuments(): HistoryDocument[] {
  const documents: HistoryDocument[] = [];
  const logDir = resolveVault(config.vaultPaths.agentLogDir);

  if (fs.existsSync(logDir)) {
    const logFiles = fs.readdirSync(logDir)
      .filter((file) => file.endsWith(".md"))
      .sort()
      .reverse()
      .slice(0, 12);

    for (const file of logFiles) {
      const fullPath = path.join(logDir, file);
      documents.push({
        file: `${config.vaultPaths.agentLogDir}/${file}`.replace(/\\/g, "/"),
        content: stripHistoryNoise(fs.readFileSync(fullPath, "utf8")),
      });
    }
  }

  for (const relativePath of [config.vaultPaths.learnings, config.vaultPaths.securityNotes]) {
    const fullPath = resolveVault(relativePath);
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    documents.push({
      file: relativePath.replace(/\\/g, "/"),
      content: stripHistoryNoise(fs.readFileSync(fullPath, "utf8")),
    });
  }

  return documents.filter((document) => document.content.trim().length > 0);
}

function loadExistingPlaybooks(): PlaybookDefinition[] {
  const relativePaths = [config.vaultPaths.globalPlaybooks, config.vaultPaths.sessionPlaybook];

  return relativePaths
    .filter((relativePath) => fs.existsSync(resolveVault(relativePath)))
    .flatMap((relativePath) =>
      parsePlaybooksFromMarkdown(fs.readFileSync(resolveVault(relativePath), "utf8"), relativePath),
    );
}

function observeSignals(documents: HistoryDocument[]): ObservedSignal[] {
  const buckets = new Map<string, ObservedSignal>();

  for (const document of documents) {
    const signals = inferQuerySignals(document.content);

    for (const signal of signals) {
      const existing = buckets.get(signal.name);
      const evidence = extractEvidence(document.content, signal).slice(0, 3);

      if (!existing) {
        buckets.set(signal.name, {
          signal,
          documents: 1,
          totalScore: signal.score,
          evidence,
          sources: [document.file],
        });
        continue;
      }

      existing.documents += 1;
      existing.totalScore += signal.score;
      existing.evidence = unique([...existing.evidence, ...evidence]).slice(0, 6);
      existing.sources = unique([...existing.sources, document.file]).slice(0, 6);
    }
  }

  return [...buckets.values()].sort((left, right) =>
    right.totalScore - left.totalScore || right.documents - left.documents,
  );
}

function extractEvidence(content: string, signal: QuerySignal): string[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .filter((line) => {
      const lower = line.toLowerCase();
      return signal.keywords.some((keyword) => lower.includes(keyword));
    })
    .slice(0, 4);
}

function renderSuggestions(
  documents: HistoryDocument[],
  observedSignals: ObservedSignal[],
  suggestions: PlaybookSuggestion[],
  existingPlaybooks: PlaybookDefinition[],
): string {
  const date = isoDate();
  const observedTable = observedSignals.length > 0
    ? [
        "| Signal | Documents | Total Score | Covered |",
        "|--------|-----------|-------------|---------|",
        ...observedSignals.map((item) =>
          `| \`${item.signal.name}\` | ${item.documents} | ${item.totalScore} | ${hasPlaybookCoverage(existingPlaybooks, item.signal) ? "yes" : "no"} |`,
        ),
      ].join("\n")
    : "_No signal history yet._";

  const body = suggestions.length > 0
    ? suggestions.map(renderSuggestionBlock).join("\n\n")
    : "_No strong playbook gaps detected yet. Keep collecting agent logs and LEARN notes._";

  return `## Auto Suggestions Snapshot

> Auto-generated from recent agent logs, learnings, and security notes.
> Source documents scanned: ${documents.length}
> Updated: ${date}

## Observed Signals

${observedTable}

## Suggested Playbooks

${body}
`;
}

function renderSuggestionBlock(suggestion: PlaybookSuggestion): string {
  return `### ${suggestion.proposal.name}

- Signal: \`${suggestion.signalName}\`
- Confidence: ${suggestion.confidence}
- Evidence count: ${suggestion.documents} document(s), score ${suggestion.totalScore}
- Sources: ${suggestion.sources.map((source) => `\`${source}\``).join(", ") || "_none_"}

**Why this is suggested**
${suggestion.evidence.map((line) => `- ${line}`).join("\n") || "- Repeated signal detected in recent history."}

**Proposed playbook**
\`\`\`md
## ${suggestion.proposal.name}
match: ${suggestion.proposal.matchTerms.join(", ")}
skills:
${suggestion.proposal.skills.map((skill) => `- ${skill}`).join("\n") || "- add-skill"}
rules:
${suggestion.proposal.rules.map((rule) => `- ${rule}`).join("\n")}
checklist:
${suggestion.proposal.checklist.map((item) => `- ${item}`).join("\n")}
note-hints:
${suggestion.proposal.noteHints.map((hint) => `- ${hint}`).join("\n")}
category-boosts:
${Object.entries(suggestion.proposal.categoryBoosts).map(([key, value]) => `- ${key}: ${value}`).join("\n")}
\`\`\``;
}

function stripHistoryNoise(content: string): string {
  return content
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/<!-- AUTO-SYNC:START -->/g, "")
    .replace(/<!-- AUTO-SYNC:END -->/g, "")
    .replace(/_No LEARN annotations found\._/g, "")
    .replace(/_No generated content yet\._/g, "")
    .trim();
}

function resolveVault(relativePath: string): string {
  return path.join(config.vaultRoot, relativePath);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function toTitle(value: string): string {
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function isoDate(date = new Date()): string {
  return date.toISOString().split("T")[0];
}
