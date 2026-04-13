import { useState, useEffect, useCallback } from "react";
import type { ApprovalWorkflow } from "../../types/approval";
import type { User } from "../../types";
import { approvalService } from "../../services/approvalService";
import { ApprovalBadge } from "./ApprovalBadge";

interface PendingApprovalsPageProps {
  currentUser: User;
}

export function PendingApprovalsPage({ currentUser }: PendingApprovalsPageProps) {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const data = await approvalService.getMyPendingApprovals();
      setWorkflows(data);
    } catch {
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleDecision = async (
    workflow: ApprovalWorkflow,
    action: "approve" | "reject" | "return"
  ) => {
    setSubmitting(workflow.id);
    setError(null);
    try {
      const comment = comments[workflow.id] || "";
      if (action === "approve") {
        await approvalService.approve(workflow.id, comment);
      } else if (action === "reject") {
        await approvalService.reject(workflow.id, comment);
      } else {
        await approvalService.returnForRevision(workflow.id, comment);
      }
      await fetchPending();
      setComments((prev) => {
        const next = { ...prev };
        delete next[workflow.id];
        return next;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ไม่สามารถดำเนินการได้");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px", color: "var(--text-secondary)" }}>
        <div>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p>กำลังโหลดรายการรออนุมัติ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "var(--text-primary)",
            margin: "0 0 6px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          รออนุมัติโดยฉัน
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>
          รายการคำขออนุมัติที่รอการตัดสินใจของ{" "}
          <strong>
            {currentUser.first_name} {currentUser.last_name}
          </strong>
        </p>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {workflows.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 24px",
            color: "var(--text-secondary)",
            background: "var(--surface-1)",
            borderRadius: "16px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--accent)", marginBottom: "16px", textTransform: "uppercase" }}>
            Completed
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "var(--text-primary)" }}>
            ไม่มีรายการรออนุมัติ
          </h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            ทุกอย่างเสร็จสิ้นแล้ว
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Count badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                background: "var(--accent)",
                color: "#fff",
                borderRadius: "999px",
                padding: "2px 10px",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {workflows.length}
            </span>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              รายการรออนุมัติ
            </span>
          </div>

          {/* Workflow cards */}
          {workflows.map((workflow) => {
            const currentStep = workflow.steps.find((s) => s.status === "pending");
            const isCurrentUser = currentStep?.approver_id === currentUser.id;
            const isSubmitting = submitting === workflow.id;

            return (
              <div
                key={workflow.id}
                style={{
                  padding: "20px",
                  borderRadius: "14px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--border-subtle)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                {/* Workflow header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <ApprovalBadge workflow={workflow} />
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        Task ID: {workflow.task_id.slice(0, 8)}...
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      สร้างเมื่อ {new Date(workflow.created_at).toLocaleDateString("th-TH", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </div>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "right" }}>
                    Step {currentStep?.order ?? "-"} / {workflow.steps.length}
                  </div>
                </div>

                {/* Steps mini timeline */}
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    marginBottom: "16px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "var(--surface-2)",
                  }}
                >
                  {[...workflow.steps].sort((a, b) => a.order - b.order).map((step, idx) => {
                    const isActive = step.status === "pending" && workflow.status === "pending";
                    return (
                      <div
                        key={step.id}
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        <div
                          title={`${step.approver_name || step.approver_id}: ${step.status}`}
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: step.status === "approved"
                              ? "#22c55e22"
                              : isActive
                              ? "var(--accent)"
                              : "var(--border-subtle)",
                            color: step.status === "approved"
                              ? "#22c55e"
                              : isActive
                              ? "#fff"
                              : "var(--text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "default",
                          }}
                        >
                          {step.status === "approved" ? "✓" : idx + 1}
                        </div>
                        {idx < workflow.steps.length - 1 && (
                          <div
                            style={{
                              width: "20px",
                              height: "2px",
                              background: step.status === "approved" ? "#22c55e44" : "var(--border-subtle)",
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Current step info */}
                {currentStep && (
                  <div style={{ marginBottom: "12px", fontSize: "14px", color: "var(--text-primary)" }}>
                    <span style={{ color: "var(--text-secondary)" }}>ผู้อนุมัติขั้นนี้: </span>
                    <strong>{currentStep.approver_name || currentStep.approver_id}</strong>
                    {isCurrentUser && (
                      <span
                        style={{
                          marginLeft: "8px",
                          background: "var(--accent)",
                          color: "#fff",
                          borderRadius: "4px",
                          padding: "1px 6px",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        YOU
                      </span>
                    )}
                  </div>
                )}

                {/* Action area */}
                {isCurrentUser && (
                  <div>
                    <textarea
                      value={comments[workflow.id] || ""}
                      onChange={(e) =>
                        setComments((prev) => ({ ...prev, [workflow.id]: e.target.value }))
                      }
                      placeholder="เหตุผล / ความเห็น (ไม่บังคับ)"
                      rows={2}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-subtle)",
                        background: "var(--surface-2)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        marginBottom: "10px",
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleDecision(workflow, "approve")}
                        disabled={isSubmitting}
                        className="btn-primary"
                        style={{ flex: 1, fontSize: "13px" }}
                      >
                        {isSubmitting ? "..." : "อนุมัติ"}
                      </button>
                      <button
                        onClick={() => handleDecision(workflow, "return")}
                        disabled={isSubmitting}
                        className="btn-secondary"
                        style={{ flex: 1, fontSize: "13px" }}
                      >
                        {isSubmitting ? "..." : "ส่งคืน"}
                      </button>
                      <button
                        onClick={() => handleDecision(workflow, "reject")}
                        disabled={isSubmitting}
                        style={{
                          flex: 1,
                          fontSize: "13px",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #ef444466",
                          background: "#ef444422",
                          color: "#ef4444",
                          cursor: isSubmitting ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          opacity: isSubmitting ? 0.6 : 1,
                        }}
                      >
                        {isSubmitting ? "..." : "ปฏิเสธ"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PendingApprovalsPage;
