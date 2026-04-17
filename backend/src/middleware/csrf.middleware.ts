/**
 * Stateless CSRF protection using a signed double-submit token.
 *
 * The token is stored in an httpOnly SameSite cookie and also returned in the
 * response header/body so the same-origin frontend can echo it in mutating
 * requests. The server verifies the cookie/header match and validates the HMAC
 * signature, expiry, and bound subject without keeping process-local state.
 */

import { Request, Response, NextFunction } from "express";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getCsrfSecret } from "../config/runtime.js";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_VERSION = "v1";
const CSRF_TOKEN_TTL_MS = 3600_000;

type ParsedCSRFToken = {
  expiresAt: number;
  nonce: string;
  subjectHash: string;
  signature: string;
  payload: string;
};

function getRequestSubject(req: Request): string {
  return req.user?.id || "anonymous";
}

function hashSubject(subject: string): string {
  return createHash("sha256").update(subject).digest("hex");
}

function signPayload(payload: string): string {
  return createHmac("sha256", getCsrfSecret()).update(payload).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCSRFToken(token: unknown): ParsedCSRFToken | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 5) return null;

  const [version, expiresAtRaw, nonce, subjectHash, signature] = parts;
  if (version !== CSRF_TOKEN_VERSION) return null;
  if (!/^\d+$/.test(expiresAtRaw)) return null;
  if (!/^[0-9a-f]{32}$/i.test(nonce)) return null;
  if (!/^[0-9a-f]{64}$/i.test(subjectHash)) return null;
  if (!/^[0-9a-f]{64}$/i.test(signature)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt)) return null;

  return {
    expiresAt,
    nonce,
    subjectHash,
    signature,
    payload: `${version}.${expiresAtRaw}.${nonce}.${subjectHash}`,
  };
}

function validateTokenForRequest(token: unknown, req: Request): string | null {
  const parsed = parseCSRFToken(token);
  if (!parsed) return "Invalid CSRF token format";
  if (parsed.expiresAt < Date.now()) return "CSRF token expired. Please refresh and try again.";

  const expectedSignature = signPayload(parsed.payload);
  if (!safeEqual(parsed.signature, expectedSignature)) {
    return "Invalid CSRF token signature";
  }

  const expectedSubjectHash = hashSubject(getRequestSubject(req));
  if (!safeEqual(parsed.subjectHash, expectedSubjectHash)) {
    return "CSRF token session mismatch. Token cannot be used by this user.";
  }

  return null;
}

export function generateCSRFToken(subject = "anonymous", now = Date.now()): string {
  const expiresAt = now + CSRF_TOKEN_TTL_MS;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${CSRF_TOKEN_VERSION}.${expiresAt}.${nonce}.${hashSubject(subject)}`;
  return `${payload}.${signPayload(payload)}`;
}

export function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction): void {
  let token = req.cookies?.[CSRF_COOKIE_NAME];

  if (validateTokenForRequest(token, req)) {
    token = generateCSRFToken(getRequestSubject(req));
  }

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: CSRF_TOKEN_TTL_MS,
  });

  res.set("X-CSRF-Token", token);
  next();
}

export function validateCSRFToken(req: Request, res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  const tokenFromHeader = req.headers[CSRF_HEADER_NAME] as string | undefined;
  const tokenFromBody = (req.body as { _csrf?: string } | undefined)?._csrf;
  const tokenFromCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const clientToken = tokenFromHeader || tokenFromBody;

  if (!clientToken) {
    res.status(403).json({ error: "CSRF token missing. Include x-csrf-token header or _csrf in body." });
    return;
  }

  if (!tokenFromCookie) {
    res.status(403).json({ error: "CSRF token cookie missing. Request session is invalid." });
    return;
  }

  if (!safeEqual(clientToken, tokenFromCookie)) {
    res.status(403).json({ error: "CSRF token mismatch. This request was rejected for security." });
    console.error(`[CSRF ATTACK DETECTED] IP=${req.ip} User=${req.user?.id || "anonymous"} Path=${req.path}`);
    return;
  }

  const validationError = validateTokenForRequest(clientToken, req);
  if (validationError) {
    res.status(403).json({ error: validationError });
    return;
  }

  next();
}

export function clearCSRFToken(_req: Request, res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME);
}

export const csrfProtection = {
  token: csrfTokenMiddleware,
  validate: validateCSRFToken,
  clear: clearCSRFToken,
};
