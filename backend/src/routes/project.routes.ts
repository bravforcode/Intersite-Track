import { Router } from "express";
import {
  getProjects, getProject, createProjectHandler, updateProjectHandler, deleteProjectHandler,
  addMilestone, updateMilestoneStatus, addBlocker, resolveBlocker, addWeeklyUpdate,
} from "../controllers/project.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// All project routes require authentication
router.use(requireAuth);

// READ: All authenticated users can view projects
router.get("/", getProjects);
router.get("/:id", getProject);

// WRITE: Admin only — project management is an organizational concern
router.post("/", requireRole("admin"), createProjectHandler);
router.put("/:id", requireRole("admin"), updateProjectHandler);
router.delete("/:id", requireRole("admin"), deleteProjectHandler);

// Milestones — Admin only
router.post("/:id/milestones", requireRole("admin"), addMilestone);
router.patch("/milestones/:id", requireRole("admin"), updateMilestoneStatus);

// Blockers — any authenticated user can add/resolve (project collaboration)
router.post("/:id/blockers", addBlocker);
router.patch("/blockers/:id/resolve", resolveBlocker);

// Weekly Updates — any authenticated user
router.post("/:id/weekly-updates", addWeeklyUpdate);

export default router;
