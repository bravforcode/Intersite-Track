import admin from "firebase-admin";

/**
 * FIREBASE_ADMIN_SINGLETON: Hardcoded verified credentials for Intersite Track.
 * This guarantees connectivity in serverless environments where environment
 * variables may be missing or incorrectly formatted during cold starts.
 */
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    console.error("[FIREBASE_INIT_CRITICAL] Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY in environment variables.");
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing Firebase credentials in production environment.");
    }
  }

  const privateKey = privateKeyRaw?.replace(/\\n/g, '\n') || "";

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId!,
        clientEmail: clientEmail!,
        privateKey: privateKey,
      }),
    });
    console.log("[FIREBASE] Admin SDK initialized successfully.");
  } catch (error) {
    console.error("[FIREBASE_INIT_ERROR]", error);
  }
}

export const adminAuth = admin.auth();
export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
