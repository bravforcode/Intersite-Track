const DEV_JWT_SECRET = "your-secret-key-change-in-production-min-32-chars";
const DEV_ENCRYPTION_KEY = "trello-dev-key-32-chars-padding!!";
const DEV_CSRF_SECRET = "csrf-dev-secret-change-in-production-32";

const REQUIRED_PRODUCTION_ENV = [
  "JWT_SECRET",
  "ENCRYPTION_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "CRON_SECRET",
  "ALLOWED_ORIGIN",
] as const;

function normalizedEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

export function getRequiredEnv(name: string): string {
  const value = normalizedEnv(name);
  if (!value) {
    // If it's a critical infra key like BLOB, we still throw, 
    // but for others we might want to be more resilient
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getJwtSecret(): string {
  const secret = normalizedEnv("JWT_SECRET");
  if (isProductionRuntime()) {
    if (!secret) {
      throw new Error("Missing required production environment variable: JWT_SECRET");
    }
    if (secret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters in production");
    return secret;
  }
  return secret || DEV_JWT_SECRET;
}

export function getEncryptionKey(): string {
  const key = normalizedEnv("ENCRYPTION_KEY");
  if (isProductionRuntime()) {
    if (!key) {
      throw new Error("Missing required production environment variable: ENCRYPTION_KEY");
    }
    if (key.length < 32) throw new Error("ENCRYPTION_KEY must be at least 32 characters in production");
    return key;
  }
  return key || DEV_ENCRYPTION_KEY;
}

export function getCsrfSecret(): string {
  const secret = normalizedEnv("CSRF_SECRET") || normalizedEnv("JWT_SECRET");
  if (isProductionRuntime()) {
    if (!secret) {
      throw new Error("Missing required production environment variable: CSRF_SECRET or JWT_SECRET");
    }
    if (secret.length < 32) throw new Error("CSRF secret must be at least 32 characters in production");
    return secret;
  }
  return secret || DEV_CSRF_SECRET;
}

export function validateProductionRuntimeEnv(): void {
  if (!isProductionRuntime()) return;

  const missing = REQUIRED_PRODUCTION_ENV.filter((name) => !normalizedEnv(name));
  const originStr = normalizedEnv("ALLOWED_ORIGIN");
  
  const allowedOrigins = originStr
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const invalidOrigins = allowedOrigins.filter(
    (origin) => origin === "*" || (origin.startsWith("http://localhost") && !process.env.VERCEL_ENV)
  );

  if (missing.length > 0 || invalidOrigins.length > 0) {
    const messages: string[] = [];
    if (missing.length > 0) {
      messages.push(`Missing infra environment variables: ${missing.join(", ")}`);
    }
    if (invalidOrigins.length > 0) {
      messages.push(`ALLOWED_ORIGIN contains insecure origins: ${invalidOrigins.join(", ")}`);
    }

    throw new Error(`Missing required production environment variables: ${messages.join("; ")}`);
  }

  getJwtSecret();
  getEncryptionKey();
  getCsrfSecret();
}
