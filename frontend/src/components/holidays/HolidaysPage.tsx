import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { motion } from "motion/react";
import { holidayService } from "../../services/holidayService";
import { HolidayFormModal } from "./HolidayFormModal";
import type { Holiday, CreateHolidayDTO } from "../../types/holiday";
import type { User } from "../../types";

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

interface HolidaysPageProps {
  user: User;
}

export function HolidaysPage({ user }: HolidaysPageProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await holidayService.getHolidays(year, month);
      setHolidays(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [year, month]);

  async function handleSave(dto: CreateHolidayDTO) {
    if (editingHoliday) {
      await holidayService.updateHoliday(editingHoliday.id, dto);
    } else {
      await holidayService.createHoliday(dto);
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("ต้องการลบวันหยุดนี้?")) return;
    await holidayService.deleteHoliday(id);
    await load();
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
            <CalendarDays size={20} className="text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">วันหยุดประจำปี</h1>
            <p className="text-sm text-slate-500">ตารางวันหยุดของบริษัท</p>
          </div>
        </div>
        {user.role === "admin" && (
          <button
            onClick={() => { setEditingHoliday(null); setFormOpen(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} /> เพิ่มวันหยุด
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={month ?? ""}
          onChange={e => setMonth(e.target.value ? Number(e.target.value) : undefined)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">ทุกเดือน</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">กำลังโหลด...</div>
        ) : holidays.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">ไม่พบวันหยุด</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600 w-12">#</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">วันที่</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">ชื่อวันหยุด</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">ประเภท</th>
                {user.role === "admin" && <th className="px-4 py-3 text-right font-medium text-slate-600">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {holidays.map((h, idx) => (
                <motion.tr
                  key={h.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatThaiDate(h.date)}</td>
                  <td className="px-4 py-3 text-slate-700">{h.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      h.type === "holiday" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {h.type === "holiday" ? "นักขัตฤกษ์" : "พิเศษ"}
                    </span>
                  </td>
                  {user.role === "admin" && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setEditingHoliday(h); setFormOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <HolidayFormModal
          holiday={editingHoliday}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingHoliday(null); }}
        />
      )}
    </div>
  );
}
