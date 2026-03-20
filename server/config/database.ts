import dotenv from "dotenv";

dotenv.config();

export const databaseConfig = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || "task",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "25800852",
  // Serverless environment: 1 connection per function instance
  max: process.env.NODE_ENV === "production" ? 1 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};
