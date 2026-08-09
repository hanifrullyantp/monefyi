/**
 * Compact multi-goals card for beranda (Sprint 3).
 * @module components/goals-list-card
 */

import { Icon } from './icons.js';
import { enrichGoal } from '../services/financial-goals.js';

/**
 * @param {object[]} goals
 * @param {object} [callbacks]
 * @returns {HTMLElement|null}
 */
export function renderGoalsListCard(goals = [], callbacks = {}) {
  const active = goals.filter((g) => g.status === 'active' || !g.status);
  if (active.length <= 1) return null;

  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
  const el = document.createElement('section');
  el.className = 'home-section goals-list-card tap';

  el.innerHTML = `
    <div class="home-section-header">
      <h2 class="home-section-title">${Icon('target', { size: 18 })} Semua Target (${active.length})</h2>
      <button type="button" class="home-section-action tap" data-action="view-all">Kelola</button>
    </div>
    <div class="goals-list-card__items">
      ${active.slice(0, 3).map((g) => {
        const e = enrichGoal(g);
        const pct = e.stats?.pct ?? 0;
        return `
          <div class="goals-list-card__item">
            <span>${g.icon || '🎯'}</span>
            <div>
              <div class="goals-list-card__name">${escapeHtml(g.name)}</div>
              <div class="goals-list-card__meta">${pct}% · Rp ${fmt(g.current_amount)}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  el.querySelector('[data-action="view-all"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onViewAll?.();
  });
  el.addEventListener('click', () => callbacks.onViewAll?.());

  return el;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
