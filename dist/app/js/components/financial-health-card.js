/**
 * Financial health score card (Fase 4.3).
 * @module components/financial-health-card
 */

/**
 * @param {object} scoreResult from computeFinancialHealthScore
 * @param {object} [callbacks]
 * @returns {HTMLElement}
 */
export function renderFinancialHealthCard(scoreResult, callbacks = {}) {
  const el = document.createElement('section');
  el.className = 'financial-health-card';

  const trendIcon = scoreResult.trend === 'up' ? '↑' : scoreResult.trend === 'down' ? '↓' : '→';
  const components = Object.values(scoreResult.components || {});

  el.innerHTML = `
    <div class="financial-health-card__head">
      <div>
        <div class="financial-health-card__kicker">Financial Health</div>
        <div class="financial-health-card__grade">${escapeHtml(scoreResult.grade || '')}</div>
      </div>
      <div class="financial-health-card__score" aria-label="Skor ${scoreResult.overall}">
        <span class="financial-health-card__score-num">${scoreResult.overall}</span>
        <span class="financial-health-card__trend">${trendIcon}</span>
      </div>
    </div>
    <div class="financial-health-card__bars">
      ${components.map((c) => `
        <div class="financial-health-bar">
          <div class="financial-health-bar__label">
            <span>${escapeHtml(c.label)}</span>
            <span>${c.max ? `${c.score}/${c.max}` : c.score}</span>
          </div>
          <div class="financial-health-bar__track">
            <div class="financial-health-bar__fill" style="width:${c.max ? Math.round((c.score / c.max) * 100) : c.score}%"></div>
          </div>
        </div>
      `).join('')}
    </div>
    ${scoreResult.recommendations?.length ? `
      <div class="financial-health-card__rec">
        ${escapeHtml(scoreResult.recommendations[0])}
      </div>
    ` : ''}
    ${callbacks.onViewDetail ? `
      <button type="button" class="financial-health-card__cta tap">Lihat rekomendasi</button>
    ` : ''}
  `;

  el.querySelector('.financial-health-card__cta')?.addEventListener('click', () => {
    callbacks.onViewDetail?.();
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
