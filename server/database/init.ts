import pool from "./connection.js";

/**
 * Verify database connectivity on startup.
 * Schema is managed via Supabase migrations (MCP apply_migration).
 */
export async function initDB(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.warn("✅ Database connection verified");
  } finally {
    client.release();
  }
}
