export function sanitizeText(input: unknown, maxLen = 500): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLen);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);
}

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateInviteCode(): string {
  let letters = "";
  for (let i = 0; i < 3; i++) {
    letters += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  }
  const nums = String(Math.floor(100 + Math.random() * 900));
  return `${letters}-${nums}`;
}
