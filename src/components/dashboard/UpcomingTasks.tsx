import { AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
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
    <div className="app-surface rounded-3xl p-6">
      <h3 className="text-lg font-serif font-bold mb-4 flex items-center gap-2 app-heading">
        <AlertTriangle size={18} className="text-amber-500" /> งานใกล้ครบกำหนด
      </h3>
      <div className="space-y-3 relative overflow-hidden">
        {upcoming.map((t, index) => {
          const daysLeft = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000);
          return (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.02, x: 4 }}
              key={t.id}
              onClick={() => onViewTask(t)}
              className="p-3 rounded-xl app-surface-subtle hover:bg-(--app-surface-hover) hover:border-black/5 cursor-pointer transition-colors"
            >
              <p className="font-medium text-sm app-heading truncate">{t.title}</p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs app-soft">{formatDate(t.due_date)}</span>
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
            </motion.div>
          );
        })}
        {upcoming.length === 0 && (
          <p className="text-center app-soft py-4 text-sm">ไม่มีงานใกล้ครบกำหนด</p>
        )}
      </div>
    </div>
  );
}
