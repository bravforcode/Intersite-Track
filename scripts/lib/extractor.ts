import fs from "node:fs";
import path from "node:path";
import { config } from "../config/sync.config";

export type AnnotationType =
  | "TODO"
  | "FIXME"
  | "BUG"
  | "ARCH"
  | "PERF"
  | "SECURITY"
  | "NOTE"
  | "LEARN";

export interface CodeAnnotation {
  type: AnnotationType;
  body: string;
  author?: string;
  file: string;
  absolutePath: string;
  line: number;
  priority: "high" | "medium" | "low" | "none";
  context: string;
  vscodeLink: string;
}

const ANNOTATION_REGEX =
  /\/\/\s*(TODO|FIXME|BUG|ARCH|PERF|SECURITY|NOTE|LEARN)\s*[:\-]?\s*(.+?)(?:\s*\(([^)]+)\))?\s*$/;

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".vite",
  "dist",
  "build",
  "coverage",
  ".vercel",
  ".playwright-cli",
]);

export async function extractAnnotations(): Promise<CodeAnnotation[]> {
  const results: CodeAnnotation[] = [];

  for (const dir of config.scanDirs) {
    const fullDir = path.join(config.codebaseRoot, dir);
    if (fs.existsSync(fullDir)) {
      walkDir(fullDir, results);
    }
  }

  const seen = new Set<string>();
  return results
    .filter((item) => {
      const key = `${item.file}:${item.line}:${item.type}:${item.body}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
}

function walkDir(dir: string, results: CodeAnnotation[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walkDir(fullPath, results);
      }
      continue;
    }

    if (config.scanExtensions.some((extension) => entry.name.endsWith(extension))) {
      extractFromFile(fullPath, results);
    }
  }
}

function extractFromFile(filePath: string, results: CodeAnnotation[]): void {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const relPath = path.relative(config.codebaseRoot, filePath).replace(/\\/g, "/");

  lines.forEach((line, index) => {
    const match = ANNOTATION_REGEX.exec(line);
    if (!match) {
      return;
    }

    const [, type, body, author] = match;
    const lineNumber = index + 1;
    const contextStart = Math.max(0, index - 2);
    const contextEnd = Math.min(lines.length, index + 2);
    const context = lines.slice(contextStart, contextEnd).join("\n");

    results.push({
      type: type as AnnotationType,
      body: body.trim(),
      author: author?.trim(),
      file: relPath,
      absolutePath: filePath,
      line: lineNumber,
      priority: detectPriority(body),
      context,
      vscodeLink: `vscode://file/${filePath.replace(/\\/g, "/")}:${lineNumber}`,
    });
  });
}

function detectPriority(body: string): CodeAnnotation["priority"] {
  const lower = body.toLowerCase();
  if (config.priorityKeywords.high.some((keyword) => lower.includes(keyword))) {
    return "high";
  }
  if (config.priorityKeywords.medium.some((keyword) => lower.includes(keyword))) {
    return "medium";
  }
  if (config.priorityKeywords.low.some((keyword) => lower.includes(keyword))) {
    return "low";
  }
  return "none";
}
