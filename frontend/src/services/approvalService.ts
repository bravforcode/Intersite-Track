import api from "./api";
import type { ApprovalWorkflow, CreateApprovalDTO } from "../types/approval";

export const approvalService = {
  /** Create a new approval workflow for a task */
  createApproval: (dto: CreateApprovalDTO) =>
    api.post<ApprovalWorkflow>("/api/approvals", dto),

  /** Get all pending approvals for the current user */
  getMyPendingApprovals: () =>
    api.get<ApprovalWorkflow[]>("/api/approvals/pending/me"),

  /** Get approval workflow status for a specific task */
  getTaskApproval: (taskId: string) =>
    api.get<ApprovalWorkflow>(`/api/approvals/${taskId}`),

  /** Approve the current step */
  approve: (id: string, comment?: string) =>
    api.put<ApprovalWorkflow>(`/api/approvals/${id}/approve`, { comment }),

  /** Reject the workflow */
  reject: (id: string, comment?: string) =>
    api.put<ApprovalWorkflow>(`/api/approvals/${id}/reject`, { comment }),

  /** Return workflow to creator for edits */
  returnForRevision: (id: string, comment?: string) =>
    api.put<ApprovalWorkflow>(`/api/approvals/${id}/return`, { comment }),
};

export default approvalService;
