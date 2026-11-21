/** Teks publik: buang tag agar mode edit tidak menyimpan HTML. */
export function sanitizeText(value: string, max = 2000): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

const FORBIDDEN_PATH_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function setByPath(source: unknown, path: string, value: string): unknown {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) return source;
  if (segments.some((segment) => FORBIDDEN_PATH_KEYS.has(segment))) return source;
  const clone = structuredClone(source) as Record<string, unknown>;
  let cursor: Record<string, unknown> | unknown[] = clone;
  for (const segment of segments.slice(0, -1)) {
    const key: string | number = Array.isArray(cursor) && /^\d+$/.test(segment)
      ? Number(segment)
      : segment;
    const next = Object.prototype.hasOwnProperty.call(cursor, key)
      ? (cursor as Record<string | number, unknown>)[key]
      : undefined;
    if (!next || typeof next !== "object") return source;
    cursor = next as Record<string, unknown>;
  }
  const leaf = segments[segments.length - 1];
  const leafKey: string | number = Array.isArray(cursor) && /^\d+$/.test(leaf)
    ? Number(leaf)
    : leaf;
  (cursor as Record<string | number, unknown>)[leafKey] = value;
  return clone;
}
