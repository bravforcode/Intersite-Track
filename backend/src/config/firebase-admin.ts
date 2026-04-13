import admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

let envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(process.cwd(), "../.env");
}
dotenv.config({ path: envPath });

if (!admin.apps.length) {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !clientEmail || !rawKey) {
    throw new Error("Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY in environment variables");
  }

  // Support both base64-encoded key and raw key with escaped newlines
  const isBase64 = !rawKey.includes("-----BEGIN");
  const privateKey = isBase64
    ? Buffer.from(rawKey, "base64").toString("utf-8")
    : rawKey.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export const adminAuth = admin.auth();
export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
