export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export const PASSWORD_CHECKS = [
  { id: 'length', label: 'Minimal 8 karakter', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'Minimal 1 huruf besar', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'digit', label: 'Minimal 1 angka', test: (p: string) => /[0-9]/.test(p) },
  { id: 'symbol', label: 'Minimal 1 simbol', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export function getPasswordChecklist(password: string) {
  return PASSWORD_CHECKS.map(c => ({ ...c, passed: c.test(password) }));
}

export function validatePassword(password: string): PasswordValidation {
  const errors = PASSWORD_CHECKS.filter(c => !c.test(password)).map(c => c.label);
  return { valid: errors.length === 0, errors };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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
