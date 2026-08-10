/**
 * Financial Health Score — adaptive, consumption-aware (Fase 4.3).
 * @module services/financial-health-score
 */

import { calculateProgress, countFlexibleOverBudget } from './budget-model.js';
import { computeRecordingStreak } from './daily-streak.js';
import { computePeriodFinancials, getMonthProgress } from './financial-metrics.js';
import { isConsumptionExpense, isReportableTransaction } from '../utils/transaction-utils.js';

const LS_HISTORY = 'monefyi_health_score_history';

/**
 * @param {number|null} score 0-100
 * @returns {string}
 */
export function getHealthGrade(score) {
  if (score == null) return 'Menganalisis';
  if (score >= 80) return 'Sangat Baik';
  if (score >= 65) return 'Baik';
  if (score >= 45) return 'Cukup';
  if (score >= 25) return 'Perlu Perhatian';
  return 'Kritis';
}

/**
 * @param {object} [state]
 * @returns {object}
 */
export function computeFinancialHealthScore(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const month = state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const monthProgress = getMonthProgress(month);

  if (monthProgress < 30) {
    return {
      overall: null,
      grade: getHealthGrade(null),
      status: 'analyzing',
      context: 'early_month',
      message: 'Kami sedang mengumpulkan data bulanmu. Score tersedia setelah minggu ke-2.',
      components: {},
      recommendations: [],
      history: loadScoreHistory(),
      computed_at: new Date().toISOString(),
      month,
      monthProgress,
    };
  }

  const metrics = computePeriodFinancials(state, month);
  const txs = (state.transactions || []).filter((t) => String(t.date || '').startsWith(month) && isReportableTransaction(t));
  const income = metrics.income;
  const consumptionExpense = metrics.consumptionExpense;
  const rows = state.budgetsByMonth?.[month]?.categories?.rows
    || state.budgetsByMonth?.[month]?.rows
    || state.budgetDraft?.rows
    || [];
  const prefs = state.db?.userPreferences || {};

  const savingRate = income > 0 ? (income - consumptionExpense) / income : 0;
  let savingScore = 0;
  if (savingRate >= 0.2) savingScore = 100;
  else if (savingRate >= 0.15) savingScore = 85;
  else if (savingRate >= 0.1) savingScore = 70;
  else if (savingRate >= 0.05) savingScore = 50;
  else if (savingRate >= 0) savingScore = 35;
  else if (savingRate >= -0.05) savingScore = 15;
  else savingScore = 0;

  let onTrack = 0;
  let tracked = 0;
  for (const row of rows) {
    const prog = calculateProgress(row, txs, month);
    if (prog.budget <= 0) continue;
    tracked += 1;
    if (prog.percent <= 100) onTrack += 1;
  }
  const overCount = countFlexibleOverBudget(rows, txs, month);
  let disciplineScore = tracked > 0
    ? Math.max(0, Math.round((onTrack / tracked) * 100) - overCount * 8)
    : 50;
  if (monthProgress < 50) {
    disciplineScore = Math.round(disciplineScore * (monthProgress / 50));
  }

  const hasNeracaData = !!(prefs.emergency_fund_balance || state.db?.emergencyFund);
  const emergencyTarget = Number(prefs.emergency_fund_target || income * 3 || 0);
  const emergencyCurrent = Number(prefs.emergency_fund_balance || state.db?.emergencyFund || 0);
  let emergencyScore = null;
  let emergencyTip = 'Setup neraca untuk score dana darurat';
  if (hasNeracaData && emergencyTarget > 0) {
    const monthsCovered = consumptionExpense > 0 ? emergencyCurrent / consumptionExpense : emergencyCurrent / (income / 3 || 1);
    if (monthsCovered >= 6) emergencyScore = 100;
    else if (monthsCovered >= 3) emergencyScore = 75;
    else if (monthsCovered >= 1) emergencyScore = 50;
    else emergencyScore = 25;
    emergencyTip = emergencyScore >= 80 ? 'Dana darurat memadai' : 'Bangun tabungan darurat 3-6x pengeluaran';
  }

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
  const categories = new Set(txs.filter(isConsumptionExpense).map((t) => t.category).filter(Boolean));
  let diversificationScore = 40;
  if (accounts.size >= 3) diversificationScore += 25;
  else if (accounts.size >= 2) diversificationScore += 15;
  if (categories.size >= 5) diversificationScore += 25;
  else if (categories.size >= 3) diversificationScore += 15;
  diversificationScore = Math.min(100, diversificationScore);

  let habitScore = 40;
  try {
    const streak = computeRecordingStreak(state.transactions || []).streak;
    if (streak >= 30) habitScore = 100;
    else if (streak >= 14) habitScore = 80;
    else if (streak >= 7) habitScore = 55;
    else if (streak >= 3) habitScore = 35;
  } catch { /* ignore */ }

  const components = {
    budgetDiscipline: {
      label: 'Disiplin Budget',
      score: Math.max(0, Math.min(20, Math.round(disciplineScore * 20 / 100))),
      raw: Math.max(0, Math.min(100, disciplineScore)),
      max: 20,
      note: monthProgress < 60 ? 'preliminary' : null,
      tip: overCount > 0 ? `${overCount} kategori flexible over — review alokasi` : 'Budget terjaga dengan baik',
    },
    savingRate: {
      label: 'Saving Rate',
      score: Math.round(savingScore * 20 / 100),
      raw: savingScore,
      max: 20,
      tip: savingRate >= 0.2 ? 'Tabungan sehat (exclude aset)' : 'Coba alokasikan minimal 20% dari income',
    },
    emergencyFund: {
      label: 'Dana Darurat',
      score: emergencyScore == null ? null : Math.round(emergencyScore * 20 / 100),
      raw: emergencyScore,
      max: 20,
      unavailable: emergencyScore == null,
      action: emergencyScore == null ? 'setup_neraca' : null,
      tip: emergencyTip,
    },
    debtRatio: {
      label: 'Rasio Utang',
      score: Math.round(debtScore * 15 / 100),
      raw: debtScore,
      max: 15,
      tip: debtAmount > 0 ? 'Prioritaskan cicilan di atas 30% income' : 'Tidak ada utang tercatat',
    },
    diversification: {
      label: 'Diversifikasi',
      score: Math.round(diversificationScore * 10 / 100),
      raw: diversificationScore,
      max: 10,
      tip: 'Sebar pengeluaran dan akun untuk risiko lebih rendah',
    },
    financialHabit: {
      label: 'Kebiasaan Catat',
      score: Math.round(habitScore * 15 / 100),
      raw: habitScore,
      max: 15,
      tip: habitScore >= 80 ? 'Streak catat transaksi kuat' : 'Target streak 14+ hari berturut-turut',
    },
  };

  const scoredComponents = Object.values(components).filter((c) => c.score != null && !c.unavailable);
  const maxPossible = scoredComponents.reduce((s, c) => s + c.max, 0);
  const overall = Math.min(100, scoredComponents.reduce((s, c) => s + c.score, 0));

  const history = loadScoreHistory();
  const prev = history[history.length - 1]?.overall;
  const trend = prev == null ? 'stable' : overall > prev + 3 ? 'up' : overall < prev - 3 ? 'down' : 'stable';

  const recommendations = Object.values(components)
    .filter((c) => c.raw != null && (c.raw ?? c.score) < 65)
    .sort((a, b) => (a.raw ?? a.score) - (b.raw ?? b.score))
    .slice(0, 3)
    .map((c) => c.tip);

  const result = {
    overall,
    maxPossible,
    grade: getHealthGrade(overall),
    status: monthProgress < 60 ? 'preliminary' : 'confident',
    context: monthProgress < 60 ? 'preliminary' : 'confident',
    trend,
    components,
    recommendations,
    history: loadScoreHistory(),
    computed_at: new Date().toISOString(),
    month,
    monthProgress,
    savingRateReal: savingRate,
  };

  saveScoreSnapshot(result);
  return result;
}

/**
 * @returns {object[]}
 */
export function loadScoreHistory() {
  try {
    if (typeof localStorage === 'undefined') return [];
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
  if (typeof localStorage === 'undefined') return;
  if (scoreResult.overall == null) return;
  const history = loadScoreHistory().filter((h) => h.month !== scoreResult.month);
  history.push({
    month: scoreResult.month,
    overall: scoreResult.overall,
    at: scoreResult.computed_at,
  });
  localStorage.setItem(LS_HISTORY, JSON.stringify(history.slice(-12)));
}

if (typeof window !== 'undefined') {
  window.monefyiHealthScore = {
    computeFinancialHealthScore, saveScoreSnapshot, loadScoreHistory, getHealthGrade,
  };
}
