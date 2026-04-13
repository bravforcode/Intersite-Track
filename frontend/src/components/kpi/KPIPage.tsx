import { useEffect, useState, useCallback } from "react";
import { Plus, Target, BarChart2, TrendingUp, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { OKRCard } from "./OKRCard";
import { GoalFormModal } from "./GoalFormModal";
import { ProgressRing } from "./ProgressRing";
import { kpiService } from "../../services/kpiService";
import type { KPI, KPIStatus, KPIType, User, CreateKPIInput, UpdateKPIInput } from "../../types";

interface KPIPageProps {
  user: User;
}

type ViewFilter = "all" | KPIType;
type StatusFilter = "all" | KPIStatus;

const TYPE_TABS: { key: ViewFilter; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "ทั้งหมด", icon: <TrendingUp size={14} /> },
  { key: "okr", label: "OKR", icon: <Target size={14} /> },
  { key: "kpi", label: "KPI", icon: <BarChart2 size={14} /> },
];

export function KPIPage({ user }: KPIPageProps) {
  const [kpis, setKPIs] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<ViewFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchKPIs = useCallback(async () => {
    try {
      const data = await kpiService.list();
      setKPIs(data);
    } catch (err) {
      console.error("Failed to load KPIs", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchKPIs();
  }, [fetchKPIs]);

  const filtered = kpis.filter((k) => {
    if (typeFilter !== "all" && k.type !== typeFilter) return false;
    if (statusFilter !== "all" && k.status !== statusFilter) return false;
    return true;
  });

  // Stats derived from full list
  const total = kpis.length;
  const on_track = kpis.filter((k) => k.status === "on_track").length;
  const at_risk = kpis.filter((k) => k.status === "at_risk").length;
  const behind = kpis.filter((k) => k.status === "behind").length;
  const completed = kpis.filter((k) => k.status === "completed").length;
  const avg_progress =
    total === 0 ? 0 : Math.round(kpis.reduce((s, k) => s + k.progress, 0) / total);

  async function handleSave(data: CreateKPIInput | UpdateKPIInput) {
    if (editingKPI) {
      await kpiService.update(editingKPI.id, data as UpdateKPIInput);
    } else {
      await kpiService.create(data as CreateKPIInput);
    }
    await fetchKPIs();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await kpiService.delete(id);
      setKPIs((prev) => prev.filter((k) => k.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function openCreate() {
    setEditingKPI(null);
    setFormOpen(true);
  }

  function openEdit(kpi: KPI) {
    setEditingKPI(kpi);
    setFormOpen(true);
  }

  const statCard = (
    icon: React.ReactNode,
    label: string,
    value: number,
    color: string
  ) => (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-[10px] text-gray-400 font-medium">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">KPI & OKR</h1>
          <p className="text-xs text-gray-400 mt-0.5">ติดตามเป้าหมายและผลลัพธ์หลักของทีม</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          เพิ่มเป้าหมาย
        </button>
      </div>

      {/* ── Stat bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Avg progress ring */}
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 col-span-2 sm:col-span-1">
          <ProgressRing
            progress={avg_progress}
            status={avg_progress >= 80 ? "on_track" : avg_progress >= 50 ? "at_risk" : "behind"}
            size={56}
          />
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">เฉลี่ย</p>
            <p className="text-[10px] text-gray-400">ความคืบหน้า</p>
          </div>
        </div>

        {statCard(<TrendingUp size={16} className="text-blue-500" />, "ทั้งหมด", total, "bg-blue-50")}
        {statCard(<CheckCircle2 size={16} className="text-emerald-500" />, "ตามแผน", on_track, "bg-emerald-50")}
        {statCard(<AlertTriangle size={16} className="text-amber-500" />, "มีความเสี่ยง", at_risk, "bg-amber-50")}
        {statCard(<AlertTriangle size={16} className="text-red-500" />, "ล้าหลัง", behind, "bg-red-50")}
        {statCard(<Clock size={16} className="text-blue-400" />, "สำเร็จ", completed, "bg-blue-50")}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Type tabs */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          {TYPE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                typeFilter === t.key
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="all">สถานะทั้งหมด</option>
          <option value="on_track">ตามแผน</option>
          <option value="at_risk">มีความเสี่ยง</option>
          <option value="behind">ล้าหลัง</option>
          <option value="completed">สำเร็จ</option>
        </select>

        <p className="text-xs text-gray-400 ml-auto">{filtered.length} รายการ</p>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 rounded-3xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-gray-400"
        >
          <Target size={48} className="mb-4 opacity-30" />
          <p className="text-sm font-medium">ยังไม่มีเป้าหมาย</p>
          <p className="text-xs mt-1">กดปุ่ม "เพิ่มเป้าหมาย" เพื่อเริ่มต้น</p>
          <button
            onClick={openCreate}
            className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} /> เพิ่มเป้าหมาย
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filtered
              .filter((k) => deletingId !== k.id)
              .map((kpi) => (
                <OKRCard
                  key={kpi.id}
                  kpi={kpi}
                  currentUser={user}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Form Modal ── */}
      <GoalFormModal
        open={formOpen}
        editingKPI={editingKPI}
        currentUser={user}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
