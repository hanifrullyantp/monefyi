/**
 * Daily micro-learning tip card (Growth Fase 3.5).
 * @module components/micro-learning-tip-card
 */

/**
 * @param {object} [callbacks]
 * @returns {Promise<HTMLElement|null>}
 */
export async function renderMicroLearningTipCard(callbacks = {}) {
  const {
    getDailyTip, isDailyTipDismissed, dismissDailyTip, getLearningPathSummary,
  } = await import('../services/micro-learning.js');

  if (isDailyTipDismissed()) return null;

  const tip = getDailyTip();
  const path = getLearningPathSummary();
  const el = document.createElement('section');
  el.className = 'home-section micro-learning-tip';
  el.innerHTML = `
    <div class="micro-learning-tip__inner">
      <div class="micro-learning-tip__kicker">💡 Money Tip Hari Ini</div>
      <strong>${escapeHtml(tip.title)}</strong>
      <div class="micro-learning-tip__meta">${tip.minutes} menit baca · Path ${path.completed}/${path.total}</div>
      <div class="micro-learning-tip__actions">
        <button type="button" class="growth-alert__btn tap" data-read>Baca sekarang</button>
        <button type="button" class="micro-learning-tip__dismiss tap" data-dismiss>Nanti</button>
      </div>
    </div>
  `;

  el.querySelector('[data-read]')?.addEventListener('click', async () => {
    const { showMicroLearningSheet } = await import('./micro-learning-sheet.js');
    showMicroLearningSheet({ lessonId: tip.id, onComplete: callbacks.onComplete });
  });
  el.querySelector('[data-dismiss]')?.addEventListener('click', () => {
    dismissDailyTip();
    el.remove();
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
