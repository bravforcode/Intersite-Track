import fs from "fs";
import path from "path";

// Vercel and other serverless platforms have read-only filesystems
// Always skip file writes outside of local development
const isReadOnlyFS = process.env.VERCEL === "1" || process.env.NODE_ENV === "production" || !process.env.WRITE_LOGS;

const LOG_DIR = path.join(process.cwd(), "logs");

if (!isReadOnlyFS) {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch {
    // ignore if can't create
  }
}

const ERROR_LOG = path.join(LOG_DIR, "error.log");
const ACCESS_LOG = path.join(LOG_DIR, "access.log");

function formatMessage(level: string, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | meta: ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}\n`;
}

function tryAppend(file: string, content: string) {
  if (isReadOnlyFS) return;
  try {
    fs.appendFileSync(file, content);
  } catch {
    // ignore write errors on read-only filesystems
  }
}

export const logger = {
  info(message: string, meta?: any) {
    const formatted = formatMessage("info", message, meta);
    process.stdout.write(formatted);
    tryAppend(ACCESS_LOG, formatted);
  },

  warn(message: string, meta?: any) {
    const formatted = formatMessage("warn", message, meta);
    process.stdout.write(formatted);
    tryAppend(ACCESS_LOG, formatted);
  },

  error(message: string, meta?: any) {
    const formatted = formatMessage("error", message, meta);
    process.stderr.write(formatted);
    tryAppend(ERROR_LOG, formatted);
  },

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === "development") {
      const formatted = formatMessage("debug", message, meta);
      process.stdout.write(formatted);
    }
  }
};
