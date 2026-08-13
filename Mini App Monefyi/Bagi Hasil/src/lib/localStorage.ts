export const STORAGE_KEYS = {
  activeAkad: "monefyi-bagi-hasil-active-akad",
  mudharabahInput: "monefyi-bagi-hasil-mudharabah-input",
  musyarakahInput: "monefyi-bagi-hasil-musyarakah-input",
  muzaraahInput: "monefyi-bagi-hasil-muzaraah-input",
  mukhabarahInput: "monefyi-bagi-hasil-mukhabarah-input",
  musaqahInput: "monefyi-bagi-hasil-musaqah-input",
  history: "monefyi-bagi-hasil-history",
} as const;

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently fail
  }
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const item = window.localStorage.getItem(key);
    if (item === null) return fallback;
    return JSON.parse(item) as T;
  } catch {
    return fallback;
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // silently fail
  }
}

export function clearAllBagiHasilStorage(): void {
  if (typeof window === "undefined") return;
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      window.localStorage.removeItem(key);
    });
  } catch {
    // silently fail
  }
}
