import fs from "node:fs";
import path from "node:path";
import { config } from "../config/sync.config";
import { updateAutoSection } from "./vault-writer";

export interface ExpressRoute {
  method: string;
  route: string;
  handlerFile: string;
  line: number;
}

interface MountedRouter {
  importName: string;
  mountPath: string;
  filePath: string;
}

const ROUTE_IMPORT_REGEX = /import\s+(\w+)\s+from\s+["'](.+?\.routes\.js)["'];?/g;
const ROUTER_USE_REGEX = /router\.use\(\s*["'`]([^"'`]+)["'`]\s*,\s*(\w+)\s*\)/g;
const ROUTE_METHOD_REGEX = /router\.(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/g;

export function extractAPIRoutes(): ExpressRoute[] {
  const routesRoot = path.join(config.codebaseRoot, "server/routes");
  const indexPath = path.join(routesRoot, "index.ts");

  if (!fs.existsSync(indexPath)) {
    console.warn("⚠️  Route index not found at server/routes/index.ts");
    updateAutoSection(config.vaultPaths.backendMap, "_Route index not found._");
    return [];
  }

  const mountedRouters = extractMountedRouters(indexPath);
  const routes: ExpressRoute[] = [];

  for (const mountedRouter of mountedRouters) {
    routes.push(...extractRoutesFromFile(mountedRouter.filePath, mountedRouter.mountPath));
  }

  routes.push(...extractRoutesFromFile(indexPath, ""));

  const deduped = dedupeRoutes(routes);

  updateAutoSection(config.vaultPaths.backendMap, renderBackendMap(deduped));
  updateAutoSection(config.vaultPaths.systemOverview, renderSystemOverview(deduped));
  updateAutoSection(config.vaultPaths.frontendMap, renderFrontendMap());
  updateAutoSection(config.vaultPaths.dataFlow, renderDataFlow(deduped));

  console.log(`✅ Extracted ${deduped.length} API route(s)`);
  return deduped;
}

export function extractTechStack(): void {
  const packagePath = path.join(config.codebaseRoot, "package.json");
  if (!fs.existsSync(packagePath)) {
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const dependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };

  const categories: Record<string, string> = {
    react: "Frontend",
    vite: "Build Tool",
    express: "Backend",
    firebase: "Database/Auth",
    multer: "File Upload",
    jsonwebtoken: "Auth",
    helmet: "Security",
    cors: "Security",
    tsx: "Tooling",
    typescript: "Language",
    tailwind: "Styling",
    lucide: "UI",
    chart: "Visualization",
    supertest: "Testing",
  };

  const rows = Object.entries(dependencies)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, version]) => {
      const category =
        Object.entries(categories).find(([needle]) => name.includes(needle))?.[1] ?? "Other";
      return `| \`${name}\` | ${version} | ${category} |`;
    });

  const markdown = [
    `> Last synced: ${new Date().toISOString()}`,
    "",
    "| Package | Version | Category |",
    "|---------|---------|----------|",
    ...rows,
  ].join("\n");

  updateAutoSection(config.vaultPaths.techStack, markdown);
  console.log(`✅ Extracted ${rows.length} package(s) into tech stack`);
}

function extractMountedRouters(indexPath: string): MountedRouter[] {
  const content = fs.readFileSync(indexPath, "utf8");
  const importMap = new Map<string, string>();

  for (const match of content.matchAll(ROUTE_IMPORT_REGEX)) {
    const importName = match[1];
    const importPath = match[2].replace(/\.js$/, ".ts");
    importMap.set(importName, path.join(path.dirname(indexPath), importPath));
  }

  const mountedRouters: MountedRouter[] = [];
  for (const match of content.matchAll(ROUTER_USE_REGEX)) {
    const mountPath = match[1];
    const importName = match[2];
    const filePath = importMap.get(importName);
    if (!filePath) {
      continue;
    }

    mountedRouters.push({
      importName,
      mountPath,
      filePath,
    });
  }

  return mountedRouters;
}

function extractRoutesFromFile(filePath: string, mountPath: string): ExpressRoute[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf8");
  const relativeFile = path.relative(config.codebaseRoot, filePath).replace(/\\/g, "/");
  const routes: ExpressRoute[] = [];

  for (const match of content.matchAll(ROUTE_METHOD_REGEX)) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    const before = content.slice(0, match.index);
    const line = before.split(/\r?\n/).length;
    routes.push({
      method,
      route: joinRoutePaths("/api", mountPath, routePath),
      handlerFile: relativeFile,
      line,
    });
  }

  return routes;
}

