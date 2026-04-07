import { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import type { Holiday, CreateHolidayDTO } from "../../types/holiday";

interface HolidayFormModalProps {
  holiday?: Holiday | null;
  onSave: (dto: CreateHolidayDTO) => Promise<void>;
  onClose: () => void;
}

export function HolidayFormModal({ holiday, onSave, onClose }: HolidayFormModalProps) {
  const [date, setDate] = useState(holiday?.date ?? "");
  const [name, setName] = useState(holiday?.name ?? "");
  const [type, setType] = useState<"holiday" | "special">(holiday?.type ?? "holiday");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !name) { setError("กรุณากรอกข้อมูลให้ครบ"); return; }
    setLoading(true);
    setError(null);
    try {
      await onSave({ date, name, type });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={holiday ? "แก้ไขวันหยุด" : "เพิ่มวันหยุด"} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">วันที่</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อวันหยุด</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="เช่น วันปีใหม่" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ประเภท</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as "holiday" | "special")}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="holiday">วันหยุดนักขัตฤกษ์ (แดง)</option>
            <option value="special">วันหยุดพิเศษ (เหลือง)</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">ยกเลิก</Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
