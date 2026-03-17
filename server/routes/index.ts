import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import taskRoutes from "./task.routes";
import departmentRoutes from "./department.routes";
import taskTypeRoutes from "./taskType.routes";
import notificationRoutes from "./notification.routes";
import reportRoutes from "./report.routes";

const router = Router();

router.use("/", authRoutes);
router.use("/users", userRoutes);
router.use("/tasks", taskRoutes);
router.use("/departments", departmentRoutes);
router.use("/task-types", taskTypeRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reports", reportRoutes);
router.use("/stats", reportRoutes);

export default router;
