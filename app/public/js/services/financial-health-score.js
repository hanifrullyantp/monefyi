/**
 * Financial Health Score — 5-component scoring (Fase 4.3).
 * @module services/financial-health-score
 */

import { calculateProgress, countFlexibleOverBudget } from './budget-model.js';

const LS_HISTORY = 'monefyi_health_score_history';

/**
 * @param {number} score 0-100
 * @returns {string}
 */
export function getHealthGrade(score) {
  if (score >= 80) return 'Sangat Baik';
  if (score >= 65) return 'Baik';
  if (score >= 50) return 'Cukup';
  if (score >= 35) return 'Perlu Perbaikan';
  return 'Kritis';
}

/**
 * @param {object} [state]
 * @returns {object}
 */
export function computeFinancialHealthScore(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const month = state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const txs = (state.transactions || []).filter((t) => String(t.date || '').startsWith(month));
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const rows = state.budgetsByMonth?.[month]?.categories?.rows
    || state.budgetsByMonth?.[month]?.rows
    || state.budgetDraft?.rows
    || [];
  const prefs = state.db?.userPreferences || {};

  const savingRate = income > 0 ? Math.max(0, (income - expense) / income) : 0;
  const savingScore = Math.min(100, Math.round(savingRate * 200));

  let onTrack = 0;
  let tracked = 0;
  for (const row of rows) {
    const prog = calculateProgress(row, txs, month);
    if (prog.budget <= 0) continue;
    tracked += 1;
    if (prog.percent <= 100) onTrack += 1;
  }
  const overCount = countFlexibleOverBudget(rows, txs, month);
  const disciplineScore = tracked > 0
    ? Math.max(0, Math.round((onTrack / tracked) * 100) - overCount * 8)
    : 50;

  const emergencyTarget = Number(prefs.emergency_fund_target || income * 3 || 0);
  const emergencyCurrent = Number(prefs.emergency_fund_balance || state.db?.emergencyFund || 0);
  const emergencyScore = emergencyTarget > 0
    ? Math.min(100, Math.round((emergencyCurrent / emergencyTarget) * 100))
    : (savingRate >= 0.1 ? 60 : 35);

  const debtAmount = Number(prefs.debt_amount || 0);
  const debtPayment = Number(prefs.monthly_debt_payment || 0);
  let debtScore = 85;
  if (debtAmount > 0 && income > 0) {
    const ratio = debtPayment / income;
    if (ratio > 0.4) debtScore = 25;
    else if (ratio > 0.3) debtScore = 45;
    else if (ratio > 0.2) debtScore = 65;
    else debtScore = 90;
  }

  const accounts = new Set(txs.map((t) => t.account).filter(Boolean));
  const categories = new Set(txs.filter((t) => t.type === 'expense').map((t) => t.category).filter(Boolean));
  let diversificationScore = 40;
  if (accounts.size >= 3) diversificationScore += 25;
  else if (accounts.size >= 2) diversificationScore += 15;
  if (categories.size >= 5) diversificationScore += 25;
  else if (categories.size >= 3) diversificationScore += 15;
  diversificationScore = Math.min(100, diversificationScore);

  const components = {
    budgetDiscipline: {
      label: 'Disiplin Budget',
      score: Math.max(0, Math.min(100, disciplineScore)),
      tip: overCount > 0 ? `${overCount} kategori flexible over — review alokasi` : 'Budget terjaga dengan baik',
    },
    savingRate: {
      label: 'Saving Rate',
      score: savingScore,
      tip: savingRate >= 0.2 ? 'Tabungan sehat' : 'Coba alokasikan minimal 20% dari income',
    },
    emergencyFund: {
      label: 'Dana Darurat',
      score: emergencyScore,
      tip: emergencyScore >= 80 ? 'Dana darurat memadai' : 'Bangun tabungan darurat 3-6x pengeluaran',
    },
    debtRatio: {
      label: 'Rasio Utang',
      score: debtScore,
      tip: debtAmount > 0 ? 'Prioritaskan cicilan di atas 30% income' : 'Tidak ada utang tercatat',
    },
    diversification: {
      label: 'Diversifikasi',
      score: diversificationScore,
      tip: 'Sebar pengeluaran dan akun untuk risiko lebih rendah',
    },
  };

  const weights = { budgetDiscipline: 0.25, savingRate: 0.25, emergencyFund: 0.2, debtRatio: 0.15, diversification: 0.15 };
  const overall = Math.round(
    Object.entries(weights).reduce((s, [k, w]) => s + (components[k].score * w), 0),
  );

  const history = loadScoreHistory();
  const prev = history[history.length - 1]?.overall;
  const trend = prev == null ? 'stable' : overall > prev + 3 ? 'up' : overall < prev - 3 ? 'down' : 'stable';

  const recommendations = Object.values(components)
    .filter((c) => c.score < 65)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((c) => c.tip);

  return {
    overall,
    grade: getHealthGrade(overall),
    trend,
    components,
    recommendations,
    computed_at: new Date().toISOString(),
    month,
  };
}

/**
 * @returns {object[]}
 */
function loadScoreHistory() {
  try {
    return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Persist score snapshot for trend tracking.
 * @param {object} scoreResult
 */
export function saveScoreSnapshot(scoreResult) {
  const history = loadScoreHistory().filter((h) => h.month !== scoreResult.month);
  history.push({
    month: scoreResult.month,
    overall: scoreResult.overall,
    at: scoreResult.computed_at,
  });
  localStorage.setItem(LS_HISTORY, JSON.stringify(history.slice(-12)));
}

if (typeof window !== 'undefined') {
  window.monefyiHealthScore = { computeFinancialHealthScore, saveScoreSnapshot, getHealthGrade };
}
