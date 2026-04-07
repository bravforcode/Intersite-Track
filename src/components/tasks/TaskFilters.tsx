import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { motion } from "motion/react";
import type { User } from "../../types";

export interface FilterValues {
  search: string;
  status: string;
  priority: string;
  assignee: string;
  dateFrom: string;
  dateTo: string;
}

interface TaskFiltersProps {
  users: User[];
  onFilterChange: (filters: FilterValues) => void;
}

export function TaskFilters({ users, onFilterChange }: TaskFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({
    search: "", status: "", priority: "", assignee: "", dateFrom: "", dateTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  const update = (patch: Partial<FilterValues>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    onFilterChange(next);
  };

  const clearFilters = () => {
    const next: FilterValues = { search: "", status: "", priority: "", assignee: "", dateFrom: "", dateTo: "" };
    setFilters(next);
    onFilterChange(next);
    setShowFilters(false);
  };

  return (
    <div className="app-surface p-4 rounded-2xl space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 app-soft" size={18} />
          <input
            type="text"
            placeholder="ค้นหางาน..."
            className="w-full pl-10 pr-4 py-2 rounded-xl app-field text-sm"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showFilters ? "bg-blue-600 text-white" : "app-surface-subtle app-muted hover:bg-(--app-surface-hover)"}`}
          >
            <Filter size={18} /> ตัวกรอง{hasActiveFilters ? ` (${activeFilterCount})` : ""}
          </button>
          <select
            className="px-4 py-2 rounded-xl text-sm font-medium app-field"
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <select
            className="px-4 py-2 rounded-xl text-sm font-medium app-field"
            value={filters.priority}
            onChange={(e) => update({ priority: e.target.value })}
          >
            <option value="">ความสำคัญทั้งหมด</option>
            <option value="low">ต่ำ</option>
            <option value="medium">ปานกลาง</option>
            <option value="high">สูง</option>
            <option value="urgent">เร่งด่วน</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-xl text-sm font-medium app-surface-subtle app-muted hover:bg-(--app-surface-hover) transition-colors"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100"
        >
          <div>
            <label className="block text-xs font-bold uppercase app-soft mb-1">ผู้รับผิดชอบ</label>
            <select
              className="w-full px-4 py-2 rounded-xl text-sm app-field"
              value={filters.assignee}
              onChange={(e) => update({ assignee: e.target.value })}
            >
              <option value="">ทั้งหมด</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase app-soft mb-1">จากวันที่</label>
            <input
              type="date"
              className="w-full px-4 py-2 rounded-xl text-sm app-field"
              value={filters.dateFrom}
              onChange={(e) => update({ dateFrom: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase app-soft mb-1">ถึงวันที่</label>
            <input
              type="date"
              className="w-full px-4 py-2 rounded-xl text-sm app-field"
              value={filters.dateTo}
              onChange={(e) => update({ dateTo: e.target.value })}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
