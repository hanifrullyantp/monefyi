/**
 * Budget summary card with color-coded progress.
 * @module components/budget-summary-card
 */

import { Icon } from './icons.js';

const STATUS_LABELS = {
  healthy: { text: 'Sehat', color: '#10b981' },
  attention: { text: 'Perhatian', color: '#f59e0b' },
  warning: { text: 'Hampir habis', color: '#f97316' },
  danger: { text: 'Melebihi', color: '#ef4444' },
};

/**
 * @param {object} budget
 * @param {Function} formatIDR
 * @param {object} [callbacks]
 * @returns {HTMLElement}
 */
export function renderBudgetSummaryCard(budget, formatIDR, callbacks = {}) {
  const el = document.createElement('section');
  el.className = 'home-section home-budget-card tap';
  const status = STATUS_LABELS[budget?.status] || STATUS_LABELS.healthy;
  const pct = Math.min(100, Math.round(budget?.percentage || 0));
  const barColor = status.color;

  el.innerHTML = `
    <div class="home-section-header">
      <h2 class="home-section-title">${Icon('target', { size: 18 })} Budget</h2>
      <span class="home-budget-badge" style="--badge-color:${status.color}">${status.text}</span>
    </div>
    <div class="home-budget-progress">
      <div class="home-budget-progress__track">
        <div class="home-budget-progress__fill" style="width:${pct}%;background:${barColor}"></div>
      </div>
      <div class="home-budget-progress__meta">
        <span>${pct}% terpakai</span>
        <span>${budget?.daysLeft ?? 0} hari tersisa</span>
      </div>
    </div>
    <div class="home-budget-grid">
      <div class="home-budget-stat">
        <span class="home-budget-stat__label">Budget</span>
        <span class="home-budget-stat__value">${formatIDR(budget?.totalBudget || 0)}</span>
      </div>
      <div class="home-budget-stat">
        <span class="home-budget-stat__label">Realisasi</span>
        <span class="home-budget-stat__value">${formatIDR(budget?.totalSpent || 0)}</span>
      </div>
      <div class="home-budget-stat">
        <span class="home-budget-stat__label">Sisa</span>
        <span class="home-budget-stat__value">${formatIDR(budget?.remaining || 0)}</span>
      </div>
    </div>
  `;

  el.addEventListener('click', () => callbacks.onClick?.());
  return el;
}
