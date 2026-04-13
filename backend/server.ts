import express from "express";
import type { Server } from "node:http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import apiRoutes from "./src/routes/index.js";
import { notFound, errorHandler } from "./src/middleware/error.middleware.js";
import { apiRateLimiter } from "./src/middleware/rateLimit.middleware.js";
import { initDB } from "./src/database/init.js";
import "./src/cron.js";

dotenv.config({ path: "../.env" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3694;
const isDev = process.env.NODE_ENV !== "production";
let server: Server | undefined;

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

// Security: HTTP headers
app.use(helmet(helmetConfig));

// Security: CORS
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map((o) => o.trim())
  : [`http://localhost:${PORT}`, "http://localhost:5173"];

app.use(
  cors({
    origin: isDev ? true : allowedOrigins,
    credentials: true,
  })
);

// Body size limit
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = Buffer.from(buf);
    },
  })
);

// Static serving for production
if (!isDev) {
  const distPath =
    [path.join(__dirname, "../frontend/dist"), path.join(__dirname, "../dist")]
      .find((candidate) => fs.existsSync(candidate));

  if (!distPath) {
    throw new Error("Frontend build output not found. Expected frontend/dist or dist.");
  }

  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

// SECURITY: Do NOT serve /uploads statically
// All file access must go through authenticated API endpoints (/api/files/:fileId/download)

// Health check endpoint
app.get("/", (_req, res) => {
  res.json({ 
    status: "ok", 
    message: "Intersite Track API running",
    environment: process.env.NODE_ENV,
    frontend: isDev ? "http://localhost:5173" : undefined
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Favicon (suppress 404 in logs)
app.get("/favicon.ico", (_req, res) => {
  res.status(204).send();
});

// API routes (must come before SPA routes)
app.use("/api", apiRateLimiter, apiRoutes);

async function start() {
  await initDB();

  // Error handling (must come after all routes)
  app.use(notFound);
  app.use(errorHandler);

  server = app.listen(PORT, () => {
    console.warn(`🚀 Intersite Track running on http://localhost:${PORT}`);
    if (isDev) {
      console.warn(`📦 Frontend: http://localhost:5173 (npm run dev:fe)`);
    }
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
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
