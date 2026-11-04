import { firstRupiah, parseCostCommand } from './money';

const MONEY_KEYS = ['total', 'unitPrice', 'unit_price', 'amount'] as const;

function asMoney(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function moneyFieldsAreIntegers(params: Record<string, unknown>): boolean {
  for (const key of MONEY_KEYS) {
    if (!(key in params) || params[key] == null || params[key] === '') continue;
    const amount = asMoney(params[key]);
    if (amount == null || !Number.isInteger(amount) || amount < 0 || !Number.isSafeInteger(amount)) {
      return false;
    }
  }
  if (Array.isArray(params.items)) {
    for (const item of params.items) {
      if (item && typeof item === 'object' && !moneyFieldsAreIntegers(item as Record<string, unknown>)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Memori lama menimpa parser hanya jika nominalnya beda dari bacaan yang sudah pasti.
 * Kalimat ambigu tidak dianggap bentrok.
 */
export function storedAmountConflicts(raw: string, params: Record<string, unknown>): boolean {
  const stored = asMoney(params.total);
  if (stored == null) return false;

  const cost = parseCostCommand(raw);
  if (cost && cost.item && !cost.needsReview && cost.total > 0) {
    return stored !== cost.total;
  }

  if (!cost) {
    const money = firstRupiah(raw);
    if (money.ok && !money.needsReview && money.amount > 0) {
      return stored !== money.amount;
    }
  }

  return false;
}

/**
 * Koreksi pengguna boleh disimpan meski berbeda dari parser.
 * Hasil model yang bentrok atau masih perlu ditinjau tidak dihafal.
 */
export function canMemorizeCommand(
  raw: string,
  params: Record<string, unknown>,
  source: 'user' | 'ai' = 'user',
): boolean {
  if (!moneyFieldsAreIntegers(params)) return false;
  if (source !== 'user' && params.needsReview === true) return false;
  if (source !== 'user' && storedAmountConflicts(raw, params)) return false;
  return true;
}
