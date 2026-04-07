import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { holidayService } from "../../services/holidayService";
import type { Holiday } from "../../types/holiday";

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long" });
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function HolidayWidget() {
  const [nextHoliday, setNextHoliday] = useState<Holiday | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().substring(0, 10);
        const year = new Date().getFullYear();
        const holidays = await holidayService.getHolidays(year);
        const upcoming = holidays.filter(h => h.date >= today).sort((a, b) => a.date.localeCompare(b.date));
        setNextHoliday(upcoming[0] ?? null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
          <CalendarDays size={16} className="text-rose-600" />
        </div>
        <p className="text-sm font-semibold text-slate-700">วันหยุดถัดไป</p>
      </div>
      {loading ? (
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      ) : nextHoliday ? (
        <div>
          <p className="font-bold text-slate-900">{nextHoliday.name}</p>
          <p className="text-sm text-slate-500 mt-0.5">{formatThaiDate(nextHoliday.date)}</p>
          <p className="text-xs text-rose-600 mt-1 font-medium">
            {daysUntil(nextHoliday.date) === 0 ? "วันนี้! 🎉" : `อีก ${daysUntil(nextHoliday.date)} วัน`}
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-400">ไม่มีวันหยุดที่กำลังจะถึง</p>
      )}
    </div>
  );
}
