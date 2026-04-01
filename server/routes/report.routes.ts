import { Router } from "express";
import { 
  getStatsHandler, 
  getAnalyticsHandler,
  getStaffReportHandler, 
  getDateRangeReport, 
  exportCsvReport,
  exportPdfReport,
  exportStaffPdfReport
} from "../controllers/report.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getStatsHandler);
router.get("/stats", requireAuth, getStatsHandler);
router.get("/analytics", requireAuth, getAnalyticsHandler);
router.get("/by-staff", requireAuth, getStaffReportHandler);
router.get("/by-date-range", requireAuth, getDateRangeReport);
router.get("/export-csv", requireAuth, exportCsvReport);
router.get("/export-pdf", requireAuth, exportPdfReport);
router.get("/export-staff-pdf", requireAuth, exportStaffPdfReport);

export default router;
