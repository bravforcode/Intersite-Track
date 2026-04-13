import { db } from "../../config/firebase-admin.js";
import type { TimeEntry } from "../../types/timeEntry.js";
import { randomUUID } from "crypto";

const COLLECTION = "time_entries";

/** Return all time entries for a given task, newest first */
export async function findTimeEntriesByTaskId(taskId: string): Promise<TimeEntry[]> {
  const snapshot = await db.collection(COLLECTION)
    .where("task_id", "==", taskId)
    .orderBy("started_at", "desc")
    .get();

  return snapshot.docs.map(doc => doc.data() as TimeEntry);
}

/** Return the currently running entry for a user on ANY task (max 1) */
export async function findRunningEntry(userId: string): Promise<TimeEntry | null> {
  const snapshot = await db.collection(COLLECTION)
    .where("user_id", "==", userId)
    .where("ended_at", "==", null)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as TimeEntry;
}

export async function findTimeEntryById(entryId: string): Promise<TimeEntry | null> {
  const doc = await db.collection(COLLECTION).doc(entryId).get();
  if (!doc.exists) return null;
  return doc.data() as TimeEntry;
}

/** Start a new timer entry */
export async function startTimeEntry(
  taskId: string,
  userId: string,
  userName?: string,
  description?: string
): Promise<TimeEntry> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const entry: TimeEntry = {
    id,
    task_id: taskId,
    user_id: userId,
    user_name: userName,
    description,
    started_at: now,
    ended_at: undefined,
    duration_minutes: undefined,
    created_at: now,
  };
  await db.collection(COLLECTION).doc(id).set(entry);
  return entry;
}

/** Stop a running timer entry and calculate duration */
export async function stopTimeEntry(entryId: string): Promise<TimeEntry> {
  const doc = await db.collection(COLLECTION).doc(entryId).get();
  if (!doc.exists) throw new Error("Time entry not found");
  const entry = doc.data() as TimeEntry;
  if (entry.ended_at) throw new Error("Timer is already stopped");

  const endedAt = new Date();
  const startedAt = new Date(entry.started_at);
  const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

  const updates = {
    ended_at: endedAt.toISOString(),
    duration_minutes: durationMinutes,
  };
  await db.collection(COLLECTION).doc(entryId).update(updates);
  return { ...entry, ...updates };
}

/** Log a manual time entry (no live timer) */
export async function createManualEntry(
  taskId: string,
  userId: string,
  durationMinutes: number,
  description?: string,
  userName?: string,
  startedAt?: string
): Promise<TimeEntry> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const baseStartedAt = startedAt ?? now;
  const endedAt = new Date(
    new Date(baseStartedAt).getTime() + durationMinutes * 60000
  ).toISOString();

  const entry: TimeEntry = {
    id,
    task_id: taskId,
    user_id: userId,
    user_name: userName,
    description,
    started_at: baseStartedAt,
    ended_at: endedAt,
    duration_minutes: durationMinutes,
    created_at: now,
  };
  await db.collection(COLLECTION).doc(id).set(entry);
  return entry;
}

/** Delete a time entry (soft delete not needed — time data is generally small) */
export async function deleteTimeEntry(entryId: string): Promise<void> {
  await db.collection(COLLECTION).doc(entryId).delete();
}

/** Sum duration_minutes for a task (for reporting) */
export async function getTotalMinutesForTask(taskId: string): Promise<number> {
  const entries = await findTimeEntriesByTaskId(taskId);
  return entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
}
