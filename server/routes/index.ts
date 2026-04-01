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

export default router;
