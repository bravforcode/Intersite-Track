/**
 * Storage Service - Manages private file uploads with signed URL access
 */
import { db } from "../database/connection.js";

interface FileMetadata {
  id: string;
  task_id: string;
  uploaded_by: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: Date;
  blob_url: string; // For Vercel Blob: the private blob URL
  blob_download_url?: string; // For temporary signed downloads
}

/**
 * Save file metadata to Firestore
 * Enables tracking of who uploaded what and authorization checks
 */
export async function saveFileMetadata(
  taskId: string,
  userId: string,
  originalName: string,
  blobUrl: string,
  mimeType: string,
  sizeBytes: number
): Promise<FileMetadata> {
  const metadata: Omit<FileMetadata, "id"> = {
    task_id: taskId,
    uploaded_by: userId,
    original_name: originalName,
    storage_path: `task-attachments/${taskId}/${Date.now()}-${originalName}`,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    uploaded_at: new Date(),
    blob_url: blobUrl,
  };

  const ref = await db.collection("file_storage").add(metadata);

  return {
    id: ref.id,
    ...metadata,
  };
}

/**
 * Get file metadata by ID
 */
export async function getFileMetadata(fileId: string): Promise<FileMetadata | null> {
  const doc = await db.collection("file_storage").doc(fileId).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...(doc.data() as Omit<FileMetadata, "id">),
  };
}

/**
 * Check if user has access to download a file
 * Access is granted if:
 * - User is admin
 * - User uploaded the file
 * - User has access to the task the file belongs to
 */
export async function canAccessFile(
  userId: string,
  userRole: string,
  fileId: string,
  ensureTaskAccess?: (user: any, taskId: string) => Promise<{ ok: boolean }>
): Promise<boolean> {
  const file = await getFileMetadata(fileId);

  if (!file) {
    return false;
  }

  // Admin can access any file
  if (userRole === "admin") {
    return true;
  }

  // User can download their own file
  if (file.uploaded_by === userId) {
    return true;
  }

  // User can download if they have access to the task
  if (ensureTaskAccess) {
    const taskAccess = await ensureTaskAccess({ id: userId, role: userRole }, file.task_id);
    return taskAccess.ok;
  }

  return false;
}

/**
 * Delete file metadata
 */
export async function deleteFileMetadata(fileId: string): Promise<void> {
  await db.collection("file_storage").doc(fileId).delete();
}

/**
 * List all files for a task
 */
export async function listTaskFiles(taskId: string): Promise<FileMetadata[]> {
  const snapshot = await db
    .collection("file_storage")
    .where("task_id", "==", taskId)
    .orderBy("uploaded_at", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<FileMetadata, "id">),
  }));
}

/**
 * Generate a signed download URL for a file (if using Vercel Blob Signed URLs)
 * For Vercel Blob, we use the download endpoint which handles authentication
 */
export async function getFileDownloadUrl(
  fileId: string,
  _fileMetadata: FileMetadata
): Promise<string> {
  // Server-side endpoint that performs auth checks before redirecting
  return `/api/files/${fileId}/download`;
}

/**
 * Validate file size and type before upload
 */
export function validateFileUpload(
  file: Express.Multer.File | undefined,
  options: {
    maxSizeBytes?: number;
    allowedMimeTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const maxSize = options.maxSizeBytes ?? 10 * 1024 * 1024; // 10MB default
  const allowedTypes = options.allowedMimeTypes ?? [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!file) {
    return { valid: false, error: "ไม่พบไฟล์" };
  }

  if (file.size > maxSize) {
    return { valid: false, error: `ไฟล์ขนาดใหญ่เกินไป (สูงสุด ${maxSize / 1024 / 1024}MB)` };
  }

  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `ประเภทไฟล์ไม่ถูกต้อง (อนุญาต: ${allowedTypes.join(", ")})`,
    };
  }

  return { valid: true };
}
