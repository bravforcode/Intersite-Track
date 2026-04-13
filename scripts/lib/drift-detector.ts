import fs from "node:fs";
import path from "node:path";
import { config } from "../config/sync.config";
import type { CodeAnnotation } from "./extractor";
import { updateAutoSection } from "./vault-writer";

type HealthStatus = "healthy" | "warning" | "critical";

export function runHealthCheck(annotations: CodeAnnotation[]): void {
  const previous = readPreviousHealthSnapshot();
  const inboxCount = annotations.filter((annotation) => config.inboxPolicy[annotation.type] === "inbox").length;
  const highPriorityCount = annotations.filter((annotation) => annotation.priority === "high").length;
  const warnings: string[] = [];
  const adrCount = countFiles(path.join(config.vaultRoot, config.vaultPaths.adrDir), /^ADR-\d+/);
  const agentLogCount = countFiles(path.join(config.vaultRoot, config.vaultPaths.agentLogDir), /\.md$/);
  const daysSinceLastSync = previous?.lastSync
    ? Math.floor((Date.now() - previous.lastSync.getTime()) / 86400000)
    : 0;

  if (highPriorityCount >= 3) {
    warnings.push(`${highPriorityCount} high-priority annotations remain unresolved`);
  }
  if (inboxCount >= 10) {
    warnings.push(`${inboxCount} high-stakes annotations are still routed through inbox`);
  }
  if (previous && annotations.length - previous.annotationCount >= 10) {
    warnings.push(`Annotation count increased by ${annotations.length - previous.annotationCount} since last health run`);
  }
  if (daysSinceLastSync > 3) {
    warnings.push(`Last health sync is ${daysSinceLastSync} day(s) old`);
  }

  const status: HealthStatus =
    warnings.length === 0 ? "healthy" : warnings.length <= 2 ? "warning" : "critical";

  const body = [
    `---
project: ${config.projectName}
type: health-report
last-sync: ${new Date().toISOString().split("T")[0]}
annotations-found: ${annotations.length}
drift-warnings: ${warnings.length}
status: ${status}
tags:
  - area/work
  - type/meta
  - ${config.projectKey}
---
`,
    "# Sync Health Report",
    "",
    "| Metric | Value |",
    "|--------|-------|",
    `| Total annotations | ${annotations.length} |`,
    `| Inbox-routed annotations | ${inboxCount} |`,
    `| High-priority annotations | ${highPriorityCount} |`,
    `| ADR files | ${adrCount} |`,
    `| Agent log files | ${agentLogCount} |`,
    `| Days since previous health sync | ${daysSinceLastSync} |`,
    "",
    `## Status: ${status.toUpperCase()}`,
    "",
    ...(warnings.length > 0 ? warnings.map((warning) => `- ${warning}`) : ["- No warnings"]),
  ].join("\n");

  updateAutoSection(config.vaultPaths.health, body);
  console.log(`✅ Health check completed with status: ${status}`);
}

function readPreviousHealthSnapshot():
  | {
      lastSync: Date;
      annotationCount: number;
    }
  | undefined {
  const fullPath = path.join(config.vaultRoot, config.vaultPaths.health);
  if (!fs.existsSync(fullPath)) {
    return undefined;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  const lastSyncRaw = content.match(/last-sync:\s*([^\n]+)/)?.[1]?.trim();
  const annotationCountRaw = content.match(/annotations-found:\s*(\d+)/)?.[1];

  if (!lastSyncRaw) {
    return undefined;
  }

  return {
    lastSync: new Date(lastSyncRaw),
    annotationCount: Number(annotationCountRaw ?? 0),
  };
}

function countFiles(dir: string, pattern: RegExp): number {
  if (!fs.existsSync(dir)) {
    return 0;
  }
  return fs.readdirSync(dir).filter((file) => pattern.test(file)).length;
}
