import express from "express";
import type { Server } from "node:http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

dotenv.config({ path: "../.env" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3694;
const isDev = process.env.NODE_ENV !== "production";
const isE2eMock = (process.env.E2E_MOCK ?? "0") === "1";
let server: Server | undefined;
let frontendDistPath: string | null = null;

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
        ...(process.env.ALLOWED_ORIGIN
          ? process.env.ALLOWED_ORIGIN.split(",").map((o) => o.trim())
          : []),
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
  // SECURITY FIX: Hardened HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: isDev ? 3600 : 31536000, // 1 year in production
    includeSubDomains: !isDev, // Include all subdomains
    preload: !isDev, // Allow HSTS preload list submission
  },
  // SECURITY: Prevent Clickjacking attacks
  frameguard: {
    action: "deny" as const,
  },
  // SECURITY: Prevent MIME type sniffing
  noSniff: true,
  // SECURITY: XSS Protection header
  xssFilter: true,
  // SECURITY: Referrer Policy
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin" as const,
  },
  // SECURITY: Permissions Policy (formerly Feature Policy)
  permissionsPolicy: {
    geolocation: [],
    microphone: [],
    camera: [],
    payment: [],
  },
};

// Security: HTTP headers
app.use(helmet(helmetConfig));

// Security: CORS
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map((o) => o.trim())
  : [`http://localhost:${PORT}`, "http://localhost:5180"];

app.use(
  cors({
    origin: isDev ? true : allowedOrigins,
    credentials: true,
  })
);

// SECURITY FIX: Add cookie parser for CSRF protection
app.use(cookieParser());

// Body size limit
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = Buffer.from(buf);
    },
  })
);

const noopMiddleware: express.RequestHandler = (_req, _res, next) => next();

const { notFound, errorHandler } = await import("./src/middleware/error.middleware.js");
const { validateProductionRuntimeEnv } = await import("./src/config/runtime.js");
const { csrfProtection } = await import("./src/middleware/csrf.middleware.js");
const { getDatabaseHealthSnapshot, probeDatabaseHealth } = await import("./src/database/health.js");

validateProductionRuntimeEnv();

const { apiRateLimiter } = isE2eMock
  ? { apiRateLimiter: noopMiddleware }
  : await import("./src/middleware/rateLimit.middleware.js");

const { optionalAuth } = isE2eMock
  ? { optionalAuth: noopMiddleware }
  : await import("./src/middleware/auth.middleware.js");

const { auditRateLimitMiddleware, auditCSRFMiddleware, auditApiRequestMiddleware } = isE2eMock
  ? {
      auditRateLimitMiddleware: noopMiddleware,
      auditCSRFMiddleware: noopMiddleware,
      auditApiRequestMiddleware: noopMiddleware,
    }
  : await import("./src/middleware/audit.middleware.js");

const apiRoutes = isE2eMock
  ? (await import("./src/routes/e2e-mock.routes.js")).default
  : (await import("./src/routes/index.js")).default;

// Static serving for production
if (!isDev) {
  frontendDistPath =
    [path.join(__dirname, "../frontend/dist"), path.join(__dirname, "../dist")]
      .find((candidate) => fs.existsSync(candidate)) ?? null;

  if (!frontendDistPath) {
    throw new Error("Frontend build output not found. Expected frontend/dist or dist.");
  }

  app.use(express.static(frontendDistPath));
}

// SECURITY: Do NOT serve /uploads statically
// All file access must go through authenticated API endpoints (/api/files/:fileId/download)

// Health check endpoint
app.get("/", (_req, res) => {
  res.json({ 
    status: "ok", 
    message: "Intersite Track API running",
    environment: process.env.NODE_ENV,
    frontend: isDev ? (process.env.ALLOWED_ORIGIN?.split(",")[0] || "http://localhost:5180") : undefined
  });
});

app.get("/api/live", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health", async (_req, res) => {
  const firestore = await probeDatabaseHealth();
  const ok = firestore.status === "ok";
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    dependencies: { firestore },
  });
});

// SECURITY FIX: CSRF Token endpoint
// Frontend calls this to get a fresh CSRF token on initial load
app.get("/api/csrf-token", optionalAuth, csrfProtection.token, (_req, res) => {
  const token = res.getHeader("X-CSRF-Token") as string | undefined;
  res.json({
    csrfToken: token,
    expiresIn: 3600000, // 1 hour
  });
});

// Favicon (suppress 404 in logs)
app.get("/favicon.ico", (_req, res) => {
  res.status(204).send();
});

// API routes (must come after CSRF token endpoint, CSRF validation applied below)
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

// SPA fallback must come after API routes so GET /api/* is never swallowed in production.
if (!isDev && frontendDistPath) {
  app.get("*", (_req, res) => res.sendFile(path.join(frontendDistPath!, "index.html")));
}

// Error handling
app.use(notFound);
app.use(errorHandler);

async function start() {
  if (!isE2eMock) {
    const { initDB } = await import("./src/database/init.js");
    await initDB();
    if (!process.env.VERCEL) {
      const dbHealth = getDatabaseHealthSnapshot();
      if (dbHealth.status === "ok") {
        const { scheduleCronJobs } = await import("./src/cron.js");
        scheduleCronJobs();
      } else {
        console.warn(`Skipping local cron scheduling because Firestore is ${dbHealth.status}`);
      }
    }
  }

  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
    if (!isDev) {
      console.log(`Serving static files from: ${frontendDistPath}`);
    }
  });

  server.on("error", (error: any) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
      process.exit(1);
    }
    throw error;
  });
}

function shutdown(signal: NodeJS.Signals) {
  console.warn(`${signal} received. Closing backend server...`);

  if (!server) {
    process.exit(0);
  }

  const forceExit = setTimeout(() => {
    console.error("Forced shutdown after waiting for open connections.");
    process.exit(1);
  }, 5_000);
  forceExit.unref();

  server.close((error) => {
    clearTimeout(forceExit);
    if (error) {
      console.error(error);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
