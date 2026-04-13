import React, { useEffect, useState } from "react";
import {
  X,
  Edit3,
  Calendar,
  ClipboardList,
  ListChecks,
  Square,
  CheckSquare,
  ImagePlus,
  MessageSquare,
  History,
  AlertTriangle,
  Timer,
} from "lucide-react";
import { motion } from "motion/react";
import { TimeTracker } from "./TimeTracker";
import { taskService } from "../../services/taskService";
import { projectService } from "../../services/projectService";
import { taskTypeService } from "../../services/taskTypeService";
import { formatDate, formatDateTime } from "../../utils/formatters";
import { priorityLabel, priorityColor, statusLabel, statusDot } from "../../utils/constants";
import type {
  Task,
  User,
  TaskType,
  TaskUpdate,
  TaskComment,
  TaskActivity,
  ChecklistItem,
  Blocker,
} from "../../types";

interface TaskDetailModalProps {
  task: Task;
  user: User;
  onClose: () => void;
  onUpdate: () => void;
  onEdit: (task: Task) => void;
}

const ACTIVITY_LABELS: Record<string, string> = {
  CREATE: "สร้างงาน",
  UPDATE: "แก้ไขรายละเอียด",
  STATUS_CHANGE: "เปลี่ยนสถานะ",
  PROGRESS_UPDATE: "อัปเดตความคืบหน้า",
  CHECKLIST_TOGGLE: "ติ๊ก Checklist",
  CHECKLIST_UPDATE: "อัปเดต Checklist",
  COMMENT: "เพิ่มความคิดเห็น",
  DELETE: "ลบงาน",
};

