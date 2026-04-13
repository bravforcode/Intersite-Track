import crypto from "node:crypto";
import { db } from "../../config/firebase-admin.js";

const COLLECTION = "line_link_tokens";
const EXPIRY_MINUTES = 10;

export interface LineLinkTokenRecord {
  user_id: string;
  code: string;
  created_at: string;
  expires_at: string;
  linked_at: string | null;
  line_user_id: string | null;
}

function toRecord(data: FirebaseFirestore.DocumentData | undefined): LineLinkTokenRecord | null {
  if (!data?.user_id || !data?.code || !data?.expires_at) return null;
  return {
    user_id: String(data.user_id),
    code: String(data.code).toUpperCase(),
    created_at: String(data.created_at ?? new Date().toISOString()),
    expires_at: String(data.expires_at),
    linked_at: data.linked_at ? String(data.linked_at) : null,
    line_user_id: data.line_user_id ? String(data.line_user_id) : null,
  };
}

function isExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now();
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const existing = await db.collection(COLLECTION).where("code", "==", code).limit(1).get();
    if (existing.empty) return code;
  }

  throw new Error("ไม่สามารถสร้างรหัสเชื่อม LINE ได้ในขณะนี้");
}

export async function createLineLinkToken(userId: string): Promise<LineLinkTokenRecord> {
  const code = await generateUniqueCode();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + EXPIRY_MINUTES * 60 * 1000);
  const record: LineLinkTokenRecord = {
    user_id: userId,
    code,
    created_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    linked_at: null,
    line_user_id: null,
  };

  await db.collection(COLLECTION).doc(userId).set(record, { merge: true });
  return record;
}

export async function getLineLinkTokenByUserId(userId: string): Promise<LineLinkTokenRecord | null> {
  const doc = await db.collection(COLLECTION).doc(userId).get();
  const record = toRecord(doc.data());
  if (!record) return null;
  if (record.linked_at || isExpired(record.expires_at)) return null;
  return record;
}

export async function findLineLinkTokenByCode(code: string): Promise<LineLinkTokenRecord | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const snap = await db.collection(COLLECTION).where("code", "==", normalized).limit(1).get();
  if (snap.empty) return null;

  const record = toRecord(snap.docs[0].data());
  if (!record) return null;
  if (record.linked_at || isExpired(record.expires_at)) return null;
  return record;
}

export async function consumeLineLinkToken(userId: string, lineUserId: string): Promise<void> {
  await db.collection(COLLECTION).doc(userId).set({
    linked_at: new Date().toISOString(),
    line_user_id: lineUserId,
  }, { merge: true });
}

export async function clearLineLinkToken(userId: string): Promise<void> {
  await db.collection(COLLECTION).doc(userId).delete().catch(() => {});
}
