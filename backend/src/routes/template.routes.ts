import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/template.controller.js";

const router = Router();

// All template routes require auth
router.use(requireAuth);

// ─── Read (all authenticated users) ──────────────────────────────────────────
router.get("/", ctrl.listTemplates);
router.get("/:id", ctrl.getTemplate);
router.get("/:id/versions", ctrl.listVersions);

// ─── Preview & Apply (all authenticated users) ───────────────────────────────
router.post("/:id/preview", ctrl.previewApply);
router.post("/:id/apply", ctrl.applyTemplate);
router.get("/:id/usage", ctrl.getTemplateUsage);

// ─── Write (manager or admin only) ───────────────────────────────────────────
const requireManager = requireRole("admin", "manager");

router.post("/", requireManager, ctrl.createTemplateHandler);
router.put("/:id", requireManager, ctrl.updateTemplateHandler);
router.post("/:id/versions", requireManager, ctrl.createVersionHandler);
router.post("/:id/publish", requireManager, ctrl.publishVersionHandler);
router.post("/:id/archive", requireManager, ctrl.archiveTemplateHandler);

// ─── Restore (admin only) ─────────────────────────────────────────────────────
router.post("/:id/restore", requireRole("admin"), ctrl.restoreTemplateHandler);

export default router;
