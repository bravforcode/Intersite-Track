import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import apiRoutes from "../src/routes/index.js";
import { notFound, errorHandler } from "../src/middleware/error.middleware.js";
import { apiRateLimiter } from "../src/middleware/rateLimit.middleware.js";
import { csrfProtection } from "../src/middleware/csrf.middleware.js";
import { optionalAuth } from "../src/middleware/auth.middleware.js";
import { validateProductionRuntimeEnv, isProductionRuntime } from "../src/config/runtime.js";
import { probeDatabaseHealth } from "../src/database/health.js";
import { logger } from "../src/utils/logger.js";
import {
  auditRateLimitMiddleware,
  auditCSRFMiddleware,
  auditApiRequestMiddleware,
} from "../src/middleware/audit.middleware.js";

// Vercel Serverless Boot Diagnostic
console.log(`[BOOT] Intersite API Initializing... ENV: ${process.env.NODE_ENV || 'development'}`);

try {
  dotenv.config();
  validateProductionRuntimeEnv();
} catch (error) {
  console.error("[BOOT_CRITICAL_FAILURE]", error);
  // On Vercel, we want to see this explicitly in the logs
  process.stderr.write(`FATAL: Backend failed to initialize configuration: ${error instanceof Error ? error.message : String(error)}\n`);
}

const app = express();
const isDev = !isProductionRuntime();

// Ensure parity between runtime logic and CORS
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "https://intersite-track-eight.vercel.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const helmetConfig = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: [
        "'self'",
        isDev ? "http://localhost:5173" : undefined,
        isDev ? "http://localhost:3694" : undefined,
        "https://*.googleapis.com",
        "https://securetoken.googleapis.com",
        "https://identitytoolkit.googleapis.com",
        "https://firestore.googleapis.com",
        "https://firebasestorage.googleapis.com",
        "https://*.vercel.com",
        "https://blob.vercelcdn.com",
      ].filter(Boolean) as string[],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: isDev ? 3600 : 31536000,
    includeSubDomains: !isDev,
    preload: !isDev,
  },
};

app.use(helmet(helmetConfig));
app.use(cors({ origin: isDev ? true : allowedOrigins, credentials: true }));
// SECURITY: cookie-parser required for CSRF double-submit cookie pattern
app.use(cookieParser());
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => {
    (req as any).rawBody = Buffer.from(buf);
  },
}));

app.get("/api/live", (_req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    region: process.env.VERCEL_REGION || 'local'
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    const firestore = await probeDatabaseHealth();
    const ok = firestore.status === "ok";
    res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "degraded",
      dependencies: { firestore },
    });
  } catch (error) {
    logger.error("Health probe failed", error);
    res.status(500).json({ status: "error", message: "Health probe failed" });
  }
});

// SECURITY: CSRF token endpoint — must be registered BEFORE the validate middleware
app.get("/api/csrf-token", optionalAuth, csrfProtection.token, (_req, res) => {
  const token = res.getHeader("X-CSRF-Token") as string | undefined;
  res.json({ csrfToken: token, expiresIn: 3600000 });
});

// SECURITY: All state-changing API requests validated for CSRF + audit logged
app.use(
  "/api",
  optionalAuth,
  auditCSRFMiddleware,
  auditRateLimitMiddleware,
  apiRateLimiter,
  csrfProtection.validate,
  auditApiRequestMiddleware,
  apiRoutes
);

app.use(notFound);
app.use(errorHandler);

console.log("[BOOT] Intersite API Middleware stack mounted.");

export default app;
