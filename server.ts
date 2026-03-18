import express from "express";
import { createServer as createViteServer } from "vite";
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

app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes (must come before SPA routes)
app.use("/api", apiRateLimiter, apiRoutes);

async function start() {
  await initDB();

  // Vite SPA or static serving (before error handlers)
  if (isDev) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (_req, res) => res.sendFile(path.join(process.cwd(), "dist", "index.html")));
  }

  // Error handling (must come after all other routes)
  app.use(notFound);
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.warn(`🚀 Intersite Track running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
