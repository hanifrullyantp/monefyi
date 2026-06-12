import type { RapItem } from '../services/rapService';
import type { CostRealization } from '../services/costService';
import type { ParsedRapRow } from '../services/rapExcelService';

export function normalizeRapKey(
  name: string,
  type?: string,
  unit?: string,
  qty?: number,
  unitPrice?: number,
): string {
  const parts = [
    (name || '').trim().toLowerCase().replace(/\s+/g, ' '),
    (type || '').trim().toLowerCase(),
    (unit || '').trim().toLowerCase(),
  ];
  if (qty != null && Number.isFinite(qty)) parts.push(String(qty));
  if (unitPrice != null && Number.isFinite(unitPrice)) parts.push(String(unitPrice));
  return parts.join('|');
}

/** Alias for plan naming — lowercase, trim, collapse spaces + optional qty/price. */
export function normalizeKey(
  name: string,
  type?: string,
  unit?: string,
  qty?: number,
  unitPrice?: number,
): string {
  return normalizeRapKey(name, type, unit, qty, unitPrice);
}

export function normalizeDescription(desc: string): string {
  return (desc || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface RapDuplicateMatch {
  index: number;
  row: ParsedRapRow;
  existingId?: string;
  existingName?: string;
  reason: 'existing' | 'internal';
}

export function findRapImportDuplicates(
  existingItems: RapItem[],
  importRows: ParsedRapRow[],
): RapDuplicateMatch[] {
  const existingKeys = new Map<string, RapItem>();
  for (const item of existingItems) {
    existingKeys.set(
      normalizeRapKey(item.name, item.type, item.unit, Number(item.quantity), Number(item.unit_price)),
      item,
    );
  }

  const seenInternal = new Map<string, number>();
  const duplicates: RapDuplicateMatch[] = [];

  importRows.forEach((row, index) => {
    if (!row.valid) return;
    const key = normalizeRapKey(row.name, row.type, row.unit, row.quantity, row.unit_price);
    const existing = existingKeys.get(key);
    if (existing) {
      duplicates.push({
        index,
        row,
        existingId: existing.id,
        existingName: existing.name,
        reason: 'existing',
      });
    }
    if (seenInternal.has(key)) {
      duplicates.push({
        index,
        row,
        reason: 'internal',
      });
    } else {
      seenInternal.set(key, index);
    }
  });

  return duplicates;
}

export interface CostDuplicateMatch {
  date: string;
  amount: number;
  description: string;
  existingId: string;
}

export function findCostDuplicate(
  existingCosts: CostRealization[],
  candidate: { date: string; amount: number; description: string },
): CostDuplicateMatch | null {
  const normDesc = normalizeDescription(candidate.description);
  const amount = Math.round(candidate.amount);

  for (const c of existingCosts) {
    const cAmount = Math.round(Number(c.total_amount) || 0);
    const cDesc = normalizeDescription(c.description || '');
    if (cAmount === amount && cDesc === normDesc && c.date === candidate.date) {
      return {
        date: c.date,
        amount: cAmount,
        description: c.description || '',
        existingId: c.id,
      };
    }
    if (cAmount === amount && cDesc === normDesc) {
      const d1 = new Date(candidate.date).getTime();
      const d2 = new Date(c.date).getTime();
      if (Math.abs(d1 - d2) <= 86400000) {
        return {
          date: c.date,
          amount: cAmount,
          description: c.description || '',
          existingId: c.id,
        };
      }
    }
  }
  return null;
}

export function findRapDuplicates(
  existingItems: RapItem[],
  candidateRows: ParsedRapRow[],
): RapDuplicateMatch[] {
  return findRapImportDuplicates(existingItems, candidateRows);
}

export function findCostDuplicates(
  existingCosts: CostRealization[],
  candidates: Array<{ date: string; amount: number; description: string }>,
): CostDuplicateMatch[] {
  const matches: CostDuplicateMatch[] = [];
  for (const c of candidates) {
    const hit = findCostDuplicate(existingCosts, c);
    if (hit) matches.push(hit);
  }
  return matches;
}

export function findRapItemDuplicate(
  existingItems: RapItem[],
  candidate: { name: string; type?: string; unit?: string },
  excludeId?: string,
): RapItem | null {
  const key = normalizeRapKey(candidate.name, candidate.type, candidate.unit);
  return existingItems.find(item => {
    if (excludeId && item.id === excludeId) return false;
    return normalizeRapKey(item.name, item.type, item.unit) === key;
  }) || null;
}
