import { db } from "./connection.js";

/**
 * Verify Firestore connectivity on startup.
 */
export async function initDB(): Promise<void> {
  try {
    await db.collection("_health").limit(1).get();
    console.warn("✅ Firestore connection verified");
  } catch (err) {
    console.warn("⚠️ Firestore connection check failed:", err);
  }
}
