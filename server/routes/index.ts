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
    const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
    const isBase64 = !rawKey.includes("-----BEGIN");
    const decoded = isBase64 ? Buffer.from(rawKey, "base64").toString("utf-8") : rawKey.replace(/\\n/g, "\n");

    // Try to actually use adminAuth and Firestore
    let authOk = false, authErr = "";
    let firestoreOk = false, firestoreErr = "";
    try {
      const { adminAuth: a } = await import("../config/firebase-admin.js");
      authOk = true;
    } catch (e: any) { authErr = e.message; }
    try {
      const { db } = await import("../config/firebase-admin.js");
      await db.collection("users").limit(1).get();
      firestoreOk = true;
    } catch (e: any) { firestoreErr = e.message?.substring(0, 200); }

    res.json({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      hasKey: !!rawKey,
      isBase64,
      hasRealNewlines: decoded.includes("\n"),
      decodedStart: decoded.substring(0, 40),
      authOk, authErr,
      firestoreOk, firestoreErr,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
