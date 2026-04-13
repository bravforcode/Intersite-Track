import { useState, useEffect } from "react";
import { Download, BarChart3, TrendingDown } from "lucide-react";
import { motion } from "motion/react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { DashboardSkeleton } from "../common/Skeleton";
import { taskService } from "../../services/taskService";
import { reportService } from "../../services/reportService";
import { authService } from "../../services/authService";
import { formatDate } from "../../utils/formatters";
import { statusColor, statusLabel } from "../../utils/constants";
import type { Stats, StaffReport } from "../../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ReportsPageProps {
  user: any;
  refreshTrigger?: number; // Used by App to trigger refresh
}

export function ReportsPage({ user: _user, refreshTrigger = 0 }: ReportsPageProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, inProgress: 0, pending: 0, cancelled: 0 });
  const [staffReport, setStaffReport] = useState<StaffReport[]>([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [dateReport, setDateReport] = useState<Record<string, unknown>[]>([]);
  const [analytics, setAnalytics] = useState<{ deptWorkload: any[], burnDown: any[] }>({ deptWorkload: [], burnDown: [] });
  const getDownloadFileName = (response: Response, fallback: string) => {
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="?(?<filename>[^";]+)"?/i);
    return match?.groups?.filename ?? fallback;
  };

  const handleDownload = async (endpoint: string) => {
    try {
      const token = await authService.getToken();
      const response = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "ดาวน์โหลดรายงานไม่สำเร็จ" }));
        throw new Error(err.error || "ดาวน์โหลดรายงานไม่สำเร็จ");
      }

      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = getDownloadFileName(response, "report");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      console.error("Failed to download report", error);
    }
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [s, sr, a] = await Promise.all([
        taskService.getStats(),
        reportService.getStaffReport(),
        reportService.getAnalytics()
      ]);
      setStats(s);
      setStaffReport(sr);
      setAnalytics(a);
    } catch (error) {
      console.error("Failed to load reports data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [refreshTrigger]);

  if (loading) return <DashboardSkeleton />;

  const loadDateReport = async () => {
    if (!dateRange.start || !dateRange.end) return;
    const data = await reportService.getDateRangeReport(dateRange.start, dateRange.end);
    setDateReport(data);
  };

  const totalTasks = stats.total || 1;
  const bars = [
    { label: "เสร็จสิ้น", value: stats.completed, color: "bg-emerald-500", pct: Math.round((stats.completed / totalTasks) * 100) },
    { label: "กำลังดำเนินการ", value: stats.inProgress, color: "bg-amber-500", pct: Math.round((stats.inProgress / totalTasks) * 100) },
    { label: "รอดำเนินการ", value: stats.pending, color: "bg-gray-400", pct: Math.round((stats.pending / totalTasks) * 100) },
    { label: "ยกเลิก", value: stats.cancelled, color: "bg-rose-500", pct: Math.round((stats.cancelled / totalTasks) * 100) },
  ];
  const reportSummary = [
    { label: "อัตราปิดงาน", value: `${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`, tone: "text-emerald-600" },
    { label: "กำลังดำเนินการ", value: stats.inProgress, tone: "text-amber-600" },
    { label: "รอดำเนินการ", value: stats.pending, tone: "text-[#5A5A40]" },
    { label: "ยกเลิก", value: stats.cancelled, tone: "text-rose-600" },
  ];

  const burnDownData = {
    labels: analytics.burnDown.map(d => formatDate(d.date)),
    datasets: [
      {
        label: "งานที่ยังไม่เสร็จ",
        data: analytics.burnDown.map(d => d.remaining),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        tension: 0.3,
      },
    ],
  };

  const workloadData = {
    labels: analytics.deptWorkload.map(d => d.department),
    datasets: [
      {
        label: "งานทั้งหมด",
        data: analytics.deptWorkload.map(d => d.total),
        backgroundColor: "rgba(54, 162, 235, 0.5)",
      },
      {
        label: "เสร็จแล้ว",
        data: analytics.deptWorkload.map(d => d.completed),
        backgroundColor: "rgba(75, 192, 192, 0.5)",
      },
    ],
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-serif font-bold app-heading">สรุปรายงาน</h3>
        <div className="flex gap-2">
          <button onClick={() => handleDownload("/api/reports/export-csv")}
            className="flex items-center gap-2 bg-white border border-[#5A5A40] text-[#5A5A40] px-4 py-2 rounded-xl text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors">
            <Download size={18} /> ส่งออก Excel/CSV
          </button>
          <button onClick={() => handleDownload("/api/reports/export-pdf")}
            className="flex items-center gap-2 bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md hover:bg-[#4A4A30] transition-colors">
            <Download size={18} /> รายงานงาน (PDF)
          </button>
          <button onClick={() => handleDownload("/api/reports/export-staff-pdf")}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md hover:bg-indigo-700 transition-colors">
            <Download size={18} /> รายงานบุคลากร (PDF)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {reportSummary.map((item) => (
          <div key={item.label} className="app-surface-subtle rounded-2xl px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] app-soft mb-2">{item.label}</p>
            <p className={`text-2xl font-serif font-bold ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="app-surface rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingDown className="text-rose-500" size={20} />
            <h4 className="text-sm font-bold uppercase tracking-wider app-soft">Burn-down Chart (14 วันล่าสุด)</h4>
          </div>
          <div className="h-64">
            <Line 
              data={burnDownData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
              }} 
            />
          </div>
        </div>

        <div className="app-surface rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="text-blue-500" size={20} />
            <h4 className="text-sm font-bold uppercase tracking-wider app-soft">ภาระงานแยกตามหน่วยงาน</h4>
          </div>
          <div className="h-64">
            <Bar 
              data={workloadData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
              }} 
            />
          </div>
        </div>
      </div>

      <div className="app-surface rounded-3xl p-6">
        <h4 className="text-sm font-bold uppercase tracking-wider app-soft mb-6">ภาพรวมสถานะงาน</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            {bars.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium app-heading">{b.label}</span>
                  <span className="app-muted">{b.value} ({b.pct}%)</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${b.color} transition-all duration-500`} style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-6xl font-serif font-bold text-[#5A5A40]">{stats.total}</p>
              <p className="text-sm app-soft mt-2">งานทั้งหมดในระบบ</p>
              <p className="text-2xl font-serif font-bold text-emerald-500 mt-4">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </p>
              <p className="text-xs app-soft">อัตราความสำเร็จ</p>
            </div>
          </div>
        </div>
      </div>

      <div className="app-surface rounded-3xl p-6">
        <h4 className="text-sm font-bold uppercase tracking-wider app-soft mb-6">รายงานตามบุคลากร</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-bold uppercase app-muted">บุคลากร</th>
                <th className="px-4 py-3 text-xs font-bold uppercase app-muted">บทบาท</th>
                <th className="px-4 py-3 text-xs font-bold uppercase app-muted">หน่วยงาน</th>
                <th className="px-4 py-3 text-xs font-bold uppercase app-muted text-center">ทั้งหมด</th>
                <th className="px-4 py-3 text-xs font-bold uppercase app-muted text-center">เสร็จสิ้น</th>
                <th className="px-4 py-3 text-xs font-bold uppercase app-muted text-center">กำลังดำเนินการ</th>
                <th className="px-4 py-3 text-xs font-bold uppercase app-muted text-center">รอดำเนินการ</th>
                <th className="px-4 py-3 text-xs font-bold uppercase app-muted">ภาพรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staffReport.map((s) => {
                const pct = s.total_tasks > 0 ? Math.round((s.completed / s.total_tasks) * 100) : 0;
                return (
                  <tr key={s.id} className="hover:bg-(--app-surface-muted) transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40] font-bold text-xs">
                          {s.first_name[0]}{s.last_name[0]}
                        </div>
                        <span className="text-sm font-medium app-heading">{s.first_name} {s.last_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${s.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                        {s.role === "admin" ? "แอดมิน" : "พนักงาน"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm app-muted">{s.department_name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-center font-bold app-heading">{s.total_tasks}</td>
                    <td className="px-4 py-3 text-sm text-center text-emerald-600 font-bold">{s.completed}</td>
                    <td className="px-4 py-3 text-sm text-center text-amber-600 font-bold">{s.in_progress}</td>
                    <td className="px-4 py-3 text-sm text-center app-muted font-bold">{s.pending}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs app-muted">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {staffReport.length === 0 && <p className="text-center app-soft py-8">ไม่มีข้อมูล</p>}
        </div>
      </div>

      <div className="app-surface rounded-3xl p-6">
        <h4 className="text-sm font-bold uppercase tracking-wider app-soft mb-4">รายงานตามช่วงเวลา</h4>
        <div className="flex gap-4 items-end mb-6">
          <div>
            <label className="block text-xs font-bold app-soft mb-1">จากวันที่</label>
            <input type="date" className="px-4 py-2 rounded-xl text-sm app-field"
              value={dateRange.start} onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold app-soft mb-1">ถึงวันที่</label>
            <input type="date" className="px-4 py-2 rounded-xl text-sm app-field"
              value={dateRange.end} onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))} />
          </div>
          <button onClick={loadDateReport} className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-medium hover:bg-[#4A4A30] transition-colors">ค้นหา</button>
        </div>
        {dateReport.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-xs font-bold uppercase app-muted">วันที่</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase app-muted">สถานะ</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase app-muted text-center">จำนวน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dateReport.map((r, i) => (
                  <tr key={i} className="hover:bg-(--app-surface-muted) transition-colors">
                    <td className="px-4 py-3 text-sm app-heading">{formatDate(r.date as string)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${statusColor[r.status as string]}`}>{statusLabel[r.status as string]}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-bold app-heading">{r.count as number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center app-soft py-8 text-sm">กรุณาเลือกช่วงเวลาแล้วกดค้นหา</p>
        )}
      </div>
    </motion.div>
  );
}
