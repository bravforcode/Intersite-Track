import express from "express";
import { createServer as createViteServer } from "vite";
import net from "node:net";
import path from "path";
import dotenv from "dotenv";
import apiRoutes from "./server/routes/index.js";
import { notFound, errorHandler } from "./server/middleware/error.middleware.js";
import { apiRateLimiter } from "./server/middleware/rateLimit.middleware.js";
import { initDB } from "./server/database/init.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3694;
const isDev = process.env.NODE_ENV !== "production";
const DEFAULT_HMR_PORT = 24678;

app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes (must come before SPA routes)
app.use("/api", apiRateLimiter, apiRoutes);

function canListenOnPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once("error", (_error: NodeJS.ErrnoException) => {
      resolve(false);
    });

    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port);
  });
}

async function findAvailablePort(startPort: number, maxAttempts = 20): Promise<number> {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidatePort = startPort + offset;

    if (await canListenOnPort(candidatePort)) {
      return candidatePort;
    }
  }

  throw new Error(`Unable to find a free port starting at ${startPort}.`);
}

async function start() {
  if (!(await canListenOnPort(PORT))) {
    console.error(`Port ${PORT} is already in use. Another dev server may already be running at http://localhost:${PORT}.`);
    process.exit(1);
  }

  await initDB();

  // Vite SPA or static serving (before error handlers)
  if (isDev) {
    const hmrEnabled = process.env.DISABLE_HMR !== "true";
    const hmrPort = hmrEnabled ? await findAvailablePort(DEFAULT_HMR_PORT) : undefined;

    if (hmrEnabled && hmrPort !== DEFAULT_HMR_PORT) {
      console.warn(`Vite HMR port ${DEFAULT_HMR_PORT} is busy, using ${hmrPort} instead.`);
    }

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrEnabled ? { port: hmrPort } : false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (_req, res) => res.sendFile(path.join(process.cwd(), "dist", "index.html")));
  }

  // Error handling (must come after all other routes)
  app.use(notFound);
  app.use(errorHandler);

  const server = app.listen(PORT, () => {
    console.warn(`🚀 Intersite Track running on http://localhost:${PORT}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Another dev server may already be running at http://localhost:${PORT}.`);
      process.exit(1);
    }

    throw error;
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
