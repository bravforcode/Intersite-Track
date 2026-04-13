// Approval Workflow types — frontend
export type ApprovalStatus = "pending" | "approved" | "rejected" | "returned";

export interface ApprovalStep {
  id: string;
  approver_id: string;
  approver_name?: string;
  order: number;
  status: ApprovalStatus;
  comment?: string;
  decided_at?: string;
}

export interface ApprovalWorkflow {
  id: string;
  task_id: string;
  created_by: string;
  status: ApprovalStatus;
  steps: ApprovalStep[];
  created_at: string;
  updated_at?: string;
}

export interface CreateApprovalDTO {
  task_id: string;
  approvers: Array<{ approver_id: string; approver_name: string }>;
}
