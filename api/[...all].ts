import express from "express";
import dotenv from "dotenv";
import path from "path";
import apiRoutes from "../server/routes/index";
import { notFound, errorHandler } from "../server/middleware/error.middleware";
import { apiRateLimiter } from "../server/middleware/rateLimit.middleware";
import { initDB } from "../server/database/init";

dotenv.config();

const app = express();
const uploadsRoot = process.env.VERCEL ? "/tmp" : process.cwd();
const uploadsDir = path.join(uploadsRoot, "uploads");

let initPromise: Promise<void> | null = null;

function ensureInitialized() {
  if (!initPromise) {
    initPromise = initDB();
  }
  return initPromise;
}

app.use(async (_req, _res, next) => {
  try {
    await ensureInitialized();
    next();
  } catch (error) {
    next(error);
  }
});

app.use(express.json());
app.use("/uploads", express.static(uploadsDir));
app.use("/api", apiRateLimiter, apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
