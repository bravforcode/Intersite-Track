import { db } from "../../config/firebase-admin.js";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface KPICheckIn {
  id: string;
  kpi_id: string;
  owner_id: string;
  owner_name: string;
  previous_value: number;
  new_value: number;
  delta: number;
  note: string;
  created_at: string;
}

export interface StaffKPISummary {
  owner_id: string;
  owner_name: string;
  total: number;
  avg_progress: number;
  on_track: number;
  at_risk: number;
  behind: number;
  completed: number;
}

// ─── Check-In Queries ─────────────────────────────────────────────────────────

export async function listCheckIns(kpiId: string): Promise<KPICheckIn[]> {
  const snap = await db
    .collection("kpi_checkins")
    .where("kpi_id", "==", kpiId)
    .orderBy("created_at", "desc")
    .get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<KPICheckIn, "id">),
  }));
}

export async function createCheckIn(
  kpiId: string,
  ownerId: string,
  ownerName: string,
  previousValue: number,
  newValue: number,
  note: string
): Promise<KPICheckIn> {
  const ref = db.collection("kpi_checkins").doc();
  const now = new Date().toISOString();
  const data: Omit<KPICheckIn, "id"> = {
    kpi_id: kpiId,
    owner_id: ownerId,
    owner_name: ownerName,
    previous_value: previousValue,
    new_value: newValue,
    delta: newValue - previousValue,
    note: note.trim(),
    created_at: now,
  };
  await ref.set(data);

  // Also update parent KPI's current_value + progress
  const kpiRef = db.collection("kpis").doc(kpiId);
  const kpiSnap = await kpiRef.get();
  if (kpiSnap.exists) {
    const kpi = kpiSnap.data()!;
    const target = kpi.target_value ?? 0;
    const progress = target > 0 ? Math.min(Math.round((newValue / target) * 100), 100) : 0;

    // Auto-compute status
    let status = kpi.status;
    if (progress >= 100) status = "completed";
    else if (progress < 50) {
      const dueDate = kpi.due_date ? new Date(kpi.due_date) : null;
      const daysLeft = dueDate ? (dueDate.getTime() - Date.now()) / 86400000 : 999;
      if (daysLeft < 7) status = "behind";
      else status = "at_risk";
    } else {
      status = "on_track";
    }

    await kpiRef.update({
      current_value: newValue,
      progress,
      status,
      updated_at: now,
    });
  }

  return { id: ref.id, ...data };
}

// ─── Staff KPI Summary (for manager/admin dashboard) ─────────────────────────

export async function getStaffKPISummaries(): Promise<StaffKPISummary[]> {
  const snap = await db.collection("kpis").get();
  const byOwner = new Map<string, { name: string; kpis: { status: string; progress: number }[] }>();

  for (const doc of snap.docs) {
    const d = doc.data();
    const oid = d.owner_id as string;
    if (!byOwner.has(oid)) byOwner.set(oid, { name: d.owner_name ?? oid, kpis: [] });
    byOwner.get(oid)!.kpis.push({ status: d.status, progress: d.progress ?? 0 });
  }

  return [...byOwner.entries()].map(([owner_id, { name, kpis }]) => ({
    owner_id,
    owner_name: name,
    total: kpis.length,
    avg_progress:
      kpis.length === 0
        ? 0
        : Math.round(kpis.reduce((s, k) => s + k.progress, 0) / kpis.length),
    on_track: kpis.filter((k) => k.status === "on_track").length,
    at_risk: kpis.filter((k) => k.status === "at_risk").length,
    behind: kpis.filter((k) => k.status === "behind").length,
    completed: kpis.filter((k) => k.status === "completed").length,
  }));
}
