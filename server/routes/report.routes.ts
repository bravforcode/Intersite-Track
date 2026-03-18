import { Router } from "express";
import { getStatsHandler, getStaffReportHandler, getDateRangeReport } from "../controllers/report.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getStatsHandler);
router.get("/stats", requireAuth, getStatsHandler);
router.get("/by-staff", requireAuth, getStaffReportHandler);
router.get("/by-date-range", requireAuth, getDateRangeReport);

export default router;
