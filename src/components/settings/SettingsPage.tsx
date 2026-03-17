import React, { useState } from "react";
import { Plus, Edit3, Trash2, X, CheckCircle2, Settings, Tag, ArrowLeftRight, FileText } from "lucide-react";
import { motion } from "motion/react";
import { userService } from "../../services/userService";
import { taskTypeService } from "../../services/taskTypeService";
import TrelloSettings from "./TrelloSettings";
import TrelloSyncLogs from "./TrelloSyncLogs";
import type { Department, TaskType, User } from "../../types";

interface SettingsPageProps {
  departments: Department[];
  taskTypes: TaskType[];
  users: User[];
  onRefresh: () => void;
}

export function SettingsPage({ departments, taskTypes, users, onRefresh }: SettingsPageProps) {
  const [tab, setTab] = useState<"departments" | "taskTypes" | "trello" | "trelloLogs">("departments");
  const [newDeptName, setNewDeptName] = useState("");
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [newTypeName, setNewTypeName] = useState("");
  const [editingType, setEditingType] = useState<TaskType | null>(null);
  const [error, setError] = useState("");

  const handleAddDept = async () => {
    if (!newDeptName.trim()) return;
    try { await userService.createDepartment(newDeptName.trim()); setNewDeptName(""); setError(""); onRefresh(); }
    catch (e: any) { setError(e.message); }
  };

  const handleEditDept = async () => {
    if (!editingDept) return;
    try { await userService.updateDepartment(editingDept.id, editingDept.name); setEditingDept(null); setError(""); onRefresh(); }
    catch (e: any) { setError(e.message); }
  };

  const handleDeleteDept = async (id: number) => {
    try { await userService.deleteDepartment(id); setError(""); onRefresh(); }
    catch (e: any) { setError(e.message); }
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    try { await taskTypeService.createTaskType(newTypeName.trim()); setNewTypeName(""); setError(""); onRefresh(); }
    catch (e: any) { setError(e.message); }
  };

  const handleEditType = async () => {
    if (!editingType) return;
    try { await taskTypeService.updateTaskType(editingType.id, editingType.name); setEditingType(null); setError(""); onRefresh(); }
    catch (e: any) { setError(e.message); }
  };

  const handleDeleteType = async (id: number) => {
    try { await taskTypeService.deleteTaskType(id); setError(""); onRefresh(); }
    catch (e: any) { setError(e.message); }
  };

  const tabBtn = (key: typeof tab, icon: React.ReactNode, label: string) => (
    <button onClick={() => setTab(key)}
      className={`px-6 py-2 rounded-xl text-sm font-medium transition-colors ${tab === key ? "bg-[#5A5A40] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
      {icon} {label}
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {tabBtn("departments", <Settings size={16} className="inline mr-2" />, "หน่วยงาน")}
        {tabBtn("taskTypes", <Tag size={16} className="inline mr-2" />, "ประเภทงาน")}
        {tabBtn("trello", <ArrowLeftRight size={16} className="inline mr-2" />, "Trello")}
        {tabBtn("trelloLogs", <FileText size={16} className="inline mr-2" />, "Sync Logs")}
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

      {tab === "departments" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">จัดการหน่วยงาน</h4>
          <div className="flex gap-3 mb-6">
            <input type="text" placeholder="ชื่อหน่วยงานใหม่..."
              className="flex-1 px-4 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[#5A5A40] outline-none"
              value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDept()} />
            <button onClick={handleAddDept} className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-medium hover:bg-[#4A4A30]">
              <Plus size={16} className="inline mr-1" />เพิ่ม
            </button>
          </div>
          <div className="space-y-2">
            {departments.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-gray-100">
                {editingDept?.id === d.id ? (
                  <input type="text" className="flex-1 px-3 py-1 rounded-lg border border-[#5A5A40] text-sm outline-none mr-3"
                    value={editingDept.name} onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleEditDept()} autoFocus />
                ) : (
                  <span className="text-sm font-medium text-gray-700">{d.name}</span>
                )}
                <div className="flex items-center gap-1">
                  {editingDept?.id === d.id ? (
                    <>
                      <button onClick={handleEditDept} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={16} /></button>
                      <button onClick={() => setEditingDept(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingDept(d)} className="p-1.5 text-gray-400 hover:text-[#5A5A40] hover:bg-gray-100 rounded-lg"><Edit3 size={14} /></button>
                      <button onClick={() => handleDeleteDept(d.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "taskTypes" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">จัดการประเภทงาน</h4>
          <div className="flex gap-3 mb-6">
            <input type="text" placeholder="ชื่อประเภทงานใหม่..."
              className="flex-1 px-4 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[#5A5A40] outline-none"
              value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddType()} />
            <button onClick={handleAddType} className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-medium hover:bg-[#4A4A30]">
              <Plus size={16} className="inline mr-1" />เพิ่ม
            </button>
          </div>
          <div className="space-y-2">
            {taskTypes.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-gray-100">
                {editingType?.id === t.id ? (
                  <input type="text" className="flex-1 px-3 py-1 rounded-lg border border-[#5A5A40] text-sm outline-none mr-3"
                    value={editingType.name} onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleEditType()} autoFocus />
                ) : (
                  <span className="text-sm font-medium text-gray-700">{t.name}</span>
                )}
                <div className="flex items-center gap-1">
                  {editingType?.id === t.id ? (
                    <>
                      <button onClick={handleEditType} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={16} /></button>
                      <button onClick={() => setEditingType(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingType(t)} className="p-1.5 text-gray-400 hover:text-[#5A5A40] hover:bg-gray-100 rounded-lg"><Edit3 size={14} /></button>
                      <button onClick={() => handleDeleteType(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "trello" && <TrelloSettings systemUsers={users.filter((u) => u.role === "staff")} />}

      {tab === "trelloLogs" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">ประวัติการซิงค์ Trello</h4>
          <TrelloSyncLogs />
        </div>
      )}
    </motion.div>
  );
}
