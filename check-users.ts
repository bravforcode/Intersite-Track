// @ts-nocheck
// Legacy Postgres inspection script retained for reference during the Firestore migration.
import pool from "./server/database/connection.js";

async function checkUsers() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    client.release();
  }
}

checkUsers();
