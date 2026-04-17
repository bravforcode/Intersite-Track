import { db } from "./connection.js";

export type DatabaseDependencyStatus = "unknown" | "ok" | "degraded";

export type DatabaseHealthSnapshot = {
  status: DatabaseDependencyStatus;
  checkedAt: string | null;
  message: string | null;
};

const CACHE_TTL_MS = Number(process.env.DB_HEALTH_CACHE_TTL_MS ?? "30000");
const TIMEOUT_MS = Number(process.env.DB_HEALTH_TIMEOUT_MS ?? "5000");

let lastCheckedAtMs = 0;
let snapshot: DatabaseHealthSnapshot = {
  status: "unknown",
  checkedAt: null,
  message: null,
};
let inFlightProbe: Promise<DatabaseHealthSnapshot> | null = null;

function isoNow(): string {
  return new Date().toISOString();
}

function toMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Firestore health check timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function updateSnapshot(status: DatabaseDependencyStatus, message: string | null): DatabaseHealthSnapshot {
  lastCheckedAtMs = Date.now();
  snapshot = {
    status,
    checkedAt: isoNow(),
    message,
  };
  return { ...snapshot };
}

export function getDatabaseHealthSnapshot(): DatabaseHealthSnapshot {
  return { ...snapshot };
}

export async function probeDatabaseHealth(force: boolean = false): Promise<DatabaseHealthSnapshot> {
  const cacheFresh =
    !force &&
    snapshot.status !== "unknown" &&
    lastCheckedAtMs > 0 &&
    Date.now() - lastCheckedAtMs < CACHE_TTL_MS;

  if (cacheFresh) {
    return getDatabaseHealthSnapshot();
  }

  if (inFlightProbe) {
    return inFlightProbe;
  }

  inFlightProbe = (async () => {
    try {
      await withTimeout(db.collection("_health").limit(1).get(), TIMEOUT_MS);
      return updateSnapshot("ok", null);
    } catch (error) {
      return updateSnapshot("degraded", toMessage(error));
    } finally {
      inFlightProbe = null;
    }
  })();

  return inFlightProbe;
}
