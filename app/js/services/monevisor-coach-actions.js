/**
 * Contextual coach actions + offline heuristic replies (Fase 6.3).
 * @module services/monevisor-coach-actions
 */

import { computeFinancialHealthScore } from './financial-health-score.js';
import { computePortfolioSummary } from './investment-tracker.js';
import { compareStrategies, loadDebts } from './debt-payoff-planner.js';

/**
 * @param {object} [state]
 * @returns {object[]}
 */
export function generateCoachActions(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const actions = [];
  const prefs = state.db?.userPreferences || {};
  const debts = loadDebts();
  const portfolio = computePortfolioSummary();

  actions.push({
    id: 'coach_budget_review',
    label: 'Review budget',
    prompt: 'Kategori mana yang paling boros bulan ini dan apa saranmu?',
    icon: '📊',
  });

  if (Number(prefs.debt_amount || 0) > 0 || debts.length) {
    actions.push({
      id: 'coach_debt',
      label: 'Strategi lunasi utang',
      prompt: 'Snowball vs avalanche — mana yang lebih cocok untuk utangku?',
      icon: '💳',
    });
  }

  if (portfolio.holdings > 0) {
    actions.push({
      id: 'coach_invest',
      label: 'Review portofolio',
      prompt: 'Apakah diversifikasi investasiku sudah cukup?',
      icon: '📈',
    });
  } else {
    actions.push({
      id: 'coach_start_invest',
      label: 'Mulai investasi',
      prompt: 'Dari surplus bulan ini, berapa yang aman dialokasikan untuk investasi?',
      icon: '🌱',
    });
  }

  actions.push({
    id: 'coach_save',
    label: 'Tips nabung',
    prompt: 'Gimana caranya nabung lebih banyak bulan depan?',
    icon: '💰',
  });

  return actions.slice(0, 5);
}

/**
 * Offline / fallback reply from local data.
 * @param {string} message
 * @param {object} [state]
 * @returns {string|null}
 */
export function generateOfflineCoachReply(message, state = typeof window !== 'undefined' ? window.STATE : {}) {
  const text = String(message || '').toLowerCase();
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
  const month = state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const txs = (state.transactions || []).filter((t) => String(t.date || '').startsWith(month));
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

  if (/utang|snowball|avalanche|cicilan/.test(text)) {
    const debts = loadDebts();
    if (!debts.length) return 'Belum ada data utang. Isi di Debt Planner atau onboarding dulu.';
    const cmp = compareStrategies(debts, 500000);
    const rec = cmp.recommended === 'avalanche' ? 'Avalanche' : 'Snowball';
    return `${rec} lebih optimal untukmu — estimasi lunas ${cmp[cmp.recommended].months} bulan, bunga total Rp ${fmt(cmp[cmp.recommended].total_interest)}. Avalanche hemat bunga, Snowball kasih quick win psychologically.`;
  }

  if (/invest|portofolio|reksadana|saham/.test(text)) {
    const p = computePortfolioSummary();
    if (!p.holdings) return 'Belum ada holding tercatat. Tambah di Investment Tracker untuk tracking manual.';
    return `Portofolio Rp ${fmt(p.total_value)} (${p.return_pct >= 0 ? '+' : ''}${p.return_pct}%). Diversifikasi: ${Object.keys(p.by_type).length} tipe aset. Score diversifikasi ${p.diversification_score}/100.`;
  }

  if (/nabung|hemat|saving/.test(text)) {
    const rate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
    const health = computeFinancialHealthScore(state);
    return `Saving rate bulan ini ${rate}%. Skor kesehatan finansial ${health.overall}/100. ${health.recommendations[0] || 'Fokus kurangi pengeluaran discretionary 10% dulu.'}`;
  }

  if (/boros|budget|kategori/.test(text)) {
    const catMap = {};
    for (const t of txs.filter((x) => x.type === 'expense')) {
      const c = t.category || 'Lainnya';
      catMap[c] = (catMap[c] || 0) + Number(t.amount || 0);
    }
    const top = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    if (!top) return 'Belum ada pengeluaran tercatat bulan ini.';
    return `Kategori terbesar: ${top[0]} (Rp ${fmt(top[1])}). Review apakah sesuai budget — pertimbangkan batasi 10–15% minggu depan.`;
  }

  return null;
}

if (typeof window !== 'undefined') {
  window.monefyiCoachActions = { generateCoachActions, generateOfflineCoachReply };
}
