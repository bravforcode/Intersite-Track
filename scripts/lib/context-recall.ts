import fs from "node:fs";
import path from "node:path";
import { config } from "../config/sync.config.js";
import { writeToVault } from "./vault-writer.js";

export interface RecallOptions {
  task?: string;
  limit?: number;
  format?: "markdown" | "json";
  saveBrief?: boolean;
}

interface ContextCandidate {
  path: string;
  category: string;
  baseScore: number;
  recencyWeight?: number;
}

interface ContextHit {
  file: string;
  score: number;
  category: string;
  excerpt: string[];
}

export interface ContextBrief {
  project: {
    key: string;
    name: string;
    root: string;
  };
  task: string;
  signals: string[];
  playbooks: MatchedPlaybook[];
  rules: ContextHit[];
  skills: string[];
  checklist: string[];
  notes: ContextHit[];
}

export interface QuerySignal {
  name: string;
  score: number;
  keywords: string[];
  noteHints: string[];
  skillHints: string[];
  categoryBoosts: Record<string, number>;
}

export interface PlaybookDefinition {
  name: string;
  source: string;
  matchTerms: string[];
  skills: string[];
  rules: string[];
  checklist: string[];
  noteHints: string[];
  categoryBoosts: Record<string, number>;
}

export interface MatchedPlaybook extends PlaybookDefinition {
  score: number;
}

interface SkillCatalogEntry {
  raw: string;
  name: string;
}

type PlaybookListKey = "skills" | "rules" | "checklist" | "note-hints" | "category-boosts";

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "into", "your", "their",
  "แก้", "ทำ", "ให้", "และ", "ของ", "กับ", "เวลา", "ตอน", "หรือ", "จาก", "งาน", "โปรเจค",
]);

const SIGNAL_LIBRARY: Array<{
  name: string;
  match: string[];
  keywords: string[];
  noteHints: string[];
  skillHints: string[];
  categoryBoosts: Record<string, number>;
}> = [
  {
    name: "bug-fix",
    match: ["bug", "fix", "broken", "error", "issue", "regression", "debug", "failing"],
    keywords: ["bug", "fix", "error", "regression", "debug"],
    noteHints: ["active-tasks", "bug", "fix", "agent-log"],
    skillHints: ["playwright", "tdd-workflow"],
    categoryBoosts: { task: 16, agentLog: 10, architecture: 8, rule: 4 },
  },
  {
    name: "auth",
    match: ["auth", "login", "logout", "signup", "signin", "session", "jwt", "token", "permission", "role"],
    keywords: ["auth", "login", "session", "token", "permission", "role", "jwt"],
    noteHints: ["auth", "login", "token", "session", "permission"],
    skillHints: ["playwright", "security-best-practices"],
    categoryBoosts: { architecture: 18, security: 14, task: 6, rule: 6 },
  },
  {
    name: "api-backend",
    match: ["api", "route", "endpoint", "backend", "controller", "middleware", "server"],
    keywords: ["api", "route", "endpoint", "controller", "middleware", "backend"],
    noteHints: ["api", "backend", "route", "controller"],
    skillHints: ["backend-patterns"],
    categoryBoosts: { architecture: 14, task: 4, resource: 4 },
  },
  {
    name: "database",
    match: ["database", "db", "schema", "migration", "query", "firestore", "sql", "collection", "table"],
    keywords: ["database", "schema", "migration", "query", "firestore", "collection", "table"],
    noteHints: ["database", "schema", "collection", "query", "migration"],
    skillHints: ["backend-patterns"],
    categoryBoosts: { architecture: 18, resource: 10, health: 2 },
  },
  {
    name: "deployment",
    match: ["deploy", "deployment", "release", "preview", "vercel", "production", "env", "infra", "build", "runtime"],
    keywords: ["deploy", "preview", "production", "env", "infra", "runtime", "build"],
    noteHints: ["infra", "deploy", "preview", "health"],
    skillHints: ["vercel-deploy", "render-deploy", "netlify-deploy"],
    categoryBoosts: { resource: 16, health: 12, architecture: 6, rule: 4 },
  },
  {
    name: "security",
    match: ["security", "secret", "vulnerability", "xss", "csrf", "access", "permission", "sanitize", "rate-limit"],
    keywords: ["security", "secret", "sanitize", "permission", "access", "rate", "auth"],
    noteHints: ["security", "secret", "sanitize", "permission"],
    skillHints: ["security-best-practices"],
    categoryBoosts: { security: 20, rule: 8, architecture: 8 },
  },
  {
    name: "ui-frontend",
    match: ["ui", "frontend", "page", "component", "layout", "css", "responsive", "design", "ux"],
    keywords: ["ui", "frontend", "page", "component", "layout", "responsive", "design"],
    noteHints: ["frontend", "component", "page", "layout"],
    skillHints: ["playwright", "ui-ux-pro-max"],
    categoryBoosts: { architecture: 10, overview: 8, task: 4 },
  },
  {
    name: "testing",
    match: ["test", "spec", "coverage", "verify", "qa", "assert", "flaky"],
    keywords: ["test", "spec", "coverage", "verify", "qa"],
    noteHints: ["test", "verify", "agent-log"],
    skillHints: ["tdd-workflow", "playwright"],
    categoryBoosts: { task: 10, agentLog: 8, architecture: 4 },
  },
  {
    name: "payments",
    match: ["payment", "payments", "checkout", "billing", "invoice", "subscription", "stripe"],
    keywords: ["payment", "checkout", "billing", "invoice", "subscription", "stripe"],
    noteHints: ["payment", "billing", "checkout", "stripe"],
    skillHints: ["stripe-best-practices", "payments"],
    categoryBoosts: { architecture: 12, resource: 8, security: 6 },
  },
  {
    name: "documentation",
    match: ["docs", "document", "guide", "manual", "readme", "adr"],
    keywords: ["docs", "guide", "manual", "readme", "adr", "document"],
    noteHints: ["guide", "manual", "adr"],
    skillHints: ["doc", "pdf"],
    categoryBoosts: { resource: 10, architecture: 8, overview: 4 },
  },
];

