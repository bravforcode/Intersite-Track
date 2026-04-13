import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import * as timeEntryController from "../controllers/timeEntry.controller.js";

const router = Router();

// All time-entry routes require authentication
router.use(requireAuth);

// Check if current user has any running timer
router.get("/running", timeEntryController.getRunningEntry);

// List all entries for a task + total minutes
router.get("/:taskId", timeEntryController.getTaskTimeEntries);

// Start a live timer for a task
router.post("/:taskId/start", timeEntryController.startTimer);

// Stop a running timer by entry ID
router.patch("/:id/stop", timeEntryController.stopTimer);

// Log hours manually for a task
router.post("/:taskId/manual", timeEntryController.logManualEntry);

// Delete an entry
router.delete("/:id", timeEntryController.deleteEntry);

export default router;
