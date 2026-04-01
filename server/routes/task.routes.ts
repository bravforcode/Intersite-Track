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
router.post("/", requireAuth, requireRole("admin"), createTaskHandler);
router.get("/:id", requireAuth, getTask);
router.put("/:id", requireAuth, requireRole("admin"), updateTaskHandler);
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
router.get("/global/activity", requireAuth, requireRole("admin"), getGlobalActivity);

// POST /api/tasks/upload — upload image attachment
router.post("/upload", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: "ไม่พบไฟล์" }); return; }

  try {
    if (isDev) {
      // Dev: return local URL
      res.json({ url: `/uploads/${(req.file as Express.Multer.File & { filename: string }).filename}` });
    } else {
      // Production: upload to Vercel Blob
      const { put } = await import("@vercel/blob");
      const filename = `task-attachments/${Date.now()}-${req.file.originalname}`;
      const blob = await put(filename, req.file.buffer, {
        access: "public",
        contentType: req.file.mimetype,
      });
      res.json({ url: blob.url });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    res.status(500).json({ error: `อัปโหลดไฟล์ไม่สำเร็จ: ${msg}` });
  }
});

export default router;
