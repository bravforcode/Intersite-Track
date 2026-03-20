import { Router } from "express";
import {
  getTasks, getTask, createTaskHandler, updateTaskHandler,
  updateStatus, deleteTaskHandler, getTasksWorkspace,
} from "../controllers/task.controller.js";
import {
  getTaskUpdates, addTaskUpdate, getChecklists, saveChecklists, toggleChecklist,
} from "../controllers/taskUpdate.controller.js";
import { getTaskComments, addTaskComment } from "../controllers/comment.controller.js";
import { getTaskActivity } from "../controllers/activity.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsRoot = process.env.VERCEL ? "/tmp" : process.cwd();
const uploadsDir = path.join(uploadsRoot, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น"));
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
router.get("/:id/comments", requireAuth, getTaskComments);
router.post("/:id/comments", requireAuth, addTaskComment);
router.get("/:id/activity", requireAuth, getTaskActivity);
router.post("/upload", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) { res.status(400).json({ error: "ไม่พบไฟล์" }); return; }
  res.json({ url: `/uploads/${req.file.filename}` });
});

export default router;
