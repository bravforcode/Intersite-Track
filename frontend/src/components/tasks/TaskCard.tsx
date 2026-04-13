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
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ 
        y: -6, 
        scale: 1.01,
        boxShadow: "0 20px 40px rgba(0,0,0,0.06)",
        borderColor: "rgba(0,0,0,0.1)"
      }}
      whileTap={{ scale: 0.98, y: 0 }}
      transition={{ 
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1], // Custom spring-like easing 
      }}
      className="app-surface p-6 rounded-3xl cursor-pointer group relative overflow-hidden transition-colors"
    >
      <div 
        className="absolute inset-0 bg-linear-to-br from-black/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
        style={{ pointerEvents: 'none' }}
      />
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

        <h4 className="font-serif font-bold text-lg app-heading mb-2 group-hover:text-[#5A5A40] transition-colors">
          {task.title}
        </h4>
        <p className="text-sm app-muted line-clamp-2 mb-2">{task.description}</p>
        
        <div className="flex flex-wrap gap-1 mb-4">
          {task.tags?.map((tag, idx) => (
            <span key={idx} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-medium border border-blue-100">
              {tag}
            </span>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="app-soft font-medium">ความคืบหน้า</span>
            <span className="app-heading font-bold">{task.progress}%</span>
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
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 app-soft">
              <Calendar size={14} />
              <span>{formatDate(task.due_date)}</span>
            </div>
            {task.sla_enabled && task.sla_status && (
              <div className="flex items-center gap-1">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  task.sla_status === 'breached' ? 'bg-red-50 text-red-600 border border-red-100' :
                  task.sla_status === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}>
                  SLA {task.sla_status} {task.sla_elapsed_business_days != null && task.sla_target_days != null ? `(${task.sla_elapsed_business_days}/${task.sla_target_days})` : ''}
                </span>
              </div>
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColor[task.status]}`}>
            {statusLabel[task.status]}
          </span>
        </div>
      </div>

      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="absolute top-4 right-4 p-1.5 app-soft hover:text-[#5A5A40] bg-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all"
          title="แก้ไข"
        >
          <Edit3 size={14} />
        </button>
      )}
    </motion.div>
  );
}
