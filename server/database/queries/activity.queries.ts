import { db } from "../../config/firebase-admin.js";

export interface TaskActivity {
  id: string;
  task_id: string;
  task_title?: string;
  user_id: string | null;
  action: string;
  old_data: any;
  new_data: any;
  created_at: string;
  user_name?: string;
  type: "audit";
}

async function enrichWithUserNames(activities: TaskActivity[]): Promise<TaskActivity[]> {
  const userIds = [...new Set(activities.map(a => a.user_id).filter(Boolean))] as string[];
  const userMap = new Map<string, string>();
  if (userIds.length > 0) {
    const userDocs = await Promise.all(userIds.map(id => db.collection("users").doc(id).get()));
    for (const doc of userDocs) {
      if (doc.exists) {
        const d = doc.data()!;
        userMap.set(doc.id, `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "System");
      }
    }
  }
  return activities.map(a => ({
    ...a,
    user_name: a.user_id ? (userMap.get(a.user_id) ?? "System") : "System",
  }));
}

export async function getActivityByTaskId(taskId: string): Promise<TaskActivity[]> {
  const snap = await db
    .collection("task_audit_logs")
    .where("task_id", "==", taskId)
    .orderBy("created_at", "desc")
    .get();

  const activities = snap.docs.map(doc => ({
    id: doc.id,
    type: "audit" as const,
    ...doc.data(),
  } as TaskActivity));

  return enrichWithUserNames(activities);
}

export async function getAllActivity(limit: number = 50): Promise<TaskActivity[]> {
  const snap = await db
    .collection("task_audit_logs")
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();

  const activities = snap.docs.map(doc => ({
    id: doc.id,
    type: "audit" as const,
    ...doc.data(),
  } as TaskActivity));

  const taskIds = [...new Set(activities.map(a => a.task_id).filter(Boolean))];
  const taskMap = new Map<string, string>();
  if (taskIds.length > 0) {
    const taskDocs = await Promise.all(taskIds.map(id => db.collection("tasks").doc(id).get()));
    for (const doc of taskDocs) {
      if (doc.exists) taskMap.set(doc.id, doc.data()?.title ?? "Unknown Task");
    }
  }

  const withTitles = activities.map(a => ({
    ...a,
    task_title: taskMap.get(a.task_id) ?? "Unknown Task",
  }));

  return enrichWithUserNames(withTitles);
}

export async function getActivityInRange(
  dateFromIso: string,
  dateToIso: string,
  limit: number = 500
): Promise<TaskActivity[]> {
  const snap = await db
    .collection("task_audit_logs")
    .where("created_at", ">=", dateFromIso)
    .where("created_at", "<", dateToIso)
    .orderBy("created_at", "asc")
    .limit(limit)
    .get();

  const activities = snap.docs.map(doc => ({
    id: doc.id,
    type: "audit" as const,
    ...doc.data(),
  } as TaskActivity));

  return enrichWithUserNames(activities);
}
