import { config } from "../config/sync.config";
import type { CodeAnnotation } from "./extractor";
import { updateAutoSection } from "./vault-writer";

interface LearningItem {
  topic: string;
  body: string;
  file: string;
  line: number;
  vscodeLink: string;
}

const TOPIC_REGEX = /^\[([^\]]+)\]\s*[-–]\s*(.+)$/;

export function syncLearnings(annotations: CodeAnnotation[]): void {
  const items = annotations
    .filter((annotation) => annotation.type === "LEARN")
    .map<LearningItem>((annotation) => {
      const match = TOPIC_REGEX.exec(annotation.body);
      return {
        topic: match?.[1]?.trim() ?? "General",
        body: match?.[2]?.trim() ?? annotation.body,
        file: annotation.file,
        line: annotation.line,
        vscodeLink: annotation.vscodeLink,
      };
    });

  if (items.length === 0) {
    updateAutoSection(config.vaultPaths.learnings, "_No LEARN annotations found._");
    return;
  }

  const groups = new Map<string, LearningItem[]>();
  for (const item of items) {
    if (!groups.has(item.topic)) {
      groups.set(item.topic, []);
    }
    groups.get(item.topic)!.push(item);
  }

  const body = [
    `> Last synced: ${new Date().toISOString()}`,
    "",
    ...[...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([topic, topicItems]) => {
        const lines = topicItems.map(
          (item) => `- **${item.body}** — [\`${item.file}:${item.line}\`](${item.vscodeLink})`,
        );
        return `### ${topic}\n\n${lines.join("\n")}`;
      }),
  ].join("\n");

  updateAutoSection(config.vaultPaths.learnings, body);
  console.log(`✅ Synced ${items.length} learning item(s)`);
}
