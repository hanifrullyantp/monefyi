/**
 * What-if simulation engine — pure financial projections (Growth Phase Sprint 3).
 * @module services/what-if-engine
 */

/**
 * @param {object} params
 * @returns {object}
 */
export function simulateSavingsExtra({
  remaining = 0,
  baseMonthly = 0,
  extraMonthly = 0,
  annualRate = 0.06,
}) {
  const rem = Math.max(0, Number(remaining) || 0);
  const base = Math.max(0, Number(baseMonthly) || 0);
  const extra = Math.max(0, Number(extraMonthly) || 0);
  const total = base + extra;

  const monthsBase = base > 0 ? Math.ceil(rem / base) : null;
  const monthsNew = total > 0 ? Math.ceil(rem / total) : null;
  const monthsSaved = monthsBase && monthsNew ? Math.max(0, monthsBase - monthsNew) : 0;

  const monthlyRate = annualRate / 12;
  const compound = (months, monthlyContrib) => {
    let balance = 0;
    for (let i = 0; i < months; i += 1) {
      balance = (balance + monthlyContrib) * (1 + monthlyRate);
    }
    return Math.round(balance);
  };

  return {
    monthsBase,
    monthsNew,
    monthsSaved,
    extraYear1: extra * 12,
    extraYear5: compound(60, extra),
    extraYear10: compound(120, extra),
    totalMonthly: total,
  };
}

/**
 * @param {object} params
 * @param {object} [state]
 * @returns {object}
 */
export function simulatePurchaseImpact(params = {}, state = {}) {
  const amount = Math.max(0, Number(params.amount) || 0);
  const installments = Math.max(1, Number(params.installments) || 1);
  const monthlyPay = Math.round(amount / installments);
  const name = String(params.name || 'Pembelian').trim();

  const month = state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const pack = state.budgetsByMonth?.[month];
  const rows = pack?.categories?.rows || pack?.rows || [];
  let flexibleRemaining = 0;
  for (const row of rows) {
    if (row.category_type === 'fixed_bill' || row.category_type === 'saving') continue;
    const planned = Number(row.amount || 0);
    const spent = Number(row.spent || row.actual || 0);
    flexibleRemaining += Math.max(0, planned - spent);
  }

  const afterFlexible = flexibleRemaining - monthlyPay;
  const runwayDays = state._dailySituation?.runwayDays
    ?? state.financialCondition?.runway_days
    ?? null;
  const runwayLoss = monthlyPay > 0 && runwayDays != null
    ? Math.round((monthlyPay / Math.max(flexibleRemaining / 30, 1)))
    : null;

  let verdict = 'safe';
  let verdictLabel = 'Aman untuk dibeli sekarang';
  if (installments === 1 && amount > flexibleRemaining * 0.5) {
    verdict = 'warn';
    verdictLabel = 'Pertimbangkan tunda — impact ke flexible besar';
  }
  if (afterFlexible < 0 || (installments === 1 && amount > flexibleRemaining)) {
    verdict = 'danger';
    verdictLabel = 'Tidak recommended saat ini — melebihi sisa flexible';
  }

  const target = state.db?.primaryTargetDisplay || state.db?.financialTargets?.[0];
  let targetDelayMonths = 0;
  if (target) {
    const monthly = Number(target.monthly_contribution || target.stats?.monthly || 0);
    if (monthly > 0) targetDelayMonths = Math.ceil(amount / monthly);
  }

  return {
    name,
    amount,
    installments,
    monthlyPay,
    flexibleBefore: Math.round(flexibleRemaining),
    flexibleAfter: Math.round(afterFlexible),
    runwayLossDays: runwayLoss,
    targetDelayMonths,
    verdict,
    verdictLabel,
  };
}

/**
 * @param {object[]} debts
 * @param {number[]} extraOptions
 * @returns {object[]}
 */
