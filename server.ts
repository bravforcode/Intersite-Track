import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import apiRoutes from "./server/routes/index";
import { notFound, errorHandler } from "./server/middleware/error.middleware";
import { apiRateLimiter } from "./server/middleware/rateLimit.middleware";
import { initDB } from "./server/database/init";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3694;
const isDev = process.env.NODE_ENV !== "production";

app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes
app.use("/api", apiRateLimiter, apiRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

async function start() {
  await initDB();

  if (isDev) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (_req, res) => res.sendFile(path.join(process.cwd(), "dist", "index.html")));
  }

  app.listen(PORT, () => {
    console.warn(`🚀 Intersite Track running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
