import { useState } from "react";
import { Search, Eye, Edit3, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import api from "../../services/api";
import { formatDate } from "../../utils/formatters";
import { statusColor, statusLabel, priorityColor, priorityLabel } from "../../utils/constants";
import type { User, Department, Task } from "../../types";

interface StaffPageProps {
  users: User[];
  departments: Department[];
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
}

export function StaffPage({ users, departments: _departments, onEdit, onDelete }: StaffPageProps) {
  const [search, setSearch] = useState("");
  const [staffTasks, setStaffTasks] = useState<Record<number, Task[]>>({});
  const [viewingStaff, setViewingStaff] = useState<User | null>(null);

  const staffUsers = users.filter((u) => {
    if (search && !`${u.first_name} ${u.last_name} ${u.username} ${u.position}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const loadStaffTasks = async (userId: number) => {
    const tasks = await api.get<Task[]>(`/api/users/${userId}/tasks`);
    setStaffTasks((prev) => ({ ...prev, [userId]: tasks }));
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-black/5">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="ค้นหาเจ้าหน้าที่..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40] outline-none text-sm"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">เจ้าหน้าที่</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">ตำแหน่ง</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">หน่วยงาน</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">บทบาท</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staffUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40] font-bold text-sm">
                      {u.first_name[0]}{u.last_name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-gray-400">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{u.position || "-"}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">{u.department_name || "-"}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
                    {u.role === "admin" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setViewingStaff(u); loadStaffTasks(u.id); }} className="p-2 text-gray-400 hover:text-blue-500 transition-colors" title="ดูประวัติงาน">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => onEdit(u)} className="p-2 text-gray-400 hover:text-[#5A5A40] transition-colors" title="แก้ไข">
                      <Edit3 size={16} />
                    </button>
                    {u.role !== "admin" && (
                      <button onClick={() => onDelete(u.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="ลบ">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {staffUsers.length === 0 && <div className="text-center py-16 text-gray-400">ไม่พบเจ้าหน้าที่</div>}
      </div>

      {/* Staff Detail Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setViewingStaff(null)}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40] font-bold text-xl">
                  {viewingStaff.first_name[0]}{viewingStaff.last_name[0]}
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold">{viewingStaff.first_name} {viewingStaff.last_name}</h3>
                  <p className="text-sm text-gray-400">{viewingStaff.position} • {viewingStaff.department_name}</p>
                </div>
              </div>
              <button onClick={() => setViewingStaff(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">ประวัติการได้รับมอบหมายงาน</h4>
              <div className="space-y-3">
                {(staffTasks[viewingStaff.id] || []).map((t) => (
                  <div key={t.id} className="p-4 rounded-2xl border border-gray-100 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{t.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColor[t.status]}`}>{statusLabel[t.status]}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>กำหนดส่ง: {formatDate(t.due_date)}</span>
                      <span>ความคืบหน้า: {t.progress}%</span>
                      <span className={`font-bold ${priorityColor[t.priority]} px-1.5 py-0.5 rounded`}>{priorityLabel[t.priority]}</span>
                    </div>
                  </div>
                ))}
                {(!staffTasks[viewingStaff.id] || staffTasks[viewingStaff.id].length === 0) && (
                  <p className="text-center text-gray-400 py-8">ยังไม่มีงานที่ได้รับมอบหมาย</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
