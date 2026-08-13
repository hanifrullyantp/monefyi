/** src/lib/admin-storage.ts */

const PREFIX = 'monefyi_admin_';

/**
 * Save data to local storage with prefix
 */
export function saveAdminData(key: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(`${PREFIX}${key}`, serializedData);
    // Dispatch event for local storage synchronization in the same tab if needed
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error('Error saving to localStorage', error);
  }
}

/**
 * Load data from local storage with prefix and fallback
 */
export function loadAdminData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(`${PREFIX}${key}`);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error('Error loading from localStorage', error);
    return fallback;
  }
}

/**
 * Clear specific key
 */
export function clearAdminData(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${PREFIX}${key}`);
}

/**
 * Export all admin-related data as JSON string
 */
export function exportAllAdminData(): string {
  if (typeof window === 'undefined') return '';
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) {
      const val = localStorage.getItem(key);
      if (val) {
        data[key.replace(PREFIX, '')] = JSON.parse(val);
      }
    }
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON string
 */
export function importAdminData(json: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const data = JSON.parse(json);
    Object.entries(data).forEach(([key, value]) => {
      saveAdminData(key, value);
    });
    return true;
  } catch (error) {
    console.error('Failed to import admin data', error);
    return false;
  }
}

/**
 * Reset all admin data except auth
 */
export function resetAllAdminData(): void {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX) && key !== `${PREFIX}auth`) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}
