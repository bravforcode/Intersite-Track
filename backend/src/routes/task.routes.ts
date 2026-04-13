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

const isDev = process.env.NODE_ENV !== "production" && !process.env.VERCEL;

// ── Storage setup ──────────────────────────────────────────────────
// Dev: save to local /uploads folder
// Production: use memory buffer → upload to Vercel Blob
const uploadsDir = path.join(process.cwd(), "uploads");
if (isDev && !fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = isDev
  ? multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadsDir),
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    })
  : multer.memoryStorage(); // production: keep in memory, upload to Vercel Blob

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // Increase to 25MB
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
    const validation = storageService.validateFileUpload(file);
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
      const path = require("path");
      const fs = require("fs").promises;
      const uploadDir = path.join(process.cwd(), "../uploads");
      await fs.mkdir(uploadDir, { recursive: true });
      const filename = `${Date.now()}-${file.originalname}`;
      const filepath = path.join(uploadDir, filename);
      await fs.writeFile(filepath, file.buffer);
      blobUrl = `/uploads/${filename}`;
    } else {
      // Production: upload to Vercel Blob with PRIVATE access
      const { put } = await import("@vercel/blob");
      const filename = `task-attachments/${taskId}/${Date.now()}-${file.originalname}`;
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

// GET /api/files/:fileId/download — secure file download with authorization
router.get("/files/:fileId/download", requireAuth, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const storageService = await import("../services/storageService.js");
    const taskAccessModule = await import("../utils/taskAccess.js");

    // 1. Get file metadata
    const file = await storageService.getFileMetadata(fileId);
    if (!file) {
      res.status(404).json({ error: "ไฟล์ไม่พบ" });
      return;
    }

    // 2. Check authorization
    const canAccess = await storageService.canAccessFile(
      req.user!.id,
      req.user!.role,
      fileId,
      (user: any, taskId: string) => taskAccessModule.ensureTaskAccess(user, taskId)
    );

    if (!canAccess) {
      res.status(403).json({ error: "คุณไม่มีสิทธิ์ดาวน์โหลดไฟล์นี้" });
      return;
    }

    // 3. Serve file or redirect to cached Vercel Blob URL
    // In dev mode, serve the file directly
    if (isDev) {
      const fs = require("fs").promises;
      const path = require("path");
      const uploadDir = path.join(process.cwd(), "../uploads");
      const filename = file.blob_url.replace("/uploads/", "");
      const filepath = path.join(uploadDir, filename);
      const buffer = await fs.readFile(filepath);
      res.set({
        "Content-Type": file.mime_type,
        "Content-Disposition": `attachment; filename="${file.original_name}"`,
      });
      res.send(buffer);
    } else {
      // Production: Vercel Blob private URL (blob_url is already a valid download link)
      // Just serve it as attachment header redirect
      res.set({
        "Content-Type": file.mime_type,
        "Content-Disposition": `attachment; filename="${file.original_name}"`,
      });
      res.redirect(file.blob_url);
    }
  } catch (err) {
    next(err);
  }
});

export default router;
