import { config, loadProjectRegistry, saveProjectRegistry } from "../config/sync.config";

export function registerCurrentProjectProfile(): void {
  const registry = loadProjectRegistry(config.vaultRoot);
  registry[config.projectKey] = {
    projectKey: config.projectKey,
    projectName: config.projectName,
    projectFolder: config.projectFolder,
    projectRoot: config.codebaseRoot,
    vaultRoot: config.vaultRoot,
    scanDirs: config.scanDirs,
    scanExtensions: [...config.scanExtensions],
    screenshotDir: config.screenshotDir,
  };
  saveProjectRegistry(registry, config.vaultRoot);
  console.log(`✅ Registered project "${config.projectKey}" → ${config.codebaseRoot}`);
}

export function listRegisteredProjects(): string {
  const registry = loadProjectRegistry(config.vaultRoot);
  const entries = Object.values(registry).sort((left, right) =>
    (left.projectKey ?? "").localeCompare(right.projectKey ?? ""),
  );

  if (entries.length === 0) {
    return "No registered projects.";
  }

  return [
    "Registered projects:",
    ...entries.map((entry) =>
      `- ${entry.projectKey} | ${entry.projectName ?? "Unnamed"} | ${entry.projectRoot ?? "No root configured"}`,
    ),
  ].join("\n");
}
