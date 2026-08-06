/**
 * Primary financial target card for beranda.
 * @module components/target-summary-card
 */

import { Icon } from './icons.js';

/**
 * @param {object|null} target enriched primary target with stats
 * @param {object} [callbacks]
 * @returns {HTMLElement|null}
 */
export function renderTargetSummaryCard(target, callbacks = {}) {
  if (!target?.name) return null;

  const stats = target.stats || {};
  const pct = stats.pct ?? 0;
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));

  const el = document.createElement('section');
  el.className = 'home-section home-target-card tap';
  el.innerHTML = `
    <div class="home-section-header">
      <h2 class="home-section-title">${Icon('target', { size: 18 })} ${escapeHtml(target.name)}</h2>
    </div>
    <div class="home-target-progress">
      <div class="home-target-progress__track">
        <div class="home-target-progress__fill" style="width:${pct}%"></div>
      </div>
      <div class="home-target-progress__meta">
        <span>${pct}% — Rp ${fmt(stats.current)}</span>
        <span>dari Rp ${fmt(stats.targetAmount)}</span>
      </div>
    </div>
    ${stats.etaLabel ? `
      <p class="home-target-eta">Estimasi tercapai: ${escapeHtml(stats.etaLabel)}</p>
    ` : ''}
    ${stats.boostMonthly && stats.etaBoostedLabel && stats.monthsLeft ? `
      <p class="home-target-boost">+Rp ${fmt(stats.boostMonthly)}/bln → maju ke ${escapeHtml(stats.etaBoostedLabel)}</p>
    ` : ''}
  `;
  el.addEventListener('click', () => callbacks.onClick?.());
  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
