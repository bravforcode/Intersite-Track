import { useState, useEffect, useCallback } from "react";
import type { ApprovalWorkflow, CreateApprovalDTO } from "../../types/approval";
import type { User } from "../../types";
import { approvalService } from "../../services/approvalService";
import { userService } from "../../services/userService";
import { ApprovalBadge } from "./ApprovalBadge";

interface ApprovalWorkflowModalProps {
  taskId: string;
  taskTitle: string;
  currentUser: User;
  onClose: () => void;
}

export function ApprovalWorkflowModal({
  taskId,
  taskTitle,
  currentUser,
  onClose,
}: ApprovalWorkflowModalProps) {
  const [workflow, setWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<User[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "create">("view");
  const [actionComment, setActionComment] = useState("");

  const fetchWorkflow = useCallback(async () => {
    setLoading(true);
    try {
      const w = await approvalService.getTaskApproval(taskId);
      setWorkflow(w);
      setMode("view");
    } catch {
      setWorkflow(null);
      setMode("create");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchWorkflow();
    userService.getUsers().then(setAllUsers).catch(() => setAllUsers([]));
  }, [fetchWorkflow]);

  const handleAddApprover = (user: User) => {
    if (!selectedApprovers.find((a) => a.id === user.id)) {
      setSelectedApprovers((prev) => [...prev, user]);
    }
  };

  const handleRemoveApprover = (userId: string) => {
    setSelectedApprovers((prev) => prev.filter((a) => a.id !== userId));
  };

  const handleCreate = async () => {
    if (selectedApprovers.length === 0) {
      setError("กรุณาเลือกผู้อนุมัติอย่างน้อย 1 คน");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const dto: CreateApprovalDTO = {
        task_id: taskId,
        approvers: selectedApprovers.map((u) => ({
          approver_id: u.id,
          approver_name: `${u.first_name} ${u.last_name}`,
        })),
      };
      const created = await approvalService.createApproval(dto);
      setWorkflow(created);
      setMode("view");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (action: "approve" | "reject" | "return") => {
    if (!workflow) return;
    setSubmitting(true);
    setError(null);
    try {
      let updated: ApprovalWorkflow;
      if (action === "approve") {
        updated = await approvalService.approve(workflow.id, actionComment);
      } else if (action === "reject") {
        updated = await approvalService.reject(workflow.id, actionComment);
      } else {
        updated = await approvalService.returnForRevision(workflow.id, actionComment);
      }
      setWorkflow(updated);
      setActionComment("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ไม่สามารถดำเนินการได้");
    } finally {
      setSubmitting(false);
    }
  };

  // Determine if current user can take action
  const currentStep = workflow?.steps.find((s) => s.status === "pending");
  const isCurrentApprover =
    currentStep?.approver_id === currentUser.id && workflow?.status === "pending";

  const availableToAdd = allUsers.filter(
    (u) =>
      u.id !== currentUser.id &&
      !selectedApprovers.find((a) => a.id === u.id)
  );

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container approval-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560, width: "100%", padding: "28px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
              Approval Workflow
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
              {taskTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            aria-label="Close"
            style={{ fontSize: "20px", color: "var(--text-secondary)" }}
          >
            ×
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
            <div className="spinner" style={{ margin: "0 auto 16px" }} />
            กำลังโหลด...
          </div>
        ) : mode === "view" && workflow ? (
          /* ── VIEW MODE ── */
          <div>
            {/* Status header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "24px",
                padding: "14px 16px",
                borderRadius: "12px",
                background: "var(--surface-1)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <ApprovalBadge workflow={workflow} />
              <div style={{ flex: 1, fontSize: "13px", color: "var(--text-secondary)" }}>
                {workflow.steps.filter((s) => s.status === "approved").length} /{" "}
                {workflow.steps.length} steps completed
              </div>
            </div>

            {/* Steps timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              {[...workflow.steps]
                .sort((a, b) => a.order - b.order)
                .map((step, idx) => {
                  const isPending = step.status === "pending";
                  const isApproved = step.status === "approved";
                  const isActive = isPending && workflow.status === "pending";

                  return (
                    <div
                      key={step.id}
                      style={{
                        display: "flex",
                        gap: "12px",
                        padding: "14px",
                        borderRadius: "10px",
                        background: isActive ? "var(--accent-alpha-10)" : "var(--surface-1)",
                        border: `1px solid ${isActive ? "var(--accent)" : "var(--border-subtle)"}`,
                        opacity: isPending && !isActive ? 0.6 : 1,
                      }}
                    >
                      {/* Step number */}
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          flexShrink: 0,
                          background: isApproved
                            ? "#22c55e22"
                            : isActive
                            ? "var(--accent)"
                            : "var(--border-subtle)",
                          color: isApproved ? "#22c55e" : isActive ? "#fff" : "var(--text-secondary)",
                        }}
                      >
                        {isApproved ? "✓" : idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "var(--text-primary)",
                          }}
                        >
                          {step.approver_name || step.approver_id}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                          {step.status === "approved" && step.decided_at
                            ? `อนุมัติเมื่อ ${new Date(step.decided_at).toLocaleDateString("th-TH")}`
                            : step.status === "rejected"
                            ? "ไม่อนุมัติ"
                            : step.status === "returned"
                            ? "ส่งคืน"
                            : isActive
                            ? "รออนุมัติ →"
                            : "รอถึง step นี้"}
                        </div>
                        {step.comment && (
                          <div
                            style={{
                              marginTop: "6px",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              background: "var(--surface-2)",
                              color: "var(--text-secondary)",
                              fontStyle: "italic",
                            }}
                          >
                            "{step.comment}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Action area for current approver */}
            {isCurrentApprover && (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: "var(--accent-alpha-10)",
                  border: "1px solid var(--accent)",
                }}
              >
                <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 600, color: "var(--accent)" }}>
                  คุณเป็นผู้อนุมัติในขั้นตอนนี้
                </p>
                <textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="เหตุผล / ความเห็น (ไม่บังคับ)"
                  rows={2}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--surface-1)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    marginBottom: "10px",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => handleDecision("approve")}
                    disabled={submitting}
                    className="btn-primary"
                    style={{ flex: 1, fontSize: "13px" }}
                  >
                    อนุมัติ
                  </button>
                  <button
                    onClick={() => handleDecision("return")}
                    disabled={submitting}
                    className="btn-secondary"
                    style={{ flex: 1, fontSize: "13px" }}
                  >
                    ส่งคืนแก้ไข
                  </button>
                  <button
                    onClick={() => handleDecision("reject")}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      fontSize: "13px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #ef444466",
                      background: "#ef444422",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    ไม่อนุมัติ
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="error-banner" style={{ marginTop: "12px" }}>
                {error}
              </div>
            )}
          </div>
        ) : (
          /* ── CREATE MODE ── */
          <div>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              เลือกลำดับผู้อนุมัติ (drag ไม่ได้ เรียงแล้ว step ตามลำดับ)
            </p>

            {/* Approver selector */}
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
              เพิ่มผู้อนุมัติ
            </label>
            <select
              onChange={(e) => {
                const user = allUsers.find((u) => u.id === e.target.value);
                if (user) handleAddApprover(user);
                e.target.value = "";
              }}
              defaultValue=""
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-1)",
                color: "var(--text-primary)",
                fontSize: "14px",
                marginBottom: "16px",
              }}
            >
              <option value="" disabled>
                -- เลือกผู้อนุมัติ --
              </option>
              {availableToAdd.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name} ({u.position})
                </option>
              ))}
            </select>

            {/* Selected approvers list */}
            {selectedApprovers.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                {selectedApprovers.map((approver, idx) => (
                  <div
                    key={approver.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "var(--surface-1)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "var(--accent)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
                        {approver.first_name} {approver.last_name}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        {approver.position}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveApprover(approver.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: "18px",
                        padding: "4px",
                        borderRadius: "4px",
                      }}
                      aria-label="Remove approver"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px",
                  borderRadius: "10px",
                  border: "2px dashed var(--border-subtle)",
                  color: "var(--text-secondary)",
                  fontSize: "14px",
                  marginBottom: "20px",
                }}
              >
                ยังไม่ได้เลือกผู้อนุมัติ
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                หมายเหตุ (ไม่บังคับ)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="รายละเอียดหรือคำขอพิเศษ..."
                rows={2}
                style={{
                  width: "100%",
                  resize: "vertical",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--surface-1)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <div className="error-banner" style={{ marginBottom: "12px" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="btn-primary"
                style={{ flex: 2 }}
                disabled={submitting || selectedApprovers.length === 0}
              >
                {submitting ? "กำลังส่ง..." : "ส่งขออนุมัติ"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApprovalWorkflowModal;
