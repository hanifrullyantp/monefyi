/**
 * Manual investment portfolio tracker (Fase 6.1).
 * @module services/investment-tracker
 */

const LS_KEY = 'monefyi_investments';

/** @type {string[]} */
export const ASSET_TYPES = ['Reksadana', 'Saham', 'Emas', 'Obligasi', 'Crypto', 'Lainnya'];

/**
 * @returns {object[]}
 */
export function loadInvestments() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * @param {object[]} rows
 */
function saveInvestments(rows) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

/**
 * @param {object} input
 * @returns {object}
 */
export function upsertInvestment(input) {
  const rows = loadInvestments();
  const row = {
    id: input.id || `inv_${crypto.randomUUID?.() || Date.now()}`,
    name: String(input.name || '').trim() || 'Investasi',
    asset_type: ASSET_TYPES.includes(input.asset_type) ? input.asset_type : 'Reksadana',
    units: Math.max(0, Number(input.units || 0)),
    avg_cost: Math.max(0, Number(input.avg_cost || 0)),
    current_price: Math.max(0, Number(input.current_price || input.avg_cost || 0)),
    platform: String(input.platform || '').trim(),
    updated_at: new Date().toISOString(),
  };
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
  else rows.push(row);
  saveInvestments(rows);
  return row;
}

/**
 * @param {string} id
 */
export function deleteInvestment(id) {
  saveInvestments(loadInvestments().filter((r) => r.id !== id));
}

/**
 * @param {object[]} [holdings]
 * @returns {object}
 */
export function computePortfolioSummary(holdings = loadInvestments()) {
  let totalCost = 0;
  let totalValue = 0;
  const byType = {};

  for (const h of holdings) {
    const cost = (Number(h.units) || 0) * (Number(h.avg_cost) || 0);
    const value = (Number(h.units) || 0) * (Number(h.current_price) || 0);
    totalCost += cost;
    totalValue += value;
    const t = h.asset_type || 'Lainnya';
    byType[t] = byType[t] || { cost: 0, value: 0, count: 0 };
    byType[t].cost += cost;
    byType[t].value += value;
    byType[t].count += 1;
  }

  const returnPct = totalCost > 0 ? Math.round(((totalValue - totalCost) / totalCost) * 1000) / 10 : 0;
  const diversification = Object.keys(byType).length;

  return {
    holdings: holdings.length,
    total_cost: totalCost,
    total_value: totalValue,
    return_pct: returnPct,
    return_amount: totalValue - totalCost,
    by_type: byType,
    diversification_score: Math.min(100, diversification * 20),
  };
}

if (typeof window !== 'undefined') {
  window.monefyiInvestments = {
    loadInvestments, upsertInvestment, deleteInvestment, computePortfolioSummary, ASSET_TYPES,
  };
}
