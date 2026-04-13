import { Router } from "express";
import { getHolidays, createHolidayHandler, updateHolidayHandler, deleteHolidayHandler } from "../controllers/holiday.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();
router.get("/", requireAuth, getHolidays);
router.post("/", requireAuth, requireRole("admin"), createHolidayHandler);
router.put("/:id", requireAuth, requireRole("admin"), updateHolidayHandler);
router.delete("/:id", requireAuth, requireRole("admin"), deleteHolidayHandler);
export default router;
