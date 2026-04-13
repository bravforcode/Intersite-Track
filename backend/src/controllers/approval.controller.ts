import { Request, Response, NextFunction } from "express";
import * as approvalQueries from "../database/queries/approval.queries.js";
import { NotificationDispatcher } from "../services/notification.dispatcher.js";
import { createAuditLog } from "../utils/auditLogger.js";
import type { ApprovalStep, ApprovalStatus, ApprovalWorkflow } from "../types/approval.js";
import { randomUUID } from "crypto";

/** POST /api/approvals */
export async function createApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { task_id, approvers } = req.body;
    
    if (!task_id || !Array.isArray(approvers) || approvers.length === 0) {
      res.status(400).json({ error: "task_id and a non-empty array of approvers are required" });
      return;
    }

    // Check if task already has a pending approval workflow
    const existing = await approvalQueries.findApprovalByTaskId(task_id);
    if (existing && existing.status === "pending") {
      res.status(400).json({ error: "Task already has a pending approval workflow" });
      return;
    }

    const steps: ApprovalStep[] = approvers.map((app, index) => ({
      id: randomUUID(),
      approver_id: app.approver_id,
      approver_name: app.approver_name,
      order: index + 1,
      status: index === 0 ? "pending" : "pending", // we keep them all pending, but only the current one can approve
      comment: ""
    }));

    const workflow = await approvalQueries.createApprovalWorkflow({
      task_id,
      created_by: String(req.user?.id),
      status: "pending",
      steps
    });

    // Notify first approver via SSE + DB
    await NotificationDispatcher.dispatch(
      NotificationDispatcher.approvalRequired({
        approverId: steps[0]!.approver_id,
        taskId: task_id,
        taskTitle: task_id, // Will be enriched by task title lookup if available
        requestedByName: req.user?.username ?? "ผู้ใช้งาน",
      })
    );

    // Create Audit Log
    if (req.user?.id) {
      await createAuditLog(
        task_id,
        String(req.user.id),
        "created_approval_workflow",
        null,
        { approvers }
      );
    }

    res.status(201).json(workflow);
  } catch (err) { next(err); }
}

/** GET /api/approvals/pending/me */
export async function getMyPendingApprovals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = String(req.user?.id);
    const workflows = await approvalQueries.findPendingApprovalsByUserId(userId);
    res.json(workflows);
  } catch (err) { next(err); }
}

/** GET /api/approvals/:taskId */
export async function getTaskApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { taskId } = req.params;
    const workflow = await approvalQueries.findApprovalByTaskId(taskId);
    if (!workflow) {
      res.status(404).json({ error: "Approval workflow not found for this task" });
      return;
    }
    res.json(workflow);
  } catch (err) { next(err); }
}

/** Process a step decision */
async function processStepDecision(
  workflowId: string,
  userId: string,
  userName: string,
  decision: ApprovalStatus,
  comment: string | undefined
): Promise<ApprovalWorkflow> {
  const workflow = await approvalQueries.findApprovalById(workflowId);
  if (!workflow) throw new Error("Workflow not found");
  if (workflow.status !== "pending") throw new Error("Workflow is already completed");

  // Find the current pending step
  const sortedSteps = [...workflow.steps].sort((a, b) => a.order - b.order);
  let currentStep = null;
  let allPreviousApproved = true;

  for (const step of sortedSteps) {
    if (step.status === "pending") {
      currentStep = step;
      break;
    }
    if (step.status !== "approved") {
      allPreviousApproved = false;
    }
  }

  if (!currentStep) throw new Error("No pending steps found");
  if (!allPreviousApproved && decision === "approved") { // Shouldn't happen ideally
    throw new Error("Invalid state: previous steps not approved");
  }

  if (currentStep.approver_id !== userId) {
    throw new Error("You are not the current approver for this workflow");
  }
  
  // Decide new overall workflow status
  let newWorkflowStatus: ApprovalStatus = "pending";
  
  if (decision === "rejected") {
    newWorkflowStatus = "rejected";
  } else if (decision === "returned") {
    newWorkflowStatus = "returned";
  } else if (decision === "approved") {
    const isLastStep = currentStep.order === sortedSteps.length;
    if (isLastStep) {
      newWorkflowStatus = "approved";
    }
  }

  // Use atomic transaction update
  await approvalQueries.updateApprovalStepAtomic(
    workflowId,
    currentStep.order,
    decision as "approved" | "rejected" | "returned",
    comment ?? "",
    userId
  );

  // Dispatch notifications via SSE + DB
  if (newWorkflowStatus === "approved" || newWorkflowStatus === "rejected" || newWorkflowStatus === "returned") {
    await NotificationDispatcher.dispatch(
      NotificationDispatcher.approvalDecided({
        requesterId: workflow.created_by,
        taskId: workflow.task_id,
        taskTitle: workflow.task_id,
        decision: newWorkflowStatus as "approved" | "rejected" | "returned",
        decidedByName: userName ?? "ผู้ตรวจสอบ",
      })
    );
  } else if (newWorkflowStatus === "pending") {
    const nextStep = sortedSteps.find(s => s.order === currentStep!.order + 1);
    if (nextStep) {
      await NotificationDispatcher.dispatch(
        NotificationDispatcher.approvalRequired({
          approverId: nextStep.approver_id,
          taskId: workflow.task_id,
          taskTitle: workflow.task_id,
          requestedByName: userName ?? "ผู้ใช้งาน",
        })
      );
    }
  }

  // Create audit log
  await createAuditLog(
    workflow.task_id,
    userId,
    `approval_${decision}`,
    { comment: currentStep.comment, status: currentStep.status },
    { comment: comment || "", status: decision }
  );

  // Reload and return updated workflow
  const updatedWorkflow = await approvalQueries.findApprovalById(workflowId);
  return updatedWorkflow as ApprovalWorkflow;
}

/** PUT /api/approvals/:id/approve */
export async function approveApproval(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = String(req.user?.id);
    const userName = req.user?.username ?? "ผู้ตรวจสอบ";

    const updated = await processStepDecision(id, userId, userName, "approved", comment);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

/** PUT /api/approvals/:id/reject */
export async function rejectApproval(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = String(req.user?.id);
    const userName = req.user?.username ?? "ผู้ตรวจสอบ";

    const updated = await processStepDecision(id, userId, userName, "rejected", comment);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

/** PUT /api/approvals/:id/return */
export async function returnApproval(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = String(req.user?.id);
    const userName = req.user?.username ?? "ผู้ตรวจสอบ";

    const updated = await processStepDecision(id, userId, userName, "returned", comment);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
