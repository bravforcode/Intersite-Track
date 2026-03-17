import React, { useState, useEffect } from "react";
import { X, Edit3, Calendar, ClipboardList, ListChecks, Square, CheckSquare, ImagePlus } from "lucide-react";
import { motion } from "motion/react";
import { taskService } from "../../services/taskService";
import { formatDate, formatDateTime } from "../../utils/formatters";
import { priorityLabel, priorityColor, statusLabel, statusDot } from "../../utils/constants";
import type { Task, User, TaskType, TaskUpdate, ChecklistItem } from "../../types";

interface TaskDetailModalProps {
  task: Task;
  user: User;
  taskTypes: TaskType[];
  onClose: () => void;
  onUpdate: () => void;
  onEdit: (task: Task) => void;
}

export function TaskDetailModal({ task, user, taskTypes, onClose, onUpdate, onEdit }: TaskDetailModalProps) {
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [newUpdate, setNewUpdate] = useState({ text: "", progress: task.progress });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taskChecklist, setTaskChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => { fetchUpdates(); fetchChecklist(); }, [task.id]);

  const fetchChecklist = async () => {
    try {
      const rows = await taskService.getChecklists(task.id) as any[];
      const parents = rows.filter((r) => !r.parent_id);
      const items: ChecklistItem[] = parents.map((p) => ({
        title: p.title, is_checked: !!p.is_checked, sort_order: p.sort_order,
        children: rows.filter((c) => c.parent_id === p.id).map((c) => ({
          title: c.title, is_checked: !!c.is_checked, sort_order: c.sort_order,
        })),
      }));
      setTaskChecklist(items);
    } catch {}
  };

  const allCheckItems = taskChecklist.flatMap((i) => [i, ...i.children]);
  const checkTotal = allCheckItems.length;
  const checkChecked = allCheckItems.filter((i) => i.is_checked).length;
  const checklistProgress = checkTotal > 0 ? Math.round((checkChecked / checkTotal) * 100) : task.progress;

  const toggleChecklistItem = async (parentIdx: number, childIdx?: number) => {
    const c = [...taskChecklist];
    if (childIdx !== undefined) {
      c[parentIdx].children[childIdx].is_checked = !c[parentIdx].children[childIdx].is_checked;
    } else {
      c[parentIdx].is_checked = !c[parentIdx].is_checked;
    }
    setTaskChecklist(c);
    await taskService.saveChecklists(task.id, c);
    onUpdate();
  };

  const fetchUpdates = async () => {
    try { setUpdates(await taskService.getUpdates(task.id)); } catch {}
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let attachUrl: string | undefined;
      if (imageFile) {
        setUploading(true);
        attachUrl = await taskService.uploadImage(imageFile);
        setUploading(false);
      }
      await taskService.addUpdate(task.id, {
        user_id: user.id, update_text: newUpdate.text, progress: task.progress, attachment_url: attachUrl,
      });
      setNewUpdate({ text: "", progress: newUpdate.progress });
      setImageFile(null);
      setImagePreview(null);
      fetchUpdates();
      onUpdate();
    } catch {} finally { setSaving(false); setUploading(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    const progress = newStatus === "completed" ? 100 : task.progress;
    await taskService.updateStatus(task.id, newStatus, progress);
    onUpdate();
    onClose();
  };

  const taskType = taskTypes.find((t) => t.id === task.task_type_id);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.status === "completed" ? "bg-emerald-100 text-emerald-600" : "bg-[#F5F5F0] text-[#5A5A40]"}`}>
              <ClipboardList size={20} />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold">{task.title}</h3>
              <p className="text-xs text-gray-400">สร้างโดย {task.creator_name} • {formatDateTime(task.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user.role === "admin" && (
              <button onClick={() => onEdit(task)} className="p-2 text-gray-400 hover:text-[#5A5A40] transition-colors" title="แก้ไข">
                <Edit3 size={20} />
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">รายละเอียด</h4>
              <p className="text-gray-700 leading-relaxed">{task.description || "ไม่มีรายละเอียด"}</p>
            </section>

            {taskChecklist.length > 0 && (
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                  <ListChecks size={14} /> Checklist หัวข้อทำงาน
                </h4>
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-3">
                  {taskChecklist.map((item, idx) => {
                    const totalChildren = item.children.length;
                    const checkedChildren = item.children.filter((c) => c.is_checked).length;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => toggleChecklistItem(idx)}>
                          {item.is_checked ? <CheckSquare size={18} className="text-emerald-500 flex-shrink-0" /> : <Square size={18} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />}
                          <span className={`text-sm font-bold ${item.is_checked ? "text-gray-400 line-through" : "text-gray-800"}`}>{idx + 1}. {item.title}</span>
                          {totalChildren > 0 && <span className="text-[10px] font-bold text-gray-400 ml-auto">{checkedChildren}/{totalChildren}</span>}
                        </div>
                        {item.children.map((child, ci) => (
                          <div key={ci} className="flex items-center gap-2 ml-7 group cursor-pointer" onClick={() => toggleChecklistItem(idx, ci)}>
                            {child.is_checked ? <CheckSquare size={16} className="text-emerald-500 flex-shrink-0" /> : <Square size={16} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />}
                            <span className={`text-sm ${child.is_checked ? "text-gray-400 line-through" : "text-gray-600"}`}>{idx + 1}.{ci + 1} {child.title}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {(() => {
                    const all = taskChecklist.flatMap((i) => [i, ...i.children]);
                    const total = all.length;
                    const checked = all.filter((i) => i.is_checked).length;
                    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
                    return (
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-400 font-medium">ความคืบหน้า Checklist</span>
                          <span className="font-bold text-gray-700">{checked}/{total} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </section>
            )}

            {user.role === "admin" && task.status !== "completed" && task.status !== "cancelled" && (
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">เปลี่ยนสถานะ</h4>
                <div className="flex gap-2">
                  {task.status !== "in_progress" && (
                    <button onClick={() => handleStatusChange("in_progress")} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-200">กำลังดำเนินการ</button>
                  )}
                  <button onClick={() => handleStatusChange("completed")} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-200">เสร็จสิ้น</button>
                  <button onClick={() => handleStatusChange("cancelled")} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-medium hover:bg-red-200">ยกเลิก</button>
                </div>
              </section>
            )}

            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">อัปเดตความคืบหน้า</h4>
              <form onSubmit={handleSubmitUpdate} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6">
                <textarea className="w-full bg-white px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none h-20 resize-none text-sm mb-3"
                  placeholder="บันทึกความคืบหน้า..." value={newUpdate.text}
                  onChange={(e) => setNewUpdate({ ...newUpdate, text: e.target.value })} required />
                <div className="mb-3">
                  <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 bg-white rounded-xl border border-gray-200 hover:border-[#5A5A40] transition-colors text-sm text-gray-500">
                    <ImagePlus size={16} />
                    <span>{imageFile ? imageFile.name : "แนบรูปภาพ (ถ้ามี)"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setImageFile(f);
                      if (f) { const r = new FileReader(); r.onload = (ev) => setImagePreview(ev.target?.result as string); r.readAsDataURL(f); }
                      else setImagePreview(null);
                    }} />
                  </label>
                  {imagePreview && (
                    <div className="relative mt-2 inline-block">
                      <img src={imagePreview} alt="preview" className="max-h-32 rounded-xl border border-gray-200" />
                      <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end">
                  <button disabled={saving || uploading} className="bg-[#5A5A40] text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-[#4A4A30] disabled:opacity-50">
                    {uploading ? "กำลังอัปโหลด..." : saving ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </form>

              <div className="space-y-6">
                {updates.map((update) => (
                  <div key={update.id} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#F5F5F0] flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-[#5A5A40]">
                      {update.first_name[0]}{update.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold">{update.first_name} {update.last_name}</p>
                        <p className="text-[10px] text-gray-400">{formatDateTime(update.created_at)}</p>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-sm text-gray-600">{update.update_text}</p>
                        {update.attachment_url && (
                          <div className="mt-2">
                            <img src={update.attachment_url} alt="แนบรูปภาพ" className="max-h-48 rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(update.attachment_url, "_blank")} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {updates.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">ยังไม่มีการอัปเดต</p>}
              </div>
            </section>
          </div>

          {/* Right Info Panel */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">สถานะ</h4>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusDot[task.status]}`} />
                  <span className="text-sm font-bold">{statusLabel[task.status]}</span>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">ระดับความสำคัญ</h4>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${priorityColor[task.priority]}`}>{priorityLabel[task.priority]}</span>
              </div>
              {taskType && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">ประเภทงาน</h4>
                  <span className="text-sm font-medium text-gray-700">{taskType.name}</span>
                </div>
              )}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">กำหนดส่ง</h4>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Calendar size={16} className="text-gray-400" />
                  {formatDate(task.due_date)}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">ผู้รับผิดชอบ</h4>
                <div className="space-y-2">
                  {task.assignments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200">
                      <div className="w-6 h-6 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[10px] font-bold text-[#5A5A40]">{a.first_name[0]}{a.last_name[0]}</div>
                      <span className="text-xs font-medium">{a.first_name} {a.last_name}</span>
                    </div>
                  ))}
                  {task.assignments.length === 0 && <p className="text-xs text-gray-400">ยังไม่ได้มอบหมาย</p>}
                </div>
              </div>
            </div>

            <div className="bg-[#5A5A40] p-6 rounded-3xl text-white shadow-lg shadow-[#5A5A40]/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-4">ความคืบหน้ารวม</h4>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-serif font-bold">{checklistProgress}%</span>
                <span className="text-xs text-white/60 mb-1">สำเร็จ</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${checklistProgress}%` }} className="h-full bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
