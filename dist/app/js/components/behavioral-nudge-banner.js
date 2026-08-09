/**
 * Behavioral nudge banner for home (Growth Fase 3.6).
 * @module components/behavioral-nudge-banner
 */

/**
 * @param {object} [state]
 * @param {object} [callbacks]
 * @returns {Promise<HTMLElement|null>}
 */
export async function renderBehavioralNudgeBanner(state = window.STATE, callbacks = {}) {
  const { getActiveNudges, consumeSaveCelebration, dismissNudge } = await import('../services/behavioral-nudges.js');

  const celebration = consumeSaveCelebration();
  const nudges = celebration ? [celebration] : getActiveNudges(state);
  if (!nudges.length) return null;

  const n = nudges[0];
  const el = document.createElement('section');
  el.className = 'home-section behavioral-nudge-banner';
  el.innerHTML = `
    <div class="behavioral-nudge-banner__inner">
      <span class="behavioral-nudge-banner__icon">${n.icon || '✨'}</span>
      <div class="behavioral-nudge-banner__body">
        <strong>${escapeHtml(n.title)}</strong>
        <p>${escapeHtml(n.body)}</p>
        <div class="growth-alert__actions">
          ${(n.actions || []).map((a) => `
            <button type="button" class="growth-alert__btn tap" data-target="${escapeHtml(a.target)}">${escapeHtml(a.label)}</button>
          `).join('')}
        </div>
      </div>
      <button type="button" class="growth-alert__dismiss tap" data-dismiss aria-label="Tutup">✕</button>
    </div>
  `;

  el.querySelector('[data-dismiss]')?.addEventListener('click', () => {
    dismissNudge(n.id, 48);
    el.remove();
  });

  el.querySelectorAll('[data-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      if (target === 'dismiss') {
        dismissNudge(n.id, 24);
        el.remove();
      } else if (target === 'goals') callbacks.onViewGoals?.() || callbacks.onViewTarget?.();
      else if (target === 'coaching') {
        import('./coaching-plans-sheet.js').then(({ showCoachingPlansSheet }) => showCoachingPlansSheet());
      }
    });
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
