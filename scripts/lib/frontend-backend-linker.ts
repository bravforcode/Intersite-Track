import fs from "node:fs";
import path from "node:path";
import { config } from "../config/sync.config";
import type { ExpressRoute } from "./knowledge-builder";
import { updateAutoSection } from "./vault-writer";

interface ApiCall {
  method: string;
  endpoint: string;
  normalizedEndpoint: string;
  callerFile: string;
  callerLine: number;
  callerFunction?: string;
  vscodeLink: string;
}

const API_CLIENT_CALL_REGEX =
  /\bapi\.(get|post|put|patch|delete)\s*(?:<[^>]+>)?\s*\(\s*([`'"])(\/api\/[\s\S]*?)\2/g;
const FETCH_CALL_REGEX = /\bfetch\(\s*([`'"])(\/api\/[\s\S]*?)\1/g;
const FUNCTION_REGEX = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*:\s*(?:async\s*)?\()/g;

export function buildCallGraph(routes: ExpressRoute[]): void {
  const calls = extractApiCalls();
  const routeMap = new Map<string, string>();

  for (const route of routes) {
    routeMap.set(`${route.method}:${normalizePath(route.route)}`, `${route.handlerFile}:${route.line}`);
  }

  const lines = [
    `> Last synced: ${new Date().toISOString()}`,
    "",
    "| Caller | Method | Endpoint | Express Handler |",
    "|--------|--------|----------|-----------------|",
  ];

  for (const call of calls) {
    const handler =
      routeMap.get(`${call.method}:${call.normalizedEndpoint}`) ??
      routeMap.get(`GET:${call.normalizedEndpoint}`) ??
      "⚠️ No matching route";

    const callerLabel = call.callerFunction
      ? `${call.callerFile} → ${call.callerFunction}()`
      : call.callerFile;

    lines.push(`| [\`${callerLabel}\`](${call.vscodeLink}) | \`${call.method}\` | \`${call.endpoint}\` | \`${handler}\` |`);
  }

  const calledEndpoints = new Set(calls.map((call) => call.normalizedEndpoint));
  const unmappedRoutes = routes.filter((route) => !calledEndpoints.has(normalizePath(route.route)));

  if (unmappedRoutes.length > 0) {
    lines.push("");
    lines.push("## Express Routes Without Frontend Callers");
    lines.push("");
    lines.push("| Method | Route | File |");
    lines.push("|--------|-------|------|");
    for (const route of unmappedRoutes) {
      lines.push(`| \`${route.method}\` | \`${route.route}\` | \`${route.handlerFile}:${route.line}\` |`);
    }
  }

  lines.push("");
  lines.push("## Mermaid View");
  lines.push("");
  lines.push("```mermaid");
  lines.push("graph LR");

  const edges = new Set<string>();
  for (const call of calls) {
    const left = toNodeName(call.callerFunction ?? path.basename(call.callerFile));
    const right = toNodeName(call.endpoint);
    const edgeKey = `${left}:${right}:${call.method}`;
    if (edges.has(edgeKey)) {
      continue;
    }
    edges.add(edgeKey);
    lines.push(`  ${left}["${escapeMermaid(call.callerFunction ?? call.callerFile)}"] -->|"${call.method}"| ${right}["${escapeMermaid(call.endpoint)}"]`);
  }
  lines.push("```");

  updateAutoSection(config.vaultPaths.apiCallGraph, lines.join("\n"));
  console.log(`✅ Mapped ${calls.length} frontend API call(s)`);
}

function extractApiCalls(): ApiCall[] {
  const roots = [
    path.join(config.codebaseRoot, "src"),
    path.join(config.codebaseRoot, "server"),
  ];
  const files = roots.flatMap((root) => collectCodeFiles(root));
  const calls: ApiCall[] = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const relativeFile = path.relative(config.codebaseRoot, filePath).replace(/\\/g, "/");

    for (const match of content.matchAll(API_CLIENT_CALL_REGEX)) {
      const method = match[1].toUpperCase();
      const endpoint = normalizeTemplateEndpoint(match[3]);
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      calls.push({
        method,
        endpoint,
        normalizedEndpoint: normalizePath(endpoint),
        callerFile: relativeFile,
        callerLine: line,
        callerFunction: findContainingFunction(content, match.index ?? 0),
        vscodeLink: `vscode://file/${filePath.replace(/\\/g, "/")}:${line}`,
      });
    }

    for (const match of content.matchAll(FETCH_CALL_REGEX)) {
      const endpoint = normalizeTemplateEndpoint(match[2]);
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      const window = content.slice(match.index, (match.index ?? 0) + 180);
      const methodMatch = /method\s*:\s*["'`](GET|POST|PUT|PATCH|DELETE)["'`]/i.exec(window);
      const method = methodMatch?.[1]?.toUpperCase() ?? "GET";
      calls.push({
        method,
        endpoint,
        normalizedEndpoint: normalizePath(endpoint),
        callerFile: relativeFile,
        callerLine: line,
        callerFunction: findContainingFunction(content, match.index ?? 0),
        vscodeLink: `vscode://file/${filePath.replace(/\\/g, "/")}:${line}`,
      });
    }
  }

  return dedupeCalls(calls);
}

function findContainingFunction(content: string, position: number): string | undefined {
  const segment = content.slice(0, position);
  const matches = [...segment.matchAll(FUNCTION_REGEX)];
  const last = matches.at(-1);
  return last?.[1] ?? last?.[2] ?? last?.[3] ?? undefined;
}

function normalizeTemplateEndpoint(endpoint: string): string {
  return endpoint
    .replace(/\/\$\{[^}]+\}/g, "/:param")
    .replace(/\$\{[^}]+\}/g, "")
    .replace(/\?.*$/, "")
    .replace(/\/+/g, "/");
}

function normalizePath(pathname: string): string {
  return pathname
    .replace(/\/\$\{[^}]+\}/g, "/:param")
    .replace(/\$\{[^}]+\}/g, "")
    .replace(/\/[0-9a-fA-F-]{8,}(?=\/|$)/g, "/:param")
    .replace(/\/:[^/]+/g, "/:param")
    .replace(/\?.*$/, "")
    .replace(/\/+/g, "/");
}

function dedupeCalls(calls: ApiCall[]): ApiCall[] {
  const seen = new Set<string>();
  return calls.filter((call) => {
    const key = `${call.method}:${call.endpoint}:${call.callerFile}:${call.callerLine}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function collectCodeFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }

  const files: string[] = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", "dist", ".next"].includes(entry.name)) {
          walk(fullPath);
        }
        continue;
      }

      if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };

  walk(root);
  return files;
}

function toNodeName(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "_").replace(/^_+/, "") || "node";
}

function escapeMermaid(value: string): string {
  return value.replace(/"/g, '\\"');
}
