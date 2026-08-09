/**
 * Smart suggestions engine — actionable insights from transaction patterns.
 * @module services/smart-suggestions
 */

import { toPeriodKey, periodDateRange } from './monthly-period.js';
import { dedupeTransactions } from '../utils/transaction-utils.js';

const COFFEE_HINTS = ['kopi', 'coffee', 'starbucks', 'janji jiwa', 'fore', 'tuku', 'excelso', 'kenangan'];

/**
 * @param {number} n
 * @returns {string}
 */
function fmtCompact(n) {
  const v = Math.abs(Math.round(Number(n) || 0));
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}jt`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}rb`;
  return String(v);
}

/**
 * @param {object} [state]
 * @returns {object[]}
 */
export function generateSmartSuggestions(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const txs = dedupeTransactions(state.transactions || []);
  const period = toPeriodKey(state.period?.end || state.selectedMonth);
  const { start, end } = periodDateRange(period);
  const monthTxs = txs.filter((t) => {
    const d = String(t.date || '').slice(0, 10);
    return d >= start && d <= end;
  });

  /** @type {object[]} */
  const suggestions = [];

  const coffeeInsight = detectCoffeeHabit(monthTxs);
  if (coffeeInsight) suggestions.push(coffeeInsight);

  const trendInsight = detectCategoryTrend(txs, period);
  if (trendInsight) suggestions.push(trendInsight);

  const debtInsight = detectDebtPayoffBoost(state);
  if (debtInsight) suggestions.push(debtInsight);

  return suggestions.slice(0, 3);
}

/**
 * @param {object[]} monthTxs
 * @returns {object|null}
 */
function detectCoffeeHabit(monthTxs) {
  const coffeeTxs = monthTxs.filter((t) => {
    if (t.type !== 'expense') return false;
    const text = `${t.merchant || ''} ${t.category || ''} ${t.notes || ''}`.toLowerCase();
    return COFFEE_HINTS.some((h) => text.includes(h));
  });
  if (coffeeTxs.length < 3) return null;

  const total = coffeeTxs.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const avg = total / coffeeTxs.length;
  const weeksInMonth = 4;
  const perWeek = coffeeTxs.length / weeksInMonth;
  const yearlySave = Math.round(total * 12 * 0.5);

  return {
    id: 'coffee-habit',
    type: 'pattern',
    icon: '☕',
    severity: 'medium',
    title: `Ngopi ~${Math.round(perWeek)}x/minggu`,
    body: `Potensi hemat Rp ${fmtCompact(yearlySave)}/tahun kalau setengahnya diganti homemade.`,
    savingsPotential: yearlySave,
    action: { label: 'Review kategori', target: 'transactions' },
  };
}

/**
 * @param {object[]} txs
 * @param {string} period YYYY-MM
 * @returns {object|null}
 */
function detectCategoryTrend(txs, period) {
  const [y, m] = period.split('-').map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const { start: curStart, end: curEnd } = periodDateRange(period);
  const { start: prevStart, end: prevEnd } = periodDateRange(prev);

  const sumByCat = (start, end) => {
    const map = new Map();
    for (const t of txs) {
      if (t.type !== 'expense') continue;
      const d = String(t.date || '').slice(0, 10);
      if (d < start || d > end) continue;
      const cat = t.category || 'Lainnya';
      map.set(cat, (map.get(cat) || 0) + Math.abs(Number(t.amount || 0)));
    }
    return map;
  };

  const cur = sumByCat(curStart, curEnd);
  const prevMap = sumByCat(prevStart, prevEnd);
  let best = null;

  for (const [cat, amount] of cur.entries()) {
    const prevAmt = prevMap.get(cat) || 0;
    if (prevAmt < 100000 || amount < prevAmt) continue;
    const change = Math.round(((amount - prevAmt) / prevAmt) * 100);
    if (change >= 15 && (!best || change > best.change)) {
      best = { cat, change, amount, prevAmt };
    }
  }

  if (!best) return null;

  return {
    id: `trend-${best.cat}`,
    type: 'trend',
    icon: '📈',
    severity: 'medium',
    title: `${best.cat} naik ${best.change}%`,
    body: `Rp ${fmtCompact(best.amount)} bulan ini vs Rp ${fmtCompact(best.prevAmt)} bulan lalu.`,
    action: { label: 'Lihat detail', target: 'budget' },
  };
}

/**
 * @param {object} state
 * @returns {object|null}
 */
function detectDebtPayoffBoost(state) {
  const prefs = state?.db?.userPreferences || {};
  const debt = Number(prefs.debt_amount || prefs.monthly_debt_payment || 0);
  const monthlyPay = Number(prefs.monthly_debt_payment || 0);
  if (debt <= 0 || monthlyPay <= 0) return null;

  const monthsLeft = Math.ceil(debt / monthlyPay);
  const extra = Math.max(100000, Math.round(monthlyPay * 0.2));
  const boostedMonths = Math.ceil(debt / (monthlyPay + extra));
  const savedMonths = Math.max(0, monthsLeft - boostedMonths);
  if (savedMonths < 1) return null;

  return {
    id: 'debt-boost',
    type: 'debt',
    icon: '💳',
    severity: 'low',
    title: `Cicilan ~${monthsLeft} bulan lagi`,
    body: `Tambah bayar Rp ${fmtCompact(extra)}/bln → lunas ${savedMonths} bulan lebih cepat.`,
    action: { label: 'Simulasi what-if', target: 'what_if' },
  };
}

if (typeof window !== 'undefined') {
  window.monefyiSmartSuggestions = { generateSmartSuggestions };
}
