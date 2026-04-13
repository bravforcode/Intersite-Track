// backend/src/database/queries/kpi.queries.ts

import { db } from "../../config/firebase-admin.js";
import { randomUUID } from "crypto";
import type { KPI, CreateKPIInput, UpdateKPIInput, KPIStats } from "../../types/kpi.js";

const COL = "kpis";

// ── Helper ────────────────────────────────────────────────────────────────────

function computeProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

function toKPI(doc: FirebaseFirestore.DocumentSnapshot): KPI {
  const d = doc.data()!;
  return {
    id: doc.id,
    title: d.title ?? "",
    description: d.description ?? "",
    owner_id: d.owner_id ?? "",
    owner_name: d.owner_name ?? "",
    type: d.type ?? "kpi",
    objective: d.objective,
    target_value: d.target_value ?? 0,
    current_value: d.current_value ?? 0,
    unit: d.unit ?? "",
    start_date: d.start_date ?? "",
    due_date: d.due_date ?? "",
    status: d.status ?? "on_track",
    progress: d.progress ?? 0,
    created_by: d.created_by ?? "",
    created_at: d.created_at ?? "",
    updated_at: d.updated_at ?? "",
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listKPIs(filters: {
  owner_id?: string;
  type?: string;
  status?: string;
} = {}): Promise<KPI[]> {
  let query: FirebaseFirestore.Query = db.collection(COL);

  if (filters.owner_id) {
    query = query.where("owner_id", "==", filters.owner_id);
  }
  if (filters.type === "okr" || filters.type === "kpi") {
    query = query.where("type", "==", filters.type);
  }
  if (filters.status) {
    query = query.where("status", "==", filters.status);
  }

  query = query.orderBy("created_at", "desc");
  const snap = await query.get();
  return snap.docs.map(toKPI);
}

export async function getKPIById(id: string): Promise<KPI | null> {
  const doc = await db.collection(COL).doc(id).get();
  if (!doc.exists) return null;
  return toKPI(doc);
}

export async function createKPI(
  data: CreateKPIInput,
  createdBy: string
): Promise<KPI> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const current = data.current_value ?? 0;
  const target = data.target_value;
  const progress = computeProgress(current, target);

  const record = {
    title: data.title,
    description: data.description ?? "",
    owner_id: data.owner_id,
    owner_name: data.owner_name,
    type: data.type,
    objective: data.objective ?? null,
    target_value: target,
    current_value: current,
    unit: data.unit ?? "",
    start_date: data.start_date,
    due_date: data.due_date,
    status: data.status ?? "on_track",
    progress,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };

  await db.collection(COL).doc(id).set(record);
  return { id, ...record } as KPI;
}

export async function updateKPI(
  id: string,
  data: UpdateKPIInput
): Promise<KPI | null> {
  const ref = db.collection(COL).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const prev = existing.data()!;
  const current = data.current_value ?? prev.current_value;
  const target = data.target_value ?? prev.target_value;
  const progress = computeProgress(current, target);

  const updates: Record<string, unknown> = {
    ...data,
    current_value: current,
    target_value: target,
    progress,
    updated_at: new Date().toISOString(),
  };

  await ref.update(updates);
  return toKPI(await ref.get());
}

export async function deleteKPI(id: string): Promise<boolean> {
  const ref = db.collection(COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}

export async function getKPIStats(): Promise<KPIStats> {
  const snap = await db.collection(COL).get();
  const kpis = snap.docs.map(toKPI);

  const on_track = kpis.filter((k: KPI) => k.status === "on_track").length;
  const at_risk = kpis.filter((k: KPI) => k.status === "at_risk").length;
  const behind = kpis.filter((k: KPI) => k.status === "behind").length;
  const completed = kpis.filter((k: KPI) => k.status === "completed").length;
  const avg_progress =
    kpis.length === 0
      ? 0
      : Math.round(kpis.reduce((s: number, k: KPI) => s + k.progress, 0) / kpis.length);

  return {
    total: kpis.length,
    on_track,
    at_risk,
    behind,
    completed,
    avg_progress,
  };
}
