/**
 * Period stats row (income / expense / savings) for mobile Beranda.
 * @module components/home-balance-stats
 */

import { Icon } from './icons.js';

/**
 * @param {object} summary
 * @param {Function} formatValue - compact or full IDR formatter
 * @param {boolean} masked
 * @returns {HTMLElement}
 */
export function renderHomeBalanceStats(summary, formatValue, masked = false) {
  const el = document.createElement('section');
  el.className = 'home-stats-row';

  const mask = (v) => (masked ? '••••••' : `Rp ${formatValue(v)}`);
  const changeHtml = (val, invert = false) => {
    if (val === null || val === undefined) return '';
    const up = val >= 0;
    const good = invert ? !up : up;
    const icon = up ? 'arrowUpRight' : 'arrowDownRight';
    const cls = good ? 'home-stat-change--good' : 'home-stat-change--bad';
    return `<span class="home-stat-change ${cls}">${Icon(icon, { size: 12 })} ${Math.abs(Math.round(val))}%</span>`;
  };

  el.innerHTML = `
    <div class="home-stat-card home-stat-card--income">
      <div class="home-stat-card__icon">${Icon('arrowUpRight', { size: 14, color: '#10b981' })}</div>
      <div class="home-stat-card__label">Pemasukan</div>
      <div class="home-stat-card__value">${mask(summary.totalIncome)}</div>
      ${changeHtml(summary.incomeChange)}
    </div>
    <div class="home-stat-card home-stat-card--expense">
      <div class="home-stat-card__icon">${Icon('arrowDownRight', { size: 18, color: '#ef4444' })}</div>
      <div class="home-stat-card__label">Pengeluaran</div>
      <div class="home-stat-card__value">${mask(summary.totalExpense)}</div>
      ${changeHtml(summary.expenseChange, true)}
    </div>
    <div class="home-stat-card home-stat-card--savings">
      <div class="home-stat-card__icon">${Icon('trendingUp', { size: 18, color: '#3b82f6' })}</div>
      <div class="home-stat-card__label">Surplus</div>
      <div class="home-stat-card__value">${mask(summary.totalSavings)}</div>
      ${changeHtml(summary.savingsChange)}
    </div>
  `;

  return el;
}
