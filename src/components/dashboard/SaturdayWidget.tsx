import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { saturdayService } from "../../services/saturdayService";
import type { SaturdaySchedule } from "../../types/holiday";

function getNextSaturday(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSat = day === 6 ? 0 : 6 - day;
  d.setDate(d.getDate() + daysUntilSat);
  return d.toISOString().substring(0, 10);
}

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long" });
}

export function SaturdayWidget() {
  const [schedule, setSchedule] = useState<SaturdaySchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const satDate = getNextSaturday();
        // Parse year and month as numbers (service expects numbers)
        const year = Number(satDate.substring(0, 4));
        const month = Number(satDate.substring(5, 7));
        const schedules = await saturdayService.getSchedules(year, month);
        const found = schedules.find(s => s.date === satDate);
        setSchedule(found ?? null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const nextSat = getNextSaturday();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
          <CalendarCheck size={16} className="text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-slate-700">เวรเสาร์ ({formatThaiDate(nextSat)})</p>
      </div>
      {loading ? (
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      ) : schedule ? (
        <div className="flex flex-wrap gap-1.5">
          {schedule.user_names.map((name, i) => (
            <span key={i} className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium">{name}</span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">ยังไม่มีตารางเวร</p>
      )}
    </div>
  );
}
