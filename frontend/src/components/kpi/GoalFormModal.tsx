import { useEffect, useState } from "react";
import { X, Target, BarChart2, Save } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { KPI, KPIType, KPIStatus, CreateKPIInput, UpdateKPIInput, User } from "../../types";

interface GoalFormModalProps {
  open: boolean;
  editingKPI: KPI | null;
  currentUser: User;
  onClose: () => void;
  onSave: (data: CreateKPIInput | UpdateKPIInput) => Promise<void>;
}

const STATUS_OPTIONS: { value: KPIStatus; label: string }[] = [
  { value: "on_track", label: "ตามแผน" },
  { value: "at_risk", label: "มีความเสี่ยง" },
  { value: "behind", label: "ล้าหลัง" },
  { value: "completed", label: "สำเร็จ" },
];

const UNIT_PRESETS = ["%", "฿", "tasks", "users", "orders", "hours", "pts"];

export function GoalFormModal({
  open,
  editingKPI,
  currentUser,
  onClose,
  onSave,
}: GoalFormModalProps) {
  const isEdit = editingKPI !== null;

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "kpi" as KPIType,
    objective: "",
    target_value: 100,
    current_value: 0,
    unit: "%",
    start_date: new Date().toISOString().split("T")[0],
    due_date: "",
    status: "on_track" as KPIStatus,
    owner_id: currentUser.id,
    owner_name: `${currentUser.first_name} ${currentUser.last_name}`,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (editingKPI) {
      setForm({
        title: editingKPI.title,
        description: editingKPI.description,
        type: editingKPI.type,
        objective: editingKPI.objective ?? "",
        target_value: editingKPI.target_value,
        current_value: editingKPI.current_value,
        unit: editingKPI.unit,
        start_date: editingKPI.start_date,
        due_date: editingKPI.due_date,
        status: editingKPI.status,
        owner_id: editingKPI.owner_id,
        owner_name: editingKPI.owner_name,
      });
    } else {
      setForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        type: "kpi",
        objective: "",
        target_value: 100,
        current_value: 0,
        unit: "%",
        due_date: "",
        status: "on_track",
        owner_id: currentUser.id,
        owner_name: `${currentUser.first_name} ${currentUser.last_name}`,
      }));
    }
    setErrors({});
  }, [editingKPI, open, currentUser]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "กรุณาระบุชื่อเป้าหมาย";
    if (!form.due_date) e.due_date = "กรุณาระบุกำหนดส่ง";
    if (form.target_value <= 0) e.target_value = "ค่าเป้าหมายต้องมากกว่า 0";
    if (form.current_value < 0) e.current_value = "ค่าปัจจุบันต้องไม่น้อยกว่า 0";
    if (form.current_value > form.target_value) e.current_value = "ค่าปัจจุบันต้องไม่เกินค่าเป้าหมาย";
    if (form.type === "okr" && !form.objective.trim()) e.objective = "OKR ต้องระบุ Objective";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        objective: form.type === "okr" ? form.objective : undefined,
      };
      await onSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function Field({
    label, error, children,
  }: { label: string; error?: string; children: React.ReactNode }) {
    return (
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
        {children}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative w-full max-w-[520px] bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                {form.type === "okr" ? <Target size={18} className="text-purple-500" /> : <BarChart2 size={18} className="text-blue-500" />}
                {isEdit ? "แก้ไขเป้าหมาย" : "เพิ่มเป้าหมายใหม่"}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Type selector */}
              <div className="flex gap-2">
                {(["kpi", "okr"] as KPIType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("type", t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      form.type === t
                        ? t === "okr"
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {t === "okr" ? "OKR" : "KPI"}
                  </button>
                ))}
              </div>

              {/* Objective (OKR only) */}
              {form.type === "okr" && (
                <Field label="Objective (เป้าหมายใหญ่)" error={errors.objective}>
                  <input
                    className={inputCls}
                    placeholder="เช่น เพิ่มความพึงพอใจลูกค้า"
                    value={form.objective}
                    onChange={(e) => set("objective", e.target.value)}
                  />
                </Field>
              )}

              {/* Title */}
              <Field label="ชื่อ Key Result / KPI *" error={errors.title}>
                <input
                  className={inputCls}
                  placeholder="เช่น เพิ่มคะแนน NPS เป็น 70"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </Field>

              {/* Description */}
              <Field label="รายละเอียด">
                <textarea
                  className={inputCls}
                  rows={2}
                  placeholder="อธิบายเป้าหมายเพิ่มเติม..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>

              {/* Target / Current / Unit */}
              <div className="grid grid-cols-3 gap-3">
                <Field label="ค่าเป้าหมาย *" error={errors.target_value}>
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    value={form.target_value}
                    onChange={(e) => set("target_value", Number(e.target.value))}
                  />
                </Field>
                <Field label="ค่าปัจจุบัน" error={errors.current_value}>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={form.current_value}
                    onChange={(e) => set("current_value", Number(e.target.value))}
                  />
                </Field>
                <Field label="หน่วย">
                  <input
                    className={inputCls}
                    list="unit-presets"
                    value={form.unit}
                    onChange={(e) => set("unit", e.target.value)}
                  />
                  <datalist id="unit-presets">
                    {UNIT_PRESETS.map((u) => <option key={u} value={u} />)}
                  </datalist>
                </Field>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="วันเริ่มต้น">
                  <input
                    type="date"
                    className={inputCls}
                    value={form.start_date}
                    onChange={(e) => set("start_date", e.target.value)}
                  />
                </Field>
                <Field label="กำหนดส่ง *" error={errors.due_date}>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.due_date}
                    onChange={(e) => set("due_date", e.target.value)}
                  />
                </Field>
              </div>

              {/* Status */}
              <Field label="สถานะ">
                <select
                  className={inputCls}
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as KPIStatus)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                <Save size={14} />
                {saving ? "กำลังบันทึก..." : isEdit ? "บันทึก" : "เพิ่มเป้าหมาย"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
