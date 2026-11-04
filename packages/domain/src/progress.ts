const DAY_MS = 86_400_000;

/**
 * Progress rencana berdasarkan posisi hari ini di antara start–end (0–100).
 * Tanggal dibaca sebagai tengah malam lokal, sama dengan tampilan yang sudah ada.
 */
export function schedulePlanProgress(start: string, end: string, asOf = new Date()): number {
  const startMs = new Date(`${start.slice(0, 10)}T00:00:00`).getTime();
  const endMs = new Date(`${end.slice(0, 10)}T00:00:00`).getTime();
  const now = asOf.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  if (now <= startMs) return 0;
  if (now >= endMs) return 100;
  return Math.round(((now - startMs) / (endMs - startMs)) * 100);
}

/** Rata-rata tertimbang progress_pct. Bobot kosong dihitung 1. */
export function weightedActualProgress(
  items: Array<{ progress_pct?: string | number | null; weight?: string | number | null }>,
): number {
  if (!items.length) return 0;
  let totalWeight = 0;
  let sum = 0;
  for (const item of items) {
    const weight = Number(item.weight) > 0 ? Number(item.weight) : 1;
    totalWeight += weight;
    sum += (Number(item.progress_pct) || 0) * weight;
  }
  return Math.round(sum / totalWeight);
}

export function daysUntil(end: string, asOf = new Date()): number {
  return Math.ceil(
    (new Date(`${end.slice(0, 10)}T00:00:00`).getTime() - asOf.getTime()) / DAY_MS,
  );
}
