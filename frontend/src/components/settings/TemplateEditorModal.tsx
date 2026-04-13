import { useState } from "react";
import { X, Plus, Minus, Eye, Upload, AlertTriangle } from "lucide-react";
import { templateService, type CreateVersionPayload } from "../../services/templateService";
import type { TaskTemplate, TemplatePlaceholderDefinition } from "../../services/templateService";

interface Props {
  template: TaskTemplate | null; // null = create new
  onClose: () => void;
  onSaved: () => void;
}

const PLACEHOLDER_TYPES = [
  "text", "textarea", "date", "number", "select", "user", "task_type",
] as const;

const DEFAULT_VERSION: CreateVersionPayload = {
  defaults: {
    title_template: "",
    description_template: "",
    task_type_id: null,
    priority: null,
    tag_ids: [],
    estimated_hours: null,
    assignee_id: null,
    due_date_rule: { type: "none" },
    checklist_items: [],
  },
  placeholders: [],
  validation_rules: {},
  change_note: "",
};

export function TemplateEditorModal({ template, onClose, onSaved }: Props) {
  const isNew = !template;

  // Template meta state
  const [key, setKey] = useState(template?.key ?? "");
  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState(template?.category ?? "");
  const [internalDesc, setInternalDesc] = useState(template?.internal_description ?? "");

  // Version state
  const [version, setVersion] = useState<CreateVersionPayload>(DEFAULT_VERSION);
  const [step, setStep] = useState<"meta" | "defaults" | "placeholders" | "preview">("meta");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewInputs, setPreviewInputs] = useState<Record<string, string>>({});

  /** Detect placeholders from title/description templates */
  const detectPlaceholders = () => {
    const pattern = /\{\{([a-z][a-z0-9_]{1,49})\}\}/g;
    const text = `${version.defaults.title_template} ${version.defaults.description_template ?? ""}`;
    const keys = new Set<string>();
    let m: RegExpExecArray | null;
    const re = new RegExp(pattern.source, "g");
    while ((m = re.exec(text)) !== null) keys.add(m[1]!);

    // Add any new keys to placeholders list that don't already exist
    const existingKeys = new Set(version.placeholders.map((p) => p.key));
    const newDefs: TemplatePlaceholderDefinition[] = [...keys]
      .filter((k) => !existingKeys.has(k))
      .map((k) => ({
        key: k,
        label: k.replace(/_/g, " "),
        type: "text",
        required: true,
      }));
    if (newDefs.length > 0) {
      setVersion((v) => ({
        ...v,
        placeholders: [...v.placeholders, ...newDefs],
      }));
    }
  };

  const handleSaveMeta = async () => {
    if (!name.trim()) { setError("กรุณาระบุชื่อ Template"); return; }
    if (isNew && !key.trim()) { setError("กรุณาระบุ Key"); return; }
    setSaving(true);
    try {
      if (isNew) {
        await templateService.createTemplate({ key, name, internal_description: internalDesc, category });
      } else {
        await templateService.updateTemplate(template!.id, { name, internal_description: internalDesc, category });
      }
      setError("");
      setStep("defaults");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVersion = async () => {
    if (!version.defaults.title_template.trim()) {
      setError("กรุณาระบุ Title Template");
      return;
    }
    setSaving(true);
    try {
      const templateId = isNew
        ? (await templateService.getTemplates()).find((t) => t.key === key)?.id ?? ""
        : template!.id;
      await templateService.createVersion(templateId, version);
      setError("");
      setStep("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    try {
      const templateId = isNew
        ? (await templateService.getTemplates()).find((t) => t.key === key)?.id ?? ""
        : template!.id;
      const result = await templateService.previewApply(templateId, previewInputs);
      setPreviewResult(result.preview);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Preview ล้มเหลว");
    }
  };

  const handlePublish = async () => {
    if (!confirm("ยืนยันการ Publish version นี้ให้ผู้ใช้งานเห็น?")) return;
    setPublishing(true);
    try {
      const templates = await templateService.getTemplates();
      const found = templates.find((t) => t.key === key) ?? template!;
      const versions = await templateService.getVersions(found.id);
      const latest = versions[0];
      if (!latest) { setError("ไม่พบ Version"); return; }
      await templateService.publishVersion(found.id, latest.version);
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setPublishing(false);
    }
  };

  const updatePlaceholder = (
    index: number,
    field: keyof TemplatePlaceholderDefinition,
    value: unknown
  ) => {
    setVersion((v) => {
      const updated = [...v.placeholders];
      updated[index] = { ...updated[index]!, [field]: value };
      return { ...v, placeholders: updated };
    });
  };

  const removePlaceholder = (index: number) => {
    setVersion((v) => ({
      ...v,
      placeholders: v.placeholders.filter((_, i) => i !== index),
    }));
  };

  const STEPS = ["meta", "defaults", "placeholders", "preview"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold app-heading">
              {isNew ? "สร้าง Template ใหม่" : `แก้ไข: ${template!.name}`}
            </h2>
            <div className="flex gap-1 mt-2">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all ${
                    STEPS.indexOf(step) >= i ? "bg-[#5A5A40] w-8" : "bg-gray-200 w-4"
                  }`}
                />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Step: Meta */}
          {step === "meta" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider app-soft mb-1.5">
                  ชื่อ Template *
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#5A5A40]/30 focus:border-[#5A5A40] outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น Onboarding ลูกค้าใหม่"
                />
              </div>
              {isNew && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider app-soft mb-1.5">
                    Key (unique ID) *
                  </label>
                  <input
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:ring-2 focus:ring-[#5A5A40]/30 focus:border-[#5A5A40] outline-none"
                    value={key}
                    onChange={(e) => setKey(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                    placeholder="onboarding-client"
                  />
                  <p className="text-xs app-muted mt-1">ใช้ตัวอักษรพิมพ์เล็ก, ตัวเลข, และ dash เท่านั้น</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider app-soft mb-1.5">
                  หมวดหมู่
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#5A5A40]/30 focus:border-[#5A5A40] outline-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="เช่น HR, Finance, Ops"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider app-soft mb-1.5">
                  คำอธิบายภายใน (Admin เท่านั้น)
                </label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-[#5A5A40]/30 focus:border-[#5A5A40] outline-none"
                  rows={3}
                  value={internalDesc}
                  onChange={(e) => setInternalDesc(e.target.value)}
                  placeholder="คำอธิบายเพื่อช่วยแอดมินจำว่า template นี้ใช้สำหรับอะไร"
                />
              </div>
            </div>
          )}

          {/* Step: Defaults */}
          {step === "defaults" && (
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-700 text-xs px-4 py-2.5 rounded-xl">
                เคล็ดลับ: ใช้ <code className="bg-blue-100 px-1 rounded">{"{{placeholder_key}}"}</code> เพื่อสร้าง placeholder ที่ผู้ใช้กรอกก่อน apply
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider app-soft mb-1.5">
                  Title Template *
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#5A5A40]/30 focus:border-[#5A5A40] outline-none"
                  value={version.defaults.title_template}
                  onChange={(e) =>
                    setVersion((v) => ({ ...v, defaults: { ...v.defaults, title_template: e.target.value } }))
                  }
                  placeholder="รายงานสัปดาห์ - {{reporting_week}}"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider app-soft mb-1.5">
                  Description Template
                </label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono resize-none focus:ring-2 focus:ring-[#5A5A40]/30 focus:border-[#5A5A40] outline-none"
                  rows={6}
                  value={version.defaults.description_template ?? ""}
                  onChange={(e) =>
                    setVersion((v) => ({ ...v, defaults: { ...v.defaults, description_template: e.target.value } }))
                  }
                  placeholder={"## สรุปสัปดาห์นี้\nลูกค้า: {{client_name}}\n\n## สิ่งที่ต้องทำ\n- [ ] รายงาน KPI\n- [ ] ส่งก่อน {{due_date}}"}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider app-soft mb-1.5">Priority เริ่มต้น</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#5A5A40]/30 outline-none"
                    value={version.defaults.priority ?? ""}
                    onChange={(e) =>
                      setVersion((v) => ({ ...v, defaults: { ...v.defaults, priority: e.target.value || null } }))
                    }
                  >
                    <option value="">ไม่กำหนด</option>
                    <option value="low">ต่ำ</option>
                    <option value="medium">ปานกลาง</option>
                    <option value="high">สูง</option>
                    <option value="urgent">เร่งด่วน</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider app-soft mb-1.5">Due Date Rule</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#5A5A40]/30 outline-none"
                    value={version.defaults.due_date_rule?.type ?? "none"}
                    onChange={(e) => {
                      const type = e.target.value as any;
                      setVersion((v) => ({
                        ...v,
                        defaults: {
                          ...v.defaults,
                          due_date_rule:
                            type === "days_after_creation"
                              ? { type, days: 7 }
                              : type === "business_days_after_creation"
                              ? { type, days: 5 }
                              : { type: "none" },
                        },
                      }));
                    }}
                  >
                    <option value="none">ไม่กำหนด</option>
                    <option value="days_after_creation">X วันหลังสร้าง</option>
                    <option value="business_days_after_creation">X วันทำการหลังสร้าง</option>
                    <option value="placeholder">จาก Placeholder</option>
                  </select>
                </div>
              </div>
              <button
                onClick={detectPlaceholders}
                className="text-sm text-[#5A5A40] hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> ตรวจจับ Placeholder อัตโนมัติจาก Title/Description
              </button>
            </div>
          )}

          {/* Step: Placeholders */}
          {step === "placeholders" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium app-heading">Placeholder Definitions</p>
                <button
                  onClick={() =>
                    setVersion((v) => ({
                      ...v,
                      placeholders: [
                        ...v.placeholders,
                        { key: "", label: "", type: "text", required: true },
                      ],
                    }))
                  }
                  className="flex items-center gap-1 text-xs text-[#5A5A40] hover:underline"
                >
                  <Plus size={13} /> เพิ่ม
                </button>
              </div>
              {version.placeholders.length === 0 && (
                <p className="text-xs app-muted text-center py-6">ยังไม่มี Placeholder — กดตรวจจับอัตโนมัติใน Step ก่อนหน้า</p>
              )}
              {version.placeholders.map((ph, i) => (
                <div key={i} className="p-3 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none"
                      placeholder="key (e.g. client_name)"
                      value={ph.key}
                      onChange={(e) => updatePlaceholder(i, "key", e.target.value)}
                    />
                    <select
                      className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs"
                      value={ph.type}
                      onChange={(e) => updatePlaceholder(i, "type", e.target.value)}
                    >
                      {PLACEHOLDER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button
                      onClick={() => removePlaceholder(i)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"
                    >
                      <Minus size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                      placeholder="Label ที่แสดงให้ผู้ใช้เห็น"
                      value={ph.label}
                      onChange={(e) => updatePlaceholder(i, "label", e.target.value)}
                    />
                    <label className="flex items-center gap-1 text-xs app-soft">
                      <input
                        type="checkbox"
                        checked={ph.required}
                        onChange={(e) => updatePlaceholder(i, "required", e.target.checked)}
                      />
                      Required
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <p className="text-sm app-soft">กรอกค่าทดสอบเพื่อดู Preview ก่อน Publish:</p>
              {version.placeholders.map((ph) => (
                <div key={ph.key}>
                  <label className="block text-xs font-bold uppercase tracking-wider app-soft mb-1">
                    {ph.label} ({ph.key}){ph.required && " *"}
                  </label>
                  <input
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                    value={previewInputs[ph.key] ?? ""}
                    onChange={(e) => setPreviewInputs((p) => ({ ...p, [ph.key]: e.target.value }))}
                  />
                </div>
              ))}
              <button
                onClick={handlePreview}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#5A5A40] text-[#5A5A40] text-sm hover:bg-[#5A5A40]/5"
              >
                <Eye size={15} /> ดู Preview
              </button>
              {previewResult && (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider app-soft">Preview Result</p>
                  <p className="font-semibold text-sm app-heading">{previewResult.rendered_title}</p>
                  <pre className="text-xs app-soft whitespace-pre-wrap bg-white rounded-xl p-3 border border-gray-100">
                    {previewResult.rendered_description}
                  </pre>
                  {previewResult.warnings?.length > 0 && (
                    <div className="text-xs text-amber-600 flex items-start gap-2">
                      <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                      {previewResult.warnings.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => {
              const idx = STEPS.indexOf(step);
              if (idx > 0) setStep(STEPS[idx - 1] as any);
              else onClose();
            }}
            className="px-5 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50"
          >
            {step === "meta" ? "ยกเลิก" : "← ก่อนหน้า"}
          </button>
          <div className="flex gap-2">
            {step === "preview" ? (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                <Upload size={15} />
                {publishing ? "กำลัง Publish..." : "Publish Version"}
              </button>
            ) : (
              <button
                onClick={
                  step === "meta" ? handleSaveMeta :
                  step === "defaults" ? handleSaveVersion :
                  () => setStep("preview")
                }
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-medium hover:bg-[#4A4A30] disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "ถัดไป →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
