import { probeDatabaseHealth } from "./health.js";

/**
 * Verify Firestore connectivity on startup.
 * Cache the startup result and keep the server alive so non-DB diagnostics
 * (health, CSRF, headers, auth bootstrap) remain reachable during incidents.
 */
export async function initDB(): Promise<void> {
  const snapshot = await probeDatabaseHealth(true);
  if (snapshot.status === "ok") {
    console.error("✅ Firestore connection verified");
    return;
  }

  console.warn(`⚠️ Firestore startup check degraded: ${snapshot.message ?? "unknown error"}`);
  console.warn("⚠️ Continuing startup so health checks and non-DB diagnostics remain available");
}
