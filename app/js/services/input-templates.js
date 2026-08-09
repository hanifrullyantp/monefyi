/**
 * Quick input templates from history (Growth Fase 2.5).
 * @module services/input-templates
 */

import { dedupeTransactions } from '../utils/transaction-utils.js';

/**
 * @param {object} [state]
 * @param {number} [limit]
 * @returns {object[]}
 */
export function getQuickInputTemplates(state = typeof window !== 'undefined' ? window.STATE : {}, limit = 3) {
  const txs = dedupeTransactions(state.transactions || [])
    .filter((t) => t.type === 'expense')
    .slice(-200);

  const freq = new Map();
  for (const t of txs) {
    const label = `${t.merchant || t.category || 'Belanja'}`.trim();
    const key = `${label}|${t.category || ''}|${t.account || ''}|${Math.round(Number(t.amount || 0) / 1000)}k`;
    if (!freq.has(key)) {
      freq.set(key, { label, category: t.category, account: t.account, amount: t.amount, count: 0, last: t.date });
    }
    const row = freq.get(key);
    row.count += 1;
    if (String(t.date) > String(row.last)) row.last = t.date;
  }

  return [...freq.values()]
    .sort((a, b) => b.count - a.count || String(b.last).localeCompare(String(a.last)))
    .slice(0, limit)
    .map((r, i) => ({
      id: `tpl_${i}`,
      text: `${r.label} ${formatAmount(r.amount)} ${r.account || ''}`.trim(),
      parsed: {
        type: 'expense',
        amount: Math.abs(Number(r.amount || 0)),
        category: r.category,
        account: r.account,
        merchant: r.label,
      },
    }));
}

/**
 * Time-based suggestion for current hour.
 * @returns {object|null}
 */
export function getTimeBasedSuggestion() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) {
    return { id: 'time_breakfast', text: 'Sarapan Rp 15rb Cash', parsed: { type: 'expense', amount: 15000, category: 'Makan', account: 'Cash', merchant: 'Sarapan' } };
  }
  if (hour >= 11 && hour < 14) {
    return { id: 'time_lunch', text: 'Makan siang Rp 35rb GoPay', parsed: { type: 'expense', amount: 35000, category: 'Makan', account: 'GoPay', merchant: 'Makan siang' } };
  }
  if (hour >= 16 && hour < 19) {
    return { id: 'time_coffee', text: 'Kopi Rp 30rb GoPay', parsed: { type: 'expense', amount: 30000, category: 'Kopi', account: 'GoPay', merchant: 'Kopi' } };
  }
  return null;
}

/**
 * @param {number} n
 */
function formatAmount(n) {
  const v = Math.abs(Math.round(Number(n) || 0));
  if (v >= 1000) return `${Math.round(v / 1000)}rb`;
  return String(v);
}

if (typeof window !== 'undefined') {
  window.monefyiInputTemplates = { getQuickInputTemplates, getTimeBasedSuggestion };
}
