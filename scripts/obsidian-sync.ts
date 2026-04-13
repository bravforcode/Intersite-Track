import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  cliHas,
  cliValue,
  initializeConfig,
  config,
} from "./config/sync.config";
import { extractAnnotations } from "./lib/extractor";
import { syncAnnotationsToVault } from "./lib/extractor-to-vault";
import { syncLearnings } from "./lib/learnings-extractor";
import { extractAPIRoutes, extractTechStack } from "./lib/knowledge-builder";
import { buildCallGraph } from "./lib/frontend-backend-linker";
import { extractFirebaseSchema } from "./lib/firebase-schema-extractor";
import { checkAndPromptADR, rebuildAdrIndex } from "./lib/adr-writer";
import { logAgentSession } from "./lib/agent-logger";
import { syncUIAssets } from "./lib/ui-asset-sync";
import { extractInfraManifest } from "./lib/infra-manifest";
import { runHealthCheck } from "./lib/drift-detector";
import { ensureVaultScaffold } from "./lib/vault-scaffold";
import { buildPreflightBrief, buildSessionContext } from "./lib/context-recall";
import { listRegisteredProjects, registerCurrentProjectProfile } from "./lib/project-registry";
import { suggestPlaybooksFromHistory } from "./lib/playbook-suggester";

const cli = initializeConfig(process.argv.slice(2));

async function main(): Promise<void> {
  console.log(`\n🧠 Gracia Vault Sync Engine · ${config.projectName}\n`);

  if (cliHas(cli, "--list-projects")) {
    console.log(listRegisteredProjects());
    return;
  }

  if (needsScaffold()) {
    ensureVaultScaffold();
  }

  if (cliHas(cli, "--register-project") || cliHas(cli, "--full") || cliHas(cli, "--bootstrap")) {
    registerCurrentProjectProfile();
  }

  if (cliHas(cli, "--context")) {
    const brief = buildSessionContext({
      task: cliValue(cli, "--task"),
      limit: Number(cliValue(cli, "--limit") ?? 6),
      format: cliHas(cli, "--json") ? "json" : "markdown",
      saveBrief: !cliHas(cli, "--no-save"),
    });
    console.log(brief);
    return;
  }

  if (cliHas(cli, "--preflight")) {
    const brief = buildPreflightBrief({
      task: cliValue(cli, "--task"),
      limit: Number(cliValue(cli, "--limit") ?? 5),
      saveBrief: !cliHas(cli, "--no-save"),
    });
    console.log(brief);
    return;
  }

  if (cliHas(cli, "--playbook-suggest")) {
    const suggestions = suggestPlaybooksFromHistory(Number(cliValue(cli, "--limit") ?? 5));
    console.log(suggestions);
    return;
  }

  let annotations = [] as Awaited<ReturnType<typeof extractAnnotations>>;
  if (needsAnnotations()) {
    annotations = await extractAnnotations();
    console.log(`Found ${annotations.length} annotation(s)`);
  }

  if (cliHas(cli, "--bootstrap")) {
    rebuildAdrIndex();
  }

  if (cliHas(cli, "--sync") || cliHas(cli, "--full")) {
    syncAnnotationsToVault(annotations);
    syncLearnings(annotations);
  }

  if (cliHas(cli, "--knowledge") || cliHas(cli, "--full")) {
    const routes = extractAPIRoutes();
    extractTechStack();
    buildCallGraph(routes);
    extractFirebaseSchema();
    extractInfraManifest();
    rebuildAdrIndex();
  }

  if (cliHas(cli, "--assets") || cliHas(cli, "--full")) {
    syncUIAssets();
  }

  if (cliHas(cli, "--health") || cliHas(cli, "--full")) {
    runHealthCheck(annotations);
  }

  if (cliHas(cli, "--full")) {
    suggestPlaybooksFromHistory(Number(cliValue(cli, "--limit") ?? 5));
  }

  if (cliHas(cli, "--check-adr")) {
    await checkAndPromptADR();
  }

  if (cliHas(cli, "--log")) {
    const summary = process.env.SESSION_SUMMARY ?? (await prompt("Session summary: "));
    const filesChanged =
      process.env.SESSION_FILES?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
    await logAgentSession({
      agent: "claude",
      summary,
      filesChanged,
      decisions: [],
      promptSummary: process.env.SESSION_PROMPT_SUMMARY,
    });
  }

  console.log("\n✅ Done.\n");
}

function needsScaffold(): boolean {
  return (
    cli.rawArgs.length === 0 ||
    cliHas(cli, "--bootstrap") ||
    cliHas(cli, "--full") ||
    cliHas(cli, "--register-project") ||
    cliHas(cli, "--context") ||
    cliHas(cli, "--preflight") ||
    cliHas(cli, "--playbook-suggest")
  );
}

function needsAnnotations(): boolean {
  return (
    cli.rawArgs.length === 0 ||
    cliHas(cli, "--sync") ||
    cliHas(cli, "--full") ||
    cliHas(cli, "--health")
  );
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("❌ Sync failed:", error);
  process.exit(1);
});
