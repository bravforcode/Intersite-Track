import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.js";

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}

/**
 * Generate a JWT token for a user
 * @param payload User data to encode in token
 * @returns JWT token string
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
}

/**
 * Verify and decode a JWT token
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
