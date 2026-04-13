import { Router } from "express";
import {
  getSaturdaySchedules, createSaturdayScheduleHandler, updateSaturdayScheduleHandler,
  deleteSaturdayScheduleHandler, joinSaturdayScheduleHandler, importSaturdayScheduleHandler,
} from "../controllers/saturdaySchedule.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();
router.get("/", requireAuth, getSaturdaySchedules);
router.post("/", requireAuth, requireRole("admin"), createSaturdayScheduleHandler);
router.post("/import", requireAuth, requireRole("admin"), importSaturdayScheduleHandler);
router.put("/:id", requireAuth, requireRole("admin"), updateSaturdayScheduleHandler);
router.delete("/:id", requireAuth, requireRole("admin"), deleteSaturdayScheduleHandler);
router.post("/:id/join", requireAuth, joinSaturdayScheduleHandler);
export default router;
