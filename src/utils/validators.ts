export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || !value.trim()) return `${fieldName} จำเป็นต้องกรอก`;
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "กรุณากรอกรหัสผ่าน";
  if (password.length < 8) return "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
  if (!/[a-zA-Z]/.test(password)) return "รหัสผ่านต้องมีตัวอักษรอย่างน้อย 1 ตัว";
  if (!/[0-9]/.test(password)) return "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว";
  return null;
}
