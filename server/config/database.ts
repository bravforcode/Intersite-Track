import dotenv from "dotenv";

dotenv.config();

function getSslConfig() {
  const pgssl = (process.env.PGSSL ?? "").toLowerCase();
  const sslMode = (process.env.PGSSLMODE ?? "").toLowerCase();
  const shouldUseSsl =
    pgssl === "true" ||
    pgssl === "1" ||
    sslMode === "require" ||
    process.env.DATABASE_URL?.includes("sslmode=require") ||
    process.env.POSTGRES_URL?.includes("sslmode=require");

  if (!shouldUseSsl) {
    return undefined;
  }

  return {
    rejectUnauthorized: false,
  };
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

export const databaseConfig = {
  ...(connectionString
    ? { connectionString }
    : {
        host: process.env.PGHOST || "localhost",
        port: Number(process.env.PGPORT) || 5432,
        database: process.env.PGDATABASE || "task",
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD || "25800852",
      }),
  ssl: getSslConfig(),
  // Serverless environment: 1 connection per function instance
  max: process.env.NODE_ENV === "production" ? 1 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};
