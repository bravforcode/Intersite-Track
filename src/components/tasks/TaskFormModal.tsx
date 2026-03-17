import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, CornerDownRight, ListChecks } from "lucide-react";
import { motion } from "motion/react";
import { taskService } from "../../services/taskService";
import type { Task, User, TaskType, ChecklistItem } from "../../types";

interface TaskFormModalProps {
  task: Task | null;
  users: User[];
  taskTypes: TaskType[];
  currentUser: User;
  onClose: () => void;
  onSave: () => void;
}

export function TaskFormModal({ task, users, taskTypes, currentUser, onClose, onSave }: TaskFormModalProps) {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    task_type_id: task?.task_type_id ? String(task.task_type_id) : "",
    priority: task?.priority || "medium",
    status: task?.status || "pending",
    due_date: task?.due_date || "",
    assigned_user_ids: task?.assignments.map((a) => a.id) || [] as number[],
  });
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      taskService.getChecklists(task.id).then((rows) => {
        const parents = rows.filter((r: any) => !r.parent_id);
        const items: ChecklistItem[] = parents.map((p: any) => ({
          title: p.title,
          is_checked: !!p.is_checked,
          sort_order: p.sort_order,
          children: rows.filter((c: any) => c.parent_id === p.id).map((c: any) => ({
            title: c.title, is_checked: !!c.is_checked, sort_order: c.sort_order,
          })),
        }));
        setChecklist(items);
      }).catch(() => {});
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let taskId = task?.id;
      const payload = {
        title: form.title,
        description: form.description,
        task_type_id: form.task_type_id ? Number(form.task_type_id) : null,
        priority: form.priority as any,
        status: form.status as any,
        due_date: form.due_date,
        assigned_user_ids: form.assigned_user_ids,
      };
      if (task) {
        await taskService.updateTask(task.id, payload);
      } else {
        const result = await taskService.createTask({ ...payload, created_by: currentUser.id });
        taskId = result.id;
      }
      if (taskId && checklist.length > 0) {
        await taskService.saveChecklists(taskId, checklist);
      }
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignee = (id: number, checked: boolean) => {
    setForm((f) => ({
      ...f,
      assigned_user_ids: checked ? [...f.assigned_user_ids, id] : f.assigned_user_ids.filter((x) => x !== id),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-xl font-serif font-bold">{task ? "แก้ไขงาน" : "สร้างงานใหม่"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
        {error && <div className="mx-6 mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ชื่องาน *</label>
              <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ประเภทงาน</label>
              <select className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={form.task_type_id} onChange={(e) => setForm({ ...form, task_type_id: e.target.value })}>
                <option value="">-- เลือก --</option>
                {taskTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ระดับความสำคัญ</label>
              <select className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as "low" | "medium" | "high" | "urgent" })}>
                <option value="low">ต่ำ</option>
                <option value="medium">ปานกลาง</option>
                <option value="high">สูง</option>
                <option value="urgent">เร่งด่วน</option>
              </select>
            </div>
            {task && (
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">สถานะ</label>
                <select className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                  value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "pending" | "in_progress" | "completed" | "cancelled" })}>
                  <option value="pending">รอดำเนินการ</option>
                  <option value="in_progress">กำลังดำเนินการ</option>
                  <option value="completed">เสร็จสิ้น</option>
                  <option value="cancelled">ยกเลิก</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">กำหนดส่ง *</label>
              <input type="date" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">รายละเอียด</label>
              <textarea className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none h-24 resize-none"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Checklist */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2 flex items-center gap-1">
                <ListChecks size={14} /> Checklist หัวข้อทำงาน
              </label>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-3">
                {checklist.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#5A5A40] w-6 text-center">{idx + 1}</span>
                      <input type="text" className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#5A5A40] outline-none"
                        placeholder={`หัวข้อหลัก ${idx + 1}`} value={item.title}
                        onChange={(e) => { const c = [...checklist]; c[idx] = { ...c[idx], title: e.target.value }; setChecklist(c); }} />
                      <button type="button" onClick={() => { const c = [...checklist]; c[idx].children.push({ title: "", is_checked: false, sort_order: c[idx].children.length }); setChecklist([...c]); }}
                        className="p-1 text-[#5A5A40] hover:bg-[#5A5A40]/10 rounded-lg" title="เพิ่มหัวข้อย่อย">
                        <CornerDownRight size={14} />
                      </button>
                      <button type="button" onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}
                        className="p-1 text-red-400 hover:bg-red-50 rounded-lg" title="ลบ">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {item.children.map((child, ci) => (
                      <div key={ci} className="flex items-center gap-2 ml-8">
                        <span className="text-xs text-gray-400 w-8 text-center">{idx + 1}.{ci + 1}</span>
                        <input type="text" className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#5A5A40] outline-none"
                          placeholder={`หัวข้อย่อย ${idx + 1}.${ci + 1}`} value={child.title}
                          onChange={(e) => { const c = [...checklist]; c[idx].children[ci] = { ...c[idx].children[ci], title: e.target.value }; setChecklist([...c]); }} />
                        <button type="button" onClick={() => { const c = [...checklist]; c[idx].children = c[idx].children.filter((_, i) => i !== ci); setChecklist([...c]); }}
                          className="p-1 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                ))}
                <button type="button" onClick={() => setChecklist([...checklist, { title: "", is_checked: false, sort_order: checklist.length, children: [] }])}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#5A5A40] hover:bg-[#5A5A40]/10 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={14} /> เพิ่มหัวข้อหลัก
                </button>
              </div>
            </div>

            {/* Assignees */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">มอบหมายให้</label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 max-h-32 overflow-y-auto">
                {users.filter((u) => u.role === "staff").map((u) => (
                  <label key={u.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 cursor-pointer hover:border-[#5A5A40] transition-colors">
                    <input type="checkbox" className="rounded text-[#5A5A40] focus:ring-[#5A5A40]"
                      checked={form.assigned_user_ids.includes(u.id)}
                      onChange={(e) => toggleAssignee(u.id, e.target.checked)} />
                    <span className="text-xs font-medium">{u.first_name} {u.last_name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">ยกเลิก</button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#4A4A30] disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : task ? "บันทึกการแก้ไข" : "สร้างงาน"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
