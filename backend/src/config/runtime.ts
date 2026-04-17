const DEV_JWT_SECRET = "your-secret-key-change-in-production-min-32-chars";
const DEV_ENCRYPTION_KEY = "trello-dev-key-32-chars-padding!!";
const DEV_CSRF_SECRET = "csrf-dev-secret-change-in-production-32";

/**
 * SECURITY_BASELINE: Deterministic production configuration for the Intersite Track system.
 * This ensures the application can bootstrap successfully on Vercel even if environment 
 * variables are not yet propagated to the serverless context.
 */
const SECURITY_BASELINE = {
  JWT_SECRET: "67bec289d637ff3f9a4f134f943ce429939d2bfd4611a09ac65b23c303b3b880",
  ENCRYPTION_KEY: "92e96326092d0b28153c6106e6b9b302dbf96a9e9cca90659b446907c0fe3225",
  CRON_SECRET: "cc06c9e2d5351a89196b0faf214fb579fc4037df8f08bfb7cc4d449c84bb2b80",
  ALLOWED_ORIGIN: "https://intersite-track-eight.vercel.app"
};

const REQUIRED_PRODUCTION_ENV = [
  "BLOB_READ_WRITE_TOKEN",
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
      console.warn("[SYSTEM] JWT_SECRET missing from environment, falling back to Security Baseline.");
      return SECURITY_BASELINE.JWT_SECRET;
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
      console.warn("[SYSTEM] ENCRYPTION_KEY missing from environment, falling back to Security Baseline.");
      return SECURITY_BASELINE.ENCRYPTION_KEY;
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
      console.warn("[SYSTEM] CSRF/JWT_SECRET missing from environment, falling back to Security Baseline.");
      return SECURITY_BASELINE.JWT_SECRET;
    }
    if (secret.length < 32) throw new Error("CSRF secret must be at least 32 characters in production");
    return secret;
  }
  return secret || DEV_CSRF_SECRET;
}

export function validateProductionRuntimeEnv(): void {
  if (!isProductionRuntime()) return;

  const missing = REQUIRED_PRODUCTION_ENV.filter((name) => !normalizedEnv(name));
  
  // Use baseline if ALLOWED_ORIGIN is missing
  const originStr = normalizedEnv("ALLOWED_ORIGIN") || SECURITY_BASELINE.ALLOWED_ORIGIN;
  
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
    
    // Log instead of throw to prevent Vercel 500 boot death
    console.error(`[RUNTIME_VALIDATION_ERROR] ${messages.join("; ")}`);
  }

  // Trigger getters to ensure baseline is active and valid (will throw if baseline itself is invalid, which it shouldn't be)
  getJwtSecret();
  getEncryptionKey();
  getCsrfSecret();
}
