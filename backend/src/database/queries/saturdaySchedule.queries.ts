import { db } from "../../config/firebase-admin.js";

export interface SaturdaySchedule {
  id: string;
  date: string;
  user_ids: string[];
  note: string | null;
  created_at: string;
  created_by: string;
}

export interface SaturdayScheduleWithNames extends SaturdaySchedule {
  user_names: string[];
}

export interface CreateSaturdayDTO {
  date: string;
  user_ids: string[];
  note?: string | null;
  created_by: string;
}

export async function findAllSaturdaySchedules(year?: string, month?: string): Promise<SaturdaySchedule[]> {
  const snap = await db.collection("saturday_schedules").orderBy("date", "asc").get();
  let schedules = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaturdaySchedule));
  if (year) schedules = schedules.filter(s => s.date.startsWith(year));
  if (month) {
    const paddedMonth = month.padStart(2, "0");
    schedules = schedules.filter(s => s.date.substring(5, 7) === paddedMonth);
  }
  return schedules;
}

export async function findSaturdayScheduleById(id: string): Promise<SaturdaySchedule | null> {
  const doc = await db.collection("saturday_schedules").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as SaturdaySchedule;
}

export async function findSaturdayScheduleByDate(date: string): Promise<SaturdaySchedule | null> {
  const snap = await db.collection("saturday_schedules").where("date", "==", date).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as SaturdaySchedule;
}

export async function createSaturdaySchedule(data: CreateSaturdayDTO): Promise<string> {
  const ref = await db.collection("saturday_schedules").add({
    ...data,
    note: data.note ?? null,
    created_at: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateSaturdaySchedule(id: string, data: Partial<Pick<SaturdaySchedule, "user_ids" | "note" | "date">>): Promise<void> {
  await db.collection("saturday_schedules").doc(id).update(data);
}

export async function deleteSaturdaySchedule(id: string): Promise<void> {
  await db.collection("saturday_schedules").doc(id).delete();
}

export async function addUserToSaturdaySchedule(id: string, userId: string): Promise<void> {
  const doc = await db.collection("saturday_schedules").doc(id).get();
  if (!doc.exists) throw new Error("Schedule not found");
  const current = (doc.data()?.user_ids ?? []) as string[];
  if (current.includes(userId)) return;
  await db.collection("saturday_schedules").doc(id).update({ user_ids: [...current, userId] });
}

export async function findUpcomingSaturdaySchedules(days: number): Promise<SaturdaySchedule[]> {
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + days);
  const todayStr = today.toISOString().substring(0, 10);
  const futureStr = future.toISOString().substring(0, 10);
  const snap = await db.collection("saturday_schedules")
    .where("date", ">=", todayStr)
    .where("date", "<=", futureStr)
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaturdaySchedule));
}
