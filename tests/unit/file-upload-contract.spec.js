import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test("frontend upload client targets the task-scoped upload endpoint and uses download_url", () => {
  const taskServiceFile = readFileSync(
    join(__dirname, "../../frontend/src/services/taskService.ts"),
    "utf-8"
  );

  assert(
    taskServiceFile.includes("uploadImage: async (taskId: string, file: File)"),
    "taskService.uploadImage should require the task id"
  );
  assert(
    taskServiceFile.includes("`/api/tasks/${taskId}/upload`"),
    "taskService.uploadImage should call the task-scoped upload endpoint"
  );
  assert(
    taskServiceFile.includes("return data.download_url;"),
    "taskService.uploadImage should return the authenticated download URL"
  );
});

test("file downloads are mounted on /api/files instead of under /api/tasks", () => {
  const routesIndexFile = readFileSync(
    join(__dirname, "../../backend/src/routes/index.ts"),
    "utf-8"
  );
  const fileRoutesFile = readFileSync(
    join(__dirname, "../../backend/src/routes/file.routes.ts"),
    "utf-8"
  );

  assert(
    routesIndexFile.includes('router.use("/files", fileRoutes);'),
    "backend route index should mount file routes under /api/files"
  );
  assert(
    fileRoutesFile.includes('router.get("/:fileId/download"'),
    "file.routes.ts should expose GET /api/files/:fileId/download"
  );
});
