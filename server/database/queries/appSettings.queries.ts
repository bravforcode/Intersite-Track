import { db, Timestamp } from "../../config/firebase-admin.js";

export async function getLineGroupId(): Promise<string | null> {
  const doc = await db.collection("app_settings").doc("line_config").get();
  if (!doc.exists) return null;
  return doc.data()?.group_id ?? null;
}

export async function saveLineGroupId(groupId: string): Promise<void> {
  await db.collection("app_settings").doc("line_config").set({
    group_id: groupId,
    updated_at: Timestamp.now(),
  }, { merge: true });
}
