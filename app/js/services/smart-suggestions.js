/**
 * Smart suggestions engine — actionable insights from transaction patterns.
 * Growth Phase 1: expanded generators.
 * @module services/smart-suggestions
 */

import { toPeriodKey, periodDateRange } from './monthly-period.js';
import { dedupeTransactions } from '../utils/transaction-utils.js';
import { loadDebts } from './debt-payoff-planner.js';

const COFFEE_HINTS = ['kopi', 'coffee', 'starbucks', 'janji jiwa', 'fore', 'tuku', 'excelso', 'kenangan'];
const SUBSCRIPTION_HINTS = [
  { key: 'netflix', label: 'Netflix' },
  { key: 'spotify', label: 'Spotify' },
  { key: 'youtube', label: 'YouTube Premium' },
  { key: 'disney', label: 'Disney+' },
  { key: 'icloud', label: 'iCloud+' },
  { key: 'notion', label: 'Notion' },
  { key: 'canva', label: 'Canva' },
  { key: 'apple music', label: 'Apple Music' },
];

/**
 * @param {number} n
 * @returns {string}
 */
export function fmtCompact(n) {
  const v = Math.abs(Math.round(Number(n) || 0));
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}jt`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}rb`;
  return String(v);
}

/**
 * @param {object} insight
 * @returns {number}
 */
function scoreInsight(insight) {
  const sev = { high: 30, medium: 20, low: 10 }[insight.severity] || 10;
  return sev + Math.min(20, Math.round((insight.savingsPotential || insight.impact_amount || 0) / 500000));
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

  const generators = [
    () => detectCoffeeHabit(monthTxs),
    () => detectSubscriptions(txs),
    () => detectCategoryTrend(txs, period),
    () => detectWeekendPattern(txs),
    () => detectImpulsePurchases(monthTxs),
    () => detectSavingOpportunity(txs, period),
    () => detectDebtPayoffBoost(state),
  ];

  for (const gen of generators) {
    const insight = gen();
    if (insight) suggestions.push(insight);
  }

  return suggestions
    .sort((a, b) => scoreInsight(b) - scoreInsight(a))
    .slice(0, 5);
}

/**
 * @param {object[]} monthTxs
 * @returns {object|null}
 */
export function detectCoffeeHabit(monthTxs) {
  const coffeeTxs = monthTxs.filter((t) => {
    if (t.type !== 'expense') return false;
    const text = `${t.merchant || ''} ${t.category || ''} ${t.notes || ''}`.toLowerCase();
    return COFFEE_HINTS.some((h) => text.includes(h));
  });
  if (coffeeTxs.length < 3) return null;

  const total = coffeeTxs.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const perWeek = coffeeTxs.length / 4;
  const yearlySave = Math.round(total * 12 * 0.5);

  return {
    id: 'coffee-habit',
    type: 'pattern',
    icon: '☕',
    severity: 'medium',
    title: `Ngopi ~${Math.round(perWeek)}x/minggu`,
    body: `Potensi hemat Rp ${fmtCompact(yearlySave)}/tahun kalau setengahnya diganti homemade.`,
    savingsPotential: yearlySave,
    impact_amount: yearlySave,
    action: { label: 'Review kategori', target: 'transactions' },
  };
}

/**
 * @param {object[]} txs
 * @returns {object|null}
 */
export function detectSubscriptions(txs) {
  const expenses = txs.filter((t) => t.type === 'expense');
  const found = [];

  for (const sub of SUBSCRIPTION_HINTS) {
    const matches = expenses.filter((t) => {
      const text = `${t.merchant || ''} ${t.notes || ''} ${t.category || ''}`.toLowerCase();
      return text.includes(sub.key);
    });
    if (matches.length < 2) continue;
    const amounts = matches.map((t) => Math.abs(Number(t.amount || 0)));
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    if (avg < 10000) continue;
    found.push({ label: sub.label, monthly: Math.round(avg) });
  }

  if (found.length < 2) return null;

  const monthlyTotal = found.reduce((s, f) => s + f.monthly, 0);
  const yearly = monthlyTotal * 12;

  return {
    id: 'subscription-stack',
    type: 'optimization',
    icon: '📺',
    severity: 'medium',
    title: `${found.length} subscription terdeteksi`,
    body: `Total ~Rp ${fmtCompact(monthlyTotal)}/bln (Rp ${fmtCompact(yearly)}/tahun). Review yang masih dipakai?`,
    savingsPotential: Math.round(yearly * 0.2),
    impact_amount: yearly,
    action: { label: 'Review transaksi', target: 'transactions' },
    data_json: { subscriptions: found },
  };
}

