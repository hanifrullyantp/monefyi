/**
 * Budget summary card with color-coded progress.
 * @module components/budget-summary-card
 */

import { Icon } from './icons.js';
import { LABELS } from '../constants/language.js';

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
        <span>${budget?.daysLeft ?? 0} ${LABELS.DAILY.DAYS_TO_PAYDAY}</span>
      </div>
    </div>
    <div class="home-budget-grid">
      <div class="home-budget-stat">
        <span class="home-budget-stat__label">Budget</span>
        <span class="home-budget-stat__value">${formatIDR(budget?.totalBudget || 0)}</span>
      </div>
      <div class="home-budget-stat">
        <span class="home-budget-stat__label">${LABELS.BUDGET.USED}</span>
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

/**
 * Budget alert card — only categories near/over limit (≥70%).
 * @param {object} ctx from buildHomePageData
 * @param {Function} formatIDR
 * @param {object} [callbacks]
 * @returns {HTMLElement|null}
 */
export function renderBudgetAlertsCard(ctx, formatIDR, callbacks = {}) {
  const alerts = ctx?.nearLimitCategories || [];
  if (!alerts.length) return null;

  const el = document.createElement('section');
  el.className = 'home-section home-budget-card home-budget-alerts tap';

  el.innerHTML = `
    <div class="home-section-header">
      <h2 class="home-section-title">${Icon('exclamation', { size: 18 })} Budget Perlu Perhatian</h2>
      <button type="button" class="home-section-action tap" data-action="view-budget">Detail</button>
    </div>
    <ul class="home-budget-alert-list">
      ${alerts.map((a) => `
        <li class="home-budget-alert-item">
          <span class="home-budget-alert-name">${escapeHtml(a.name)}</span>
          <span class="home-budget-alert-pct" style="color:${a.pct >= 100 ? '#ef4444' : '#f59e0b'}">${Math.round(a.pct)}%</span>
          <span class="home-budget-alert-rem">sisa ${formatIDR(a.remaining)}</span>
        </li>`).join('')}
    </ul>
  `;

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="view-budget"]')) {
      e.stopPropagation();
    }
    callbacks.onClick?.();
  });
  el.querySelector('[data-action="view-budget"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onClick?.();
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
