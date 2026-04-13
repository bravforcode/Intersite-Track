import fs from "node:fs";
import path from "node:path";
import { config } from "../config/sync.config";
import { writeToVault } from "./vault-writer";

export function syncUIAssets(): void {
  const sourceDir = path.join(config.codebaseRoot, config.screenshotDir);
  if (!fs.existsSync(sourceDir)) {
    console.log(`ℹ️  Screenshot directory not found at ${config.screenshotDir}`);
    return;
  }

  const images = fs
    .readdirSync(sourceDir)
    .filter((file) => /\.(png|jpe?g|gif|webp|svg)$/i.test(file))
    .sort();

  if (images.length === 0) {
    console.log("ℹ️  No screenshots to sync");
    return;
  }

  const indexLines = [
    `---
project: ${config.projectName}
type: ui-assets
updated: ${new Date().toISOString().split("T")[0]}
tags:
  - area/work
  - type/meta
  - ${config.projectKey}
---
`,
    "# UI Screenshot Index",
    "",
  ];

  for (const image of images) {
    const sourcePath = path.join(sourceDir, image);
    const destinationPath = path.join(config.vaultRoot, config.vaultPaths.attachments, image);
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

    const sourceStat = fs.statSync(sourcePath);
    const destinationStat = fs.existsSync(destinationPath) ? fs.statSync(destinationPath) : undefined;

    if (!destinationStat || sourceStat.mtimeMs > destinationStat.mtimeMs) {
      fs.copyFileSync(sourcePath, destinationPath);
    }

    indexLines.push(`## ${image.replace(/\.[^.]+$/, "")}`);
    indexLines.push(`![[${image}]]`);
    indexLines.push("");
  }

  writeToVault(config.vaultPaths.screenshotIndex, indexLines.join("\n"));
  console.log(`✅ Synced ${images.length} screenshot asset(s)`);
}
