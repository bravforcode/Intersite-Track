import { useState, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import type { TaskSyncState } from "../../types/trello";
import { retrySyncForTask } from "../../services/trelloService";

interface Props {
  syncState: TaskSyncState;
  onRetried?: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  create: "สร้างการ์ด",
  update: "อัปเดตการ์ด",
  delete: "ลบการ์ด",
  sync_checklist: "ซิงค์ checklist",
  sync_members: "ซิงค์สมาชิก",
  sync_status: "ซิงค์สถานะ",
};

export default function TrelloSyncStatus({ syncState, onRetried }: Props) {
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryMsg, setRetryMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleRetry() {
    setRetrying(true);
    setRetryMsg(null);
    try {
      await retrySyncForTask(syncState.taskId);
      setRetryMsg("เริ่มซิงค์ใหม่แล้ว");
      onRetried?.();
    } catch (err) {
      setRetryMsg(err instanceof Error ? err.message : "ลองซิงค์ใหม่ล้มเหลว");
    } finally {
      setRetrying(false);
    }
  }

  const icon = (() => {
    switch (syncState.status) {
      case "success":
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case "failed":
        return <XCircle size={14} className="text-red-500" />;
      case "pending":
      case "retrying":
        return <RefreshCw size={14} className="text-amber-500 animate-spin" />;
      default:
        return null;
    }
  })();

  if (!icon) return null;

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 hover:opacity-80 transition-opacity"
        title="สถานะ Trello"
      >
        {icon}
        {syncState.trelloCardUrl && (
          <a
            href={syncState.trelloCardUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-blue-400 hover:text-blue-600"
          >
            <ExternalLink size={11} />
          </a>
        )}
      </button>

      {open && (
        <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-white rounded-2xl shadow-xl border border-black/5 p-4 text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Trello Sync</p>

          <div className="space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span className="text-gray-400">สถานะ</span>
              <StatusBadge status={syncState.status} />
            </div>
            {syncState.lastAction && (
              <div className="flex justify-between">
                <span className="text-gray-400">การกระทำ</span>
                <span>{ACTION_LABELS[syncState.lastAction] ?? syncState.lastAction}</span>
              </div>
            )}
            {syncState.lastSyncedAt && (
              <div className="flex justify-between">
                <span className="text-gray-400">ซิงค์ล่าสุด</span>
                <span>{new Date(syncState.lastSyncedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
            )}
            {syncState.errorMessage && (
              <div className="mt-2 p-2 bg-red-50 rounded-lg text-red-600 text-[11px] break-words">
                {syncState.errorMessage}
              </div>
            )}
          </div>

          {retryMsg && (
            <p className={`mt-2 text-xs ${retryMsg.includes("ล้มเหลว") ? "text-red-500" : "text-emerald-600"}`}>
              {retryMsg}
            </p>
          )}

          <button
            onClick={handleRetry}
            disabled={retrying}
            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#5A5A40] text-white text-xs font-medium hover:bg-[#4A4A30] disabled:opacity-50 transition-colors"
          >
            {retrying ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            ลองซิงค์ใหม่
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    success: { label: "สำเร็จ", cls: "bg-emerald-100 text-emerald-700" },
    failed: { label: "ล้มเหลว", cls: "bg-red-100 text-red-600" },
    pending: { label: "รอดำเนินการ", cls: "bg-amber-100 text-amber-700" },
    retrying: { label: "กำลังลองใหม่", cls: "bg-amber-100 text-amber-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return <span className={`px-2 py-0.5 rounded-full font-semibold ${s.cls}`}>{s.label}</span>;
}
