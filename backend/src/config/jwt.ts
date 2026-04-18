import type { SignOptions } from "jsonwebtoken";
import { getJwtSecret } from "./runtime.js";

export const jwtConfig = {
  secret: getJwtSecret(),
  expiresIn: (process.env.JWT_EXPIRES_IN || "24h") as SignOptions["expiresIn"],
};
