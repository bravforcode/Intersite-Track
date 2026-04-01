import { Router } from "express";
import {
  getProjects, getProject, createProjectHandler, updateProjectHandler, deleteProjectHandler,
  addMilestone, updateMilestoneStatus, addBlocker, resolveBlocker, addWeeklyUpdate
} from "../controllers/project.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", getProjects);
router.get("/:id", getProject);
router.post("/", createProjectHandler);
router.put("/:id", updateProjectHandler);
router.delete("/:id", deleteProjectHandler);

// Milestones
router.post("/:id/milestones", addMilestone);
router.patch("/milestones/:id", updateMilestoneStatus);

// Blockers
router.post("/:id/blockers", addBlocker);
router.patch("/blockers/:id/resolve", resolveBlocker);

// Weekly Updates
router.post("/:id/weekly-updates", addWeeklyUpdate);

export default router;
