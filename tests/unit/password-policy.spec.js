import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PASSWORD_REQUIREMENTS_HINT,
  validatePassword,
} from "../../frontend/src/utils/validators.ts";
import { validatePasswordStrength } from "../../backend/src/utils/password.ts";
import {
  CreateUserSchema,
  PasswordChangeSchema,
  SignUpSchema,
} from "../../shared/schemas/api.schemas.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test("frontend and backend password validators reject missing uppercase, lowercase, and number", () => {
  assert.equal(validatePassword("lowercase123"), "รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว");
  assert.equal(validatePassword("UPPERCASE123"), "รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว");
  assert.equal(validatePassword("NoNumbers"), "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว");

  assert.equal(validatePasswordStrength("lowercase123").errors[0], "รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว");
  assert.equal(validatePasswordStrength("UPPERCASE123").errors[0], "รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว");
  assert.equal(validatePasswordStrength("NoNumbers").errors[0], "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว");
});

test("shared schemas accept strong passwords for signup, password change, and admin-created users", () => {
  const strongPassword = "StrongPass123";

  assert.equal(validatePassword(strongPassword), null);
  assert.equal(validatePasswordStrength(strongPassword).valid, true);
  assert.equal(
    SignUpSchema.safeParse({ email: "admin@taskam.local", password: strongPassword }).success,
    true
  );
  assert.equal(
    PasswordChangeSchema.safeParse({
      current_password: "Current123",
      new_password: strongPassword,
    }).success,
    true
  );
  assert.equal(
    CreateUserSchema.safeParse({
      email: "staff@taskam.local",
      username: "staff",
      password: strongPassword,
      first_name: "Staff",
      last_name: "User",
      role: "staff",
    }).success,
    true
  );
  assert.match(PASSWORD_REQUIREMENTS_HINT, /ตัวพิมพ์ใหญ่/);
});

test("admin user routes are guarded by centralized validation middleware", () => {
  const userRoutesFile = readFileSync(
    join(__dirname, "../../backend/src/routes/user.routes.ts"),
    "utf-8"
  );

  assert(
    userRoutesFile.includes("validate(CreateUserSchema)"),
    "POST /api/users should validate against CreateUserSchema"
  );
  assert(
    userRoutesFile.includes("validate(UpdateUserSchema)"),
    "PUT /api/users/:id should validate against UpdateUserSchema"
  );
});
