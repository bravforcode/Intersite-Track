import fs from "node:fs";
import path from "node:path";

export interface ProjectProfile {
  projectKey?: string;
  projectName?: string;
  projectFolder?: string;
  projectRoot?: string;
  vaultRoot?: string;
  scanDirs?: string[];
  scanExtensions?: string[];
  screenshotDir?: string;
}

export interface CliOptions {
  flags: Set<string>;
  values: Record<string, string>;
  rawArgs: string[];
}

export interface SyncConfig {
  projectKey: string;
  projectName: string;
  projectFolder: string;
  codebaseRoot: string;
  vaultRoot: string;
  registryPath: string;
  localProjectConfigPath?: string;
  scanDirs: string[];
  scanExtensions: readonly string[];
  screenshotDir: string;
  vaultPaths: {
    inbox: string;
    projectRoot: string;
    dashboard: string;
    activeTasks: string;
    adrDir: string;
    adrIndex: string;
    architectureDir: string;
    systemOverview: string;
    frontendMap: string;
    backendMap: string;
    dataFlow: string;
    apiCallGraph: string;
    databaseSchema: string;
    contextDir: string;
    sessionRules: string;
    preferredSkills: string;
    sessionPlaybook: string;
    playbookSuggestions: string;
    workingAgreements: string;
    domainGlossary: string;
    sprintsDir: string;
    learnings: string;
    securityNotes: string;
    techStack: string;
    infraManifest: string;
    agentLogDir: string;
    attachments: string;
    screenshotIndex: string;
    health: string;
    tagTaxonomy: string;
    globalRules: string;
    globalSkills: string;
    globalPlaybooks: string;
    projectRegistry: string;
    contextCacheDir: string;
    latestContextBrief: string;
    latestPreflightBrief: string;
  };
  inboxPolicy: Record<string, "inbox" | "direct">;
  priorityKeywords: {
    high: string[];
    medium: string[];
    low: string[];
  };
  adrTriggerPatterns: RegExp[];
  sensitiveKeyPatterns: RegExp[];
}

export let config: SyncConfig = buildConfig({
  flags: new Set<string>(),
  values: {},
  rawArgs: [],
});

export function initializeConfig(argv: string[] = process.argv.slice(2)): CliOptions {
  const cli = parseCliOptions(argv);
  config = buildConfig(cli);
  return cli;
}

export function parseCliOptions(argv: string[]): CliOptions {
  const flags = new Set<string>();
  const values: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      flags.add(token);
      continue;
    }

    values[token] = next;
    index += 1;
  }

  return { flags, values, rawArgs: argv };
}

export function cliHas(cli: CliOptions, flag: string): boolean {
  return cli.flags.has(flag);
}

export function cliValue(cli: CliOptions, flag: string): string | undefined {
  return cli.values[flag];
}

export function loadProjectRegistry(vaultRoot = config.vaultRoot): Record<string, ProjectProfile> {
  const registryPath = path.join(vaultRoot, "Meta/AI/project-registry.json");
  if (!fs.existsSync(registryPath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8")) as {
      projects?: Record<string, ProjectProfile>;
    };
    return parsed.projects ?? {};
  } catch {
    return {};
  }
}

export function saveProjectRegistry(projects: Record<string, ProjectProfile>, vaultRoot = config.vaultRoot): void {
  const registryPath = path.join(vaultRoot, "Meta/AI/project-registry.json");
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(
    registryPath,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        projects,
      },
      null,
      2,
    ),
    "utf8",
  );
}

