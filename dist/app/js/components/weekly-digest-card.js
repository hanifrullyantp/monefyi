/**
 * Weekly digest card for home dashboard (Fase 4.1).
 * @module components/weekly-digest-card
 */

import { Icon } from './icons.js';

/**
 * @param {object} [state]
 * @param {object} [callbacks]
 * @returns {HTMLElement|null}
 */
export function renderWeeklyDigestCard(state = window.STATE, callbacks = {}) {
  const digest = state._weeklyDigest;
  if (!digest?.has_data) return null;

  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
  const el = document.createElement('section');
  el.className = 'home-section weekly-digest-card';

  el.innerHTML = `
    <div class="weekly-digest-card__inner">
      <div class="weekly-digest-card__head">
        <span class="weekly-digest-card__icon">📊</span>
        <div>
          <div class="weekly-digest-card__title">Rekap Minggu Ini</div>
          <div class="weekly-digest-card__period">${escapeHtml(digest.period_label || '')}</div>
        </div>
        <button type="button" class="weekly-digest-card__open tap" aria-label="Buka detail">
          ${Icon('chevronRight', { size: 18 })}
        </button>
      </div>
      ${digest.coaching_greeting ? `
        <div class="weekly-digest-card__coaching">${escapeHtml(digest.coaching_greeting)}</div>
      ` : ''}
      <div class="weekly-digest-card__stat">
        Pengeluaran <strong>Rp ${fmt(digest.week_total)}</strong>
        <span class="weekly-digest-card__change">${escapeHtml(digest.change_label || '')}</span>
      </div>
      ${digest.highlights?.length ? `
        <ul class="weekly-digest-card__list weekly-digest-card__list--good">
          ${digest.highlights.slice(0, 2).map((h) => `<li>✅ ${escapeHtml(h)}</li>`).join('')}
        </ul>
      ` : ''}
      ${digest.recommendations?.length ? `
        <div class="weekly-digest-card__rec">💡 ${escapeHtml(digest.recommendations[0])}</div>
      ` : ''}
    </div>
  `;

  el.querySelector('.weekly-digest-card__open')?.addEventListener('click', async () => {
    const { showWeeklyDigestPage } = await import('../pages/weekly-digest-page.js');
    showWeeklyDigestPage({
      digest: state._weeklyDigest || digest,
      onAdvisor: () => callbacks.onViewAdvisor?.(),
    });
  });
  el.addEventListener('click', (e) => {
    if (e.target.closest('.weekly-digest-card__open')) return;
    el.querySelector('.weekly-digest-card__open')?.click();
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
