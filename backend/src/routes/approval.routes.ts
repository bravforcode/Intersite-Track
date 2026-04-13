import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import * as approvalController from "../controllers/approval.controller.js";

const router = Router();

// All approval routes require authentication
router.use(requireAuth);

// Create a new approval workflow for a task
router.post("/", approvalController.createApproval);

// Get pending approvals for the current user
router.get("/pending/me", approvalController.getMyPendingApprovals);

// Get approval workflow status for a specific task
router.get("/:taskId", approvalController.getTaskApproval);

// Approve the workflow at the current step
router.put("/:id/approve", approvalController.approveApproval);

// Reject the workflow
router.put("/:id/reject", approvalController.rejectApproval);

// Return the workflow for edits
router.put("/:id/return", approvalController.returnApproval);

export default router;
