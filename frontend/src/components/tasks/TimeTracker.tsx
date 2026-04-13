import { useState, useEffect, useRef, useCallback } from "react";
import { Clock3 } from "lucide-react";
import type { TimeEntry, TimeEntrySummary } from "../../types/timeEntry";
import type { User } from "../../types";
import { timeEntryService } from "../../services/timeEntryService";

interface TimeTrackerProps {
  taskId: string;
  currentUser: User;
  /** Called when total tracked time changes (optional, e.g. to show summary on parent) */
  onTotalChange?: (totalMinutes: number) => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} ชม.` : `${h} ชม. ${m} นาที`;
}

function formatElapsed(startedAt: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

type ModalMode = "manual" | null;

export function TimeTracker({ taskId, currentUser, onTotalChange }: TimeTrackerProps) {
  const [summary, setSummary] = useState<TimeEntrySummary | null>(null);
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerDescription, setTimerDescription] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [manualMinutes, setManualMinutes] = useState<string>("30");
  const [manualDesc, setManualDesc] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));

  const elapsedInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, runningRes] = await Promise.all([
        timeEntryService.getTaskEntries(taskId),
        timeEntryService.getRunning(),
      ]);
      setSummary(sum);
      onTotalChange?.(sum.total_minutes);

      // Only show running entry if it's for THIS task
      const running = runningRes.running_entry;
      setRunningEntry(running?.task_id === taskId ? running : null);
    } catch {
      setSummary({ entries: [], total_minutes: 0 });
    } finally {
      setLoading(false);
    }
  }, [taskId, onTotalChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live clock tick
  useEffect(() => {
    if (!runningEntry) {
      elapsedInterval.current && clearInterval(elapsedInterval.current);
      setElapsed("00:00:00");
      return;
    }
    elapsedInterval.current = setInterval(() => {
      setElapsed(formatElapsed(runningEntry.started_at));
    }, 1000);
    setElapsed(formatElapsed(runningEntry.started_at));
    return () => {
      elapsedInterval.current && clearInterval(elapsedInterval.current);
    };
  }, [runningEntry]);

  const handleStartTimer = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const entry = await timeEntryService.startTimer(taskId, {
        description: timerDescription || undefined,
      });
      setRunningEntry(entry);
      setTimerDescription("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "เริ่ม timer ไม่ได้";
      setError(msg.includes("409") || msg.includes("timer") ? "คุณมี timer กำลังทำงานอยู่แล้ว" : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopTimer = async () => {
    if (!runningEntry) return;
    setSubmitting(true);
    setError(null);
    try {
      await timeEntryService.stopTimer(runningEntry.id);
      setRunningEntry(null);
      await fetchData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "หยุด timer ไม่ได้");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogManual = async () => {
    const mins = parseInt(manualMinutes, 10);
    if (!mins || mins <= 0) { setError("กรุณาระบุเวลาให้ถูกต้อง"); return; }
    setSubmitting(true);
    setError(null);
    try {
      await timeEntryService.logManual(taskId, {
        duration_minutes: mins,
        description: manualDesc || undefined,
        started_at: manualDate ? `${manualDate}T09:00:00.000Z` : undefined,
      });
      setModalMode(null);
      setManualMinutes("30");
      setManualDesc("");
      await fetchData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "บันทึกเวลาไม่ได้");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await timeEntryService.deleteEntry(entryId);
      await fetchData();
    } catch { /* silent */ }
  };

  const isRunningForThisTask = !!runningEntry;
  const totalMinutes = summary?.total_minutes ?? 0;
  const entries = summary?.entries ?? [];
  const completedEntries = entries.filter(e => e.ended_at);

  const isOwner = (entry: TimeEntry) => entry.user_id === currentUser.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Total summary */}
      {totalMinutes > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "10px",
            background: "var(--accent-alpha-10)",
            border: "1px solid var(--accent)",
          }}
        >
          <Clock3 size={20} color="var(--accent)" aria-hidden="true" />
          <div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>เวลารวมทั้งหมด</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--accent)" }}>
              {formatDuration(totalMinutes)}
            </div>
          </div>
        </div>
      )}

      {/* Timer control */}
      <div
        style={{
          padding: "16px",
          borderRadius: "12px",
          background: isRunningForThisTask ? "#22c55e0d" : "var(--surface-1)",
          border: `1px solid ${isRunningForThisTask ? "#22c55e44" : "var(--border-subtle)"}`,
          transition: "all 0.3s",
        }}
      >
        {isRunningForThisTask ? (
          /* Running state */
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 0 0 #22c55e",
                  animation: "pulse-dot 1.5s infinite",
                }}
              />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#22c55e" }}>
                กำลังบันทึกเวลา
              </span>
              {runningEntry?.description && (
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                  — {runningEntry.description}
                </span>
              )}
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "36px",
                fontWeight: 800,
                color: "#22c55e",
                textAlign: "center",
                letterSpacing: "4px",
                marginBottom: "12px",
              }}
            >
              {elapsed}
            </div>
            <button
              onClick={handleStopTimer}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: "#ef4444",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              ⏹ หยุดและบันทึก
            </button>
          </div>
        ) : (
          /* Start state */
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "6px",
              }}
            >
              กำลังทำอะไร? (ไม่บังคับ)
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={timerDescription}
                onChange={(e) => setTimerDescription(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleStartTimer(); }}
                placeholder="เช่น ออกแบบ UI, ประชุม..."
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--surface-2)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                }}
              />
              <button
                onClick={handleStartTimer}
                disabled={submitting}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#22c55e",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ▶ เริ่ม
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual log button */}
      <button
        onClick={() => setModalMode("manual")}
        style={{
          padding: "8px 14px",
          borderRadius: "8px",
          border: "1px dashed var(--border-subtle)",
          background: "transparent",
          color: "var(--text-secondary)",
          fontSize: "13px",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        ➕ บันทึกเวลาย้อนหลัง
      </button>

      {error && (
        <div className="error-banner">{error}</div>
      )}

      {/* Manual entry modal */}
      {modalMode === "manual" && (
        <div className="modal-overlay" onClick={() => setModalMode(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 400, padding: "24px" }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700 }}>
              บันทึกเวลาย้อนหลัง
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                  ระยะเวลา (นาที) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--surface-1)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
                {manualMinutes && parseInt(manualMinutes) > 0 && (
                  <div style={{ fontSize: "11px", color: "var(--accent)", marginTop: "4px" }}>
                    = {formatDuration(parseInt(manualMinutes))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                  วันที่ทำงาน
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--surface-1)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                  คำอธิบาย (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="เช่น เขียนเอกสาร, ทดสอบระบบ..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--surface-1)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button
                onClick={() => setModalMode(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleLogManual}
                className="btn-primary"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                {submitting ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entry history */}
      {!loading && completedEntries.length > 0 && (
        <div>
          <h4 style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            ประวัติ ({completedEntries.length} รายการ)
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {completedEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <Clock3 size={14} style={{ color: "var(--accent)" }} aria-hidden />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>
                    {formatDuration(entry.duration_minutes ?? 0)}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "2px" }}>
                    <span>{entry.user_name || entry.user_id}</span>
                    <span>·</span>
                    <span>
                      {new Date(entry.started_at).toLocaleDateString("th-TH", {
                        day: "numeric", month: "short", year: "2-digit",
                      })}
                    </span>
                    {entry.description && (
                      <>
                        <span>·</span>
                        <span style={{ fontStyle: "italic" }}>{entry.description}</span>
                      </>
                    )}
                  </div>
                </div>
                {isOwner(entry) && (
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    title="ลบ"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "2px 4px",
                      borderRadius: "4px",
                      flexShrink: 0,
                      opacity: 0.5,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.5"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "16px", color: "var(--text-secondary)", fontSize: "13px" }}>
          กำลังโหลด...
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0% { box-shadow: 0 0 0 0 #22c55e66; }
          70% { box-shadow: 0 0 0 8px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
      `}</style>
    </div>
  );
}

export default TimeTracker;
