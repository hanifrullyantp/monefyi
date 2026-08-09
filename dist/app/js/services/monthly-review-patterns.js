/**
 * Monthly review pattern detection (Growth Sprint 8).
 * @module services/monthly-review-patterns
 */

import { dedupeTransactions } from '../utils/transaction-utils.js';

/**
 * @param {string} period YYYY-MM
 * @param {object[]} transactions
 * @returns {object[]}
 */
export function detectMonthlyPatterns(period, transactions = []) {
  const txs = dedupeTransactions(transactions).filter((t) => {
    if (t.type !== 'expense') return false;
    return String(t.date || '').startsWith(period);
  });

  /** @type {object[]} */
  const patterns = [];

  const byDay = [0, 0, 0, 0, 0, 0, 0];
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  for (const t of txs) {
    const d = new Date(`${String(t.date).slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      byDay[d.getDay()] += Math.abs(Number(t.amount || 0));
    }
  }
  const maxDay = byDay.indexOf(Math.max(...byDay));
  if (byDay[maxDay] > 0) {
    patterns.push({
      id: 'expensive_day',
      text: `${dayNames[maxDay]} jadi hari termahal (Rp ${fmt(byDay[maxDay])} total)`,
    });
  }

  const byCat = new Map();
  for (const t of txs) {
    const cat = t.category || 'Lainnya';
    byCat.set(cat, (byCat.get(cat) || 0) + Math.abs(Number(t.amount || 0)));
  }
  const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    patterns.push({
      id: 'top_category',
      text: `Kategori terbesar: ${topCat[0]} (Rp ${fmt(topCat[1])})`,
    });
  }

  const impulse = txs.filter((t) => Math.abs(Number(t.amount || 0)) >= 200000);
  if (impulse.length >= 2) {
    patterns.push({
      id: 'impulse_large',
      text: `${impulse.length} kali belanja > Rp 200rb bulan ini`,
    });
  }

  return patterns.slice(0, 4);
}

/**
 * @param {number} n
 */
function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
}

if (typeof window !== 'undefined') {
  window.monefyiMonthlyPatterns = { detectMonthlyPatterns };
}
