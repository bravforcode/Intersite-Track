import { db } from "../../config/firebase-admin.js";

export interface Holiday {
  id: string;
  date: string;         // "YYYY-MM-DD"
  name: string;
  type: "holiday" | "special";
  created_at: string;
  created_by: string;
}

export interface CreateHolidayDTO {
  date: string;
  name: string;
  type: "holiday" | "special";
  created_by: string;
}

export async function findAllHolidays(year?: string, month?: string): Promise<Holiday[]> {
  const snap = await db.collection("holidays").orderBy("date", "asc").get();
  let holidays = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Holiday));

  if (year) holidays = holidays.filter(h => h.date.startsWith(year));
  if (month) {
    const paddedMonth = month.padStart(2, "0");
    holidays = holidays.filter(h => h.date.substring(5, 7) === paddedMonth);
  }
  return holidays;
}

export async function findHolidayById(id: string): Promise<Holiday | null> {
  const doc = await db.collection("holidays").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Holiday;
}

export async function findHolidayByDate(date: string): Promise<Holiday | null> {
  const snap = await db.collection("holidays").where("date", "==", date).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as Holiday;
}

export async function createHoliday(data: CreateHolidayDTO): Promise<string> {
  const ref = await db.collection("holidays").add({
    ...data,
    created_at: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateHoliday(id: string, data: Partial<Omit<Holiday, "id" | "created_at" | "created_by">>): Promise<void> {
  await db.collection("holidays").doc(id).update(data);
}

export async function deleteHoliday(id: string): Promise<void> {
  await db.collection("holidays").doc(id).delete();
}

export async function findUpcomingHolidays(days: number): Promise<Holiday[]> {
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + days);
  const todayStr = today.toISOString().substring(0, 10);
  const futureStr = future.toISOString().substring(0, 10);
  const snap = await db.collection("holidays")
    .where("date", ">=", todayStr)
    .where("date", "<=", futureStr)
    .orderBy("date", "asc")
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Holiday));
}
