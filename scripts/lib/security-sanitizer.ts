import { config } from "../config/sync.config.js";

interface SanitizeResult {
  content: string;
  warnings: string[];
}

const SECRET_VALUE_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?\b/,
  /\b[0-9a-f]{32,}\b/i,
  /\b[A-Za-z0-9+/_-]{32,}={0,2}\b/,
];

const SENSITIVE_ASSIGNMENT_REGEX =
  /((?:const|let|var)?\s*[A-Za-z0-9_.-]*(?:api[_-]?key|secret|password|token|credential|private[_-]?key|service[_-]?role)[A-Za-z0-9_.-]*\s*[:=]\s*)(["'`])([^"'`]{8,})(\2)/i;

export function sanitizeContent(content: string): string {
  const result = sanitize(content);

  if (result.warnings.length > 0) {
    console.warn(`⚠️  Security sanitizer redacted ${result.warnings.length} value(s).`);
    result.warnings.forEach((warning) => console.warn(`   ${warning}`));
  }

  return result.content;
}

function sanitize(content: string): SanitizeResult {
  const warnings: string[] = [];
  const output: string[] = [];
  const lines = content.split(/\r?\n/);
  let inPrivateKeyBlock = false;

  for (const line of lines) {
    if (line.includes("BEGIN PRIVATE KEY")) {
      inPrivateKeyBlock = true;
      warnings.push("Private key block redacted");
      output.push(line.replace(/BEGIN PRIVATE KEY/, "BEGIN PRIVATE KEY [REDACTED]"));
      continue;
    }

    if (inPrivateKeyBlock) {
      if (line.includes("END PRIVATE KEY")) {
        inPrivateKeyBlock = false;
        output.push(line.replace(/END PRIVATE KEY/, "END PRIVATE KEY [REDACTED]"));
      } else {
        output.push("[REDACTED]");
      }
      continue;
    }

    output.push(sanitizeLine(line, warnings));
  }

  return {
    content: output.join("\n"),
    warnings,
  };
}

function sanitizeLine(line: string, warnings: string[]): string {
  const envMatch = /^\s*([A-Z][A-Z0-9_]{2,})\s*=\s*(.+)\s*$/.exec(line);
  if (envMatch && config.sensitiveKeyPatterns.some((pattern) => pattern.test(envMatch[1]))) {
    warnings.push(`Env var "${envMatch[1]}" value redacted`);
    return `${envMatch[1]}=[REDACTED]`;
  }

  const jsonMatch =
    /(["']?)([A-Za-z0-9_.-]*(?:api[Kk]ey|secret|password|token|credential|private[_-]?key|service[_-]?role)[A-Za-z0-9_.-]*)\1\s*:\s*(["'`])([^"'`]{8,})(\3)/.exec(line);
  if (jsonMatch) {
    warnings.push(`JSON/object key "${jsonMatch[2]}" value redacted`);
    return line.replace(jsonMatch[0], `${jsonMatch[1]}${jsonMatch[2]}${jsonMatch[1]}: "${"[REDACTED]"}"`);
  }

  const assignmentMatch = SENSITIVE_ASSIGNMENT_REGEX.exec(line);
  if (assignmentMatch) {
    warnings.push("Possible hardcoded secret redacted");
    return `${assignmentMatch[1]}"[REDACTED]"`;
  }

  if (/authorization\s*:\s*bearer\s+/i.test(line)) {
    warnings.push("Authorization header redacted");
    return line.replace(/bearer\s+.+$/i, "Bearer [REDACTED]");
  }

  const hasSensitiveKeyword = /\b(api[_-]?key|secret|password|token|credential|private[_-]?key|service[_-]?role|bearer)\b/i.test(line);
  const looksLikeStructuredSecret =
    hasSensitiveKeyword &&
    (
      /\s=\s/.test(line) ||
      /:\s*["'`]/.test(line) ||
      /bearer\s+/i.test(line)
    );

  if (looksLikeStructuredSecret) {
    for (const pattern of SECRET_VALUE_PATTERNS) {
      if (pattern.test(line)) {
        warnings.push("Potential secret-like token redacted");
        return line.replace(pattern, "[REDACTED]");
      }
    }
  }

  return line;
}
