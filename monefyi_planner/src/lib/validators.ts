export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Minimal 8 karakter');
  if (!/[A-Z]/.test(password)) errors.push('Minimal 1 huruf besar');
  if (!/[0-9]/.test(password)) errors.push('Minimal 1 angka');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Minimal 1 simbol');
  return { valid: errors.length === 0, errors };
}

export function formatInviteCode(raw: string): string {
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
}

export function parseEmailList(input: string, max = 10): string[] {
  return input
    .split(/[,;\n]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    .slice(0, max);
}