export function buildSessionContext(options: RecallOptions = {}): string {
  const brief = createContextBrief(options);

  if (options.saveBrief !== false) {
    writeToVault(config.vaultPaths.latestContextBrief, renderContextMarkdown(brief));
  }

  if (options.format === "json") {
    return JSON.stringify(brief, null, 2);
  }

  return renderContextMarkdown(brief);
}

export function buildPreflightBrief(options: RecallOptions = {}): string {
  const brief = createContextBrief({
    ...options,
    format: "markdown",
    saveBrief: false,
  });
  const rendered = renderPreflight(brief);

  if (options.saveBrief !== false) {
    writeToVault(config.vaultPaths.latestPreflightBrief, rendered);
  }

  return rendered;
}

function createContextBrief(options: RecallOptions = {}): ContextBrief {
  const task = options.task?.trim() ?? "";
  const limit = Math.max(3, Number(options.limit ?? 6));
  const keywords = extractKeywords(task);
  const signals = inferQuerySignals(task);
  const playbooks = selectMatchingPlaybooks(loadPlaybooks(), task, keywords, signals);
  const candidates = collectCandidateFiles();

  const rules = scoreFiles(
    candidates.filter((candidate) => candidate.category === "rule"),
    keywords,
    task,
    signals,
    playbooks,
  ).slice(0, 4);

  const skills = collectSkills(keywords, signals, playbooks);
  const notes = scoreFiles(
    candidates.filter((candidate) => !["rule", "skill", "playbook"].includes(candidate.category)),
    keywords,
    task,
    signals,
    playbooks,
  ).slice(0, limit);

  const brief: ContextBrief = {
    project: {
      key: config.projectKey,
      name: config.projectName,
      root: config.codebaseRoot,
    },
    task,
    signals: signals.map((signal) => signal.name),
    playbooks,
    rules,
    skills,
    checklist: buildChecklist(playbooks),
    notes,
  };

  return brief;
}

