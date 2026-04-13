import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { execSync } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";
import { config } from "../config/sync.config";
import { updateAutoSection, upsertInboxItem, writeToVault } from "./vault-writer";

export async function checkAndPromptADR(): Promise<void> {
  const commitMessage = getLastCommitMessage();
  if (!commitMessage) {
    return;
  }

  if (!config.adrTriggerPatterns.some((pattern) => pattern.test(commitMessage))) {
    return;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    createAdrReminder(commitMessage);
    console.log("ℹ️  Architectural commit detected; created inbox reminder because session is non-interactive.");
    return;
  }

  const rl = readline.createInterface({ input, output });

  try {
    const answer = await rl.question(`Commit "${commitMessage}" looks architectural. Create ADR? (y/n): `);
    if (answer.trim().toLowerCase() !== "y") {
      rebuildAdrIndex();
      return;
    }

    const title = (await rl.question("ADR title: ")).trim();
    if (!title) {
      rebuildAdrIndex();
      return;
    }

    const number = getNextAdrNumber();
    const date = new Date().toISOString().split("T")[0];
    const fileName = `ADR-${String(number).padStart(3, "0")}-${slugify(title)}.md`;
    const content = `---
project: ${config.projectName}
type: adr
adr-number: "${String(number).padStart(3, "0")}"
title: "${title}"
status: proposed
date: ${date}
deciders:
  - me
tags:
  - area/work
  - type/project
  - type/adr
  - type/architecture
  - ${config.projectKey}
  - status/proposed
---

# ADR-${String(number).padStart(3, "0")}: ${title}

## Status
Proposed

## Context
Triggered by commit: "${commitMessage}"

## Decision
_Fill in the decision._

## Consequences
**Positive**
- 

**Negative**
- 

## Alternatives Considered
| Option | Why not chosen |
|--------|----------------|
|        |                |

## Related ADRs
- [[ADR-000-Index]]
`;

    writeToVault(path.join(config.vaultPaths.adrDir, fileName), content);
    rebuildAdrIndex();
    console.log(`✅ Created ${fileName}`);
  } finally {
    rl.close();
  }
}

export function rebuildAdrIndex(): void {
  const adrDir = path.join(config.vaultRoot, config.vaultPaths.adrDir);
  if (!fs.existsSync(adrDir)) {
    return;
  }

  const adrFiles = fs
    .readdirSync(adrDir)
    .filter((file) => /^ADR-\d+/.test(file) && file !== "ADR-000-Index.md")
    .sort();

  const rows = adrFiles.map((file) => {
    const fullPath = path.join(adrDir, file);
    const content = fs.readFileSync(fullPath, "utf8");
    const adrNumber = content.match(/adr-number:\s*"([^"]+)"/)?.[1] ?? file.match(/ADR-(\d+)/)?.[1] ?? "000";
    const title = content.match(/title:\s*"([^"]+)"/)?.[1] ?? file.replace(/\.md$/, "");
    const status = content.match(/status:\s*([^\n]+)/)?.[1]?.trim() ?? "unknown";
    const date = content.match(/date:\s*([^\n]+)/)?.[1]?.trim() ?? "unknown";
    const stem = file.replace(/\.md$/, "");
    return `| [[${stem}|ADR-${adrNumber}]] | ${title} | ${status} | ${date} |`;
  });

  updateAutoSection(
    config.vaultPaths.adrIndex,
    rows.length > 0 ? rows.join("\n") : "| _None yet_ |  |  |  |",
  );
}

function createAdrReminder(commitMessage: string): void {
  const date = new Date().toISOString().split("T")[0];
  upsertInboxItem(
    `adr-reminder-${date}.md`,
    `---
project: ${config.projectName}
type: inbox-item
status: open
source: auto-sync
created: ${date}
updated: ${date}
tags:
  - inbox
  - ${config.projectKey}
  - type/adr
---

# ADR Reminder

The latest commit looks architectural and should be reviewed for ADR creation.

**Commit:** \`${commitMessage}\`

- [ ] Run \`npm run vault:adr\` from an interactive terminal
- [ ] Decide whether this change deserves a permanent ADR
`,
  );
}

function getLastCommitMessage(): string {
  try {
    return execSync("git log -1 --pretty=%s", { cwd: config.codebaseRoot, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

function getNextAdrNumber(): number {
  const adrDir = path.join(config.vaultRoot, config.vaultPaths.adrDir);
  if (!fs.existsSync(adrDir)) {
    return 1;
  }

  const numbers = fs
    .readdirSync(adrDir)
    .map((file) => Number(file.match(/^ADR-(\d+)/)?.[1] ?? 0))
    .filter((value) => value > 0);

  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
