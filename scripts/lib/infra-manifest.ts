import fs from "node:fs";
import path from "node:path";
import { config } from "../config/sync.config";
import { updateAutoSection } from "./vault-writer";

const PROCESS_ENV_REGEX = /process\.env\.([A-Z][A-Z0-9_]+)/g;
const VITE_ENV_REGEX = /import\.meta\.env\.([A-Z][A-Z0-9_]+)/g;

export function extractInfraManifest(): void {
  const envKeys = new Set<string>();
  const scripts = new Map<string, string>();

  [".env.example", ".env.sample", ".env.template"].forEach((fileName) => {
    const fullPath = path.join(config.codebaseRoot, fileName);
    if (!fs.existsSync(fullPath)) {
      return;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = /^\s*([A-Z][A-Z0-9_]+)\s*=/.exec(line);
      if (match) {
        envKeys.add(match[1]);
      }
    }
  });

  for (const filePath of collectCodeFiles(["src", "server", "scripts"])) {
    const content = fs.readFileSync(filePath, "utf8");
    for (const match of content.matchAll(PROCESS_ENV_REGEX)) {
      envKeys.add(match[1]);
    }
    for (const match of content.matchAll(VITE_ENV_REGEX)) {
      envKeys.add(match[1]);
    }
  }

  const packagePath = path.join(config.codebaseRoot, "package.json");
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
      if (["build", "start", "preview", "deploy", "migrate", "seed"].some((needle) => name.includes(needle))) {
        scripts.set(name, command);
      }
    }
  }

  const sortedKeys = [...envKeys].sort();
  const sensitiveKeys = sortedKeys.filter((key) =>
    config.sensitiveKeyPatterns.some((pattern) => pattern.test(key)),
  );
  const regularKeys = sortedKeys.filter((key) => !sensitiveKeys.includes(key));

  const lines = [
    `> Last synced: ${new Date().toISOString()}`,
    "",
    "## Environment Variables Checklist",
    "",
    "> Values are intentionally omitted. This note stores key names only.",
    "",
    "### Configuration",
    ...(regularKeys.length > 0 ? regularKeys.map((key) => `- [ ] \`${key}\``) : ["- _None detected_"]),
    "",
    "### Secrets",
    ...(sensitiveKeys.length > 0 ? sensitiveKeys.map((key) => `- [ ] \`${key}\` 🔐`) : ["- _None detected_"]),
    "",
    "## Deploy / Build Scripts",
    ...(scripts.size > 0
      ? [...scripts.entries()].map(([name, command]) => `- \`npm run ${name}\` → \`${command}\``)
      : ["- _No matching scripts found._"]),
    "",
    "## Config Files Present",
    ...["vercel.json", "firestore.rules", "firestore.indexes.json", ".env.example"]
      .filter((fileName) => fs.existsSync(path.join(config.codebaseRoot, fileName)))
      .map((fileName) => `- \`${fileName}\``),
    "",
    "## Pre-Deploy Checklist",
    "- [ ] Required environment variables are configured",
    "- [ ] `npm run build` succeeds locally",
    "- [ ] Firestore / Supabase permissions reviewed",
    "- [ ] CORS origins reflect the production domain",
    "- [ ] No secrets are committed into the repository",
  ];

  updateAutoSection(config.vaultPaths.infraManifest, lines.join("\n"));
  console.log(`✅ Extracted ${sortedKeys.length} environment key(s) into infra manifest`);
}

function collectCodeFiles(roots: string[]): string[] {
  const files: string[] = [];

  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) {
      return;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", "dist", ".next"].includes(entry.name)) {
          walk(fullPath);
        }
        continue;
      }

      if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };

  roots.forEach((root) => walk(path.join(config.codebaseRoot, root)));
  return files;
}
