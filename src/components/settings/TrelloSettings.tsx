import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, RefreshCw, Save, Wifi, WifiOff, Settings2, Users, ArrowLeftRight, ToggleLeft, ToggleRight } from "lucide-react";
import { useTrelloConfig } from "../../hooks/useTrelloConfig";
import * as trelloService from "../../services/trelloService";
import type {
  TrelloConfigForm, TrelloListOption, TrelloMemberOption,
  StatusMappingEntry, UserMappingEntry, TaskStatus,
} from "../../types/trello";

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

const ALL_STATUSES: TaskStatus[] = ["pending", "in_progress", "completed", "cancelled"];

interface Props {
  systemUsers: { id: number; first_name: string; last_name: string; username: string }[];
}

export default function TrelloSettings({ systemUsers }: Props) {
  const { config, loading, saving, testing, error, testResult, save, testConn } = useTrelloConfig();

  // Connection form
  const [form, setForm] = useState<TrelloConfigForm>({
    apiKey: "", token: "", boardId: "", boardUrl: "",
    enableAutoSync: true, enableTwoWaySync: false,
  });

  // Board data
  const [lists, setLists] = useState<TrelloListOption[]>([]);
  const [members, setMembers] = useState<TrelloMemberOption[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

  // Mappings
  const [statusMappings, setStatusMappings] = useState<Record<TaskStatus, string>>({
    pending: "", in_progress: "", completed: "", cancelled: "",
  });
  const [userMappings, setUserMappings] = useState<Record<number, string>>({});
  const [savingMappings, setSavingMappings] = useState(false);
  const [mappingMsg, setMappingMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Populate form when config loads
  useEffect(() => {
    if (!config) return;
    setForm(prev => ({
      ...prev,
      boardId: config.boardId,
      boardUrl: config.boardUrl ?? "",
      enableAutoSync: config.enableAutoSync,
      enableTwoWaySync: config.enableTwoWaySync,
    }));
    if (config.isConnected) loadBoardData();
  }, [config]);

  async function loadBoardData() {
    setLoadingBoard(true);
    try {
      const [l, m, sm, um] = await Promise.all([
        trelloService.getBoardLists(),
        trelloService.getBoardMembers(),
        trelloService.getStatusMappings(),
        trelloService.getUserMappings(),
      ]);
      setLists(l);
      setMembers(m);
      const sm2: Record<TaskStatus, string> = { pending: "", in_progress: "", completed: "", cancelled: "" };
      for (const s of sm) sm2[s.status] = s.trelloListId;
      setStatusMappings(sm2);
      const um2: Record<number, string> = {};
      for (const u of um) um2[u.userId] = u.trelloMemberId;
      setUserMappings(um2);
    } catch (e) {
      console.error("loadBoardData error:", e);
    } finally {
      setLoadingBoard(false);
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save(form);
      await loadBoardData();
    } catch {}
  }

  async function handleTestConnection() {
    const result = await testConn();
    if (result.success) await loadBoardData();
  }

  async function handleSaveMappings() {
    setSavingMappings(true);
    setMappingMsg(null);
    try {
      const statusArr: StatusMappingEntry[] = ALL_STATUSES
        .filter(s => statusMappings[s])
        .map(s => {
          const list = lists.find(l => l.id === statusMappings[s]);
          return { status: s, trelloListId: statusMappings[s], trelloListName: list?.name };
        });

      const userArr: UserMappingEntry[] = systemUsers
        .filter(u => userMappings[u.id])
        .map(u => {
          const member = members.find(m => m.id === userMappings[u.id]);
          return {
            userId: u.id,
            username: u.username,
            fullName: `${u.first_name} ${u.last_name}`,
            trelloMemberId: userMappings[u.id],
            trelloUsername: member?.username,
          };
        });

      await Promise.all([
        trelloService.saveStatusMappings(statusArr),
        trelloService.saveUserMappings(userArr),
      ]);
      setMappingMsg({ ok: true, text: "บันทึกการแมปสำเร็จ" });
    } catch (err) {
      setMappingMsg({ ok: false, text: err instanceof Error ? err.message : "บันทึกล้มเหลว" });
    } finally {
      setSavingMappings(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  const isConnected = config?.isConnected ?? false;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Section 1: Connection ── */}
      <div className="app-surface rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <Settings2 size={18} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold app-heading">เชื่อมต่อ Trello</h3>
            <p className="text-xs app-soft">กรอก API Key และ Token จาก trello.com/app-key</p>
          </div>
          <div className="ml-auto">
            {isConnected
              ? <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full"><Wifi size={13} /> เชื่อมต่อแล้ว</span>
              : <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full"><WifiOff size={13} /> ยังไม่เชื่อมต่อ</span>
            }
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold app-muted uppercase tracking-wider mb-1">API Key</label>
              <input type="password" className="w-full px-3 py-2 rounded-xl text-sm app-field"
                placeholder="Trello API Key" value={form.apiKey}
                onChange={e => setForm({ ...form, apiKey: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold app-muted uppercase tracking-wider mb-1">Token</label>
              <input type="password" className="w-full px-3 py-2 rounded-xl text-sm app-field"
                placeholder="Trello Token" value={form.token}
                onChange={e => setForm({ ...form, token: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold app-muted uppercase tracking-wider mb-1">Board URL</label>
            <input type="url" className="w-full px-3 py-2 rounded-xl text-sm app-field"
              placeholder="https://trello.com/b/xxxxx/board-name" value={form.boardUrl}
              onChange={e => {
                const url = e.target.value;
                const match = url.match(/trello\.com\/b\/([^/]+)/);
                setForm({ ...form, boardUrl: url, boardId: match ? match[1] : form.boardId });
              }} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {testResult && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${testResult.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {testResult.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {testResult.message}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={handleTestConnection} disabled={testing || !form.apiKey || !form.token || !form.boardId}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium app-muted hover:bg-gray-50 disabled:opacity-50 transition-colors">
              {testing ? <RefreshCw size={15} className="animate-spin" /> : <Wifi size={15} />}
              ทดสอบการเชื่อมต่อ
            </button>
            <button type="submit" disabled={saving || !form.apiKey || !form.token || !form.boardId}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5A5A40] text-white text-sm font-medium hover:bg-[#4A4A30] disabled:opacity-50 transition-colors">
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              บันทึก
            </button>
          </div>
        </form>
      </div>

      {/* ── Section 4: Sync Options (shown early so user can toggle before mappings) ── */}
      <div className="app-surface rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
            <ArrowLeftRight size={18} className="text-purple-600" />
          </div>
          <h3 className="font-semibold app-heading">ตัวเลือกการซิงค์</h3>
        </div>
        <div className="space-y-4">
          <ToggleRow
            label="ซิงค์อัตโนมัติ"
            description="เมื่อสร้าง/แก้ไข/ลบงาน จะอัปเดต Trello โดยอัตโนมัติ"
            value={form.enableAutoSync}
            onChange={v => setForm({ ...form, enableAutoSync: v })}
          />
          <ToggleRow
            label="ซิงค์สองทาง"
            description="เมื่อแก้ไขการ์ดใน Trello จะอัปเดตกลับมาในระบบ"
            value={form.enableTwoWaySync}
            onChange={v => setForm({ ...form, enableTwoWaySync: v })}
          />
        </div>
        <button onClick={handleSaveConfig as any} disabled={saving}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5A5A40] text-white text-sm font-medium hover:bg-[#4A4A30] disabled:opacity-50 transition-colors">
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          บันทึกตัวเลือก
        </button>
      </div>

      {/* ── Sections 2 & 3: Mappings (only when connected) ── */}
      {isConnected && (
        <>
          {/* Section 2: Status Mapping */}
          <div className="app-surface rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                <Settings2 size={18} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold app-heading">แมปสถานะ → Trello List</h3>
                <p className="text-xs app-soft">เลือก List ที่ตรงกับแต่ละสถานะงาน</p>
              </div>
              {loadingBoard && <RefreshCw size={14} className="ml-auto animate-spin text-gray-400" />}
            </div>
            <div className="space-y-3">
              {ALL_STATUSES.map(status => (
                <div key={status} className="flex items-center gap-4">
                  <span className="w-36 text-sm font-medium app-heading">{STATUS_LABELS[status]}</span>
                  <select
                    className="flex-1 px-3 py-2 rounded-xl text-sm app-field"
                    value={statusMappings[status]}
                    onChange={e => setStatusMappings({ ...statusMappings, [status]: e.target.value })}
                  >
                    <option value="">— เลือก List —</option>
                    {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: User Mapping */}
          <div className="app-surface rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                <Users size={18} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold app-heading">แมปผู้ใช้ → Trello Member</h3>
                <p className="text-xs app-soft">เลือก Trello Member ที่ตรงกับผู้ใช้แต่ละคน</p>
              </div>
            </div>
            <div className="space-y-3">
              {systemUsers.map(u => (
                <div key={u.id} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40] font-bold text-xs flex-shrink-0">
                    {u.first_name[0]}{u.last_name[0]}
                  </div>
                  <span className="w-36 text-sm font-medium app-heading truncate">{u.first_name} {u.last_name}</span>
                  <select
                    className="flex-1 px-3 py-2 rounded-xl text-sm app-field"
                    value={userMappings[u.id] ?? ""}
                    onChange={e => setUserMappings({ ...userMappings, [u.id]: e.target.value })}
                  >
                    <option value="">— เลือก Member —</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} (@{m.username})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {systemUsers.length === 0 && <p className="text-sm app-soft">ไม่มีผู้ใช้ในระบบ</p>}
            </div>
          </div>

          {/* Save Mappings Button */}
          <div className="flex items-center gap-4">
            <button onClick={handleSaveMappings} disabled={savingMappings}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5A5A40] text-white text-sm font-medium hover:bg-[#4A4A30] disabled:opacity-50 transition-colors">
              {savingMappings ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              บันทึกการแมป
            </button>
            {mappingMsg && (
              <span className={`flex items-center gap-1.5 text-sm ${mappingMsg.ok ? "text-emerald-600" : "text-red-500"}`}>
                {mappingMsg.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                {mappingMsg.text}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────

function ToggleRow({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium app-heading">{label}</p>
        <p className="text-xs app-soft">{description}</p>
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          value ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
        }`}>
        {value ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
        {value ? "เปิด" : "ปิด"}
      </button>
    </div>
  );
}
