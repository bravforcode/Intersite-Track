// @ts-nocheck
// Legacy Postgres inspection script retained for reference during the Firestore migration.
import pool from "./server/database/connection.js";

async function checkTables() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    client.release();
  }
}

checkTables();
