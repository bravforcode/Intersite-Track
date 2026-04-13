import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { config } from "../config/sync.config";
import { appendToVault, writeToVault } from "./vault-writer";

export interface AgentSession {
  agent: "claude" | "copilot" | "cursor" | "other";
  summary: string;
  filesChanged?: string[];
  decisions?: string[];
  promptSummary?: string;
}

export async function logAgentSession(session: AgentSession): Promise<void> {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0];
  const week = getIsoWeekTag(now);
  const branch = getGitOutput("git branch --show-current");
  const commitMessage = getGitOutput("git log -1 --pretty=%s");
  const diffStat = getGitOutput("git diff HEAD~1 HEAD --stat");
  const reflection = await generateAiReflection(diffStat, commitMessage);
  const relativePath = path.join(config.vaultPaths.agentLogDir, `${date}.md`);
  const fullPath = path.join(config.vaultRoot, relativePath);

  const section = `
## ${time} · ${session.agent}

### Branch / Commit
\`${branch || "unknown"}\` · _"${commitMessage || "uncommitted"}"_

### Session Summary
${session.summary}

### AI Reflection
${reflection}

### Decisions
${(session.decisions ?? []).length > 0 ? (session.decisions ?? []).map((decision) => `- ${decision}`).join("\n") : "_None recorded._"}

${session.promptSummary ? `### Prompt Context\n${session.promptSummary}\n` : ""}### Files Modified
${(session.filesChanged ?? []).length > 0 ? (session.filesChanged ?? []).map((file) => `- \`${file}\``).join("\n") : "_Not specified._"}

### Git Diff Stats
\`\`\`
${diffStat || "No diff stats available."}
\`\`\`
`;

  if (!fs.existsSync(fullPath)) {
    writeToVault(
      relativePath,
      `---
project: ${config.projectName}
type: agent-log
session-date: ${date}
agent: ${session.agent}
commit: "${commitMessage || ""}"
files-touched: ${JSON.stringify(session.filesChanged ?? [])}
tags:
  - area/work
  - type/meta
  - ${config.projectKey}
  - timeline/${week}
---

# Agent Log - ${date}
${section}
`,
    );
  } else {
    appendToVault(relativePath, `\n${section}\n`);
  }

  console.log(`✅ Logged agent session to ${relativePath}`);
}

async function generateAiReflection(diffStat: string, commitMessage: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY || !diffStat || diffStat.length < 16) {
    return "_Reflection skipped: missing API key or insufficient diff context._";
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Review this ${config.projectName} change in Thai.

Commit: ${commitMessage || "unknown"}

Diff stat:
${diffStat}

Respond with:
**สรุปการเปลี่ยนแปลง:**
**โมดูลที่กระทบ:**
**Technical Debt ที่อาจเพิ่มขึ้น:**
**ควร Follow Up:**`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return `_Reflection API failed with status ${response.status}._`;
    }

    const data = (await response.json()) as { content?: Array<{ text?: string }> };
    return data.content?.[0]?.text?.trim() || "_Reflection returned no text._";
  } catch (error) {
    return `_Reflection failed: ${error instanceof Error ? error.message : "unknown error"}._`;
  }
}

function getGitOutput(command: string): string {
  try {
    return execSync(command, {
      cwd: config.codebaseRoot,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

function getIsoWeekTag(date: Date): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
