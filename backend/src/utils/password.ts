import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * @param password Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 * @param password Plain text password
 * @param hash Hashed password
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * @param password Plain text password
 * @returns True if password meets requirements
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
