import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import taskRoutes from "./task.routes.js";
import departmentRoutes from "./department.routes.js";
import taskTypeRoutes from "./taskType.routes.js";
import notificationRoutes from "./notification.routes.js";
import reportRoutes from "./report.routes.js";
import trelloRoutes from "./trello.routes.js";
import projectRoutes from "./project.routes.js";
import lineWebhookRoutes from "./lineWebhook.routes.js";
import holidayRoutes from "./holiday.routes.js";
import saturdayScheduleRoutes from "./saturdaySchedule.routes.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use("/", authRoutes);
router.use("/users", userRoutes);
router.use("/tasks", taskRoutes);
router.use("/projects", projectRoutes);
router.use("/departments", departmentRoutes);
router.use("/task-types", taskTypeRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reports", reportRoutes);
router.use("/stats", reportRoutes);
router.use("/trello", trelloRoutes);
router.use("/line", lineWebhookRoutes);
router.use("/holidays", holidayRoutes);
router.use("/saturday-schedules", saturdayScheduleRoutes);

router.get("/settings/line-group", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { getLineGroupId } = await import("../database/queries/appSettings.queries.js");
    const groupId = await getLineGroupId();
    res.json({ group_id: groupId });
  } catch (err) { next(err); }
});

// Temporary debug endpoint — remove after fixing
router.get("/debug/firebase", async (req, res) => {
  try {
    const { adminAuth } = await import("../config/firebase-admin.js");
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const hasKey = !!process.env.FIREBASE_PRIVATE_KEY;
    const keyStart = (process.env.FIREBASE_PRIVATE_KEY ?? "").substring(0, 30);
    res.json({ ok: true, projectId, hasKey, keyStart });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
