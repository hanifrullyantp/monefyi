import { parseCostCommand } from "../domain/money.ts";

/** Teks dan suara yang terbaca sebagai biaya masuk SOP yang sama dengan tombol catat. */
export function sopForIntent(intent: string): 'catat_biaya' | null {
  if (intent === 'record_cost') return 'catat_biaya';
  return null;
}

export function routeCatatBiaya(text: string): { sop: 'catat_biaya'; item: string; total: number } | null {
  const cost = parseCostCommand(text);
  if (!cost || !cost.item || cost.needsReview || cost.total <= 0) return null;
  return { sop: 'catat_biaya', item: cost.item, total: cost.total };
}
