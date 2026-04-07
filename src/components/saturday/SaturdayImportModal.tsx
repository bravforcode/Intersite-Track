import { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { saturdayService } from "../../services/saturdayService";
import type { User } from "../../types";
import type { CreateSaturdayDTO } from "../../types/holiday";

interface SaturdayImportModalProps {
  users: User[];
  onImported: () => void;
  onClose: () => void;
}

interface PreviewRow {
  date: string;
  names: string[];
  user_ids: string[];
  unmatched: string[];
}

export function SaturdayImportModal({ users, onImported, onClose }: SaturdayImportModalProps) {
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "preview">("upload");

  function parseCSV(text: string): PreviewRow[] {
    const lines = text.trim().split("\n").slice(1); // skip header
    const rows: PreviewRow[] = [];

    for (const line of lines) {
      const [date, ...nameParts] = line.split(",").map(s => s.trim());
      if (!date) continue;

      const names = nameParts.filter(Boolean);
      const user_ids: string[] = [];
      const unmatched: string[] = [];

      for (const name of names) {
        const found = users.find(u =>
          `${u.first_name} ${u.last_name}`.includes(name) ||
          name.includes(u.first_name)
        );
        if (found) user_ids.push(found.id);
        else unmatched.push(name);
      }

      rows.push({ date, names, user_ids, unmatched });
    }
    return rows;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target?.result as string;
        const rows = parseCSV(text);
        setPreview(rows);
        setStep("preview");
        setError(null);
      } catch {
        setError("ไม่สามารถอ่านไฟล์ได้");
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImport() {
    setLoading(true);
    setError(null);
    try {
      const schedules: CreateSaturdayDTO[] = preview
        .filter(r => r.user_ids.length > 0)
        .map(r => ({ date: r.date, user_ids: r.user_ids, note: null }));
      await saturdayService.importSchedules(schedules);
      onImported();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Import เวรเสาร์จาก CSV" open={true}>
      <div className="space-y-4 p-6">
        {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}

        {step === "upload" && (
          <div>
            <p className="text-sm text-slate-600 mb-3">
              อัปโหลดไฟล์ CSV รูปแบบ:<br />
              <code className="text-xs bg-slate-100 px-2 py-1 rounded">วันที่,ชื่อ1,ชื่อ2,...</code><br />
              <code className="text-xs bg-slate-100 px-2 py-1 rounded">2026-04-12,สมชาย,สมหญิง</code>
            </p>
            <input type="file" accept=".csv,.txt" onChange={handleFile} className="text-sm" />
          </div>
        )}

        {step === "preview" && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Preview ({preview.length} แถว)</p>
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {preview.map((row, i) => (
                <div key={i} className="px-3 py-2">
                  <span className="text-sm font-medium text-slate-900">{row.date}</span>
                  <span className="text-sm text-slate-600 ml-2">{row.names.join(", ")}</span>
                  {row.unmatched.length > 0 && (
                    <span className="text-xs text-amber-600 ml-2">⚠️ ไม่พบ: {row.unmatched.join(", ")}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" onClick={() => setStep("upload")} className="flex-1">เลือกไฟล์ใหม่</Button>
              <Button onClick={handleImport} disabled={loading} className="flex-1">
                {loading ? "กำลัง import..." : `Import ${preview.filter(r => r.user_ids.length > 0).length} แถว`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
