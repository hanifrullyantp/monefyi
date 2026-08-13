/**
 * Safe localStorage utilities — SSR-safe
 */

const KEYS = {
  HARTA: "monefyi-waris-harta",
  AHLI_WARIS: "monefyi-waris-ahliwaris",
  HASIL: "monefyi-waris-hasil",
  HISTORY: "monefyi-waris-history",
} as const;

export { KEYS as LOCAL_STORAGE_KEYS };

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function getItem<T>(key: string): T | null {
  if (!isClient()) return null;
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item) as T;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): boolean {
  if (!isClient()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key: string): boolean {
  if (!isClient()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function clearWarisData(): boolean {
  if (!isClient()) return false;
  try {
    Object.values(KEYS).forEach((key) => {
      window.localStorage.removeItem(key);
    });
    return true;
  } catch {
    return false;
  }
}
