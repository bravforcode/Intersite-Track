import { useState, useEffect } from "react";
import { AlertTriangle, Eye, Check } from "lucide-react";
import { motion } from "motion/react";
import { templateService, type ApplyPreview } from "../../services/templateService";
import type { TaskTemplate, TaskTemplateVersion } from "../../services/templateService";

interface Props {
  template: TaskTemplate;
  onApply: (preview: ApplyPreview, version: number) => void;
  onCancel: () => void;
}

export function TemplatePlaceholderForm({ template, onApply, onCancel }: Props) {
  const [currentVersion, setCurrentVersion] = useState<TaskTemplateVersion | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ApplyPreview | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoadingVersion(true);
        const versions = await templateService.getVersions(template.id);
        const published = versions.find((v) => v.is_published) ?? null;
        setCurrentVersion(published);
        // Pre-fill defaults
        if (published) {
          const defaults: Record<string, string> = {};
          for (const ph of published.placeholders) {
            if (ph.default_value !== undefined && ph.default_value !== null) {
              defaults[ph.key] = String(ph.default_value);
            }
          }
          setInputs(defaults);
        }
      } catch (e: unknown) {
        setError("ไม่สามารถโหลด Version ได้");
      } finally {
        setLoadingVersion(false);
      }
    })();
  }, [template.id]);

  const handlePreview = async () => {
    if (!currentVersion) return;
    setPreviewing(true);
    try {
      const result = await templateService.previewApply(template.id, inputs);
      setPreview(result.preview);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Preview ล้มเหลว");
    } finally {
      setPreviewing(false);
    }
  };

  const handleApply = () => {
    if (preview && currentVersion) {
      onApply(preview, currentVersion.version);
    }
  };

  if (loadingVersion) {
    return (
      <div className="animate-pulse h-24 bg-gray-100 rounded-2xl" />
    );
  }

  if (!currentVersion) {
    return (
      <div className="bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-xl border border-amber-200 flex items-center gap-2">
        <AlertTriangle size={15} />
        Template นี้ยังไม่มี Version ที่ Publish แล้ว
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#5A5A40]/5 border border-[#5A5A40]/20 rounded-2xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]">
          กรอกข้อมูล Template: {template.name}
        </p>
        <span className="text-xs text-gray-400">v{currentVersion.version}</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {/* Placeholder Inputs */}
      {currentVersion.placeholders.length > 0 ? (
        <div className="space-y-2">
          {currentVersion.placeholders.map((ph) => (
            <div key={ph.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {ph.label}
                {ph.required && <span className="text-red-400 ml-0.5">*</span>}
                {ph.hint && (
                  <span className="text-gray-400 font-normal ml-1">— {ph.hint}</span>
                )}
              </label>
              {ph.type === "textarea" ? (
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none outline-none focus:border-[#5A5A40]"
                  value={inputs[ph.key] ?? ""}
                  onChange={(e) => setInputs((p) => ({ ...p, [ph.key]: e.target.value }))}
                />
              ) : ph.type === "select" && ph.options ? (
                <select
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#5A5A40]"
                  value={inputs[ph.key] ?? ""}
                  onChange={(e) => setInputs((p) => ({ ...p, [ph.key]: e.target.value }))}
                >
                  <option value="">เลือก...</option>
                  {ph.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={ph.type === "date" ? "date" : ph.type === "number" ? "number" : "text"}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#5A5A40]"
                  value={inputs[ph.key] ?? ""}
                  onChange={(e) => setInputs((p) => ({ ...p, [ph.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">ไม่มี Placeholder — กด Apply ได้เลย</p>
      )}

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-1">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Preview</p>
          <p className="text-sm font-semibold text-gray-800">{preview.rendered_title}</p>
          {preview.rendered_description && (
            <pre className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-3">
              {preview.rendered_description}
            </pre>
          )}
          {preview.warnings.length > 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle size={12} />
              {preview.warnings.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewing}
          className="px-4 py-2 rounded-xl border border-[#5A5A40] text-[#5A5A40] text-sm flex items-center gap-1 hover:bg-[#5A5A40]/5"
        >
          <Eye size={14} />
          Preview
        </button>
        <button
          type="button"
          onClick={preview ? handleApply : handlePreview}
          disabled={previewing}
          className="flex-1 px-4 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1 hover:bg-[#4A4A30]"
        >
          <Check size={14} />
          {preview ? "Apply" : "ดู Preview"}
        </button>
      </div>
    </motion.div>
  );
}