export function inferQuerySignals(task: string): QuerySignal[] {
  const normalizedTask = task.toLowerCase();
  const keywords = extractKeywords(task);

  return SIGNAL_LIBRARY
    .map<QuerySignal | null>((definition) => {
      let score = 0;

      for (const term of definition.match) {
        if (normalizedTask.includes(term)) {
          score += 8;
        }
        if (keywords.includes(term)) {
          score += 6;
        }
      }

      if (score === 0) {
        return null;
      }

      return {
        name: definition.name,
        score,
        keywords: definition.keywords,
        noteHints: definition.noteHints,
        skillHints: definition.skillHints,
        categoryBoosts: definition.categoryBoosts,
      };
    })
    .filter((signal): signal is QuerySignal => signal !== null)
    .sort((left, right) => right.score - left.score);
}

export function parsePlaybooksFromMarkdown(markdown: string, source: string): PlaybookDefinition[] {
  const sections = markdown.split(/^##\s+/m).slice(1);
  const playbooks: PlaybookDefinition[] = [];

  for (const section of sections) {
    const lines = section.split(/\r?\n/);
    const name = lines.shift()?.trim() ?? "";
    if (!name) {
      continue;
    }

    const playbook: PlaybookDefinition = {
      name,
      source,
      matchTerms: [],
      skills: [],
      rules: [],
      checklist: [],
      noteHints: [],
      categoryBoosts: {},
    };

    let currentList: PlaybookListKey | undefined;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      const inlineMatch = /^(match|skills|rules|checklist|note-hints|category-boosts):\s*(.*)$/i.exec(line);
      if (inlineMatch) {
        const key = inlineMatch[1].toLowerCase();
        const rest = inlineMatch[2].trim();
        currentList = key === "match" ? undefined : (key as PlaybookListKey);

        if (key === "match") {
          playbook.matchTerms.push(...splitCsv(rest));
        } else if (rest) {
          pushPlaybookValue(playbook, key as PlaybookListKey, rest);
        }
        continue;
      }

      const bulletMatch = /^-\s+(.+)$/.exec(line);
      if (bulletMatch && currentList) {
        pushPlaybookValue(playbook, currentList, bulletMatch[1].trim());
      }
    }

    playbook.matchTerms = unique(playbook.matchTerms.map((term) => term.toLowerCase()));
    playbook.skills = unique(playbook.skills);
    playbook.rules = unique(playbook.rules);
    playbook.checklist = unique(playbook.checklist);
    playbook.noteHints = unique(playbook.noteHints.map((hint) => hint.toLowerCase()));

    playbooks.push(playbook);
  }

  return playbooks;
}

function loadPlaybooks(): PlaybookDefinition[] {
  const sources = [
    config.vaultPaths.globalPlaybooks,
    config.vaultPaths.sessionPlaybook,
  ].filter((relativePath) => fs.existsSync(resolveVault(relativePath)));

  return sources.flatMap((relativePath) =>
    parsePlaybooksFromMarkdown(fs.readFileSync(resolveVault(relativePath), "utf8"), relativePath),
  );
}

function selectMatchingPlaybooks(
  playbooks: PlaybookDefinition[],
  task: string,
  keywords: string[],
  signals: QuerySignal[],
): MatchedPlaybook[] {
  const normalizedTask = task.toLowerCase();
  const signalKeywords = new Set(signals.flatMap((signal) => signal.keywords));

  return playbooks
    .map<MatchedPlaybook | null>((playbook) => {
      let score = 0;

      for (const term of playbook.matchTerms) {
        if (normalizedTask.includes(term)) {
          score += 10;
        }
        if (keywords.includes(term)) {
          score += 8;
        }
        if (signalKeywords.has(term)) {
          score += 4;
        }
      }

      const nameWords = extractKeywords(playbook.name);
      for (const word of nameWords) {
        if (keywords.includes(word)) {
          score += 5;
        }
      }

      if (score === 0) {
        return null;
      }

      return {
        ...playbook,
        score,
      };
    })
    .filter((playbook): playbook is MatchedPlaybook => playbook !== null)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, 4);
}