function dedupeRoutes(routes: ExpressRoute[]): ExpressRoute[] {
  const seen = new Set<string>();
  return routes.filter((route) => {
    const key = `${route.method}:${route.route}:${route.handlerFile}:${route.line}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function renderBackendMap(routes: ExpressRoute[]): string {
  if (routes.length === 0) {
    return "_No API routes found._";
  }

  const lines = [
    `> Last synced: ${new Date().toISOString()}`,
    "",
    "| Method | Route | Handler File |",
    "|--------|-------|--------------|",
    ...routes
      .sort((left, right) => left.route.localeCompare(right.route) || left.method.localeCompare(right.method))
      .map((route) => `| \`${route.method}\` | \`${route.route}\` | \`${route.handlerFile}:${route.line}\` |`),
  ];

  return lines.join("\n");
}

function renderSystemOverview(routes: ExpressRoute[]): string {
  const summary = [
    "## Runtime",
    "- Frontend: React 19 + Vite SPA via `src/main.tsx` and `src/App.tsx`",
    "- Backend: Express app served from `server.ts` with Vite middleware in development",
    "- Persistence: Firebase Auth + Firestore are the active application data stores",
    "",
    "## Integration Surface",
    `- API endpoints discovered: ${routes.length}`,
    "- Auth path: Firebase client auth issues bearer tokens consumed by Express middleware",
    "- File uploads: `/api/tasks/upload` stores locally in dev and Vercel Blob in production",
  ];

  return summary.join("\n");
}

function renderFrontendMap(): string {
  const sections: string[] = [];
  const appEntry = path.join(config.codebaseRoot, "src/main.tsx");
  const servicesDir = path.join(config.codebaseRoot, "src/services");
  const hooksDir = path.join(config.codebaseRoot, "src/hooks");
  const pages = collectFiles(path.join(config.codebaseRoot, "src/components"), (file) =>
    file.endsWith("Page.tsx"),
  );
  const services = collectFiles(servicesDir, (file) => file.endsWith(".ts"));
  const hooks = collectFiles(hooksDir, (file) => file.endsWith(".ts") || file.endsWith(".tsx"));

  sections.push(`- Entry point: \`${path.relative(config.codebaseRoot, appEntry).replace(/\\/g, "/")}\``);
  sections.push(`- Page-level components: ${pages.length}`);
  sections.push(`- Service modules: ${services.length}`);
  sections.push(`- Custom hooks: ${hooks.length}`);
  sections.push("");
  sections.push("## Pages");
  sections.push(...pages.map((page) => `- \`${page}\``));
  sections.push("");
  sections.push("## Services");
  sections.push(...services.map((service) => `- \`${service}\``));

  return sections.join("\n");
}

function renderDataFlow(routes: ExpressRoute[]): string {
  const authRoutes = routes.filter((route) => route.route.includes("/auth") || route.route.includes("/login"));
  return [
    "## Request Flow",
    "- React components call service modules under `src/services/*`.",
    "- Service modules use the shared API client in `src/services/apiClient.ts` or direct `fetch` for uploads.",
    "- Requests hit Express routers mounted from `server/routes/index.ts` under `/api`.",
    "- Controllers and database query modules resolve data from Firestore and selected auxiliary services.",
    "",
    "## Auth Flow",
    `- Auth-related endpoints discovered: ${authRoutes.length}`,
    "- Firebase client tokens are attached to API requests and validated by backend middleware.",
    "",
    "## Data Stores",
    "- Firestore collections are used across controllers and query modules.",
    "- Firestore rules and indexes are the primary schema/control artifacts for the live app.",
  ].join("\n");
}

function collectFiles(root: string, matcher: (file: string) => boolean): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }

  const results: string[] = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const relativePath = path.relative(config.codebaseRoot, fullPath).replace(/\\/g, "/");
      if (matcher(relativePath)) {
        results.push(relativePath);
      }
    }
  };

  walk(root);
  return results.sort();
}

function joinRoutePaths(...parts: string[]): string {
  const cleaned = parts
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/\/+$/g, "").replace(/^\/+/g, ""));

  const joined = `/${cleaned.join("/")}`.replace(/\/+/g, "/");
  return joined === "/api/" ? "/api" : joined.replace(/\/$/, "") || "/";
}
