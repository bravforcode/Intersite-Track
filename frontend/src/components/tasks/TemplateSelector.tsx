import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, LayoutTemplate, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { templateService, type ApplyPreview } from "../../services/templateService";
import type { TaskTemplate } from "../../services/templateService";
import { TemplatePlaceholderForm } from "./TemplatePlaceholderForm";

interface Props {
  /** Called when the user confirms applying. Returns the preview payload. */
  onApply: (preview: ApplyPreview, templateId: string, version: number) => void;
  /** Whether the form currently has dirty (user-edited) fields */
  isDirty?: boolean;
}

export function TemplateSelector({ onApply, isDirty = false }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selected, setSelected] = useState<TaskTemplate | null>(null);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [showDirtyWarning, setShowDirtyWarning] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<TaskTemplate | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load templates on mount
  useEffect(() => {
    (async () => {
      try {
        setLoadingTemplates(true);
        const data = await templateService.getTemplates();
        setTemplates(data.filter((t) => t.status === "active"));
      } catch {
        // Silently fail — manual creation still available
      } finally {
        setLoadingTemplates(false);
      }
    })();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = templates.filter((t) =>
    `${t.name} ${t.category ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (tpl: TaskTemplate) => {
    setOpen(false);
    setSearch("");
    if (isDirty) {
      setPendingTemplate(tpl);
      setShowDirtyWarning(true);
    } else {
      confirmSelect(tpl);
    }
  };

  const confirmSelect = (tpl: TaskTemplate) => {
    setSelected(tpl);
    setShowDirtyWarning(false);
    setPendingTemplate(null);
    setShowPlaceholders(true);
  };

  const handleClear = () => {
    setSelected(null);
    setShowPlaceholders(false);
  };

  const handlePlaceholderApply = (preview: ApplyPreview, version: number) => {
    if (selected) {
      onApply(preview, selected.id, version);
      setShowPlaceholders(false);
    }
  };

  if (templates.length === 0 && !loadingTemplates) return null;

  return (
    <div className="relative">
      {/* Selector bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors ${
              selected
                ? "border-[#5A5A40] bg-[#5A5A40]/5 text-[#5A5A40]"
                : "border-dashed border-gray-300 text-gray-400 hover:border-[#5A5A40]/50"
            }`}
          >
            <LayoutTemplate size={16} />
            <span className="flex-1 text-left truncate">
              {selected ? selected.name : "เลือก Template (ไม่บังคับ)"}
            </span>
            {selected ? (
              <X
                size={15}
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="cursor-pointer hover:text-red-500"
              />
            ) : (
              <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            )}
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute z-50 top-full mt-1 left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
              >
                {/* Search */}
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
                    <Search size={14} className="text-gray-400 flex-shrink-0" />
                    <input
                      autoFocus
                      className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                      placeholder="ค้นหา template..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* List */}
                <div className="max-h-52 overflow-y-auto py-1">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-center py-6 text-gray-400">ไม่พบ Template</p>
                  ) : (
                    filtered.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleSelect(tpl)}
                        className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-[#5A5A40]/5 transition-colors"
                      >
                        <LayoutTemplate size={15} className="text-[#5A5A40] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{tpl.name}</p>
                          <p className="text-xs text-gray-400">
                            {tpl.category && <span>{tpl.category} · </span>}
                            v{tpl.current_version}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Dirty Warning Modal */}
      <AnimatePresence>
        {showDirtyWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4"
            >
              <h3 className="font-bold text-sm mb-2">แทนที่ข้อมูลที่กรอกแล้ว?</h3>
              <p className="text-xs text-gray-500 mb-4">
                การเลือก Template จะแทนที่ข้อมูลที่คุณกรอกไว้ในฟอร์ม ยืนยันหรือไม่?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDirtyWarning(false); setPendingTemplate(null); }}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => pendingTemplate && confirmSelect(pendingTemplate)}
                  className="flex-1 px-4 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-medium hover:bg-[#4A4A30]"
                >
                  ยืนยัน
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Placeholder Form */}
      {showPlaceholders && selected && (
        <TemplatePlaceholderForm
          template={selected}
          onApply={handlePlaceholderApply}
          onCancel={handleClear}
        />
      )}
    </div>
  );
}
