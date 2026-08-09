/**
 * Home prompt for monthly review ritual (Growth Sprint 8).
 * @module components/monthly-review-prompt-card
 */

import { dismissMonthlyReviewPrompt, getCurrentPeriod } from '../services/monthly-review-prompt.js';

/**
 * @param {object} [callbacks]
 * @returns {HTMLElement|null}
 */
export function renderMonthlyReviewPromptCard(callbacks = {}) {
  const period = getCurrentPeriod();
  const monthName = new Date(`${period}-01T12:00:00`).toLocaleDateString('id-ID', {
    month: 'long', year: 'numeric',
  });

  const el = document.createElement('section');
  el.className = 'home-section wellness-prompt-card';
  el.innerHTML = `
    <div class="wellness-prompt-card__inner tap">
      <span>📔</span>
      <div>
        <strong>Review ${monthName}</strong>
        <div class="wellness-prompt-card__sub">5 menit refleksi — tutup buku bulan ini</div>
      </div>
      <button type="button" class="beta-launch-banner__dismiss tap" data-dismiss aria-label="Nanti">✕</button>
    </div>
  `;

  el.querySelector('.wellness-prompt-card__inner')?.addEventListener('click', async (e) => {
    if (e.target.closest('[data-dismiss]')) return;
    const { showMonthlyReviewSheet } = await import('./monthly-review-sheet.js');
    await showMonthlyReviewSheet({
      period,
      onComplete: () => {
        el.remove();
        if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
      },
      onClosing: callbacks.onClosing,
    });
  });

  el.querySelector('[data-dismiss]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dismissMonthlyReviewPrompt(period);
    el.remove();
  });

  return el;
}
