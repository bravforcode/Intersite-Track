import { Router } from "express";
import {
  getTasks, getTask, createTaskHandler, updateTaskHandler,
  updateStatus, deleteTaskHandler, getTasksWorkspace, getBlockers,
} from "../controllers/task.controller.js";
import {
  getTaskUpdates, addTaskUpdate, getChecklists, saveChecklists, toggleChecklist,
} from "../controllers/taskUpdate.controller.js";
import { getTaskComments, addTaskComment } from "../controllers/comment.controller.js";
import { getTaskActivity, getGlobalActivity } from "../controllers/activity.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { CreateTaskSchema, UpdateTaskSchema } from "../../../shared/schemas/api.schemas.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const isDev = process.env.NODE_ENV !== "production" && !process.env.VERCEL;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const uploadsDir = path.join(repoRoot, "uploads");
const VERCEL_SERVER_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;
const LOCAL_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
const maxUploadBytes = process.env.VERCEL ? VERCEL_SERVER_UPLOAD_LIMIT_BYTES : LOCAL_UPLOAD_LIMIT_BYTES;

// ── Storage setup ──────────────────────────────────────────────────
// Dev/production: keep uploads in memory, then persist to the correct backing store.
if (isDev && !fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/",
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    if (allowedTypes.some(type => file.mimetype.startsWith(type))) {
      cb(null, true);
    } else {
      cb(new Error("รองรับเฉพาะไฟล์รูปภาพ, PDF, Excel และ Word เท่านั้น"));
    }
  },
});

const router = Router();

function buildSafeFilename(originalName: string): string {
  const baseName = path.basename(originalName).trim() || "upload.bin";
  const normalized = baseName.replace(/[^\w.\-() ]+/g, "_");
  return `${Date.now()}-${normalized}`;
}

router.get("/workspace", requireAuth, getTasksWorkspace);
router.get("/", requireAuth, getTasks);
router.get("/global/activity", requireAuth, requireRole("admin"), getGlobalActivity);
router.post("/", requireAuth, requireRole("admin"), validate(CreateTaskSchema), createTaskHandler);
router.get("/:id", requireAuth, getTask);
router.put("/:id", requireAuth, requireRole("admin"), validate(UpdateTaskSchema), updateTaskHandler);
router.patch("/:id/status", requireAuth, updateStatus);
router.delete("/:id", requireAuth, requireRole("admin"), deleteTaskHandler);
router.get("/:id/updates", requireAuth, getTaskUpdates);
router.post("/:id/updates", requireAuth, addTaskUpdate);
router.get("/:id/checklists", requireAuth, getChecklists);
router.post("/:id/checklists", requireAuth, saveChecklists);
router.patch("/:id/checklists/:checklistId/toggle", requireAuth, toggleChecklist);
router.get("/:id/comments", requireAuth, getTaskComments);
router.post("/:id/comments", requireAuth, addTaskComment);
router.get("/:id/activity", requireAuth, getTaskActivity);
router.get("/:id/blockers", requireAuth, getBlockers);

// POST /api/tasks/:taskId/upload — upload image attachment (private, with authorization)
router.post("/:taskId/upload", requireAuth, upload.single("image"), async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const file = req.file;

    // 1. Validate file
    const storageService = await import("../services/storageService.js");
    const validation = storageService.validateFileUpload(file, { maxSizeBytes: maxUploadBytes });
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    if (!file) {
      res.status(400).json({ error: "ไฟล์ไม่พบ" });
      return;
    }

    // 2. Verify task access
    const taskAccess = await import("../utils/taskAccess.js");
    const access = await taskAccess.ensureTaskAccess(req.user, taskId);
    if (!access.ok) {
      res.status(access.status ?? 403).json({ error: access.error ?? "Access denied" });
      return;
    }

    // 3. Upload file
    let blobUrl: string;
    if (isDev) {
      // Dev: save to local filesystem with metadata
      const filename = buildSafeFilename(file.originalname);
      const filepath = path.join(uploadsDir, filename);
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      await fs.promises.writeFile(filepath, file.buffer);
      blobUrl = `/uploads/${filename}`;
    } else {
      // Production: upload to Vercel Blob with PRIVATE access
      const { put } = await import("@vercel/blob");
      const filename = `task-attachments/${taskId}/${buildSafeFilename(file.originalname)}`;
      const blob = await put(filename, file.buffer, {
        access: "private", // SECURITY: Private storage only
        contentType: file.mimetype,
      });
      blobUrl = blob.url;
    }

    // 4. Save metadata to Firestore
    const metadata = await storageService.saveFileMetadata(
      taskId,
      req.user!.id,
      file.originalname,
      blobUrl,
      file.mimetype,
      file.size
    );

    // 5. Return download endpoint instead of direct URL
    res.status(201).json({
      file_id: metadata.id,
      download_url: `/api/files/${metadata.id}/download`,
      original_name: metadata.original_name,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
