import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Upload, CalendarCheck, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { saturdayService } from "../../services/saturdayService";
import { SaturdayFormModal } from "./SaturdayFormModal";
import { SaturdayImportModal } from "./SaturdayImportModal";
import type { SaturdaySchedule, CreateSaturdayDTO } from "../../types/holiday";
import type { User } from "../../types";

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

interface SaturdaySchedulePageProps {
  user: User;
  users: User[];
}

export function SaturdaySchedulePage({ user, users }: SaturdaySchedulePageProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number>(currentMonth);
  const [schedules, setSchedules] = useState<SaturdaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<SaturdaySchedule | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await saturdayService.getSchedules(year, month);
      setSchedules(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [year, month]);

  async function handleSave(dto: CreateSaturdayDTO) {
    if (editingSchedule) {
      await saturdayService.updateSchedule(editingSchedule.id, dto);
    } else {
      await saturdayService.createSchedule(dto);
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("ต้องการลบเวรนี้?")) return;
    await saturdayService.deleteSchedule(id);
    await load();
  }

  async function handleJoin(id: string) {
    await saturdayService.joinSchedule(id);
    await load();
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <CalendarCheck size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">ตารางเวรเสาร์</h1>
            <p className="text-sm text-slate-500">กำหนดการทำงานวันเสาร์</p>
          </div>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && (
            <>
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Upload size={16} /> Import CSV
              </button>
              <button
                onClick={() => { setEditingSchedule(null); setFormOpen(true); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Plus size={16} /> เพิ่มเวร
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">ทุกเดือน</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center text-slate-400 text-sm py-8">กำลังโหลด...</div>
      ) : schedules.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-8">ไม่พบตารางเวรเสาร์</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((s, idx) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900">{formatThaiDate(s.date)}</p>
                  {s.note && <p className="text-xs text-slate-500 mt-0.5">{s.note}</p>}
                </div>
                {user.role === "admin" && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingSchedule(s); setFormOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.user_names.map((name, i) => (
                  <span key={i} className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium">{name}</span>
                ))}
              </div>
              {user.role === "staff" && !s.user_ids.includes(user.id) && (
                <button
                  onClick={() => handleJoin(s.id)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg py-1.5 transition-colors"
                >
                  <UserPlus size={13} /> ลงทะเบียนเวรตัวเอง
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {formOpen && (
        <SaturdayFormModal
          schedule={editingSchedule}
          users={users}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingSchedule(null); }}
        />
      )}
      {importOpen && (
        <SaturdayImportModal
          users={users}
          onImported={load}
          onClose={() => setImportOpen(false)}
        />
      )}
    </div>
  );
}
