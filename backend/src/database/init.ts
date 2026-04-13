import { db } from "./connection.js";

/**
 * Verify Firestore connectivity on startup.
 * Fails HARD in production/staging; logs warning in test environments.
 * This ensures the server does not start if critical dependencies are unavailable.
 *
 * @throws Will throw error in non-test environments if Firestore is unreachable
 */
export async function initDB(): Promise<void> {
  const isTestEnv = process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined;

  try {
    // Try a simple read to verify connectivity
    await db.collection("_health").limit(1).get();
    console.error("✅ Firestore connection verified");
  } catch (err: any) {
    const errorMessage = `Firestore initialization failed: ${err?.message || String(err)}`;

    if (isTestEnv) {
      // In tests, just warn but continue (allows tests to mock Firestore)
      console.warn("⚠️ [TEST MODE] " + errorMessage);
      return;
    }

    // In production/staging, fail hard
    console.error("❌ FATAL: " + errorMessage);
    console.error("🛑 Shutting down server - critical dependency unavailable");
    process.exit(1);
  }
}
