// @ts-nocheck
// Legacy Supabase/Postgres migration runner retained for reference during the Firestore migration.
import fs from "fs";
import path from "path";
import pool from "./server/database/connection.js";

async function applyMigrations() {
  const migrationsDir = "./supabase/migrations";
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${migrationFiles.length} migrations.`);

  const client = await pool.connect();
  try {
    for (const file of migrationFiles) {
      // Let's try to run everything from 20260331 onwards
      if (file < "20260331000000") {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      
      try {
        await client.query("BEGIN");
        // Split by ; and run one by one if it's too big, but usually pg pool can handle it
        // However, DO $$ blocks might need care.
        // Let's try running the whole file first.
        await client.query(sql);
        await client.query("COMMIT");
        console.log(`Successfully applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`Failed to apply ${file}:`, err.message);
        // Continue with next migration if this one fails (might be because some parts already exist)
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigrations();
