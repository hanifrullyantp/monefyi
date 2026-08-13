import type { BudgetPlan, RiwayatItem } from "@/types/budget-planner";
import { getStatusAlokasi } from "./formatters";

export const STORAGE_KEYS = {
  PROFIL: "monefyi-budget-profil",
  ACTIVE_METODE: "monefyi-budget-active-metode",
  CURRENT_PLAN: "monefyi-budget-current-plan",
  ENVELOPE_DATA: "monefyi-budget-envelope-data",
  ZEROBASED_DATA: "monefyi-budget-zerobased-data",
  HISTORY: "monefyi-budget-history",
} as const;

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage might be full or unavailable
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
    // ignore
  }
}

export function clearAllBudgetStorage(): void {
  if (typeof window === "undefined") return;
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      window.localStorage.removeItem(key);
    });
  } catch {
    // ignore
  }
}

export function saveBudgetToHistory(plan: BudgetPlan): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadFromStorage<RiwayatItem[]>(STORAGE_KEYS.HISTORY, []);

    const ringkasan: RiwayatItem = {
      id: plan.id,
      bulan: plan.bulan,
      tahun: plan.tahun,
      totalPenghasilan: plan.totalPenghasilan,
      totalTerpakai: plan.totalTerpakai,
      persentaseTerpakai: plan.persentaseTerpakai,
      statusKeseluruhan: getStatusAlokasi(plan.persentaseTerpakai),
      kategoriRingkasan: plan.kategori.map((k) => ({
        nama: k.nama,
        persentaseTerpakai:
          k.rupiahAlokasi > 0
            ? (k.rupiahTerpakai / k.rupiahAlokasi) * 100
            : 0,
      })),
    };

    // Remove duplicate for same bulan
    const filtered = existing.filter(
      (r) => !(r.bulan === plan.bulan && r.tahun === plan.tahun)
    );

    const updated = [ringkasan, ...filtered].slice(0, 12);
    saveToStorage(STORAGE_KEYS.HISTORY, updated);
  } catch {
    // ignore
  }
}
