/**
 * Weekly check-in bottom sheet.
 * @module components/weekly-checkin-sheet
 */

import { Icon } from './icons.js';

/** @type {HTMLElement|null} */
let _root = null;

function ensureRoot() {
  if (_root && document.body.contains(_root)) return _root;
  _root = document.createElement('div');
  _root.id = 'weeklyCheckinHost';
  _root.className = 'weekly-checkin-host';
  document.body.appendChild(_root);
  return _root;
}

/**
 * @param {object} content
 * @param {object} [callbacks]
 */
export function showWeeklyCheckinSheet(content, callbacks = {}) {
  const root = ensureRoot();
  root.innerHTML = `
    <div class="weekly-checkin-sheet" role="dialog" aria-modal="true">
      <div class="wcs-header">
        <div>
          <div class="wcs-kicker">Review Minggu Ini</div>
          <div class="wcs-period">${escapeHtml(content.period_label || '')}</div>
        </div>
        <button type="button" class="wcs-close" data-action="close">${Icon('x', { size: 18 })}</button>
      </div>
      <div class="wcs-section wcs-good">
        <div class="wcs-section-title">✅ Yang berjalan baik</div>
        <ul>${(content.good || []).map((g) => `<li>${escapeHtml(g)}</li>`).join('') || '<li>Mulai catat untuk lihat insight</li>'}</ul>
      </div>
      ${(content.attention || []).length ? `
        <div class="wcs-section wcs-attention">
          <div class="wcs-section-title">⚠️ Yang perlu perhatian</div>
          <ul>${content.attention.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
        </div>
      ` : ''}
      <div class="wcs-section wcs-focus">
        <div class="wcs-section-title">🎯 Fokus minggu depan</div>
        <p>${escapeHtml(content.focus || '')}</p>
      </div>
      <div class="wcs-actions">
        <button type="button" class="wcs-btn wcs-btn--ghost" data-action="advisor">Lihat Detail</button>
        <button type="button" class="wcs-btn wcs-btn--primary" data-action="ok">Oke, Siap!</button>
      </div>
    </div>
  `;

  const close = () => {
    root.classList.remove('is-visible');
    callbacks.onDismiss?.();
  };

  root.classList.add('is-visible');
  root.querySelector('[data-action="close"]')?.addEventListener('click', close);
  root.querySelector('[data-action="ok"]')?.addEventListener('click', close);
  root.querySelector('[data-action="advisor"]')?.addEventListener('click', () => {
    close();
    if (typeof window.toggleNav === 'function') window.toggleNav('advisor');
    else if (typeof window.openAdvisorAuto === 'function') window.openAdvisorAuto();
  });
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  }, { once: true });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