/**
 * @param {object[]} txs
 * @param {string} period YYYY-MM
 * @returns {object|null}
 */
export function detectCategoryTrend(txs, period) {
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
    severity: best.change >= 30 ? 'high' : 'medium',
    title: `${best.cat} naik ${best.change}%`,
    body: `Rp ${fmtCompact(best.amount)} bulan ini vs Rp ${fmtCompact(best.prevAmt)} bulan lalu.`,
    category_related: best.cat,
    action: { label: 'Lihat detail', target: 'budget' },
  };
}

/**
 * @param {object[]} txs — last ~60 days
 * @returns {object|null}
 */
export function detectWeekendPattern(txs) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 28);
  const cutStr = cutoff.toISOString().slice(0, 10);

  let weekdayTotal = 0;
  let weekdayDays = 0;
  let weekendTotal = 0;
  let weekendDays = 0;
  const dayTotals = new Map();

  for (const t of txs) {
    if (t.type !== 'expense') continue;
    const d = String(t.date || '').slice(0, 10);
    if (d < cutStr) continue;
    const dow = new Date(`${d}T12:00:00`).getDay();
    const amt = Math.abs(Number(t.amount || 0));
    dayTotals.set(d, (dayTotals.get(d) || 0) + amt);
    if (dow === 0 || dow === 6) weekendTotal += amt;
    else weekdayTotal += amt;
  }

  weekdayDays = [...dayTotals.keys()].filter((d) => {
    const dow = new Date(`${d}T12:00:00`).getDay();
    return dow !== 0 && dow !== 6;
  }).length;
  weekendDays = [...dayTotals.keys()].filter((d) => {
    const dow = new Date(`${d}T12:00:00`).getDay();
    return dow === 0 || dow === 6;
  }).length;

  if (weekdayDays < 5 || weekendDays < 2) return null;

  const weekdayAvg = weekdayTotal / weekdayDays;
  const weekendAvg = weekendTotal / weekendDays;
  if (weekendAvg < weekdayAvg * 2.5) return null;

  const ratio = (weekendAvg / Math.max(weekdayAvg, 1)).toFixed(1);
  const monthlySave = Math.round((weekendAvg - weekdayAvg * 2) * 8);

  return {
    id: 'weekend-spending',
    type: 'pattern',
    icon: '🎉',
    severity: 'medium',
    title: `Weekend ${ratio}x lebih boros`,
    body: `Rata-rata weekend Rp ${fmtCompact(weekendAvg)}/hari vs weekday Rp ${fmtCompact(weekdayAvg)}.`,
    savingsPotential: Math.max(0, monthlySave * 12),
    impact_amount: monthlySave,
    action: { label: 'Set budget weekend', target: 'budget' },
  };
}

/**
 * @param {object[]} monthTxs
 * @returns {object|null}
 */
