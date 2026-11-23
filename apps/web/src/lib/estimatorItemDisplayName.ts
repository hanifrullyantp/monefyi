import type { EstimationItemDraft } from '../types/estimator';

const NAME_PRODUCT_SEP = ' — ';
const DUPLICATE_SUFFIX_RE = /\s\(\d+\)\s*$/;

/** Nama tampilan tanpa suffix kelompok produk (legacy: "Kanopi 1,2 — Kanopi"). */
export function estimationItemDisplayName(item: Pick<EstimationItemDraft, 'name'>): string {
  const raw = item.name.trim();
  if (!raw) return '';
  const idx = raw.indexOf(NAME_PRODUCT_SEP);
  if (idx >= 0) return raw.slice(0, idx).trim();
  return raw;
}

export function stripDuplicateNameSuffix(name: string): string {
  return name.trim().replace(DUPLICATE_SUFFIX_RE, '').trim();
}

/**
 * Saat menambah item dengan nama yang sudah ada, beri suffix (2), (3), …
 * Contoh: backsplash → backsplash (2) → backsplash (3).
 */
export function uniquifyItemName(existing: EstimationItemDraft[], proposedName: string): string {
  const base = stripDuplicateNameSuffix(estimationItemDisplayName({ name: proposedName }));
  if (!base) return proposedName.trim();

  const lower = base.toLowerCase();
  let count = 0;
  for (const item of existing) {
    const itemBase = stripDuplicateNameSuffix(estimationItemDisplayName(item));
    if (itemBase.toLowerCase() === lower) count += 1;
  }
  if (count === 0) return base;
  return `${base} (${count + 1})`;
}