function collectCandidateFiles(): ContextCandidate[] {
  const fixed: ContextCandidate[] = [
    { path: config.vaultPaths.globalRules, category: "rule", baseScore: 120 },
    { path: config.vaultPaths.globalSkills, category: "skill", baseScore: 115 },
    { path: config.vaultPaths.sessionRules, category: "rule", baseScore: 110 },
    { path: config.vaultPaths.preferredSkills, category: "skill", baseScore: 108 },
    { path: config.vaultPaths.workingAgreements, category: "rule", baseScore: 106 },
    { path: config.vaultPaths.sessionPlaybook, category: "playbook", baseScore: 104 },
    { path: config.vaultPaths.globalPlaybooks, category: "playbook", baseScore: 102 },
    { path: config.vaultPaths.domainGlossary, category: "glossary", baseScore: 80 },
    { path: config.vaultPaths.activeTasks, category: "task", baseScore: 85 },
    { path: config.vaultPaths.learnings, category: "learning", baseScore: 78 },
    { path: config.vaultPaths.securityNotes, category: "security", baseScore: 82 },
    { path: config.vaultPaths.techStack, category: "resource", baseScore: 72 },
    { path: config.vaultPaths.infraManifest, category: "resource", baseScore: 74 },
    { path: config.vaultPaths.systemOverview, category: "architecture", baseScore: 90 },
    { path: config.vaultPaths.frontendMap, category: "architecture", baseScore: 84 },
    { path: config.vaultPaths.backendMap, category: "architecture", baseScore: 84 },
    { path: config.vaultPaths.dataFlow, category: "architecture", baseScore: 82 },
    { path: config.vaultPaths.apiCallGraph, category: "architecture", baseScore: 88 },
    { path: config.vaultPaths.databaseSchema, category: "architecture", baseScore: 86 },
    { path: config.vaultPaths.health, category: "health", baseScore: 65 },
    { path: config.vaultPaths.dashboard, category: "overview", baseScore: 60 },
  ];

  const variable = [
    ...collectRecentFiles(config.vaultPaths.adrDir, "adr", 85, 6),
    ...collectRecentFiles(config.vaultPaths.agentLogDir, "agentLog", 55, 4),
    ...collectRecentFiles(config.vaultPaths.sprintsDir, "sprint", 68, 2),
  ];

  return [...fixed, ...variable].filter((candidate) => fs.existsSync(resolveVault(candidate.path)));
}

function collectRecentFiles(relativeDir: string, category: string, baseScore: number, limit: number): ContextCandidate[] {
  const fullDir = resolveVault(relativeDir);
  if (!fs.existsSync(fullDir)) {
    return [];
  }

  return fs
    .readdirSync(fullDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const fullPath = path.join(fullDir, file);
      return {
        path: `${relativeDir}/${file}`.replace(/\\/g, "/"),
        category,
        baseScore,
        recencyWeight: fs.statSync(fullPath).mtimeMs,
      };
    })
    .sort((left, right) => (right.recencyWeight ?? 0) - (left.recencyWeight ?? 0))
    .slice(0, limit);
}

function collectSkills(
  keywords: string[],
  signals: QuerySignal[],
  playbooks: MatchedPlaybook[],
): string[] {
  const catalogEntries = readSkillCatalog();
  const hintedNames = unique([
    ...signals.flatMap((signal) => signal.skillHints),
    ...playbooks.flatMap((playbook) => playbook.skills),
  ].map((value) => value.toLowerCase()));

  const scored = catalogEntries.map((entry) => {
    const lower = entry.raw.toLowerCase();
    let score = 0;

    for (const hint of hintedNames) {
      if (entry.name === hint) score += 20;
      if (lower.includes(hint)) score += 8;
    }

    for (const keyword of keywords) {
      if (lower.includes(keyword)) score += 4;
    }

    return { entry: entry.raw, score };
  });

  const selected = scored
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.localeCompare(right.entry))
    .map((item) => item.entry);

  const synthetic = hintedNames
    .filter((name) => !catalogEntries.some((entry) => entry.name === name))
    .map((name) => `- ${name}`);

  const merged = unique([...selected, ...synthetic]);
  if (merged.length > 0) {
    return merged.slice(0, 8);
  }

  return unique(catalogEntries.map((entry) => entry.raw)).slice(0, 8);
}

