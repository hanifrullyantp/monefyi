/**
 * Debt payoff planner — snowball & avalanche (Fase 6.2).
 * @module services/debt-payoff-planner
 */

const LS_DEBTS = 'monefyi_debts';

/**
 * @returns {object[]}
 */
export function loadDebts() {
  if (typeof window !== 'undefined' && window.STATE?.db?.debts?.length) {
    return window.STATE.db.debts;
  }
  try {
    const rows = JSON.parse(localStorage.getItem(LS_DEBTS) || '[]');
    if (rows.length) return rows;
  } catch { /* ignore */ }

  const prefs = typeof window !== 'undefined' ? window.STATE?.db?.userPreferences : {};
  const amount = Number(prefs?.debt_amount || 0);
  const payment = Number(prefs?.monthly_debt_payment || 0);
  if (amount > 0) {
    return [{
      id: 'debt_primary',
      name: 'Utang utama',
      balance: amount,
      min_payment: payment || Math.round(amount * 0.05),
      interest_rate: Number(prefs?.debt_interest_rate || 12),
      source: 'onboarding',
    }];
  }
  return [];
}

/**
 * @param {object[]} rows
 */
export function saveDebts(rows) {
  localStorage.setItem(LS_DEBTS, JSON.stringify(rows));
  import('./debt-milestones.js').then(({ checkDebtMilestones }) => {
    checkDebtMilestones(rows).catch(() => {});
  }).catch(() => {});
}

/**
 * @param {object} input
 * @returns {object}
 */
export function upsertDebt(input) {
  const rows = loadDebts().filter((d) => d.source !== 'onboarding' || input.id);
  const row = {
    id: input.id || `debt_${crypto.randomUUID?.() || Date.now()}`,
    name: String(input.name || 'Utang').trim(),
    balance: Math.max(0, Number(input.balance || 0)),
    min_payment: Math.max(0, Number(input.min_payment || 0)),
    interest_rate: Math.max(0, Number(input.interest_rate || 0)),
    source: 'manual',
  };
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
  else rows.push(row);
  saveDebts(rows);
  return row;
}

/**
 * @param {string} id
 */
export function deleteDebt(id) {
  saveDebts(loadDebts().filter((r) => r.id !== id));
}

/**
 * @param {object[]} debts
 * @param {number} extraPayment
 * @param {'snowball'|'avalanche'} strategy
 * @returns {object}
 */
export function simulatePayoff(debts, extraPayment = 0, strategy = 'avalanche') {
  const working = debts
    .filter((d) => Number(d.balance) > 0)
    .map((d) => ({
      id: d.id,
      name: d.name,
      balance: Number(d.balance),
      min_payment: Math.max(0, Number(d.min_payment) || 0),
      interest_rate: Math.max(0, Number(d.interest_rate) || 0),
    }));

  if (!working.length) {
    return { months: 0, total_interest: 0, timeline: [], strategy, debt_free_date: null };
  }

  const pickTarget = (list) => {
    const open = list.filter((d) => d.balance > 0.01);
    if (!open.length) return null;
    if (strategy === 'snowball') {
      return open.sort((a, b) => a.balance - b.balance)[0];
    }
    return open.sort((a, b) => b.interest_rate - a.interest_rate)[0];
  };

  let month = 0;
  let totalInterest = 0;
  const timeline = [];

  while (working.some((d) => d.balance > 0.01) && month < 600) {
    month += 1;
    let monthInterest = 0;

    for (const d of working) {
      if (d.balance <= 0) continue;
      const interest = (d.balance * (d.interest_rate / 100)) / 12;
      d.balance += interest;
      monthInterest += interest;
    }
    totalInterest += monthInterest;

    let extra = extraPayment;
    for (const d of working) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.balance, d.min_payment);
      d.balance -= pay;
    }

    const target = pickTarget(working);
    if (target && extra > 0) {
      const add = Math.min(target.balance, extra);
      target.balance -= add;
      extra -= add;
    }

    if (month <= 12 || month % 6 === 0 || !working.some((d) => d.balance > 0.01)) {
      timeline.push({
        month,
        total_balance: Math.round(working.reduce((s, d) => s + Math.max(0, d.balance), 0)),
        interest_paid: Math.round(monthInterest),
      });
    }
  }

  const freeDate = new Date();
  freeDate.setMonth(freeDate.getMonth() + month);

  return {
    months: month,
    total_interest: Math.round(totalInterest),
    timeline,
    strategy,
    debt_free_date: month < 600 ? freeDate.toISOString().slice(0, 10) : null,
  };
}

/**
 * Compare strategies.
 * @param {object[]} debts
 * @param {number} extraPayment
 */
export function compareStrategies(debts, extraPayment = 0) {
  const snowball = simulatePayoff(debts, extraPayment, 'snowball');
  const avalanche = simulatePayoff(debts, extraPayment, 'avalanche');
  const interestSaved = snowball.total_interest - avalanche.total_interest;
  return {
    snowball,
    avalanche,
    recommended: interestSaved >= 0 ? 'avalanche' : 'snowball',
    interest_saved: Math.abs(Math.round(interestSaved)),
  };
}

if (typeof window !== 'undefined') {
  window.monefyiDebtPlanner = {
    loadDebts, saveDebts, upsertDebt, deleteDebt, simulatePayoff, compareStrategies,
  };
}
