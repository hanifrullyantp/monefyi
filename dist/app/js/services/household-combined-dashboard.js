/**
 * Combined household dashboard metrics (income, expense, goals).
 * @module services/household-combined-dashboard
 */

import { loadHousehold } from './household-mode.js';
import { filterTransactionsForView, getTransactionVisibility, hasActiveHousehold } from './household-shared.js';

/**
 * @param {object} [state]
 * @returns {object|null}
 */
export function buildCombinedHouseholdDashboard(state = window.STATE || {}) {
  if (!hasActiveHousehold()) return null;

  const hh = loadHousehold();
  const month = state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const monthTxs = (state.transactions || []).filter((t) => String(t.date || '').startsWith(month));
  const sharedTxs = filterTransactionsForView(monthTxs, 'shared');
  const personalTxs = monthTxs.filter((t) => getTransactionVisibility(t) !== 'shared');

  const sumType = (rows, type) => rows
    .filter((t) => t.type === type)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const sharedIncome = sumType(sharedTxs, 'income');
  const sharedExpense = sumType(sharedTxs, 'expense');
  const personalExpense = sumType(personalTxs, 'expense');

  const categoryMap = new Map();
  for (const t of sharedTxs.filter((x) => x.type === 'expense')) {
    const cat = t.category || 'Lainnya';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (Number(t.amount) || 0));
  }
  const topCategories = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => ({ name, amount }));

  const goals = (state.db?.financialGoals || [])
    .filter((g) => g.status === 'active' && (g.shared || g.household_id || g.is_household))
    .map((g) => ({
      id: g.id,
      name: g.name,
      pct: g.target_amount > 0
        ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)
        : 0,
    }));

  const net = sharedIncome - sharedExpense;
  const savingsRate = sharedIncome > 0 ? Math.round((net / sharedIncome) * 100) : 0;

  return {
    householdName: hh?.name || 'Household',
    memberCount: hh?.members?.length || 1,
    month,
    shared: {
      income: sharedIncome,
      expense: sharedExpense,
      net,
      savingsRate,
      txCount: sharedTxs.length,
      topCategories,
    },
    personal: {
      expense: personalExpense,
      txCount: personalTxs.length,
    },
    sharedGoals: goals,
  };
}