function readSkillCatalog(): SkillCatalogEntry[] {
  const files = [config.vaultPaths.globalSkills, config.vaultPaths.preferredSkills]
    .map(resolveVault)
    .filter((file) => fs.existsSync(file));

  const bullets = files.flatMap((file) =>
    fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- ")),
  );

  return unique(bullets).map((raw) => ({
    raw,
    name: raw.replace(/^-+\s*/, "").split(":")[0].trim().toLowerCase(),
  }));
}

function scoreFiles(
  files: ContextCandidate[],
  keywords: string[],
  task: string,
  signals: QuerySignal[],
  playbooks: MatchedPlaybook[],
): ContextHit[] {
  const normalizedTask = task.toLowerCase();
  const phrases = extractPhrases(task);
  const noteHints = unique([
    ...signals.flatMap((signal) => signal.noteHints),
    ...playbooks.flatMap((playbook) => playbook.noteHints),
  ]);

  return files
    .map((file) => {
      const relativePath = file.path.replace(/\\/g, "/");
      const content = fs.readFileSync(resolveVault(relativePath), "utf8");
      const useful = stripNoise(content);
      const lower = useful.toLowerCase();
      const pathLower = relativePath.toLowerCase();
      let score = file.baseScore;

      for (const keyword of keywords) {
        if (pathLower.includes(keyword)) score += 10;
        const matches = lower.match(new RegExp(escapeRegExp(keyword), "g"));
        if (matches) score += matches.length * 4;
      }

      for (const phrase of phrases) {
        if (normalizedTask.includes(phrase) && lower.includes(phrase)) score += 10;
        if (pathLower.includes(phrase.replace(/\s+/g, "-"))) score += 8;
      }

      for (const signal of signals) {
        score += signal.categoryBoosts[file.category] ?? 0;
      }

      for (const playbook of playbooks) {
        score += playbook.categoryBoosts[file.category] ?? 0;
      }

      for (const hint of noteHints) {
        if (pathLower.includes(hint)) score += 10;
        else if (lower.includes(hint)) score += 5;
      }

      if (file.recencyWeight) {
        score += 2;
      }

      const excerpt = extractExcerpt(useful, keywords, noteHints);

      return {
        file: relativePath,
        category: file.category,
        score,
        excerpt,
      };
    })
    .filter((hit) => hit.excerpt.length > 0)
    .sort((left, right) => right.score - left.score || left.file.localeCompare(right.file));
}

function buildChecklist(playbooks: MatchedPlaybook[]): string[] {
  return unique(playbooks.flatMap((playbook) => playbook.checklist)).slice(0, 12);
}

function extractExcerpt(content: string, keywords: string[], noteHints: string[]): string[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("---"))
    .filter((line) => line !== "<!-- AUTO-SYNC:START -->" && line !== "<!-- AUTO-SYNC:END -->");

  const focusTerms = unique([...keywords, ...noteHints]);
  if (focusTerms.length > 0) {
    const matched = lines.filter((line) => {
      const lower = line.toLowerCase();
      return focusTerms.some((term) => lower.includes(term));
    });

    if (matched.length > 0) {
      return matched.slice(0, 4);
    }
  }

  return lines
    .filter((line) => !/^(_No .+_|#\s)/.test(line))
    .slice(0, 4);
}

function stripNoise(content: string): string {
  return content
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/_No generated content yet\._/g, "")
    .replace(/_No synced tasks yet\._/g, "")
    .replace(/_No health data yet\._/g, "")
    .replace(/_No LEARN annotations found\._/g, "");
}

function extractKeywords(task: string): string[] {
  return unique(
    task
      .toLowerCase()
      .split(/[^a-zA-Z0-9ก-๙_-]+/g)
      .filter((part) => part.length >= 3)
      .filter((part) => !STOP_WORDS.has(part)),
  );
}

function extractPhrases(task: string): string[] {
  const words = extractKeywords(task);
  const phrases: string[] = [];
  for (let index = 0; index < words.length - 1; index += 1) {
    phrases.push(`${words[index]} ${words[index + 1]}`);
  }
  return unique(phrases);
}

