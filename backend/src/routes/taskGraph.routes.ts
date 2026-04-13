import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/taskGraph.controller.js";

const router = Router();

router.use(requireAuth);

// ── Task Dependencies (DAG Links) ─────────────────────────────────────────────
// GET    /task-graph/links/:taskId       → all links for a task (in+out)
// POST   /task-graph/links               → create link (cycle-safe)
// DELETE /task-graph/links/:linkId       → remove link

router.get("/links/:taskId", ctrl.getTaskLinks);
router.post("/links", ctrl.createLink);
router.delete("/links/:linkId", ctrl.deleteLink);

// ── Subtasks ──────────────────────────────────────────────────────────────────
// GET    /task-graph/subtasks/:taskId         → list subtasks of parent
// POST   /task-graph/subtasks/:taskId         → add subtask
// DELETE /task-graph/subtasks/:taskId/:refId  → remove subtask ref
// PUT    /task-graph/subtasks/:taskId/reorder → drag-drop reorder

router.get("/subtasks/:taskId", ctrl.getSubtasks);
router.post("/subtasks/:taskId", ctrl.createSubtask);
router.delete("/subtasks/:taskId/:refId", ctrl.deleteSubtask);
router.put("/subtasks/:taskId/reorder", ctrl.reorderSubtasksHandler);

export default router;
