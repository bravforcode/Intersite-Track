import { ClipboardList } from "lucide-react";
import { motion } from "motion/react";
import { TaskCard } from "./TaskCard";
import { TaskFilters, type FilterValues } from "./TaskFilters";
import { useState } from "react";
import type { Task, User, TaskType } from "../../types";

interface TasksPageProps {
  tasks: Task[];
  users: User[];
  taskTypes: TaskType[];
  currentUser: User;
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onRefresh: () => void;
}

export function TasksPage({ tasks, users, taskTypes, currentUser, onViewTask, onEditTask }: TasksPageProps) {
  const [filters, setFilters] = useState<FilterValues>({
    search: "", status: "", priority: "", assignee: "", dateFrom: "", dateTo: "",
  });

  const myTasks =
    currentUser.role === "staff"
      ? tasks.filter((t) => t.assignments.some((a) => a.id === currentUser.id))
      : tasks;

  const filtered = myTasks.filter((t) => {
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase()) && !(t.description || "").toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.assignee && !t.assignments.some((a) => a.id === Number(filters.assignee))) return false;
    if (filters.dateFrom && t.due_date < filters.dateFrom) return false;
    if (filters.dateTo && t.due_date > filters.dateTo) return false;
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      <TaskFilters users={users} onFilterChange={setFilters} />

      <p className="text-sm text-gray-400">
        แสดง {filtered.length} จาก {myTasks.length} งาน
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onView={() => onViewTask(task)}
            onEdit={currentUser.role === "admin" ? () => onEditTask(task) : undefined}
            currentUser={currentUser}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
          <p>ไม่พบงานที่ตรงตามเงื่อนไข</p>
        </div>
      )}
    </motion.div>
  );
}
