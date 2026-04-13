import { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import type { SaturdaySchedule, CreateSaturdayDTO } from "../../types/holiday";
import type { User } from "../../types";

interface SaturdayFormModalProps {
  schedule?: SaturdaySchedule | null;
  users: User[];
  onSave: (dto: CreateSaturdayDTO) => Promise<void>;
  onClose: () => void;
}

export function SaturdayFormModal({ schedule, users, onSave, onClose }: SaturdayFormModalProps) {
  const [date, setDate] = useState(schedule?.date ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(schedule?.user_ids ?? []);
  const [note, setNote] = useState(schedule?.note ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleUser(uid: string) {
    setSelectedIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  }

  function isSaturday(d: string) {
    const day = new Date(d + "T00:00:00").getDay();
    return day === 6;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) { setError("กรุณาระบุวันที่"); return; }
    if (!isSaturday(date)) { setError("กรุณาเลือกวันเสาร์เท่านั้น"); return; }
    if (selectedIds.length === 0) { setError("กรุณาเลือกผู้มีเวรอย่างน้อย 1 คน"); return; }
    setLoading(true);
    setError(null);
    try {
      await onSave({ date, user_ids: selectedIds, note: note || null });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} title={schedule ? "แก้ไขเวรเสาร์" : "เพิ่มเวรเสาร์"} open={true}>
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ (วันเสาร์เท่านั้น)</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">เลือกผู้มีเวร</label>
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {users.map(u => (
              <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(u.id)}
                  onChange={() => toggleUser(u.id)}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">{u.first_name} {u.last_name}</span>
                <span className="text-xs text-slate-400">{u.position}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ (ไม่บังคับ)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="หมายเหตุ..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
