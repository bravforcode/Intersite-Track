import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import apiRoutes from "../src/routes/index.js";
import { notFound, errorHandler } from "../src/middleware/error.middleware.js";
import { apiRateLimiter } from "../src/middleware/rateLimit.middleware.js";

dotenv.config();

const app = express();
const isDev = process.env.NODE_ENV !== "production";
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://localhost:3694", "http://localhost:5173"];

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
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => {
    (req as express.Request).rawBody = Buffer.from(buf);
  },
}));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRateLimiter, apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
