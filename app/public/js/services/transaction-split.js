/**
 * Split transaction into multiple category lines (ROADMAP 3.3).
 * @module services/transaction-split
 */

/**
 * @param {object} original
 * @param {Array<{ amount: number, category?: string, notes?: string }>} splits
 * @returns {{ success: boolean, transactions?: object[], error?: string }}
 */
export function buildSplitTransactions(original, splits = []) {
  if (!original || !splits.length) {
    return { success: false, error: 'Split minimal 2 baris.' };
  }

  const total = splits.reduce((s, p) => s + Math.max(0, Number(p.amount) || 0), 0);
  const origAmount = Math.max(0, Number(original.amount) || 0);
  if (Math.abs(total - origAmount) > 1) {
    return { success: false, error: `Total split (Rp ${total}) harus sama dengan transaksi (Rp ${origAmount}).` };
  }

  const groupId = original.split_group_id
    || original.meta?.split_group_id
    || `split_${Date.now()}`;

  const base = {
    date: original.date,
    type: original.type || 'expense',
    currency: original.currency || 'IDR',
    account: original.account || 'Cash',
    merchant: original.merchant || '',
    payment_method: original.payment_method || original.account || 'Cash',
    meta: { ...(original.meta || {}), split_group_id: groupId, split_from: original.id },
  };

  const transactions = splits.map((part, idx) => ({
    ...base,
    id: `${original.id || 'tx'}_split_${idx}_${Date.now()}`,
    amount: Math.round(Number(part.amount) || 0),
    category: String(part.category || original.category || 'Lainnya').trim(),
    notes: String(part.notes || part.category || original.notes || '').trim(),
    split_group_id: groupId,
  }));

  return { success: true, transactions, groupId };
}

/**
 * Default 50/50 split helper.
 * @param {object} original
 * @param {string} categoryA
 * @param {string} categoryB
 * @returns {object}
 */
export function defaultHalfSplit(original, categoryA, categoryB) {
  const half = Math.round(Number(original.amount || 0) / 2);
  const remainder = Number(original.amount || 0) - half;
  return buildSplitTransactions(original, [
    { amount: half, category: categoryA },
    { amount: remainder, category: categoryB },
  ]);
}
