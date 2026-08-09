/**
 * Wellness score home card (Growth Sprint 22).
 * @module components/wellness-home-card
 */

import {
  computeWellnessScore,
  getWellnessFinancialBlend,
  getThisWeekCheckin,
} from '../services/financial-wellness.js';

/**
 * @param {object} [state]
 * @param {object} [callbacks]
 * @returns {HTMLElement|null}
 */
export function renderWellnessHomeCard(state = window.STATE, callbacks = {}) {
  const checkin = getThisWeekCheckin();
  const blend = getWellnessFinancialBlend(state);
  if (!checkin && blend.combined == null) return null;

  const score = computeWellnessScore();
  const trendIcon = score.trend === 'up' ? '↑' : score.trend === 'down' ? '↓' : '→';

  const el = document.createElement('section');
  el.className = 'home-section wellness-score-card';
  el.innerHTML = `
    <div class="wellness-score-card__inner tap">
      <div class="wellness-score-card__head">
        <span>🧘</span>
        <div>
          <strong>Financial Wellness</strong>
          <div class="wellness-prompt-card__sub">${escapeHtml(blend.label)}</div>
        </div>
        <div class="wellness-score-card__score">${blend.combined ?? score.overall ?? '—'}</div>
      </div>
      <div class="wellness-score-card__meta">
        <span>Wellness ${score.overall ?? '—'} ${trendIcon}</span>
        ${blend.financial != null ? `<span>· Health ${blend.financial}</span>` : ''}
      </div>
    </div>
  `;

  el.querySelector('.wellness-score-card__inner')?.addEventListener('click', async () => {
    const { showWellnessCheckinSheet } = await import('./wellness-checkin-sheet.js');
    showWellnessCheckinSheet({ force: !checkin });
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
