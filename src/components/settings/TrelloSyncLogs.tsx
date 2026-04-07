import React from "react";
import { RefreshCw, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useSyncLogs } from "../../hooks/useSyncLogs";
import type { SyncStatus, SyncAction } from "../../types/trello";

const STATUS_LABELS: Record<SyncStatus, string> = {
  pending: "รอดำเนินการ",
  success: "สำเร็จ",
  failed: "ล้มเหลว",
  retrying: "กำลังลองใหม่",
};

const STATUS_COLORS: Record<SyncStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-600",
  retrying: "bg-amber-100 text-amber-700",
};

const ACTION_LABELS: Record<SyncAction, string> = {
  create: "สร้าง",
  update: "อัปเดต",
  delete: "ลบ",
  sync_checklist: "Checklist",
  sync_members: "สมาชิก",
  sync_status: "สถานะ",
};

export default function TrelloSyncLogs() {
  const { data, loading, error, filters, updateFilters, setPage, refresh } = useSyncLogs();

  const totalPages = data ? Math.ceil(data.total / (filters.pageSize ?? 20)) : 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end app-surface p-4 rounded-2xl">
        <div>
          <label className="block text-xs font-semibold app-soft uppercase tracking-wider mb-1">จากวันที่</label>
          <input type="date" className="px-3 py-2 rounded-xl text-sm app-field"
            value={filters.dateFrom ?? ""}
            onChange={e => updateFilters({ dateFrom: e.target.value || undefined })} />
        </div>
        <div>
          <label className="block text-xs font-semibold app-soft uppercase tracking-wider mb-1">ถึงวันที่</label>
          <input type="date" className="px-3 py-2 rounded-xl text-sm app-field"
            value={filters.dateTo ?? ""}
            onChange={e => updateFilters({ dateTo: e.target.value || undefined })} />
        </div>
        <div>
          <label className="block text-xs font-semibold app-soft uppercase tracking-wider mb-1">สถานะ</label>
          <select className="px-3 py-2 rounded-xl text-sm app-field"
            value={filters.status ?? ""}
            onChange={e => updateFilters({ status: (e.target.value as SyncStatus) || undefined })}>
            <option value="">ทั้งหมด</option>
            {(Object.keys(STATUS_LABELS) as SyncStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold app-soft uppercase tracking-wider mb-1">Task ID</label>
          <input type="text" className="w-32 px-3 py-2 rounded-xl text-sm app-field"
            placeholder="เช่น task-42"
            value={filters.taskId ?? ""}
            onChange={e => updateFilters({ taskId: e.target.value || undefined })} />
        </div>
        <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm app-muted hover:bg-gray-50 transition-colors">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          รีเฟรช
        </button>
      </div>

      {/* Table */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl app-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold app-muted uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">เวลา</th>
              <th className="px-4 py-3 text-left">Task</th>
              <th className="px-4 py-3 text-left">การกระทำ</th>
              <th className="px-4 py-3 text-left">สถานะ</th>
              <th className="px-4 py-3 text-left">ลองซ้ำ</th>
              <th className="px-4 py-3 text-left">ข้อผิดพลาด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center app-soft">
                  <RefreshCw size={18} className="animate-spin inline mr-2" />กำลังโหลด...
                </td>
              </tr>
            )}
            {!loading && (!data || data.logs.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center app-soft">ไม่มีข้อมูล</td>
              </tr>
            )}
            {!loading && data?.logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 app-muted whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="px-4 py-3">
                  {log.taskId ? (
                    <span className="font-medium app-heading">
                      #{log.taskId}{log.taskTitle ? ` — ${log.taskTitle}` : ""}
                    </span>
                  ) : (
                    <span className="app-soft">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 app-heading text-xs font-medium">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[log.status]}`}>
                    {STATUS_LABELS[log.status]}
                  </span>
                </td>
                <td className="px-4 py-3 app-muted">{log.retryCount}</td>
                <td className="px-4 py-3 text-red-500 text-xs max-w-xs truncate" title={log.errorMessage}>
                  {log.errorMessage ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm app-muted">
          <span>แสดง {data.logs.length} จาก {data.total} รายการ</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((filters.page ?? 1) - 1)} disabled={(filters.page ?? 1) <= 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span>หน้า {filters.page ?? 1} / {totalPages}</span>
            <button onClick={() => setPage((filters.page ?? 1) + 1)} disabled={(filters.page ?? 1) >= totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
