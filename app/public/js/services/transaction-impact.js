/**
 * Post-save transaction impact — safe-to-spend, category, runway, target.
 * @module services/transaction-impact
 */

import {
  computeDailySituation,
  computeFlexibleBudget,
  getAvgDailySpend7d,
} from './daily-situation.js';
import { getPrimaryTargetStatsFromState, inferSavingsContribution } from './financial-targets.js';

/**
 * @param {object} state
 * @param {object[]} transactions
 * @returns {object}
 */
export function buildStateSnapshot(state, transactions) {
  return {
    ...state,
    transactions: transactions.map((t) => ({ ...t })),
  };
}

/**
 * @param {object} tx
 * @param {object} state
 * @returns {{ name: string, planned: number, spent: number, pct: number, remaining: number, status: string, label: string }|null}
 */
export function getCategoryImpact(tx, state) {
  const type = String(tx.type || 'expense').toLowerCase();
  if (type !== 'expense' && type !== 'pengeluaran' && type !== 'out') return null;

  const category = String(tx.category || tx.merchant || '').trim();
  if (!category) return null;

  const period = state?.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const rows = state?.budgetsByMonth?.[period]?.categories?.rows || [];
  const catLower = category.toLowerCase();

  const row = rows.find((r) => {
    const n = String(r.name || '').toLowerCase();
    return n === catLower || catLower.includes(n) || n.includes(catLower);
  });
  if (!row) return null;

  const planned = Number(row.amount || 0);
  if (planned <= 0) return null;

  const periodStart = state?.period?.start || `${period}-01`;
  const periodEnd = state?.period?.end || periodStart;
  const spent = (state.transactions || [])
    .filter((t) => {
      const dt = String(t.type || '').toLowerCase();
      if (dt !== 'expense' && dt !== 'pengeluaran' && dt !== 'out') return false;
      if (t.date < periodStart || t.date > periodEnd) return false;
      const c = String(t.category || '').toLowerCase();
      const n = String(row.name || '').toLowerCase();
      return c === n || c.includes(n) || n.includes(c);
    })
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const pct = (spent / planned) * 100;
  let status = 'safe';
  let label = '✅ masih aman';
  if (pct > 100) {
    status = 'over';
    label = '🔴 melewati batas';
  } else if (pct >= 90) {
    status = 'warning';
    label = '⚠️ hampir habis';
  } else if (pct >= 70) {
    status = 'attention';
    label = '⚠️ mendekati batas';
  }

  return {
    name: row.name,
    planned,
    spent,
    pct,
    remaining: planned - spent,
    status,
    label,
  };
}

/**
 * @param {object} tx
 * @param {object} stateBefore
 * @param {object} stateAfter
 * @returns {object|null}
 */
function getTargetImpactLine(tx, stateBefore, stateAfter) {
  const contribution = inferSavingsContribution(tx);
  const before = getPrimaryTargetStatsFromState(stateBefore);
  const after = getPrimaryTargetStatsFromState(stateAfter);
  const primary = stateAfter?.db?.primaryTargetDisplay;

  if (!primary?.name) return null;

  if (contribution > 0 && before && after && after.pct !== before.pct) {
    const daysSaved = before.monthsLeft && after.monthsLeft && before.monthsLeft > after.monthsLeft
      ? Math.round((before.monthsLeft - after.monthsLeft) * 30)
      : null;
    let line = `✅ +${fmt(contribution)} ke ${primary.name}\nProgress: ${before.pct}% → ${after.pct}%`;
    if (daysSaved && daysSaved > 0) line += `\nEstimasi tercapai maju ~${daysSaved} hari`;
    return line;
  }

  if (contribution > 0) {
    return `✅ +${fmt(contribution)} ke ${primary.name}`;
  }

  const type = String(tx.type || '').toLowerCase();
  if (type === 'expense' || type === 'pengeluaran') {
    return `${primary.name}: belum berubah`;
  }
  return null;
}

function fmt(n) {
  return `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`;
}

/**
 * @param {object} tx
 * @param {object} stateBefore
 * @param {object} stateAfter
 * @returns {object}
 */
export function computeTransactionImpact(tx, stateBefore, stateAfter) {
  const type = String(tx.type || 'expense').toLowerCase();
  const isExpense = type === 'expense' || type === 'pengeluaran' || type === 'out';
  const isIncome = type === 'income' || type === 'pemasukan';

  const beforeSit = computeDailySituation(stateBefore);
  const afterSit = computeDailySituation(stateAfter);

  const label = tx.merchant || tx.category || (isIncome ? 'Pemasukan' : 'Pengeluaran');
  const amount = Number(tx.amount || 0);

  if (afterSit.status === 'incomplete') {
    return {
      show: true,
      incomplete: true,
      title: `Tersimpan: ${label}`,
      amount,
      message: 'Lengkapi income bulanan untuk lihat dampak ke keuangan harianmu.',
    };
  }

  const flexAfter = computeFlexibleBudget(stateAfter);
  const category = isExpense ? getCategoryImpact(tx, stateAfter) : null;
  const runwayDelta = (afterSit.runwayDays || 0) - (beforeSit.runwayDays || 0);
  const showRunway = Math.abs(runwayDelta) >= 1;

  const result = {
    show: true,
    incomplete: false,
    title: `Tersimpan: ${label}`,
    amount,
    isIncome,
    isExpense,
    safeToSpendAfter: afterSit.safeToSpend,
    safeToSpendBefore: beforeSit.safeToSpend,
    showSafeDelta: isExpense && beforeSit.safeToSpend !== afterSit.safeToSpend,
    category,
    flexibleRemaining: flexAfter.flexibleRemaining,
    daysToPayday: afterSit.daysToPayday,
    targetLine: getTargetImpactLine(tx, stateBefore, stateAfter),
    targetProgress: (() => {
      const b = getPrimaryTargetStatsFromState(stateBefore);
      const a = getPrimaryTargetStatsFromState(stateAfter);
      if (!b || !a || b.pct === a.pct) return null;
      return { pctBefore: b.pct, pctAfter: a.pct, name: stateAfter?.db?.primaryTargetDisplay?.name };
    })(),
    runwayAfter: afterSit.runwayDays,
    runwayBefore: beforeSit.runwayDays,
    runwayDelta,
    showRunway: showRunway && isExpense,
    incomeLine: isIncome
      ? `Saldo bertambah. Runway naik jadi ${Math.round(afterSit.runwayDays)} hari ✅`
      : null,
  };

  return result;
}

/**
 * @param {string} transactionId
 * @param {object} impact
 */
export async function logTransactionImpact(transactionId, impact) {
  const uid = window.STATE?.db?.user?.id;
  const supa = window.STATE?.db?.supa;
  if (!uid || !supa || !impact) return;

  try {
    await supa.from('transaction_impact_logs').insert({
      user_id: uid,
      transaction_id: String(transactionId),
      impact: {
        title: impact.title,
        amount: impact.amount,
        safeToSpendAfter: impact.safeToSpendAfter,
        category: impact.category,
        runwayDelta: impact.runwayDelta,
        isIncome: impact.isIncome,
      },
    });
  } catch (e) {
    console.warn('[transaction-impact] log failed', e);
  }
}

if (typeof window !== 'undefined') {
  window.__monefyiTransactionImpact = {
    computeTransactionImpact,
    buildStateSnapshot,
    getCategoryImpact,
    logTransactionImpact,
  };
}
