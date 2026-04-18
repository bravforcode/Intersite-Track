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
import approvalRoutes from "./approval.routes.js";
import timeEntryRoutes from "./timeEntry.routes.js";
import kpiRoutes from "./kpi.routes.js";
import templateRoutes from "./template.routes.js";
import taskGraphRoutes from "./taskGraph.routes.js";
import fileRoutes from "./file.routes.js";
import cronRoutes from "./cron.routes.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use("/", authRoutes);
router.use("/users", userRoutes);
router.use("/tasks", taskRoutes);
router.use("/projects", projectRoutes);
router.use("/departments", departmentRoutes);
router.use("/task-types", taskTypeRoutes);
router.use("/notifications", notificationRoutes);
router.use("/cron", cronRoutes);
router.use("/files", fileRoutes);
router.use("/reports", reportRoutes);
router.use("/stats", reportRoutes);
router.use("/trello", trelloRoutes);
router.use("/line", lineWebhookRoutes);
router.use("/holidays", holidayRoutes);
router.use("/saturday-schedules", saturdayScheduleRoutes);
router.use("/approvals", approvalRoutes);
router.use("/time-entries", timeEntryRoutes);
router.use("/kpis", kpiRoutes);
router.use("/templates", templateRoutes);
router.use("/task-graph", taskGraphRoutes);

router.get("/settings/line-group", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const { getLineGroupId } = await import("../database/queries/appSettings.queries.js");
    const groupId = await getLineGroupId();
    res.json({ group_id: groupId });
  } catch (err) { next(err); }
});

export default router;
