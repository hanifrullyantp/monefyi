/**
 * Monthly report auto-generator (Sprint 3).
 * @module services/monthly-report-generator
 */

import { computePeriodCategoryBreakdown } from './monthly-period.js';

function supa() {
  return window.STATE?.db?.supa || window.__monefyiSupabase || null;
}

function userId() {
  return window.STATE?.db?.user?.id || null;
}

/**
 * @param {string} period YYYY-MM
 * @param {object} [state]
 * @returns {object}
 */
export function generateMonthlyReportContent(period, state = window.STATE || {}) {
  const txs = (state.transactions || []).filter((t) => String(t.date || '').startsWith(period));
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const net = income - expense;
  const cats = computePeriodCategoryBreakdown(txs, period).slice(0, 8);

  const budget = state.budgetsByMonth?.[period];
  const budgetTotal = budget?.categories?.rows?.reduce((s, r) => s + (Number(r.amount) || 0), 0) || 0;
  const budgetUsed = budgetTotal > 0 ? Math.round((expense / budgetTotal) * 100) : null;

  const goals = (state.db?.financialGoals || []).filter((g) => g.status === 'active');
  const goalProgress = goals.map((g) => ({
    name: g.name,
    pct: g.target_amount > 0 ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100) : 0,
  }));

  let healthScore = 70;
  if (net >= 0) healthScore += 10;
  if (budgetUsed != null && budgetUsed <= 100) healthScore += 10;
  if (budgetUsed != null && budgetUsed > 110) healthScore -= 15;
  if (expense > income * 1.2) healthScore -= 20;
  healthScore = Math.max(0, Math.min(100, healthScore));

  const fin = state.financialCondition?.level || 'safe';
  if (fin === 'danger') healthScore = Math.min(healthScore, 45);
  if (fin === 'warning') healthScore = Math.min(healthScore, 65);

  return {
    period,
    cover: {
      title: `Laporan ${formatMonthLabel(period)}`,
      health_score: healthScore,
      financial_status: fin,
    },
    summary: {
      income,
      expense,
      net,
      transaction_count: txs.length,
      budget_used_pct: budgetUsed,
    },
    top_categories: cats,
    goals: goalProgress,
    insights: buildInsights(income, expense, net, budgetUsed, cats),
    generated_at: new Date().toISOString(),
  };
}

/**
 * @param {number} income
 * @param {number} expense
 * @param {number} net
 * @param {number|null} budgetUsed
 * @param {object[]} cats
 * @returns {string[]}
 */
function buildInsights(income, expense, net, budgetUsed, cats) {
  const insights = [];
  if (net >= 0) insights.push(`Net positif Rp ${fmt(income - expense)} — arus kas sehat.`);
  else insights.push(`Defisit Rp ${fmt(Math.abs(net))} — pertimbangkan kurangi pengeluaran non-penting.`);
  if (budgetUsed != null) {
    if (budgetUsed <= 90) insights.push(`Budget terpakai ${budgetUsed}% — masih on-track.`);
    else if (budgetUsed > 100) insights.push(`Budget terlampaui ${budgetUsed}% — review kategori terbesar.`);
  }
  if (cats[0]) insights.push(`Kategori terbesar: ${cats[0].category} (Rp ${fmt(cats[0].amount)}).`);
  return insights.slice(0, 3);
}

/**
 * @param {string} period
 * @param {object} [state]
 * @returns {Promise<object|null>}
 */
export async function saveMonthlyReport(period, state = window.STATE) {
  const uid = userId();
  if (!uid || !period) return null;

  const content = generateMonthlyReportContent(period, state);
  const row = {
    user_id: uid,
    period,
    content_json: content,
    health_score: content.cover?.health_score ?? null,
    generated_at: new Date().toISOString(),
  };

  const client = supa();
  if (client) {
    try {
      const { data, error } = await client
        .from('monthly_reports')
        .upsert(row, { onConflict: 'user_id,period' })
        .select('*')
        .single();
      if (!error) return data;
    } catch (e) {
      console.warn('[monthly-report] save', e);
    }
  }

  try {
    const key = `monefyi_monthly_reports_${uid}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = list.findIndex((r) => r.period === period);
    const local = { ...row, id: `local_${period}` };
    if (idx >= 0) list[idx] = local;
    else list.unshift(local);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 24)));
    return local;
  } catch {
    return null;
  }
}

/**
 * @param {number} [limit]
 * @returns {Promise<object[]>}
 */
export async function loadMonthlyReports(limit = 12) {
  const uid = userId();
  const client = supa();
  if (uid && client) {
    try {
      const { data, error } = await client
        .from('monthly_reports')
        .select('*')
        .eq('user_id', uid)
        .order('period', { ascending: false })
        .limit(limit);
      if (!error && data) return data;
    } catch (e) {
      console.warn('[monthly-report] load', e);
    }
  }
  try {
    const key = `monefyi_monthly_reports_${uid || 'local'}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

/**
 * Auto-generate report for previous month on day 1.
 * @param {object} [state]
 */
export async function autoGeneratePreviousMonthReport(state = window.STATE) {
  const now = new Date();
  if (now.getDate() !== 1) return null;

  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const period = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const existing = await loadMonthlyReports(3);
  if (existing.some((r) => r.period === period)) return null;

  return saveMonthlyReport(period, state);
}

function formatMonthLabel(period) {
  const [y, m] = String(period).slice(0, 7).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
}

if (typeof window !== 'undefined') {
  window.monefyiMonthlyReport = {
    generateMonthlyReportContent,
    saveMonthlyReport,
    loadMonthlyReports,
    autoGeneratePreviousMonthReport,
  };
}
