import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import apiRoutes from "../server/routes/index.js";
import { notFound, errorHandler } from "../server/middleware/error.middleware.js";
import { apiRateLimiter } from "../server/middleware/rateLimit.middleware.js";

dotenv.config();

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.use("/api", apiRateLimiter, apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