function renderContextMarkdown(brief: ContextBrief): string {
  const playbooks = brief.playbooks.length > 0
    ? brief.playbooks.map((playbook) => {
        const lines = [
          `- ${playbook.name} [score ${playbook.score}]`,
          ...playbook.rules.slice(0, 2).map((rule) => `  rule: ${rule}`),
          ...playbook.skills.slice(0, 3).map((skill) => `  skill: ${skill}`),
        ];
        return lines.join("\n");
      }).join("\n")
    : "- No playbook matched.";

  const rules = brief.rules.length > 0
    ? brief.rules.map((rule) => `- \`${rule.file}\`\n  ${rule.excerpt.map((line) => `  ${line}`).join("\n")}`).join("\n")
    : "- No rules found.";

  const skills = brief.skills.length > 0
    ? brief.skills.join("\n")
    : "- No preferred skills recorded.";

  const checklist = brief.checklist.length > 0
    ? brief.checklist.map((item) => `- ${item}`).join("\n")
    : "- No checklist generated.";

  const notes = brief.notes.length > 0
    ? brief.notes.map((note, index) => `${index + 1}. \`${note.file}\` (${note.category}, score ${note.score})\n   ${note.excerpt.join("\n   ")}`).join("\n")
    : "1. No relevant notes found.";

  return `# Session Context Brief

Project: ${brief.project.name} (${brief.project.key})
Repo: ${brief.project.root}
Task: ${brief.task || "general session startup"}
Signals: ${brief.signals.length > 0 ? brief.signals.join(", ") : "none"}

## Matched Playbooks
${playbooks}

## Must-Read Rules
${rules}

## Recommended Skills
${skills}

## Suggested Checklist
${checklist}

## Relevant Notes
${notes}
`;
}

function renderPreflight(brief: ContextBrief): string {
  const topPlaybooks = brief.playbooks.length > 0
    ? brief.playbooks.map((playbook) => playbook.name).slice(0, 2).join(", ")
    : "none";
  const topRules = brief.rules.length > 0
    ? brief.rules.slice(0, 2).map((rule) => firstExcerpt(rule)).filter(Boolean)
    : ["No specific rules found."];
  const skills = brief.skills.length > 0
    ? brief.skills
      .map((skill) => skill.replace(/^-+\s*/, ""))
      .slice(0, 5)
      .join(", ")
    : "none";
  const checklist = brief.checklist.length > 0
    ? brief.checklist.slice(0, 3)
    : ["No checklist generated."];
  const notes = brief.notes.length > 0
    ? brief.notes.slice(0, 3).map((note) => path.basename(note.file))
    : ["none"];

  return [
    "# Preflight Brief",
    `PROJECT: ${brief.project.name} (${brief.project.key})`,
    `TASK: ${brief.task || "general session startup"}`,
    `SIGNALS: ${brief.signals.length > 0 ? brief.signals.join(", ") : "none"}`,
    `PLAYBOOKS: ${topPlaybooks}`,
    "RULES:",
    ...topRules.map((rule) => `- ${rule}`),
    `SKILLS: ${skills}`,
    "CHECKLIST:",
    ...checklist.map((item) => `- ${item}`),
    `NOTES: ${notes.join(", ")}`,
  ].join("\n");
}

function pushPlaybookValue(
  playbook: PlaybookDefinition,
  key: PlaybookListKey,
  value: string,
): void {
  if (key === "skills") {
    playbook.skills.push(value);
    return;
  }
  if (key === "rules") {
    playbook.rules.push(value);
    return;
  }
  if (key === "checklist") {
    playbook.checklist.push(value);
    return;
  }
  if (key === "note-hints") {
    playbook.noteHints.push(value);
    return;
  }
  const boostMatch = /^([A-Za-z-]+)\s*:\s*(\d+)$/.exec(value);
  if (boostMatch) {
    playbook.categoryBoosts[normalizeCategoryKey(boostMatch[1])] = Number(boostMatch[2]);
  }
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveVault(relativePath: string): string {
  return path.join(config.vaultRoot, relativePath);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function normalizeCategoryKey(value: string): string {
  return value.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function firstExcerpt(hit: ContextHit): string {
  const line = hit.excerpt.find(Boolean) ?? "";
  return line
    .replace(/^\s*[-*]\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .trim();
}
