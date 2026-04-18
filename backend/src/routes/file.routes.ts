import { Router } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Readable } from "stream";
import { ReadableStream as NodeReadableStream } from "node:stream/web";
import { requireAuth } from "../middleware/auth.middleware.js";
import { canAccessFile, getFileMetadata } from "../services/storageService.js";
import { ensureTaskAccess } from "../utils/taskAccess.js";

const router = Router();
const isDev = process.env.NODE_ENV !== "production" && !process.env.VERCEL;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const uploadsDir = path.join(repoRoot, "uploads");

function safeAttachmentName(originalName: string): string {
  return (path.basename(originalName).replace(/["\r\n]+/g, "_").trim() || "download");
}

// GET /api/files/:fileId/download — secure file download with authorization
router.get("/:fileId/download", requireAuth, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const file = await getFileMetadata(fileId);

    if (!file) {
      res.status(404).json({ error: "ไฟล์ไม่พบ" });
      return;
    }

    const canDownload = await canAccessFile(
      req.user!.id,
      req.user!.role,
      fileId,
      (user, taskId) => ensureTaskAccess(user, taskId)
    );

    if (!canDownload) {
      res.status(403).json({ error: "คุณไม่มีสิทธิ์ดาวน์โหลดไฟล์นี้" });
      return;
    }

    if (isDev) {
      const filename = file.blob_url.replace("/uploads/", "");
      const filepath = path.join(uploadsDir, filename);
      const buffer = await fs.promises.readFile(filepath);
      res.set({
        "Content-Type": file.mime_type,
        "Content-Disposition": `attachment; filename="${safeAttachmentName(file.original_name)}"`,
      });
      res.send(buffer);
      return;
    }

    const { get } = await import("@vercel/blob");
    const blob = await get(file.blob_url, { access: "private", useCache: false });
    if (!blob?.stream) {
      res.status(404).json({ error: "ไฟล์ไม่พบ" });
      return;
    }

    const contentLength = blob.headers.get("content-length");
    res.set({
      "Content-Type": blob.blob.contentType || file.mime_type,
      "Content-Disposition": `attachment; filename="${safeAttachmentName(file.original_name)}"`,
      ...(contentLength ? { "Content-Length": contentLength } : {}),
    });
    Readable.fromWeb(blob.stream as NodeReadableStream<Uint8Array>)
      .on("error", next)
      .pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;
