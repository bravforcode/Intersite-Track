import { Router } from "express";
import {
  getStatsHandler,
  getAnalyticsHandler,
  getStaffReportHandler,
  getDateRangeReport,
  exportCsvReport,
  exportPdfReport,
  exportStaffPdfReport,
} from "../controllers/report.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// Summary stats: all authenticated users can see aggregate totals
router.get("/", requireAuth, getStatsHandler);
router.get("/stats", requireAuth, getStatsHandler);

// Detailed analytics & per-person reports: Admin only
// These expose organizational-wide data and individual PII (performance per user)
router.get("/analytics", requireAuth, requireRole("admin"), getAnalyticsHandler);
router.get("/by-staff", requireAuth, requireRole("admin"), getStaffReportHandler);
router.get("/by-date-range", requireAuth, requireRole("admin"), getDateRangeReport);

// Export endpoints: Admin only — these download full organizational data
router.get("/export-csv", requireAuth, requireRole("admin"), exportCsvReport);
router.get("/export-pdf", requireAuth, requireRole("admin"), exportPdfReport);
router.get("/export-staff-pdf", requireAuth, requireRole("admin"), exportStaffPdfReport);

export default router;
