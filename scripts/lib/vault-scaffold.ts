import path from "node:path";
import { config } from "../config/sync.config";
import {
  AUTO_END,
  AUTO_START,
  autoMarkerEnd,
  autoMarkerStart,
  ensureVaultDirectory,
  writeIfMissing,
} from "./vault-writer";

export function ensureVaultScaffold(): void {
  [
    config.vaultPaths.inbox,
    config.vaultPaths.projectRoot,
    config.vaultPaths.adrDir,
    config.vaultPaths.architectureDir,
    config.vaultPaths.contextDir,
    config.vaultPaths.sprintsDir,
    path.dirname(config.vaultPaths.learnings),
    path.dirname(config.vaultPaths.securityNotes),
    path.dirname(config.vaultPaths.techStack),
    path.dirname(config.vaultPaths.infraManifest),
    config.vaultPaths.agentLogDir,
    config.vaultPaths.attachments,
    path.dirname(config.vaultPaths.health),
    path.dirname(config.vaultPaths.globalRules),
    config.vaultPaths.contextCacheDir,
    "Meta",
  ].forEach(ensureVaultDirectory);

  const today = isoDate();
  const week = getIsoWeekTag();

  writeIfMissing(
    config.vaultPaths.dashboard,
    `---
project: ${config.projectName}
type: moc
status: active
created: ${today}
updated: ${today}
source: auto-sync
tags:
  - area/work
  - type/project
  - ${config.projectKey}
  - status/active
---

# ${config.projectName} Dashboard

## Live Status

### Active Tasks (Code Sync)
\`\`\`dataview
TASK FROM "${normalizeVault(config.vaultPaths.activeTasks)}"
WHERE !completed
SORT file.mtime DESC
\`\`\`

### Recent ADRs
\`\`\`dataview
TABLE adr-number, title, status, date
FROM "${normalizeVault(config.vaultPaths.adrDir)}"
WHERE type = "adr"
SORT adr-number DESC
LIMIT 5
\`\`\`

### Recent AI Sessions
\`\`\`dataview
TABLE session-date, agent, commit
FROM "${normalizeVault(config.vaultPaths.agentLogDir)}"
SORT session-date DESC
LIMIT 7
\`\`\`

### Recent Learnings
\`\`\`dataview
TABLE topic, updated
FROM "${normalizeVault(config.vaultPaths.learnings)}"
SORT updated DESC
LIMIT 5
\`\`\`

## Context
- [[Session-Rules]]
- [[Preferred-Skills]]
- [[Session-Playbooks]]
- [[Playbook-Suggestions]]
- [[Working-Agreements]]
- [[Domain-Glossary]]

## Architecture Quick Links
- [[System-Overview]] · [[Frontend-Map]] · [[Backend-Map]] · [[Data-Flow]]
- [[API-Call-Graph]] · [[Database-Schema]]

## Sync Health
\`\`\`dataview
TABLE last-sync, annotations-found, drift-warnings
FROM "${normalizeVault(config.vaultPaths.health)}"
WHERE project = "${config.projectName}"
SORT last-sync DESC
LIMIT 1
\`\`\`
`,
  );

  writeIfMissing(
    config.vaultPaths.activeTasks,
    projectFrontmatter("project-note", today) +
      `
# Active Tasks

## Notes
- Auto-synced annotations from the codebase appear below.
- High-stakes annotations are routed to \`00-Inbox\`.

${AUTO_START}
_No synced tasks yet._
${AUTO_END}
`,
  );

  writeIfMissing(
    config.vaultPaths.adrIndex,
    `---
project: ${config.projectName}
type: adr-index
status: active
created: ${today}
updated: ${today}
source: auto-sync
tags:
  - area/work
  - type/project
  - type/adr
  - ${config.projectKey}
  - status/active
---

# ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
${AUTO_START}
| _None yet_ |  |  |  |
${AUTO_END}
`,
  );

  writeIfMissing(config.vaultPaths.systemOverview, architectureNote("System Overview", today));
  writeIfMissing(config.vaultPaths.frontendMap, architectureNote("Frontend Map", today));
  writeIfMissing(config.vaultPaths.backendMap, architectureNote("Backend Map", today));
  writeIfMissing(config.vaultPaths.dataFlow, architectureNote("Data Flow", today));
  writeIfMissing(config.vaultPaths.apiCallGraph, architectureNote("API Call Graph", today));
  writeIfMissing(config.vaultPaths.databaseSchema, architectureNote("Database Schema", today));

  writeIfMissing(
    config.vaultPaths.sessionRules,
    contextNote("Session Rules", today, [
      "- Keep answers compact unless deeper detail is needed.",
      "- Prefer repo conventions over generic framework advice.",
      "- Check Vault context before re-deriving known architecture decisions.",
    ]),
  );
  writeIfMissing(
    config.vaultPaths.preferredSkills,
    contextNote("Preferred Skills", today, [
      "- openai-docs: for latest OpenAI / model questions",
      "- playwright: for browser verification and UI debugging",
      "- security-best-practices: for explicit security review tasks",
    ]),
  );
  writeIfMissing(
    config.vaultPaths.workingAgreements,
    contextNote("Working Agreements", today, [
      "- Document durable decisions in ADRs instead of re-explaining them every session.",
      "- Put recurring constraints and gotchas in this Context folder.",
      "- Prefer links to source notes over long pasted context.",
    ]),
  );
  writeIfMissing(
    config.vaultPaths.domainGlossary,
    contextNote("Domain Glossary", today, [
      "- Add product terms, internal names, and abbreviations here.",
    ]),
  );
  writeIfMissing(
    config.vaultPaths.playbookSuggestions,
    `---
project: ${config.projectName}
type: playbook-suggestions
status: active
created: ${today}
updated: ${today}
source: auto-sync
tags:
  - area/work
  - type/meta
  - ${config.projectKey}
---

# Playbook Suggestions

## Manual Notes

- Capture durable, human-curated playbooks here.
- The auto-generated section below is safe to regenerate.

${autoMarkerStart("gracia-playbooks")}
_No suggestions generated yet. Run \`npm run vault:playbooks\` after you have some agent logs or learnings._
${autoMarkerEnd("gracia-playbooks")}
`,
  );

  const sprintPath = path.join(config.vaultPaths.sprintsDir, `Sprint-${week}.md`);
  writeIfMissing(
    sprintPath,
    `---
project: ${config.projectName}
type: sprint
week: "${week}"
status: active
created: ${today}
updated: ${today}
source: auto-sync
tags:
  - area/work
  - type/project
  - ${config.projectKey}
  - status/active
  - timeline/${week}
---

# Sprint ${week}

## Objectives
- [ ] Review current auto-synced work items
- [ ] Triage inbox issues
- [ ] Capture architecture decisions

## Notes
${AUTO_START}
_No sprint notes generated yet._
${AUTO_END}
`,
  );

  writeIfMissing(config.vaultPaths.learnings, learningNote(`${config.projectName} Learnings`, today));
  writeIfMissing(config.vaultPaths.securityNotes, learningNote(`${config.projectName} Security Notes`, today));
  writeIfMissing(config.vaultPaths.techStack, resourceNote(`${config.projectName} Tech Stack`, today));
  writeIfMissing(config.vaultPaths.infraManifest, resourceNote(`${config.projectName} Infra Manifest`, today));
  writeIfMissing(
    config.vaultPaths.health,
    `---
project: ${config.projectName}
type: health-report
last-sync: ${today}
annotations-found: 0
drift-warnings: 0
status: healthy
tags:
  - area/work
  - type/meta
  - ${config.projectKey}
---

# Sync Health Report

${AUTO_START}
_No health data yet._
${AUTO_END}
`,
  );

  writeIfMissing(
    config.vaultPaths.globalRules,
    `# Global Rules

- Put durable rules here so session startup can pull them without repeating them in chat.
- Keep bullets short, actionable, and stable across projects.
`,
  );

  writeIfMissing(
    config.vaultPaths.globalSkills,
    `# Global Skills

- Record skill names and when to use them.
- Format: \`- skill-name: when it is worth loading\`
`,
  );

  writeIfMissing(
    config.vaultPaths.globalPlaybooks,
    `---
type: playbook-catalog
scope: global
updated: ${today}
---

# Global Session Playbooks

## Bug Fix
match: bug, fix, error, failing, regression, broken, debug
skills:
- playwright
- tdd-workflow
rules:
- Reproduce before changing code.
- Prefer a root-cause fix over a symptom patch.
checklist:
- Confirm current behavior and expected behavior
- Inspect related routes/services/components
- Add or update verification
note-hints:
- active-tasks
- agent-log
- architecture
category-boosts:
- task: 14
- architecture: 10
- agent-log: 8

## Deployment
match: deploy, production, preview, release, env, vercel, infra
skills:
- vercel-deploy
- render-deploy
rules:
- Check infra manifest and environment keys before deploying.
checklist:
- Verify required env vars
- Run build locally
- Check logs or preview URL after deploy
note-hints:
- infra
- health
- architecture
category-boosts:
- resource: 12
- health: 10
- architecture: 6

## Security Review
match: security, auth, token, secret, permission, role, jwt
skills:
- security-best-practices
rules:
- Read security notes and auth-related architecture before editing.
checklist:
- Check access control paths
- Check secret handling and sanitizer impact
- Verify privilege boundaries
note-hints:
- security
- auth
- backend
category-boosts:
- security: 18
- architecture: 10
- rule: 6
`,
  );

  writeIfMissing(
    config.vaultPaths.tagTaxonomy,
    `# Tag Taxonomy

## Area
- area/work
- area/personal
- area/learning

## Type
- type/project
- type/adr
- type/meta
- type/resource
- type/learning
- type/architecture

## Status
- status/active
- status/on-hold
- status/done
- status/archived

## Source
- source/auto-sync
- source/manual
`,
  );

  writeIfMissing(
    config.vaultPaths.sessionPlaybook,
    `---
project: ${config.projectName}
type: playbook
status: active
created: ${today}
updated: ${today}
source: manual
tags:
  - area/work
  - type/meta
  - ${config.projectKey}
---

# Session Playbooks

## Auth Work
match: auth, login, logout, session, permission, role, jwt, token
skills:
- playwright
rules:
- Read API call graph and backend map for auth-related flows first.
checklist:
- Identify caller and route
- Confirm auth middleware / guard path
- Verify frontend redirect or session refresh behavior
note-hints:
- auth
- login
- token
- session
category-boosts:
- architecture: 16
- security: 10
- task: 6

## UI Implementation
match: ui, layout, component, design, page, responsive, css, frontend
skills:
- playwright
- ui-ux-pro-max
rules:
- Read frontend map and existing page/component patterns first.
checklist:
- Confirm target page/component
- Preserve existing design language unless asked to change it
- Verify desktop and mobile behavior
note-hints:
- frontend
- component
- page
- layout
category-boosts:
- architecture: 10
- overview: 6

## Data / Schema Work
match: database, schema, firestore, migration, query, collection
skills:
- backend-patterns
rules:
- Read database schema and infra manifest before changing data flow.
checklist:
- Identify affected collection/table
- Confirm read/write path
- Check migration or schema implications
note-hints:
- database
- schema
- collection
- query
category-boosts:
- architecture: 18
- resource: 8
`,
  );
}

