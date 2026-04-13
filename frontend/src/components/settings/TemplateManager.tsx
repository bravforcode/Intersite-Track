import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Archive,
  RotateCcw,
  Eye,
  Edit3,
  LayoutTemplate,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { templateService } from "../../services/templateService";
import type { TaskTemplate } from "../../services/templateService";
import { TemplateEditorModal } from "./TemplateEditorModal";

const STATUS_CONFIG = {
  active: {
    label: "ใช้งาน",
    color: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle size={12} />,
  },
  draft: {
    label: "ร่าง",
    color: "bg-amber-100 text-amber-700",
    icon: <Clock size={12} />,
  },
  archived: {
    label: "เก็บถาวร",
    color: "bg-gray-100 text-gray-500",
    icon: <Archive size={12} />,
  },
};

interface Props {
  isAdmin: boolean;
}

export function TemplateManager({ isAdmin }: Props) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await templateService.getTemplates();
      setTemplates(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleArchive = async (id: string) => {
    if (!confirm("ยืนยันการเก็บถาวร Template นี้?")) return;
    setActionLoading(id);
    try {
      await templateService.archiveTemplate(id);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (id: string) => {
    setActionLoading(id);
    try {
      await templateService.restoreTemplate(id);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider app-soft">
            แม่แบบงาน (Task Templates)
          </h4>
          <p className="text-xs app-muted mt-0.5">
            {templates.length} template · {templates.filter((t) => t.status === "active").length} ใช้งานอยู่
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingTemplate(null); setShowEditor(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-medium hover:bg-[#4A4A30] transition-colors"
          >
            <Plus size={16} />
            สร้าง Template
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Template List */}
      <AnimatePresence>
        {templates.length === 0 ? (
          <div className="text-center py-16 app-surface rounded-2xl">
            <LayoutTemplate size={40} className="mx-auto mb-3 app-soft opacity-40" />
            <p className="app-soft text-sm">ยังไม่มี Template</p>
            <p className="app-muted text-xs mt-1">เริ่มสร้าง Template แรกของคุณ</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((tpl) => {
              const status = STATUS_CONFIG[tpl.status] ?? STATUS_CONFIG.draft;
              return (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${
                    tpl.status === "archived"
                      ? "border-gray-100 bg-gray-50 opacity-60"
                      : "border-gray-100 app-surface hover:border-[#5A5A40]/20"
                  }`}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-[#5A5A40]/10 flex items-center justify-center flex-shrink-0">
                    <LayoutTemplate size={18} className="text-[#5A5A40]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm app-heading truncate">{tpl.name}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs app-soft mt-0.5">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{tpl.key}</code>
                      {tpl.category && <span className="ml-2">· {tpl.category}</span>}
                      <span className="ml-2">· v{tpl.current_version}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {tpl.status !== "archived" && (
                        <>
                          <button
                            title="แก้ไข"
                            onClick={() => { setEditingTemplate(tpl); setShowEditor(true); }}
                            className="p-2 rounded-lg hover:bg-[#5A5A40]/10 transition-colors app-soft hover:text-[#5A5A40]"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            title="เก็บถาวร"
                            onClick={() => handleArchive(tpl.id)}
                            disabled={actionLoading === tpl.id}
                            className="p-2 rounded-lg hover:bg-amber-50 transition-colors app-soft hover:text-amber-600"
                          >
                            <Archive size={15} />
                          </button>
                        </>
                      )}
                      {tpl.status === "archived" && (
                        <button
                          title="กู้คืน"
                          onClick={() => handleRestore(tpl.id)}
                          disabled={actionLoading === tpl.id}
                          className="p-2 rounded-lg hover:bg-emerald-50 transition-colors app-soft hover:text-emerald-600"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                      <button
                        title="ดูรายละเอียด"
                        className="p-2 rounded-lg hover:bg-blue-50 transition-colors app-soft hover:text-blue-600"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Editor Modal */}
      {showEditor && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); load(); }}
        />
      )}
    </div>
  );
}
