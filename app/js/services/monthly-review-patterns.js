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
 * Rich behavioral block for monthly report / review (Growth Sprint 5-6).
 * @param {string} period YYYY-MM
 * @param {object[]} transactions
 * @returns {object[]}
 */
export function buildBehavioralInsights(period, transactions = []) {
  const patterns = detectMonthlyPatterns(period, transactions);
  const txs = dedupeTransactions(transactions).filter((t) => {
    if (t.type !== 'expense') return false;
    return String(t.date || '').startsWith(period);
  });

  const [y, m] = String(period).split('-').map(Number);
  const prev = new Date(y, m - 2, 1);
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const prevTxs = dedupeTransactions(transactions).filter((t) => {
    if (t.type !== 'expense') return false;
    return String(t.date || '').startsWith(prevKey);
  });

  const byCat = new Map();
  for (const t of txs) {
    const cat = t.category || 'Lainnya';
    byCat.set(cat, (byCat.get(cat) || 0) + Math.abs(Number(t.amount || 0)));
  }
  const prevByCat = new Map();
  for (const t of prevTxs) {
    const cat = t.category || 'Lainnya';
    prevByCat.set(cat, (prevByCat.get(cat) || 0) + Math.abs(Number(t.amount || 0)));
  }

  for (const [cat, total] of byCat) {
    const prevTotal = prevByCat.get(cat) || 0;
    if (prevTotal <= 0 || total <= prevTotal * 1.25) continue;
    const pct = Math.round(((total - prevTotal) / prevTotal) * 100);
    patterns.push({
      id: `surprise_${cat}`,
      text: `Kategori surprising: ${cat} naik ${pct}% vs bulan lalu`,
    });
    break;
  }

  const byDay = [0, 0, 0, 0, 0, 0, 0];
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  for (const t of txs) {
    const d = new Date(`${String(t.date).slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(d.getTime())) byDay[d.getDay()] += Math.abs(Number(t.amount || 0));
  }
  const minDay = byDay.indexOf(Math.min(...byDay.filter((v) => v >= 0)));
  if (byDay[minDay] > 0 && byDay[minDay] < byDay.reduce((a, b) => a + b, 0) / 7) {
    patterns.push({
      id: 'cheapest_day',
      text: `Hari paling hemat: ${dayNames[minDay]} (Rp ${fmt(byDay[minDay])} total)`,
    });
  }

  const merchantCounts = new Map();
  for (const t of txs) {
    const merchant = String(t.merchant || '').trim();
    if (merchant.length < 3) continue;
    merchantCounts.set(merchant, (merchantCounts.get(merchant) || 0) + 1);
  }
  const priorMerchants = new Set(
    dedupeTransactions(transactions)
      .filter((t) => t.type === 'expense' && !String(t.date || '').startsWith(period))
      .map((t) => String(t.merchant || '').trim().toLowerCase())
      .filter((x) => x.length >= 3),
  );
  for (const [merchant, count] of merchantCounts) {
    if (count >= 3 && !priorMerchants.has(merchant.toLowerCase())) {
      const total = txs
        .filter((t) => String(t.merchant || '').trim() === merchant)
        .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
      patterns.push({
        id: 'new_habit',
        text: `Kebiasaan baru terdeteksi: rutin ke ${merchant} (Rp ${fmt(total)}/bulan)`,
      });
      break;
    }
  }

  return patterns.slice(0, 6);
}

/**
 * @param {number} n
 */
function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
}

if (typeof window !== 'undefined') {
  window.monefyiMonthlyPatterns = { detectMonthlyPatterns, buildBehavioralInsights };
}