function projectFrontmatter(type: string, date: string): string {
  return `---
project: ${config.projectName}
type: ${type}
status: active
created: ${date}
updated: ${date}
source: auto-sync
tags:
  - area/work
  - type/project
  - ${config.projectKey}
  - status/active
---`;
}

function architectureNote(title: string, date: string): string {
  return `---
project: ${config.projectName}
type: architecture
status: active
created: ${date}
updated: ${date}
source: auto-sync
tags:
  - area/work
  - type/project
  - type/architecture
  - ${config.projectKey}
  - status/active
---

# ${title}

${AUTO_START}
_No generated content yet._
${AUTO_END}
`;
}

function learningNote(title: string, date: string): string {
  return `---
project: ${config.projectName}
type: learning
created: ${date}
updated: ${date}
source: auto-sync
tags:
  - area/work
  - type/learning
  - ${config.projectKey}
---

# ${title}

${AUTO_START}
_No generated content yet._
${AUTO_END}
`;
}

function resourceNote(title: string, date: string): string {
  return `---
project: ${config.projectName}
type: resource
status: active
created: ${date}
updated: ${date}
source: auto-sync
tags:
  - area/work
  - type/resource
  - ${config.projectKey}
---

# ${title}

${AUTO_START}
_No generated content yet._
${AUTO_END}
`;
}

function contextNote(title: string, date: string, bullets: string[]): string {
  return `---
project: ${config.projectName}
type: context
status: active
created: ${date}
updated: ${date}
source: manual
tags:
  - area/work
  - type/meta
  - ${config.projectKey}
---

# ${title}

${bullets.join("\n")}
`;
}

function normalizeVault(relativePath: string): string {
  return relativePath.replace(/\\/g, "/");
}

function isoDate(date = new Date()): string {
  return date.toISOString().split("T")[0];
}

function getIsoWeekTag(date = new Date()): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
