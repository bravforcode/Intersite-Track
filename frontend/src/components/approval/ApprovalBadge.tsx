import type { ApprovalWorkflow, ApprovalStatus } from "../../types/approval";

interface ApprovalBadgeProps {
  workflow: ApprovalWorkflow | null | undefined;
  compact?: boolean;
}

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string }> = {
  pending: { label: "รออนุมัติ", color: "var(--badge-warning)" },
  approved: { label: "อนุมัติแล้ว", color: "var(--badge-success)" },
  rejected: { label: "ไม่อนุมัติ", color: "var(--badge-error)" },
  returned: { label: "ส่งคืนแก้ไข", color: "var(--badge-info)" },
};

export function ApprovalBadge({ workflow, compact = false }: ApprovalBadgeProps) {
  if (!workflow) return null;

  const config = STATUS_CONFIG[workflow.status];
  const currentStepIndex = workflow.steps.findIndex(s => s.status === "pending");
  const totalSteps = workflow.steps.length;
  const completedSteps = workflow.steps.filter(s => s.status === "approved").length;

  return (
    <span
      className="approval-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: compact ? "2px 8px" : "4px 10px",
        borderRadius: "999px",
        fontSize: compact ? "11px" : "12px",
        fontWeight: 600,
        background: `${config.color}22`,
        color: config.color,
        border: `1px solid ${config.color}44`,
        whiteSpace: "nowrap",
      }}
      title={`Approval: ${config.label} (Step ${completedSteps}/${totalSteps})`}
    >
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: config.color,
          display: "inline-block",
        }}
      />
      {!compact && <span>{config.label}</span>}
      {!compact && workflow.status === "pending" && totalSteps > 1 && (
        <span style={{ opacity: 0.7, fontSize: "10px" }}>
          ({currentStepIndex + 1}/{totalSteps})
        </span>
      )}
    </span>
  );
}

export default ApprovalBadge;
