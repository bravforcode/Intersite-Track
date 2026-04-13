import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Link2, RefreshCw, Unlink } from "lucide-react";
import { motion } from "motion/react";
import { userService, type LineLinkStatus } from "../../services/userService";
import type { User } from "../../types";

interface LineLinkPageProps {
  user: User;
  onUserUpdate: (updated: User) => void;
}

function maskLineId(value: string | null): string {
  if (!value) return "-";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getRemainingMinutes(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diffMs = Date.parse(expiresAt) - Date.now();
  if (Number.isNaN(diffMs) || diffMs <= 0) return 0;
  return Math.ceil(diffMs / 60000);
}

export function LineLinkPage({ user, onUserUpdate }: LineLinkPageProps) {
  const [status, setStatus] = useState<LineLinkStatus>({
    is_linked: Boolean(user.line_user_id),
    line_user_id: user.line_user_id ?? null,
    pending_code: null,
    expires_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const remainingMinutes = useMemo(() => getRemainingMinutes(status.expires_at), [status.expires_at]);

  const syncUser = (lineUserId: string | null) => {
    onUserUpdate({ ...user, line_user_id: lineUserId });
  };

  const loadStatus = async () => {
    const next = await userService.getMyLineLinkStatus();
    setStatus(next);
    syncUser(next.line_user_id);
    return next;
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const next = await loadStatus();
        if (!cancelled && next.is_linked) {
          setSuccess("บัญชี LINE เชื่อมกับระบบแล้ว");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "ไม่สามารถโหลดสถานะ LINE ได้";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!status.pending_code || status.is_linked) return;

    const interval = window.setInterval(() => {
      void loadStatus().catch(() => {});
    }, 5000);

    return () => window.clearInterval(interval);
  }, [status.pending_code, status.is_linked]);

  const handleGenerate = async () => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const next = await userService.requestMyLineLink();
      setStatus(next);
      setSuccess("สร้างรหัสเชื่อม LINE แล้ว");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "ไม่สามารถสร้างรหัสเชื่อม LINE ได้";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setBusy(true);
    setError("");
    try {
      const next = await loadStatus();
      if (next.is_linked) {
        setSuccess("ตรวจพบว่าบัญชี LINE เชื่อมสำเร็จแล้ว");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "ไม่สามารถรีเฟรชสถานะ LINE ได้";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async () => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await userService.unlinkMyLine();
      const next: LineLinkStatus = {
        is_linked: false,
        line_user_id: null,
        pending_code: null,
        expires_at: null,
      };
      setStatus(next);
      syncUser(null);
      setSuccess("ยกเลิกการเชื่อม LINE แล้ว");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "ไม่สามารถยกเลิกการเชื่อม LINE ได้";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-6"
    >
      <div className="app-surface rounded-3xl p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] app-soft mb-2">LINE Notification</p>
            <h3 className="text-2xl font-serif font-bold app-heading">จัดการการเชื่อม LINE</h3>
            <p className="text-sm app-soft mt-2 max-w-2xl">
              เชื่อม LINE ส่วนตัวเพื่อรับการแจ้งเตือนงาน, วันหยุด และเวรวันเสาร์จาก Intersite Track โดยไม่ต้องให้แอดมินมากรอก `line_user_id` ให้
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${status.is_linked ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-blue-700"}`}>
            {status.is_linked ? <CheckCircle2 size={18} /> : <Link2 size={18} />}
            {status.is_linked ? "เชื่อมแล้ว" : "ยังไม่ได้เชื่อม"}
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}
      {success && <div className="bg-emerald-50 text-emerald-600 text-sm p-3 rounded-xl border border-emerald-100">{success}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="app-surface rounded-3xl p-6">
          <h4 className="text-sm font-bold uppercase tracking-wider app-soft mb-4">สถานะปัจจุบัน</h4>
          {loading ? (
            <p className="text-sm app-soft">กำลังโหลดข้อมูล...</p>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-3xl border px-5 py-5 ${status.is_linked ? "border-emerald-200 bg-emerald-50" : "border-sky-100 bg-sky-50/70"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-sky-700/70 mb-1">บัญชีที่เชื่อม</p>
                    <h4 className="text-lg font-serif font-bold text-slate-900">
                      {status.is_linked ? "เชื่อม LINE สำเร็จแล้ว" : "ยังไม่มีบัญชี LINE ที่เชื่อมอยู่"}
                    </h4>
                    <p className="text-sm text-slate-600 mt-2">
                      {status.is_linked
                        ? `LINE User ID: ${maskLineId(status.line_user_id)}`
                        : "เมื่อเชื่อมเสร็จ ระบบจะส่งการแจ้งเตือนไปที่ LINE บัญชีนี้โดยตรง"}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-3 ${status.is_linked ? "bg-emerald-100 text-emerald-700" : "bg-white text-blue-700"}`}>
                    {status.is_linked ? <CheckCircle2 size={20} /> : <Link2 size={20} />}
                  </div>
                </div>
              </div>

              {!status.is_linked && (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold app-heading">รหัสสำหรับเชื่อม LINE</p>
                      <p className="text-xs app-soft mt-1">รหัสนี้ใช้ได้ครั้งเดียวและมีอายุ 10 นาที</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleGenerate()}
                      disabled={busy}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {status.pending_code ? "สร้างใหม่" : "สร้างรหัส"}
                    </button>
                  </div>

                  {status.pending_code && (
                    <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700/70 mb-2">รหัสเชื่อม</p>
                      <p className="text-3xl font-mono font-bold tracking-[0.25em] text-blue-700">{status.pending_code}</p>
                      <p className="text-xs text-slate-500 mt-3">
                        {remainingMinutes === 0
                          ? "รหัสหมดอายุแล้ว กรุณาสร้างใหม่"
                          : remainingMinutes
                            ? `รหัสนี้จะหมดอายุในอีกประมาณ ${remainingMinutes} นาที`
                            : "กำลังตรวจสอบเวลาหมดอายุ"}
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-xl border border-sky-100 text-sm font-bold text-slate-600 hover:bg-sky-50 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                >
                  <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
                  รีเฟรชสถานะ
                </button>
                {status.is_linked && (
                  <button
                    type="button"
                    onClick={() => void handleUnlink()}
                    disabled={busy}
                    className="px-4 py-2.5 rounded-xl border border-rose-100 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                  >
                    <Unlink size={16} />
                    ยกเลิกการเชื่อม
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="app-surface rounded-3xl p-6">
          <h4 className="text-sm font-bold uppercase tracking-wider app-soft mb-4">วิธีเชื่อม LINE</h4>
          <div className="space-y-4 text-sm app-heading">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold mb-2">ขั้นตอน</p>
              <ol className="space-y-2 list-decimal pl-5 text-slate-700">
                <li>กดปุ่มสร้างรหัสเชื่อมจากหน้านี้</li>
                <li>เปิดแชตกับ LINE bot ของระบบ</li>
                <li>ส่งข้อความตามรูปแบบ <span className="font-mono font-semibold">LINK {status.pending_code ?? "XXXXXXXX"}</span></li>
                <li>รอข้อความตอบกลับว่าเชื่อมสำเร็จ</li>
                <li>กลับมากดรีเฟรชสถานะหากหน้าจอยังไม่อัปเดต</li>
              </ol>
            </div>

            <div className="rounded-2xl bg-sky-50 p-4 text-slate-700">
              <p className="font-semibold mb-2">เมื่อเชื่อมสำเร็จแล้ว คุณจะได้รับ</p>
              <ul className="space-y-1 list-disc pl-5">
                <li>แจ้งเตือนเมื่อมีงานใหม่หรือสถานะงานเปลี่ยน</li>
                <li>แจ้งเตือนงานใกล้ครบกำหนด</li>
                <li>แจ้งเตือนวันหยุดวันนี้, พรุ่งนี้ และสรุปรายสัปดาห์</li>
                <li>แจ้งเตือนเวรทำงานวันเสาร์</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4 text-slate-700">
              <p className="font-semibold mb-2">หมายเหตุ</p>
              <p>
                ถ้า LINE บัญชีเดียวถูกผูกกับผู้ใช้อื่นอยู่ ระบบจะไม่ยอมผูกซ้ำ เพื่อป้องกันการส่งแจ้งเตือนไปผิดคน
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
