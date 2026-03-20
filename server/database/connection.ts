import pg from "pg";
import { databaseConfig } from "../config/database.js";

const { Pool } = pg;

// Create connection pool
export const pool = new Pool(databaseConfig);

/**
 * Execute a query
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<pg.QueryResult<T>> {
  return pool.query(sql, params);
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all connections
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

export default pool;