export function detectImpulsePurchases(monthTxs) {
  const expenses = monthTxs.filter((t) => t.type === 'expense');
  if (expenses.length < 5) return null;

  const amounts = expenses.map((t) => Math.abs(Number(t.amount || 0)));
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
  const std = Math.sqrt(variance);

  const impulse = expenses.filter((t) => {
    const amt = Math.abs(Number(t.amount || 0));
    if (amt < 50000 || amt < mean + std * 1.5) return false;
    const text = `${t.merchant || ''} ${t.notes || ''}`.toLowerCase();
    if (text.includes('kost') || text.includes('listrik') || text.includes('cicilan')) return false;
    const hour = t.time ? parseInt(String(t.time).slice(0, 2), 10) : 12;
    return hour < 9 || hour >= 22;
  });

  if (impulse.length < 2) return null;

  const total = impulse.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);

  return {
    id: 'impulse-pattern',
    type: 'habit_detection',
    icon: '🛒',
    severity: 'high',
    title: `${impulse.length} pembelian impulsif`,
    body: `Total Rp ${fmtCompact(total)} bulan ini (malam/pagi). Coba aturan 24 jam sebelum beli > Rp 100rb.`,
    savingsPotential: Math.round(total * 0.5),
    impact_amount: total,
    action: { label: 'Lihat transaksi', target: 'transactions' },
  };
}

/**
 * @param {object[]} txs
 * @param {string} period
 * @returns {object|null}
 */
export function detectSavingOpportunity(txs, period) {
  const { start, end } = periodDateRange(period);
  const incomes = txs.filter((t) => t.type === 'income');
  const curIncome = incomes
    .filter((t) => {
      const d = String(t.date || '').slice(0, 10);
      return d >= start && d <= end;
    })
    .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);

  const prevMonths = [];
  const [y, m] = period.split('-').map(Number);
  for (let i = 1; i <= 3; i += 1) {
    const pm = m - i <= 0 ? `${y - 1}-${String(12 + m - i).padStart(2, '0')}` : `${y}-${String(m - i).padStart(2, '0')}`;
    const { start: ps, end: pe } = periodDateRange(pm);
    const sum = incomes
      .filter((t) => {
        const d = String(t.date || '').slice(0, 10);
        return d >= ps && d <= pe;
      })
      .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
    if (sum > 0) prevMonths.push(sum);
  }

  if (!prevMonths.length || curIncome < 500000) return null;
  const avg = prevMonths.reduce((a, b) => a + b, 0) / prevMonths.length;
  const extra = curIncome - avg;
  if (extra < avg * 0.15) return null;

  return {
    id: 'saving-opportunity',
    type: 'opportunity',
    icon: '💰',
    severity: 'medium',
    title: 'Income di atas rata-rata',
    body: `Extra ~Rp ${fmtCompact(extra)} vs 3 bulan terakhir. Alokasikan ke dana darurat atau target?`,
    savingsPotential: extra,
    impact_amount: extra,
    action: { label: 'Simulasi what-if', target: 'what_if' },
  };
}

/**
 * @param {object} state
 * @returns {object|null}
 */
export function detectDebtPayoffBoost(state) {
  try {
    const debts = loadDebts() || [];
    const active = debts.filter((d) => d.status !== 'paid' && Number(d.current_balance) > 0);
    if (active.length) {
      const total = active.reduce((s, d) => s + Number(d.current_balance || 0), 0);
      const minPay = active.reduce((s, d) => s + Number(d.minimum_payment || 0), 0) || 500000;
      const monthsLeft = Math.ceil(total / minPay);
      const extra = Math.max(100000, Math.round(minPay * 0.25));
      const boostedMonths = Math.ceil(total / (minPay + extra));
      const savedMonths = Math.max(0, monthsLeft - boostedMonths);
      if (savedMonths >= 1) {
        return {
          id: 'debt-boost',
          type: 'debt',
          icon: '💳',
          severity: 'low',
          title: `Utang ~${monthsLeft} bulan lagi`,
          body: `Tambah bayar Rp ${fmtCompact(extra)}/bln → lunas ${savedMonths} bulan lebih cepat.`,
          action: { label: 'Buka debt planner', target: 'debt_planner' },
        };
      }
    }
  } catch { /* fallback prefs */ }

  const prefs = state?.db?.userPreferences || {};
  const debt = Number(prefs.debt_amount || 0);
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
  window.monefyiSmartSuggestions = {
    generateSmartSuggestions,
    detectCoffeeHabit,
    detectSubscriptions,
    detectWeekendPattern,
    detectImpulsePurchases,
    detectSavingOpportunity,
  };
}
