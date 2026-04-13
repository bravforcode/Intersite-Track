import type { SignOptions } from "jsonwebtoken";

export const jwtConfig = {
  secret: process.env.JWT_SECRET || "your-secret-key-change-in-production-min-32-chars",
  expiresIn: (process.env.JWT_EXPIRES_IN || "24h") as SignOptions["expiresIn"],
};
