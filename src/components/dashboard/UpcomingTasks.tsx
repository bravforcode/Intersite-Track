import { AlertTriangle } from "lucide-react";
import { formatDate } from "../../utils/formatters";
import type { Task } from "../../types";

interface UpcomingTasksProps {
  tasks: Task[];
  onViewTask: (task: Task) => void;
}

export function UpcomingTasks({ tasks, onViewTask }: UpcomingTasksProps) {
  const upcoming = tasks
    .filter((t) => t.status !== "completed" && t.status !== "cancelled" && t.due_date)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
      <h3 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-500" /> งานใกล้ครบกำหนด
      </h3>
      <div className="space-y-3">
        {upcoming.map((t) => {
          const daysLeft = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000);
          return (
            <div
              key={t.id}
              onClick={() => onViewTask(t)}
              className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <p className="font-medium text-sm text-gray-900 truncate">{t.title}</p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-400">{formatDate(t.due_date)}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    daysLeft <= 0
                      ? "bg-rose-100 text-rose-600"
                      : daysLeft <= 1
                      ? "bg-rose-100 text-rose-600"
                      : daysLeft <= 3
                      ? "bg-amber-100 text-amber-600"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {daysLeft <= 0 ? "เลยกำหนด!" : `อีก ${daysLeft} วัน`}
                </span>
              </div>
            </div>
          );
        })}
        {upcoming.length === 0 && (
          <p className="text-center text-gray-400 py-4 text-sm">ไม่มีงานใกล้ครบกำหนด</p>
        )}
      </div>
    </div>
  );
}
