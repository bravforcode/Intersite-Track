import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

const ERROR_LOG = path.join(LOG_DIR, "error.log");
const ACCESS_LOG = path.join(LOG_DIR, "access.log");

function formatMessage(level: string, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | meta: ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}\n`;
}

export const logger = {
  info(message: string, meta?: any) {
    const formatted = formatMessage("info", message, meta);
    process.stdout.write(formatted);
    fs.appendFileSync(ACCESS_LOG, formatted);
  },

  warn(message: string, meta?: any) {
    const formatted = formatMessage("warn", message, meta);
    process.stdout.write(formatted);
    fs.appendFileSync(ACCESS_LOG, formatted);
  },

  error(message: string, meta?: any) {
    const formatted = formatMessage("error", message, meta);
    process.stderr.write(formatted);
    fs.appendFileSync(ERROR_LOG, formatted);
  },

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === "development") {
      const formatted = formatMessage("debug", message, meta);
      process.stdout.write(formatted);
    }
  }
};