export function simulateDebtScenarios(debts = [], extraOptions = [0, 200000, 500000]) {
  const active = debts.filter((d) => Number(d.balance || d.current_balance) > 0);
  if (!active.length) return [];

  const normalized = active.map((d) => ({
    id: d.id,
    name: d.name,
    balance: Number(d.balance || d.current_balance || 0),
    min_payment: Number(d.min_payment || d.minimum_payment || 0),
    interest_rate: Number(d.interest_rate || 12),
  }));

  return extraOptions.map((extra) => {
    const result = simulatePayoffSimple(normalized, extra);
    return {
      extraMonthly: extra,
      months: result.months,
      totalInterest: result.total_interest,
      debtFreeDate: result.debt_free_date,
      label: extra === 0 ? 'Sekarang' : `+Rp ${fmtCompact(extra)}/bln`,
    };
  });
}

/**
 * @param {object[]} debts
 * @param {number} extraPayment
 * @returns {object}
 */
function simulatePayoffSimple(debts, extraPayment = 0) {
  const working = debts.map((d) => ({ ...d, balance: d.balance }));
  let month = 0;
  let totalInterest = 0;

  while (working.some((d) => d.balance > 0.01) && month < 600) {
    month += 1;
    for (const d of working) {
      if (d.balance <= 0) continue;
      const interest = (d.balance * (d.interest_rate / 100)) / 12;
      d.balance += interest;
      totalInterest += interest;
      d.balance -= Math.min(d.balance, d.min_payment);
    }
    const target = working.filter((d) => d.balance > 0).sort((a, b) => b.interest_rate - a.interest_rate)[0];
    if (target && extraPayment > 0) {
      target.balance -= Math.min(target.balance, extraPayment);
    }
  }

  const freeDate = new Date();
  freeDate.setMonth(freeDate.getMonth() + month);

  return {
    months: month,
    total_interest: Math.round(totalInterest),
    debt_free_date: month < 600 ? freeDate.toISOString().slice(0, 10) : null,
  };
}

/**
 * Retirement projection — monthly contribution to target nest egg.
 * @param {object} params
 * @returns {object}
 */
export function simulateRetirement({
  currentAge = 30,
  retireAge = 60,
  currentSavings = 0,
  monthlyContribution = 0,
  annualReturn = 0.07,
  monthlyExpenseAtRetire = 0,
  inflation = 0.04,
}) {
  const age = Math.max(18, Number(currentAge) || 30);
  const targetAge = Math.max(age + 1, Number(retireAge) || 60);
  const years = targetAge - age;
  const months = years * 12;
  const r = Math.max(0, Number(annualReturn) || 0) / 12;
  const contrib = Math.max(0, Number(monthlyContribution) || 0);
  let balance = Math.max(0, Number(currentSavings) || 0);

  for (let i = 0; i < months; i += 1) {
    balance = balance * (1 + r) + contrib;
  }

  const expenseNow = Math.max(0, Number(monthlyExpenseAtRetire) || 0);
  const infl = Math.max(0, Number(inflation) || 0);
  const expenseAtRetire = expenseNow * Math.pow(1 + infl, years);
  const safeWithdrawRate = 0.04;
  const nestEggNeeded = expenseAtRetire > 0 ? Math.round(expenseAtRetire * 12 / safeWithdrawRate) : 0;
  const gap = nestEggNeeded - Math.round(balance);
  const onTrack = nestEggNeeded <= 0 || balance >= nestEggNeeded;

  let extraNeeded = 0;
  if (!onTrack && months > 0 && r > 0) {
    const factor = (Math.pow(1 + r, months) - 1) / r;
    extraNeeded = Math.max(0, Math.round(gap / factor));
  } else if (!onTrack && months > 0) {
    extraNeeded = Math.max(0, Math.round(gap / months));
  }

  return {
    years,
    projectedBalance: Math.round(balance),
    nestEggNeeded,
    monthlyExpenseAtRetire: Math.round(expenseAtRetire),
    onTrack,
    gap: Math.max(0, gap),
    extraMonthlyNeeded: extraNeeded,
    retireAge: targetAge,
  };
}

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

if (typeof window !== 'undefined') {
  window.monefyiWhatIfEngine = {
    simulateSavingsExtra,
    simulatePurchaseImpact,
    simulateDebtScenarios,
    simulateRetirement,
    fmtCompact,
  };
}
