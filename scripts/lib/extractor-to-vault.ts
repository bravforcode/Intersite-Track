import path from "node:path";
import { config } from "../config/sync.config";
import type { CodeAnnotation } from "./extractor";
import { updateAutoSection, upsertInboxItem } from "./vault-writer";

const PRIORITY_EMOJI: Record<CodeAnnotation["priority"], string> = {
  high: "🔴",
  medium: "🟡",
  low: "🟢",
  none: "⬜",
};

export function syncAnnotationsToVault(annotations: CodeAnnotation[]): void {
  const direct = annotations.filter((annotation) =>
    (config.inboxPolicy[annotation.type] ?? "direct") === "direct" && annotation.type !== "LEARN",
  );
  const inbox = annotations.filter((annotation) => config.inboxPolicy[annotation.type] === "inbox");

  updateAutoSection(config.vaultPaths.activeTasks, buildActiveTasksMarkdown(direct));

  for (const item of inbox) {
    upsertInboxItem(stableInboxName(item), buildInboxNote(item));
  }

  console.log(`✅ Synced ${direct.length} direct tasks and ${inbox.length} inbox items`);
}

function buildActiveTasksMarkdown(annotations: CodeAnnotation[]): string {
  if (annotations.length === 0) {
    return `> Last synced: ${new Date().toISOString()}

_No direct annotations found._`;
  }

  const grouped = new Map<string, CodeAnnotation[]>();

  for (const annotation of annotations) {
    if (!grouped.has(annotation.file)) {
      grouped.set(annotation.file, []);
    }
    grouped.get(annotation.file)!.push(annotation);
  }

  const sections = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([file, items]) => {
      const lines = items
        .sort((left, right) => left.line - right.line)
        .map((item) => {
          const author = item.author ? ` _(${item.author})_` : "";
          return `- [ ] ${PRIORITY_EMOJI[item.priority]} **[${item.type}]** ${item.body}${author} [↗ line ${item.line}](${item.vscodeLink})`;
        });

      return `### \`${file}\`\n\n${lines.join("\n")}`;
    });

  return `> Last synced: ${new Date().toISOString()}

${sections.join("\n\n")}`;
}

function buildInboxNote(item: CodeAnnotation): string {
  const today = new Date().toISOString().split("T")[0];

  return `---
project: ${config.projectName}
type: inbox-item
status: open
source: auto-sync
created: ${today}
updated: ${today}
severity: ${item.priority}
tags:
  - inbox
  - ${config.projectKey}
  - code/${item.type.toLowerCase()}
--- 

# [${item.type}] ${item.body}

**File:** \`${item.file}\`  
**Line:** ${item.line}  
**VSCode:** [Open here](${item.vscodeLink})

## Context
\`\`\`ts
${item.context}
\`\`\`

## Action Required
- [ ] Review and triage this ${item.type}
- [ ] Move it into active work or resolve it in code
- [ ] Delete or archive this note after resolution
`;
}

function stableInboxName(item: CodeAnnotation): string {
  const fileSlug = item.file.replace(/[\\/]/g, "-").replace(/[^a-zA-Z0-9.-]/g, "-");
  return `${item.type.toLowerCase()}-${fileSlug}-L${item.line}.md`;
}
