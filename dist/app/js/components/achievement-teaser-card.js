/**
 * Home teaser for next achievement (Growth Sprint 14 polish).
 * @module components/achievement-teaser-card
 */

/**
 * @param {object} hint from getNextAchievementHint
 * @param {object} [callbacks]
 * @returns {HTMLElement|null}
 */
export function renderAchievementTeaserCard(hint, callbacks = {}) {
  if (!hint?.badge) return null;

  const el = document.createElement('section');
  el.className = 'home-section wellness-prompt-card achievement-teaser-card';
  el.innerHTML = `
    <div class="wellness-prompt-card__inner tap">
      <span>${hint.badge.icon}</span>
      <div>
        <strong>${escapeHtml(hint.badge.title)}</strong>
        <div class="wellness-prompt-card__sub">
          ${hint.unlockedCount}/${hint.total} badge · Level ${hint.level} ${escapeHtml(hint.levelLabel)}
        </div>
        <div class="wellness-prompt-card__sub">${escapeHtml(hint.badge.desc)}</div>
      </div>
    </div>
  `;
  el.querySelector('.wellness-prompt-card__inner')?.addEventListener('click', () => {
    callbacks.onOpen?.();
  });
  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
