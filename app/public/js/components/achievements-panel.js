/**
 * Achievements panel — badge grid + level (Fase 5.2).
 * @module components/achievements-panel
 */

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export async function showAchievementsPanel(opts = {}) {
  const { loadAchievements } = await import('../services/mini-win-engine.js');
  const { computeAchievementProgress } = await import('../services/achievement-catalog.js');
  const { syncCatalogAchievements } = await import('../services/achievement-store.js');
  await syncCatalogAchievements(window.STATE || {});
  const earned = await loadAchievements();
  const progress = computeAchievementProgress(window.STATE || {}, earned);

  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'achievementsPanelHost';
    _host.className = 'achievements-panel-host';
    document.body.appendChild(_host);
  }

  _host.innerHTML = `
    <div class="achievements-panel" role="dialog" aria-modal="true">
      <div class="achievements-panel__head">
        <div>
          <div class="achievements-panel__kicker">Level ${progress.level} · ${escapeHtml(progress.levelLabel)}</div>
          <div class="achievements-panel__title">Pencapaian</div>
          <div class="achievements-panel__sub">${progress.unlockedCount}/${progress.total} badge · ${progress.totalXp} XP</div>
        </div>
        <button type="button" class="achievements-panel__close" data-action="close" aria-label="Tutup">×</button>
      </div>
      <div class="achievements-panel__grid">
        ${progress.badges.map((b) => `
          <div class="achievement-badge ${b.unlocked ? 'is-unlocked' : 'is-locked'}" title="${escapeHtml(b.desc)}">
            <span class="achievement-badge__icon">${b.icon}</span>
            <span class="achievement-badge__title">${escapeHtml(b.title)}</span>
            <span class="achievement-badge__xp">${b.xp} XP</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  _host.classList.add('is-visible');
  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.addEventListener('click', (e) => {
    if (e.target === _host) close();
  }, { once: true });
  opts.onOpen?.();
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function close() {
  _host?.classList.remove('is-visible');
}
