// @ts-nocheck
// Legacy Postgres inspection script retained for reference during the Firestore migration.
import pool from "./server/database/connection.js";

async function checkChecklists() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'task_checklists';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    client.release();
  }
}

checkChecklists();
