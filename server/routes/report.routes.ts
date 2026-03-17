import { Router } from "express";
import { getStatsHandler, getStaffReportHandler, getDateRangeReport } from "../controllers/report.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/stats", requireAuth, getStatsHandler);
router.get("/by-staff", requireAuth, getStaffReportHandler);
router.get("/by-date-range", requireAuth, getDateRangeReport);

export default router;
