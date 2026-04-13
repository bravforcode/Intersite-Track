import fs from "node:fs";
import path from "node:path";
import { config } from "../config/sync.config.js";
import { sanitizeContent } from "./security-sanitizer.js";

export const AUTO_START = "<!-- AUTO-SYNC:START -->";
export const AUTO_END = "<!-- AUTO-SYNC:END -->";

export function autoMarkerStart(sectionName?: string): string {
  return sectionName ? `<!-- AUTO-SYNC:START ${sectionName} -->` : AUTO_START;
}

export function autoMarkerEnd(sectionName?: string): string {
  return sectionName ? `<!-- AUTO-SYNC:END ${sectionName} -->` : AUTO_END;
}

export function resolveVaultPath(relativePath: string): string {
  return path.join(config.vaultRoot, relativePath);
}

export function ensureVaultDirectory(relativePath: string): string {
  const fullPath = resolveVaultPath(relativePath);
  fs.mkdirSync(fullPath, { recursive: true });
  return fullPath;
}

export function ensureParentDirectory(relativePath: string): string {
  const fullPath = resolveVaultPath(relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  return fullPath;
}

export function writeToVault(relativePath: string, content: string): void {
  const fullPath = ensureParentDirectory(relativePath);
  fs.writeFileSync(fullPath, sanitizeContent(content), "utf8");
}

export function appendToVault(relativePath: string, content: string): void {
  const fullPath = ensureParentDirectory(relativePath);
  fs.appendFileSync(fullPath, sanitizeContent(content), "utf8");
}

export function upsertAutoSectionContent(existing: string, autoContent: string, sectionName?: string): string {
  const sanitized = sanitizeContent(autoContent.trim());
  const startMarker = autoMarkerStart(sectionName);
  const endMarker = autoMarkerEnd(sectionName);

  if (!existing.trim()) {
    return `${startMarker}\n${sanitized}\n${endMarker}\n`;
  }

  if (!existing.includes(startMarker) || !existing.includes(endMarker)) {
    const separator = existing.endsWith("\n") ? "" : "\n";
    return `${existing}${separator}\n${startMarker}\n${sanitized}\n${endMarker}\n`;
  }

  const startIndex = existing.indexOf(startMarker);
  const endIndex = existing.indexOf(endMarker) + endMarker.length;
  const before = existing.slice(0, startIndex + startMarker.length);
  const after = existing.slice(endIndex);
  return `${before}\n${sanitized}\n${endMarker}${after}`;
}

export function updateAutoSection(relativePath: string, autoContent: string, sectionName?: string): void {
  const fullPath = ensureParentDirectory(relativePath);
  const existing = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
  fs.writeFileSync(fullPath, upsertAutoSectionContent(existing, autoContent, sectionName), "utf8");
}

export function writeIfMissing(relativePath: string, content: string): void {
  const fullPath = ensureParentDirectory(relativePath);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, sanitizeContent(content), "utf8");
  }
}

export function upsertInboxItem(stableName: string, content: string): void {
  const fileName = stableName.endsWith(".md") ? stableName : `${stableName}.md`;
  writeToVault(path.join(config.vaultPaths.inbox, fileName), content);
}
