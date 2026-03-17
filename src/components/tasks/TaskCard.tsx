import { Calendar, Edit3 } from "lucide-react";
import { motion } from "motion/react";
import { formatDate } from "../../utils/formatters";
import { priorityLabel, priorityColor, statusColor, statusLabel } from "../../utils/constants";
import type { Task, User } from "../../types";

interface TaskCardProps {
  task: Task;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  currentUser?: User;
}

export function TaskCard({ task, onView, onEdit }: TaskCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.08)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.25 }}
      className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 cursor-pointer group relative"
    >
      <div onClick={onView}>
        <div className="flex items-start justify-between mb-4">
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${priorityColor[task.priority]}`}>
            {priorityLabel[task.priority]}
          </span>
          <div className="flex -space-x-2">
            {task.assignments.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="w-8 h-8 rounded-full bg-[#F5F5F0] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#5A5A40]"
              >
                {a.first_name[0]}{a.last_name[0]}
              </div>
            ))}
            {task.assignments.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-400">
                +{task.assignments.length - 3}
              </div>
            )}
          </div>
        </div>

        <h4 className="font-serif font-bold text-lg text-gray-900 mb-2 group-hover:text-[#5A5A40] transition-colors">
          {task.title}
        </h4>
        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{task.description}</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400 font-medium">ความคืบหน้า</span>
            <span className="text-gray-900 font-bold">{task.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              className={`h-full rounded-full ${task.status === "completed" ? "bg-emerald-500" : "bg-[#5A5A40]"}`}
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Calendar size={14} />
            <span>{formatDate(task.due_date)}</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColor[task.status]}`}>
            {statusLabel[task.status]}
          </span>
        </div>
      </div>

      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-[#5A5A40] bg-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all"
          title="แก้ไข"
        >
          <Edit3 size={14} />
        </button>
      )}
    </motion.div>
  );
}
