import { Calendar, Edit3 } from "lucide-react";
import { formatDate } from "../../utils/formatters";
import { priorityLabel, priorityColor } from "../../utils/constants";
import type { Task } from "../../types";

interface KanbanCardProps {
  task: Task;
  onView: () => void;
  onEdit?: () => void;
  isDragging?: boolean;
}

export function KanbanCard({ task, onView, onEdit, isDragging }: KanbanCardProps) {
  return (
    <div
      onClick={onView}
      className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing group relative ${
        isDragging
          ? "border-[#5A5A40] shadow-2xl scale-105 z-50 ring-2 ring-[#5A5A40]/20 rotate-2"
          : "border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${priorityColor[task.priority]}`}>
          {priorityLabel[task.priority]}
        </span>
        <div className="flex -space-x-2">
          {task.assignments.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="w-7 h-7 rounded-full bg-[#F5F5F0] dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[9px] font-bold text-[#5A5A40] dark:text-gray-300"
            >
              {a.first_name[0]}{a.last_name[0]}
            </div>
          ))}
        </div>
      </div>

      <h4 className="font-serif font-bold text-base text-gray-900 dark:text-gray-100 mb-1 leading-snug group-hover:text-[#5A5A40] transition-colors">
        {task.title}
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
        {task.description}
      </p>

      {/* Progress omitted to save vertical space in kanban, or can be kept compact */}
      <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full ${task.status === "completed" ? "bg-emerald-500" : "bg-[#5A5A40]"}`}
          style={{ width: `${task.progress}%` }}
        />
      </div>

      <div className="pt-3 border-t border-gray-50 dark:border-white/5 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 font-medium">
          <Calendar size={12} />
          <span>{formatDate(task.due_date)}</span>
        </div>
      </div>

      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-[#5A5A40] bg-white dark:bg-gray-800 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
          title="แก้ไข"
        >
          <Edit3 size={14} />
        </button>
      )}
    </div>
  );
}
