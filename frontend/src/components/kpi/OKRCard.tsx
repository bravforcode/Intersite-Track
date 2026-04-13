import { Pencil, Trash2, Target, BarChart2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { motion } from "motion/react";
import { ProgressRing } from "./ProgressRing";
import type { KPI, KPIStatus, User } from "../../types";

const STATUS_LABEL: Record<KPIStatus, string> = {
  on_track: "ตามแผน",
  at_risk: "มีความเสี่ยง",
  behind: "ล้าหลัง",
  completed: "สำเร็จ",
};

const STATUS_ICON: Record<KPIStatus, React.ReactNode> = {
  on_track: <CheckCircle2 size={12} className="text-emerald-500" />,
  at_risk: <AlertTriangle size={12} className="text-amber-500" />,
  behind: <AlertTriangle size={12} className="text-red-500" />,
  completed: <CheckCircle2 size={12} className="text-blue-500" />,
};

const STATUS_BG: Record<KPIStatus, string> = {
  on_track: "bg-emerald-50 text-emerald-700 border-emerald-100",
  at_risk: "bg-amber-50 text-amber-700 border-amber-100",
  behind: "bg-red-50 text-red-700 border-red-100",
  completed: "bg-blue-50 text-blue-700 border-blue-100",
};

interface OKRCardProps {
  kpi: KPI;
  currentUser: User;
  onEdit: (kpi: KPI) => void;
  onDelete: (id: string) => void;
}

export function OKRCard({ kpi, currentUser, onEdit, onDelete }: OKRCardProps) {
  const canAct = currentUser.role === "admin" || currentUser.id === kpi.owner_id;
  const isOKR = kpi.type === "okr";

  const overdue =
    kpi.status !== "completed" &&
    kpi.due_date &&
    new Date(kpi.due_date) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="relative bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex gap-4 hover:shadow-md transition-shadow group"
    >
      {/* Progress ring */}
      <ProgressRing progress={kpi.progress} status={kpi.status} size={76} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Type badge */}
        <div className="flex items-center gap-2 mb-1">
          {isOKR ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
              <Target size={9} /> OKR
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
              <BarChart2 size={9} /> KPI
            </span>
          )}

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BG[kpi.status]}`}>
            {STATUS_ICON[kpi.status]}
            {STATUS_LABEL[kpi.status]}
          </span>

          {overdue && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              <Clock size={9} /> เกินกำหนด
            </span>
          )}
        </div>

        {/* Objective label */}
        {isOKR && kpi.objective && (
          <p className="text-[10px] text-purple-500 font-medium mb-0.5 truncate">
            {kpi.objective}
          </p>
        )}

        {/* Title */}
        <h3 className="text-sm font-bold text-gray-900 truncate leading-snug mb-1">
          {kpi.title}
        </h3>

        {/* Description */}
        {kpi.description && (
          <p className="text-[11px] text-gray-400 line-clamp-2 mb-2 leading-relaxed">
            {kpi.description}
          </p>
        )}

        {/* Progress bar + values */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
            <span>
              <span className="font-bold text-gray-700 text-xs">{kpi.current_value.toLocaleString()}</span>
              {" / "}
              {kpi.target_value.toLocaleString()} {kpi.unit}
            </span>
            <span>{kpi.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${kpi.progress}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background:
                  kpi.status === "on_track" ? "#10b981"
                  : kpi.status === "at_risk" ? "#f59e0b"
                  : kpi.status === "behind" ? "#ef4444"
                  : "#3b82f6",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#5A5A40] flex items-center justify-center text-[8px] font-bold text-white">
              {kpi.owner_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{kpi.owner_name}</span>
          </div>
          <span className="text-[10px] text-gray-400">
            ครบ {kpi.due_date ? new Date(kpi.due_date).toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "—"}
          </span>
        </div>
      </div>

      {/* Actions (visible on hover for owners/admins) */}
      {canAct && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(kpi)}
            className="w-7 h-7 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete(kpi.id)}
            className="w-7 h-7 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
