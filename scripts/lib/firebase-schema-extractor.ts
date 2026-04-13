import fs from "node:fs";
import path from "node:path";
import { config } from "../config/sync.config";
import { updateAutoSection } from "./vault-writer";

const FIRESTORE_COLLECTION_REGEXES = [
  /\.collection\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
  /collection\(\s*\w+\s*,\s*["'`]([^"'`]+)["'`]\s*\)/g,
];
const DOC_PATH_REGEX = /doc\(\s*\w+\s*,\s*["'`]([^"'`]+)["'`]\s*\)/g;
const INTERFACE_REGEX = /(?:export\s+)?interface\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
const TYPE_LITERAL_REGEX = /(?:export\s+)?type\s+(\w+)\s*=\s*\{([\s\S]*?)\n\};?/g;
const FIELD_REGEX = /^\s*([A-Za-z0-9_]+)\??\s*:\s*([^;,\n]+)/gm;

interface CollectionUsage {
  name: string;
  files: Set<string>;
  docPaths: Set<string>;
}

export function extractFirebaseSchema(): void {
  const files = collectFiles(["src", "server", "tests"]);
  const collections = new Map<string, CollectionUsage>();
  const shapes: Array<{
    name: string;
    file: string;
    collection?: string;
    fields: Array<{ name: string; type: string }>;
  }> = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const relativeFile = path.relative(config.codebaseRoot, filePath).replace(/\\/g, "/");

    for (const regex of FIRESTORE_COLLECTION_REGEXES) {
      for (const match of content.matchAll(regex)) {
        const collectionName = match[1];
        if (!collections.has(collectionName)) {
          collections.set(collectionName, {
            name: collectionName,
            files: new Set<string>(),
            docPaths: new Set<string>(),
          });
        }
        collections.get(collectionName)!.files.add(relativeFile);
      }
    }

    for (const match of content.matchAll(DOC_PATH_REGEX)) {
      const docPath = match[1];
      const collectionName = docPath.split("/")[0];
      if (!collections.has(collectionName)) {
        collections.set(collectionName, {
          name: collectionName,
          files: new Set<string>(),
          docPaths: new Set<string>(),
        });
      }
      collections.get(collectionName)!.files.add(relativeFile);
      collections.get(collectionName)!.docPaths.add(docPath);
    }

    shapes.push(...extractShapes(content, relativeFile, collections));
  }

  const firestoreArtifacts = [
    "firestore.rules",
    "firestore.indexes.json",
  ].filter((file) => fs.existsSync(path.join(config.codebaseRoot, file)));

  const lines = [
    `> Last synced: ${new Date().toISOString()}`,
    "",
    "## Firestore Collections",
    "",
    "| Collection | Sample Doc Paths | Used In |",
    "|------------|------------------|---------|",
  ];

  if (collections.size === 0) {
    lines.push("| _None detected_ |  |  |");
  } else {
    for (const collection of [...collections.values()].sort((left, right) => left.name.localeCompare(right.name))) {
      lines.push(
        `| \`${collection.name}\` | ${
          collection.docPaths.size > 0
            ? [...collection.docPaths].slice(0, 3).map((docPath) => `\`${docPath}\``).join(", ")
            : "—"
        } | ${[...collection.files].map((file) => `\`${file}\``).join(", ")} |`,
      );
    }
  }

  lines.push("");
  lines.push("## Type Shapes");
  lines.push("");

  if (shapes.length === 0) {
    lines.push("_No matching TypeScript object shapes found._");
  } else {
    for (const shape of shapes.sort((left, right) => left.name.localeCompare(right.name))) {
      lines.push(`### \`${shape.name}\`${shape.collection ? ` → \`${shape.collection}\`` : ""}`);
      lines.push(`> \`${shape.file}\``);
      lines.push("");
      lines.push("| Field | Type |");
      lines.push("|-------|------|");
      shape.fields.forEach((field) => lines.push(`| \`${field.name}\` | \`${field.type}\` |`));
      lines.push("");
    }
  }

  lines.push("## Firestore Artifacts");
  lines.push("");
  if (firestoreArtifacts.length === 0) {
    lines.push("_No Firestore rules or index files found._");
  } else {
    firestoreArtifacts.forEach((artifact) => lines.push(`- \`${artifact}\``));
  }

  updateAutoSection(config.vaultPaths.databaseSchema, lines.join("\n"));
  console.log(`✅ Extracted ${collections.size} Firestore collection(s), ${shapes.length} shape(s), and ${firestoreArtifacts.length} Firestore artifact(s)`);
}

function extractShapes(
  content: string,
  relativeFile: string,
  collections: Map<string, CollectionUsage>,
): Array<{ name: string; file: string; collection?: string; fields: Array<{ name: string; type: string }> }> {
  const shapes: Array<{ name: string; file: string; collection?: string; fields: Array<{ name: string; type: string }> }> = [];
  const patterns = [INTERFACE_REGEX, TYPE_LITERAL_REGEX];

  for (const regex of patterns) {
    for (const match of content.matchAll(regex)) {
      const name = match[1];
      const body = match[2];
      const fields: Array<{ name: string; type: string }> = [];
      for (const fieldMatch of body.matchAll(FIELD_REGEX)) {
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[2].trim(),
        });
      }

      if (fields.length === 0) {
        continue;
      }

      const guessedCollection = guessCollectionName(name, collections);
      shapes.push({
        name,
        file: relativeFile,
        collection: guessedCollection,
        fields,
      });
    }
  }

  return shapes;
}

function guessCollectionName(name: string, collections: Map<string, CollectionUsage>): string | undefined {
  const candidates = [
    name.toLowerCase(),
    `${name.toLowerCase()}s`,
    `${name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()}s`,
  ];

  return candidates.find((candidate) => collections.has(candidate));
}

function collectFiles(roots: string[]): string[] {
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

      if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };

  roots.forEach((root) => walk(path.join(config.codebaseRoot, root)));
  return files;
}
