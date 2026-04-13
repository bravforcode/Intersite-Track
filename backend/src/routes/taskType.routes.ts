import { Router } from "express";
import {
  getTaskTypes, createTaskType, updateTaskType, deleteTaskType,
} from "../controllers/taskType.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getTaskTypes);
router.post("/", requireAuth, requireRole("admin"), createTaskType);
router.put("/:id", requireAuth, requireRole("admin"), updateTaskType);
router.delete("/:id", requireAuth, requireRole("admin"), deleteTaskType);

export default router;
