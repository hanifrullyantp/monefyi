import type { MappedRapItem } from './migration/planner-mapper';

export type RapItemGroup = {
  key: string;
  label: string;
  items: MappedRapItem[];
};

function prefixKey(name: string, wordCount: number): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length < wordCount) return '';
  return words.slice(0, wordCount).join(' ').toLowerCase();
}

function titleCase(key: string): string {
  return key
    .split(' ')
    .map(w => (w.length <= 4 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * Group RAP items by shared name prefix (e.g. "acp" → ACP asphalt, ACP putih).
 * Uses longest shared prefix (up to 3 words) with at least 2 items per group.
 */
export function groupRapItemsByKeyword(items: MappedRapItem[]): RapItemGroup[] {
  if (items.length === 0) return [];

  const remaining = new Set(items.map((_, i) => i));
  const groups: RapItemGroup[] = [];

  for (let wordCount = 3; wordCount >= 1; wordCount--) {
    const bucket = new Map<string, number[]>();
    for (const idx of remaining) {
      const key = prefixKey(items[idx].name, wordCount);
      if (!key || key.length < 2) continue;
      const arr = bucket.get(key) || [];
      arr.push(idx);
      bucket.set(key, arr);
    }
    for (const [key, indices] of bucket) {
      if (indices.length < 2) continue;
      const groupItems = indices.map(i => items[i]);
      indices.forEach(i => remaining.delete(i));
      groups.push({ key, label: titleCase(key), items: groupItems });
    }
  }

  for (const idx of remaining) {
    groups.push({ key: `solo-${idx}`, label: '', items: [items[idx]] });
  }

  return groups.sort((a, b) => a.items[0].name.localeCompare(b.items[0].name, 'id'));
}

/**
 * Apply draft realization overrides to mapped items for optimistic UI.
 */
export function applyRealizationDraft(
  items: MappedRapItem[],
  draft: Record<string, boolean>,
): MappedRapItem[] {
  return items.map(item => {
    const rapId = item.plannerId;
    if (!rapId || draft[rapId] === undefined) return item;
    const realized = draft[rapId];
    return {
      ...item,
      checked: realized,
      qtyActual: realized ? (item.qtyActual > 0 ? item.qtyActual : item.qtyPlan) : 0,
      status: realized ? (item.qtyActual > item.qtyPlan ? 'over' : 'ok') : 'pending',
    };
  });
}
