/** Filter kampanye relevan. Murni. null atau kosong = tidak memfilter (semua kampanye). */
export function filterTracked<T>(items: T[], tracked: string[] | null | undefined, idOf: (item: T) => string): { kept: T[]; dropped: number } {
  if (!tracked || tracked.length === 0) return { kept: items, dropped: 0 };
  const set = new Set(tracked.map(String));
  const kept = items.filter((i) => set.has(String(idOf(i))));
  return { kept, dropped: items.length - kept.length };
}

