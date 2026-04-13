import crypto from "node:crypto";
import { Request, Response, NextFunction } from "express";

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyLineSignature(req: Request, res: Response, next: NextFunction): void {
  if (!LINE_CHANNEL_SECRET) {
    res.status(500).json({ error: "LINE webhook secret ยังไม่ได้ตั้งค่า" });
    return;
  }

  const signature = req.get("x-line-signature") ?? "";
  if (!signature) {
    res.status(401).json({ error: "Missing X-Line-Signature" });
    return;
  }

  if (!req.rawBody) {
    res.status(400).json({ error: "Missing raw body for LINE signature verification" });
    return;
  }

  const expected = crypto
    .createHmac("sha256", LINE_CHANNEL_SECRET)
    .update(req.rawBody)
    .digest("base64");

  if (!safeEquals(signature, expected)) {
    res.status(401).json({ error: "Invalid X-Line-Signature" });
    return;
  }

  next();
}
