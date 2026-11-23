// Local storage utilities dengan error handling dan migrasi fallback froyek <-> monefyi

function getLegacyKey(key: string): string | null {
  if (key.startsWith("froyek_")) return key.replace(/^froyek_/, "monefyi_");
  if (key.startsWith("froyek-")) return key.replace(/^froyek-/, "monefyi-");
  return null;
}

export function getStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    let item = localStorage.getItem(key);
    if (!item) {
      const legacy = getLegacyKey(key);
      if (legacy) {
        item = localStorage.getItem(legacy);
        if (item) {
          try { localStorage.setItem(key, item); } catch {}
        }
      }
    }
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

export function setStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    const legacy = getLegacyKey(key);
    if (legacy) {
      try { localStorage.setItem(legacy, serialized); } catch {}
    }
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

export function removeStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
    const legacy = getLegacyKey(key);
    if (legacy) {
      try { localStorage.removeItem(legacy); } catch {}
    }
  } catch (e) {
    console.error("Failed to remove from localStorage:", e);
  }
}

const MAX_VERSIONS = 10;

export function saveVersion(key: string, data: unknown): void {
  const historyKey = `${key}_history`;
  const history = getStorage<Array<{ timestamp: string; data: unknown }>>(historyKey, []);
  history.unshift({ timestamp: new Date().toISOString(), data });
  if (history.length > MAX_VERSIONS) history.splice(MAX_VERSIONS);
  setStorage(historyKey, history);
}

export function getVersionHistory(key: string): Array<{ timestamp: string; data: unknown }> {
  return getStorage(`${key}_history`, []);
}

export function restoreVersion(key: string, versionIndex: number): unknown {
  const history = getVersionHistory(key);
  if (versionIndex < 0 || versionIndex >= history.length) return null;
  return history[versionIndex].data;
}