export function TaskDetailModal({ task, user, onClose, onUpdate, onEdit }: TaskDetailModalProps) {
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [blockerDraft, setBlockerDraft] = useState("");
  const [blockerFormOpen, setBlockerFormOpen] = useState(false);
  const [blockerSaving, setBlockerSaving] = useState(false);
  const [resolvingBlockerId, setResolvingBlockerId] = useState<string | null>(null);
  const [blockerMessage, setBlockerMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [newUpdate, setNewUpdate] = useState({ text: "", progress: task.progress });
  const [newComment, setNewComment] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [taskChecklist, setTaskChecklist] = useState<ChecklistItem[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);

  useEffect(() => {
    setBlockerDraft("");
    setBlockerFormOpen(false);
    setBlockerMessage(null);
    void Promise.all([fetchUpdates(), fetchChecklist(), fetchComments(), fetchActivity(), fetchBlockers()]);
    void taskTypeService.getTaskTypes().then(setTaskTypes).catch(() => {});
  }, [task.id]);

  const fetchBlockers = async () => {
    try {
      const data = await taskService.getBlockers(task.id);
      setBlockers(data);
    } catch {}
  };

  const handleResolveBlocker = async (blockerId: string) => {
    try {
      setResolvingBlockerId(blockerId);
      await projectService.resolveBlocker(blockerId);
      setBlockerMessage({ type: "success", text: "ปลดล็อกปัญหาแล้ว" });
      await Promise.all([fetchBlockers(), fetchActivity(), onUpdate()]);
    } catch {
      setBlockerMessage({ type: "error", text: "ไม่สามารถปลดล็อกปัญหาได้ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setResolvingBlockerId(null);
    }
  };

  const openBlockerForm = () => {
    if (!task.project_id) {
      setBlockerMessage({ type: "error", text: "งานนี้ยังไม่ได้ผูกกับโปรเจกต์ จึงไม่สามารถสร้าง blocker ได้" });
      return;
    }
    setBlockerMessage(null);
    setBlockerFormOpen(true);
  };

  const handleAddBlocker = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!task.project_id) {
      setBlockerMessage({ type: "error", text: "งานนี้ยังไม่ได้ผูกกับโปรเจกต์ จึงไม่สามารถสร้าง blocker ได้" });
      return;
    }

    const description = blockerDraft.trim();
    if (!description) {
      setBlockerMessage({ type: "error", text: "กรุณาระบุปัญหาที่พบ" });
      return;
    }

    try {
      setBlockerSaving(true);
      await projectService.addBlocker(task.project_id, { task_id: task.id, description });
      setBlockerDraft("");
      setBlockerFormOpen(false);
      setBlockerMessage({ type: "success", text: "บันทึก blocker แล้ว" });
      await Promise.all([fetchBlockers(), fetchActivity(), onUpdate()]);
    } catch {
      setBlockerMessage({ type: "error", text: "ไม่สามารถบันทึก blocker ได้ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setBlockerSaving(false);
    }
  };

  const fetchChecklist = async () => {
    try {
      const rows = await taskService.getChecklists(task.id);
      const parents = rows.filter((r) => !r.parent_id);
      const items: ChecklistItem[] = parents.map((p) => ({
        id: p.id,
        title: p.title,
        is_checked: !!p.is_checked,
        sort_order: p.sort_order,
        checked_by: p.checked_by ?? null,
        checked_at: p.checked_at ?? null,
        checked_by_name: p.checked_by_name ?? null,
        children: rows.filter((c) => c.parent_id === p.id).map((c) => ({
          id: c.id,
          title: c.title,
          is_checked: !!c.is_checked,
          sort_order: c.sort_order,
          checked_by: c.checked_by ?? null,
          checked_at: c.checked_at ?? null,
          checked_by_name: c.checked_by_name ?? null,
        })),
      }));
      setTaskChecklist(items);
    } catch {}
  };

  const fetchUpdates = async () => {
    try {
      setUpdates(await taskService.getUpdates(task.id));
    } catch {}
  };

  const fetchComments = async () => {
    try {
      setComments(await taskService.getComments(task.id));
    } catch {}
  };

  const fetchActivity = async () => {
    try {
      setActivity(await taskService.getActivity(task.id));
    } catch {}
  };

  const allCheckItems = taskChecklist.flatMap((item) => (
    item.children.length > 0 ? item.children : [item]
  ));
  const checkTotal = allCheckItems.length;
  const checkChecked = allCheckItems.filter((item) => item.is_checked).length;
  const checklistProgress = taskChecklist.length > 0
    ? (checkTotal > 0 ? Math.round((checkChecked / checkTotal) * 100) : 0)
    : task.progress;
  const displayTaskStatus = task.status === "cancelled"
    ? "cancelled"
    : checkTotal > 0
      ? (checklistProgress >= 100 ? "completed" : checklistProgress > 0 ? "in_progress" : "pending")
      : task.status;

  const toggleChecklistItem = async (parentIdx: number, childIdx?: number) => {
    const parent = taskChecklist[parentIdx];
    const target = childIdx !== undefined ? parent.children[childIdx] : parent;

    if (!target?.id) return;

    try {
      await taskService.toggleChecklist(task.id, target.id);
      await Promise.all([fetchChecklist(), fetchActivity(), onUpdate()]);
    } catch {
      // Error state is surfaced by the API layer and guarded by user feedback upstream.
    }
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const progressForUpdate = taskChecklist.length > 0 ? checklistProgress : newUpdate.progress;
      let attachUrl: string | undefined;
      if (imageFile) {
        setUploading(true);
        attachUrl = await taskService.uploadImage(imageFile);
        setUploading(false);
      }

      await taskService.addUpdate(task.id, {
        user_id: user.id,
        update_text: newUpdate.text,
        progress: progressForUpdate,
        attachment_url: attachUrl,
      });

      setNewUpdate({ text: "", progress: progressForUpdate });
      setImageFile(null);
      setImagePreview(null);

      await Promise.all([fetchUpdates(), fetchActivity(), onUpdate()]);
    } catch {
      // Error state is surfaced by the API layer and guarded by button states.
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentSaving(true);
    try {
      await taskService.addComment(task.id, newComment.trim());
      setNewComment("");
      await Promise.all([fetchComments(), fetchActivity()]);
    } catch {
      // Error state is surfaced by the API layer and guarded by button states.
    } finally {
      setCommentSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const progress = newStatus === "completed" ? 100 : checklistProgress;
    await taskService.updateStatus(task.id, newStatus, progress);
    await onUpdate();
    onClose();
  };

  const taskType = taskTypes.find((t) => t.id === task.task_type_id);

  const renderChecklistMeta = (item: { is_checked: boolean; checked_by_name?: string | null; checked_at?: string | null }) => {
    if (!item.is_checked || !item.checked_by_name) return null;

    const parts = item.checked_by_name.trim().split(/\s+/);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";

    return (
      <div className="ml-auto flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] text-emerald-700">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 font-bold">
          {initials}
        </span>
        <span className="font-semibold">{item.checked_by_name}</span>
        {item.checked_at && <span className="text-emerald-600/80">{formatDateTime(item.checked_at)}</span>}
      </div>
    );
  };

  const renderActivityDetail = (entry: TaskActivity) => {
    const nextData = entry.new_data ?? {};
    const prevData = entry.old_data ?? {};

    if (entry.action === "STATUS_CHANGE") {
      const from = typeof prevData.status === "string" ? statusLabel[prevData.status as keyof typeof statusLabel] ?? prevData.status : "ไม่ระบุ";
      const to = typeof nextData.status === "string" ? statusLabel[nextData.status as keyof typeof statusLabel] ?? nextData.status : "ไม่ระบุ";
      return `${from} -> ${to}`;
    }

    if (entry.action === "PROGRESS_UPDATE") {
      return `ความคืบหน้า ${typeof nextData.progress === "number" ? nextData.progress : 0}%`;
    }

    if (entry.action === "CHECKLIST_TOGGLE") {
      const label = typeof nextData.display_label === "string"
        ? nextData.display_label
        : typeof prevData.display_label === "string"
          ? prevData.display_label
          : "Checklist";
      const actor = typeof nextData.checked_by_name === "string" && nextData.checked_by_name
        ? nextData.checked_by_name
        : entry.user_name || "ผู้ใช้ในระบบ";

      if (nextData.is_checked === true) {
        const when = typeof nextData.checked_at === "string" ? formatDateTime(nextData.checked_at) : formatDateTime(entry.created_at);
        return `${label} ถูกติ๊กโดย ${actor} เวลา ${when}`;
      }

      return `${label} ถูกยกเลิกการติ๊กโดย ${actor}`;
    }

    if (entry.action === "CHECKLIST_UPDATE") {
      const count = typeof nextData.checkable_count === "number" ? nextData.checkable_count : 0;
      const progress = typeof nextData.progress === "number" ? nextData.progress : 0;
      return `ปรับรายการ checklist แล้ว เหลือรายการที่นับจริง ${count} ข้อ (${progress}%)`;
    }

    if (entry.action === "COMMENT") {
      return typeof nextData.message === "string" ? nextData.message : "เพิ่มความคิดเห็นในงาน";
    }

    if (entry.action === "UPDATE") {
      return "แก้ไขหัวข้อ รายละเอียด สถานะ หรือผู้รับผิดชอบ";
    }

    if (entry.action === "CREATE") {
      return "สร้างงานและบันทึกข้อมูลตั้งต้น";
    }

    if (entry.action === "DELETE") {
      return "ลบงานออกจากระบบ";
    }

    return "มีการเปลี่ยนแปลงข้อมูลของงาน";
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="app-surface rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${displayTaskStatus === "completed" ? "bg-emerald-100 text-emerald-600" : "bg-[#F5F5F0] text-[#5A5A40]"}`}>
              <ClipboardList size={20} />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold app-heading">{task.title}</h3>
              <p className="text-xs app-soft">สร้างโดย {task.creator_name} • {formatDateTime(task.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user.role === "admin" && (
              <button onClick={() => onEdit(task)} className="p-2 app-soft hover:text-[#5A5A40] transition-colors" title="แก้ไข">
                <Edit3 size={20} />
              </button>
            )}
            <button onClick={onClose} className="app-soft hover:text-[#1f1d16]"><X size={24} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_360px] gap-8">
          <div className="space-y-8">
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider app-soft mb-3">รายละเอียด</h4>
              <p className="app-muted leading-relaxed">{task.description || "ไม่มีรายละเอียด"}</p>
            </section>

            {taskChecklist.length > 0 && (
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider app-soft mb-3 flex items-center gap-1.5">
                  <ListChecks size={14} /> Checklist หัวข้อทำงาน
                </h4>
                <div className="app-surface-subtle rounded-2xl p-4 space-y-3">
                  {taskChecklist.map((item, idx) => {
                    const totalChildren = item.children.length;
                    const checkedChildren = item.children.filter((c) => c.is_checked).length;
                    const isGroup = totalChildren > 0;
                    const parentChecked = isGroup ? totalChildren > 0 && checkedChildren === totalChildren : item.is_checked;
                    return (
                      <div key={idx} className="space-y-1">
                        <div
                          className={`flex items-center gap-2 ${isGroup ? "" : "group cursor-pointer"}`}
                          onClick={isGroup ? undefined : () => toggleChecklistItem(idx)}
                        >
                          {parentChecked ? <CheckSquare size={18} className="text-emerald-500 shrink-0" /> : <Square size={18} className={`shrink-0 ${isGroup ? "text-gray-300" : "text-gray-300 group-hover:text-gray-500"}`} />}
                          <span className={`text-sm font-bold ${parentChecked && !isGroup ? "app-soft line-through" : "app-heading"}`}>{idx + 1}. {item.title}</span>
                          {isGroup ? (
                            <span className="text-[10px] font-bold app-soft ml-auto">{checkedChildren}/{totalChildren}</span>
                          ) : (
                            renderChecklistMeta(item)
                          )}
                        </div>
                        {item.children.map((child, ci) => (
                          <div key={ci} className="flex items-center gap-2 ml-7 group cursor-pointer" onClick={() => toggleChecklistItem(idx, ci)}>
                            {child.is_checked ? <CheckSquare size={16} className="text-emerald-500 shrink-0" /> : <Square size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />}
                            <span className={`text-sm ${child.is_checked ? "app-soft line-through" : "app-muted"}`}>{idx + 1}.{ci + 1} {child.title}</span>
                            {renderChecklistMeta(child)}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="app-soft font-medium">ความคืบหน้า Checklist</span>
                      <span className="font-bold app-heading">{checkChecked}/{checkTotal} ({checklistProgress}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${checklistProgress}%` }} />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {user.role === "admin" && displayTaskStatus !== "completed" && displayTaskStatus !== "cancelled" && (
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider app-soft mb-3">เปลี่ยนสถานะ</h4>
                <div className="flex gap-2 flex-wrap">
                  {displayTaskStatus !== "in_progress" && (
                    <button onClick={() => handleStatusChange("in_progress")} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-200">กำลังดำเนินการ</button>
                  )}
                  <button onClick={() => handleStatusChange("completed")} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-200">เสร็จสิ้น</button>
                  <button onClick={() => handleStatusChange("cancelled")} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-medium hover:bg-red-200">ยกเลิก</button>
                </div>
              </section>
            )}

            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider app-soft mb-4">อัปเดตความคืบหน้า</h4>
              <form onSubmit={handleSubmitUpdate} className="app-surface-subtle p-4 rounded-2xl mb-6">
                <textarea
                  className="w-full px-4 py-2 rounded-xl h-20 resize-none text-sm mb-3 app-field"
                  placeholder="บันทึกความคืบหน้า..."
                  value={newUpdate.text}
                  onChange={(e) => setNewUpdate({ ...newUpdate, text: e.target.value })}
                  required
                />
                <div className="mb-3">
                  <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 bg-white rounded-xl border border-gray-200 hover:border-[#5A5A40] transition-colors text-sm app-muted">
                    <ImagePlus size={16} />
                    <span>{imageFile ? imageFile.name : "แนบรูปภาพ (ถ้ามี)"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setImageFile(file);
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => setImagePreview(event.target?.result as string);
                          reader.readAsDataURL(file);
                        } else {
                          setImagePreview(null);
                        }
                      }}
                    />
                  </label>
                  {imagePreview && (
                    <div className="relative mt-2 inline-block">
                      <img src={imagePreview} alt="preview" className="max-h-32 rounded-xl border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
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
                    <div className="w-8 h-8 rounded-full bg-[#F5F5F0] shrink-0 flex items-center justify-center text-[10px] font-bold text-[#5A5A40]">
                      {update.first_name[0]}{update.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold app-heading">{update.first_name} {update.last_name}</p>
                        <p className="text-[10px] app-soft">{formatDateTime(update.created_at)}</p>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-sm app-muted whitespace-pre-wrap">{update.update_text}</p>
                        {update.attachment_url && (
                          <div className="mt-2">
                            <img
                              src={update.attachment_url}
                              alt="แนบรูปภาพ"
                              className="max-h-48 rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                // SECURITY: Files must be accessed through authenticated download endpoint
                                // The attachment_url should point to /api/files/:fileId/download
                                // to ensure only authorized users can access the file
                                if (update.attachment_url) {
                                  const link = document.createElement("a");
                                  link.href = update.attachment_url;
                                  link.target = "_blank";
                                  link.click();
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {updates.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">ยังไม่มีการอัปเดต</p>}
              </div>
            </section>

            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider app-soft mb-4 flex items-center gap-1.5">
                <MessageSquare size={14} /> ความคิดเห็นในงาน
              </h4>
              <form onSubmit={handleSubmitComment} className="app-surface-subtle p-4 rounded-2xl mb-6">
                <textarea
                  className="w-full px-4 py-2 rounded-xl h-20 resize-none text-sm mb-3 app-field"
                  placeholder="เขียนความคิดเห็นหรือโน้ตสำหรับทีม..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  required
                />
                <div className="flex items-center justify-end">
                  <button disabled={commentSaving} className="bg-[#5A5A40] text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-[#4A4A30] disabled:opacity-50">
                    {commentSaving ? "กำลังส่ง..." : "ส่งความคิดเห็น"}
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-sm font-bold app-heading">{comment.user_name || "ผู้ใช้ในระบบ"}</p>
                      <p className="text-[10px] app-soft">{formatDateTime(comment.created_at)}</p>
                    </div>
                    <p className="text-sm app-muted whitespace-pre-wrap">{comment.message}</p>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">ยังไม่มีความคิดเห็นในงานนี้</p>}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">สถานะ</h4>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusDot[displayTaskStatus]}`} />
                  <span className="text-sm font-bold">{statusLabel[displayTaskStatus]}</span>
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
              {task.sla_enabled && task.sla_status && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Service Level Agreement</h4>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold ${
                    task.sla_status === 'breached' ? 'bg-red-50 text-red-700 border-red-200' :
                    task.sla_status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {task.sla_status === 'breached' ? 'BREACHED' : task.sla_status === 'warning' ? 'WARNING' : 'ON TRACK'}
                    {task.sla_elapsed_business_days != null && task.sla_target_days != null && (
                      <span className="opacity-80 ml-1">
                        ({task.sla_elapsed_business_days}/{task.sla_target_days} วัน)
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">ผู้รับผิดชอบ</h4>
                <div className="space-y-2">
                  {task.assignments.map((assignee) => (
                    <div key={assignee.id} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200">
                      <div className="w-6 h-6 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[10px] font-bold text-[#5A5A40]">{assignee.first_name[0]}{assignee.last_name[0]}</div>
                      <span className="text-xs font-medium">{assignee.first_name} {assignee.last_name}</span>
                    </div>
                  ))}
                  {task.assignments.length === 0 && <p className="text-xs text-gray-400">ยังไม่ได้มอบหมาย</p>}
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-6 rounded-lg border border-red-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> ปัญหาที่ติดขัด (Blockers)
              </h4>
              {blockerMessage && (
                <div
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    blockerMessage.type === "error"
                      ? "border-red-200 bg-white text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                  role={blockerMessage.type === "error" ? "alert" : "status"}
                >
                  {blockerMessage.text}
                </div>
              )}
              <div className="space-y-3">
                {blockers.map((b) => (
                  <div key={b.id} className={`p-3 rounded-lg border ${b.status === 'active' ? 'bg-white border-red-200 shadow-sm' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-bold uppercase ${b.status === 'active' ? 'text-red-600' : 'text-gray-500'}`}>
                        {b.status === 'active' ? 'กำลังติดปัญหา' : 'แก้ไขแล้ว'}
                      </span>
                      <span className="text-[10px] text-gray-400">{formatDate(b.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-700 mb-2">{b.description}</p>
                    {b.status === 'active' && (
                      <button 
                        type="button"
                        onClick={() => void handleResolveBlocker(b.id)}
                        disabled={resolvingBlockerId === b.id}
                        className="min-h-9 rounded-lg px-2 text-[10px] text-red-600 font-bold hover:bg-red-50 disabled:opacity-50"
                      >
                        {resolvingBlockerId === b.id ? "กำลังปลดล็อก..." : "ปลดล็อกปัญหานี้"}
                      </button>
                    )}
                  </div>
                ))}
                {blockers.length === 0 && <p className="text-xs text-gray-400 italic">ไม่มีปัญหาที่ติดขัด</p>}
              </div>
              {blockerFormOpen ? (
                <form onSubmit={handleAddBlocker} className="space-y-3 rounded-lg border border-red-200 bg-white p-3">
                  <label className="block text-xs font-bold text-red-700" htmlFor="task-blocker-description">
                    รายละเอียดปัญหา
                  </label>
                  <textarea
                    id="task-blocker-description"
                    className="app-field h-24 w-full resize-none rounded-lg px-3 py-2 text-xs"
                    value={blockerDraft}
                    onChange={(event) => setBlockerDraft(event.target.value)}
                    placeholder="ระบุปัญหาที่ทำให้งานไปต่อไม่ได้"
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBlockerFormOpen(false);
                        setBlockerDraft("");
                      }}
                      className="min-h-10 rounded-lg px-3 text-xs font-bold text-gray-500 hover:bg-gray-100"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={blockerSaving}
                      className="min-h-10 rounded-lg bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {blockerSaving ? "กำลังบันทึก..." : "บันทึกปัญหา"}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={openBlockerForm}
                  className="w-full min-h-11 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                >
                  แจ้งปัญหาที่พบ
                </button>
              )}
            </div>

            <div className="bg-[#5A5A40] p-6 rounded-lg text-white shadow-lg shadow-[#5A5A40]/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-4">ความคืบหน้ารวม</h4>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-serif font-bold">{checklistProgress}%</span>
                <span className="text-xs text-white/60 mb-1">สำเร็จ</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${checklistProgress}%` }} className="h-full bg-white rounded-full" />
              </div>
            </div>

            <div className="app-surface-subtle rounded-lg p-5 border border-gray-100">
              <h4 className="text-xs font-bold uppercase tracking-wider app-soft mb-4 flex items-center gap-1.5">
                <Timer size={14} /> บันทึกเวลาทำงาน
              </h4>
              <TimeTracker taskId={task.id} currentUser={user} />
            </div>

            <div className="app-surface-subtle rounded-lg p-5 border border-gray-100">
              <h4 className="text-xs font-bold uppercase tracking-wider app-soft mb-4 flex items-center gap-1.5">
                <History size={14} /> ประวัติการเปลี่ยนแปลง
              </h4>
              <div className="space-y-3 max-h-90 overflow-y-auto pr-1">
                {activity.map((entry) => (
                  <div key={entry.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#F5F5F0] text-[#5A5A40]">
                        {ACTIVITY_LABELS[entry.action] || entry.action}
                      </span>
                      <span className="text-[10px] app-soft">{formatDateTime(entry.created_at)}</span>
                    </div>
                    <p className="text-sm font-medium app-heading mb-1">{entry.user_name || "System"}</p>
                    <p className="text-sm app-muted whitespace-pre-wrap">{renderActivityDetail(entry)}</p>
                  </div>
                ))}
                {activity.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">ยังไม่มีประวัติการเปลี่ยนแปลง</p>}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
