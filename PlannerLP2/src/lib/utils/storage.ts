// Local storage utilities dengan error handling

export function getStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

export function setStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

export function removeStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
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
