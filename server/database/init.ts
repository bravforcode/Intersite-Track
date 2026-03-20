import pool from "./connection.js";

/**
 * Verify database connectivity on startup.
 * Schema is managed via Supabase migrations (MCP apply_migration).
 */
export async function initDB(): Promise<void> {
  // Vercel serverless runtime cannot reliably reach Supabase via the pg driver
  // in this project, so the API uses Supabase Data API paths instead.
  if (process.env.VERCEL) {
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.warn("✅ Database connection verified");
  } finally {
    client.release();
  }
}