function buildConfig(cli: CliOptions): SyncConfig {
  const vaultRoot = normalizePath(cli.values["--vault-root"] ?? process.env.GRACIA_VAULT_ROOT ?? "C:/Users/menum/OneDrive/Documents/Gracia");
  const registry = loadProjectRegistry(vaultRoot);
  const requestedProjectKey = cli.values["--project"];
  const registryProfile = requestedProjectKey ? registry[requestedProjectKey] : undefined;
  const resolvedRoot = normalizePath(
    cli.values["--project-root"] ??
      registryProfile?.projectRoot ??
      process.cwd(),
  );
  const localProfile = loadLocalProjectProfile(resolvedRoot, cli.values["--config"]);
  const packageJson = loadPackageJson(resolvedRoot);
  const derivedName = cli.values["--project-name"] ?? localProfile.projectName ?? registryProfile?.projectName ?? deriveProjectName(packageJson?.name, resolvedRoot);
  const derivedKey = cli.values["--project"] ?? localProfile.projectKey ?? registryProfile?.projectKey ?? slugify(packageJson?.name ?? path.basename(resolvedRoot));
  const projectFolder = localProfile.projectFolder ?? registryProfile?.projectFolder ?? sanitizeFolderName(derivedName);

  const scanDirs = uniqueStrings(
    localProfile.scanDirs ??
      registryProfile?.scanDirs ??
      detectScanDirs(resolvedRoot),
  );
  const scanExtensions = uniqueStrings(
    localProfile.scanExtensions ??
      registryProfile?.scanExtensions ??
      [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  );
  const screenshotDir =
    localProfile.screenshotDir ??
    registryProfile?.screenshotDir ??
    detectScreenshotDir(resolvedRoot);

  return {
    projectKey: derivedKey,
    projectName: derivedName,
    projectFolder,
    codebaseRoot: resolvedRoot,
    vaultRoot,
    registryPath: path.join(vaultRoot, "Meta/AI/project-registry.json"),
    localProjectConfigPath: localProfile.__path,
    scanDirs,
    scanExtensions,
    screenshotDir,
    vaultPaths: buildVaultPaths(projectFolder, derivedName, derivedKey),
    inboxPolicy: {
      BUG: "inbox",
      FIXME: "inbox",
      SECURITY: "inbox",
      PERF: "inbox",
      TODO: "direct",
      ARCH: "direct",
      NOTE: "direct",
      LEARN: "direct",
    },
    priorityKeywords: {
      high: ["urgent", "critical", "asap", "blocker", "breaking"],
      medium: ["should", "consider", "improve", "refactor"],
      low: ["nice-to-have", "someday", "maybe", "eventually"],
    },
    adrTriggerPatterns: [
      /^(feat|refactor|arch):/i,
      /\[ADR\]/i,
      /decision:/i,
    ],
    sensitiveKeyPatterns: [
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token/i,
      /private[_-]?key/i,
      /auth/i,
      /credential/i,
      /passphrase/i,
      /service[_-]?role/i,
      /database[_-]?url/i,
    ],
  };
}

function buildVaultPaths(projectFolder: string, projectName: string, projectKey: string): SyncConfig["vaultPaths"] {
  return {
    inbox: "00-Inbox",
    projectRoot: `01-Projects/${projectFolder}`,
    dashboard: `01-Projects/${projectFolder}/_${projectFolder} Dashboard.md`,
    activeTasks: `01-Projects/${projectFolder}/Active-Tasks.md`,
    adrDir: `01-Projects/${projectFolder}/Decisions`,
    adrIndex: `01-Projects/${projectFolder}/Decisions/ADR-000-Index.md`,
    architectureDir: `01-Projects/${projectFolder}/Architecture`,
    systemOverview: `01-Projects/${projectFolder}/Architecture/System-Overview.md`,
    frontendMap: `01-Projects/${projectFolder}/Architecture/Frontend-Map.md`,
    backendMap: `01-Projects/${projectFolder}/Architecture/Backend-Map.md`,
    dataFlow: `01-Projects/${projectFolder}/Architecture/Data-Flow.md`,
    apiCallGraph: `01-Projects/${projectFolder}/Architecture/API-Call-Graph.md`,
    databaseSchema: `01-Projects/${projectFolder}/Architecture/Database-Schema.md`,
    contextDir: `01-Projects/${projectFolder}/Context`,
    sessionRules: `01-Projects/${projectFolder}/Context/Session-Rules.md`,
    preferredSkills: `01-Projects/${projectFolder}/Context/Preferred-Skills.md`,
    sessionPlaybook: `01-Projects/${projectFolder}/Context/Session-Playbooks.md`,
    playbookSuggestions: `01-Projects/${projectFolder}/Context/Playbook-Suggestions.md`,
    workingAgreements: `01-Projects/${projectFolder}/Context/Working-Agreements.md`,
    domainGlossary: `01-Projects/${projectFolder}/Context/Domain-Glossary.md`,
    sprintsDir: `01-Projects/${projectFolder}/Sprints`,
    learnings: `02-Areas/Dev-Practice/${projectName}-Learnings.md`,
    securityNotes: `02-Areas/Dev-Practice/${projectName}-Security-Notes.md`,
    techStack: `03-Resources/Tech/${projectName}-Tech-Stack.md`,
    infraManifest: `03-Resources/Tech/${projectName}-Infra-Manifest.md`,
    agentLogDir: `Meta/agent-log/${projectFolder}`,
    attachments: `Meta/attachments/${projectFolder}`,
    screenshotIndex: `Meta/attachments/${projectFolder}/_UI-Screenshot-Index.md`,
    health: `Meta/health/${projectName}-Sync-Health.md`,
    tagTaxonomy: "Meta/tag-taxonomy.md",
    globalRules: "Meta/AI/Global-Rules.md",
    globalSkills: "Meta/AI/Global-Skills.md",
    globalPlaybooks: "Meta/AI/Global-Session-Playbooks.md",
    projectRegistry: "Meta/AI/project-registry.json",
    contextCacheDir: `Meta/AI/context-cache/${projectKey}`,
    latestContextBrief: `Meta/AI/context-cache/${projectKey}/latest.md`,
    latestPreflightBrief: `Meta/AI/context-cache/${projectKey}/preflight.md`,
  };
}

function loadLocalProjectProfile(projectRoot: string, explicitPath?: string): (ProjectProfile & { __path?: string }) {
  const candidates = [
    explicitPath ? normalizePath(explicitPath) : undefined,
    path.join(projectRoot, ".vaultsync/project.json"),
    path.join(projectRoot, "vault.project.json"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8")) as ProjectProfile;
      return { ...parsed, __path: candidate };
    } catch {
      return {};
    }
  }

  return {};
}

function loadPackageJson(projectRoot: string): { name?: string } | undefined {
  const packagePath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(packagePath)) {
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(packagePath, "utf8")) as { name?: string };
  } catch {
    return undefined;
  }
}

function deriveProjectName(packageName: string | undefined, projectRoot: string): string {
  const raw = packageName ?? path.basename(projectRoot);
  return raw
    .replace(/^@[^/]+\//, "")
    .split(/[-_]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function detectScanDirs(projectRoot: string): string[] {
  const candidates = [
    "src",
    "app",
    "server",
    "api",
    "backend",
    "frontend",
    "components",
    "lib",
    "services",
    "packages",
    "tests",
    "scripts",
  ];

  const detected = candidates.filter((dir) => fs.existsSync(path.join(projectRoot, dir)));
  return detected.length > 0 ? detected : ["src", "tests", "scripts"].filter((dir) => fs.existsSync(path.join(projectRoot, dir)));
}

function detectScreenshotDir(projectRoot: string): string {
  const candidates = [
    "docs/screenshots",
    "screenshots",
    "docs/ui",
    "docs/assets/screens",
  ];

  return candidates.find((dir) => fs.existsSync(path.join(projectRoot, dir))) ?? "docs/screenshots";
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/^@[^/]+\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeFolderName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, "-").trim();
}

function normalizePath(value: string): string {
  return path.resolve(value).replace(/\\/g, "/");
}

export type VaultPathKey = keyof SyncConfig["vaultPaths"];
