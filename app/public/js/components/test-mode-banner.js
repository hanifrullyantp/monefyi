/**
 * Test mode banner — visible when admin impersonates test user.
 * @module components/test-mode-banner
 */

import { endImpersonation, isTestModeActive } from '../services/test-mode-service.js';

/**
 * @param {HTMLElement} [mount]
 */
export function renderTestModeBanner(mount) {
  const root = mount || document.getElementById('testModeBannerRoot') || document.body;
  let el = document.getElementById('testModeBanner');
  if (!isTestModeActive()) {
    el?.remove();
    return;
  }

  const tm = window.STATE?.testMode || {};
  if (!el) {
    el = document.createElement('div');
    el.id = 'testModeBanner';
    el.className = 'test-mode-banner';
    el.setAttribute('role', 'status');
    root.prepend(el);
  }

  el.innerHTML = `
    <div class="test-mode-banner__inner">
      <span class="test-mode-banner__label">Mode Testing</span>
      <span class="test-mode-banner__meta">Skenario: ${escapeHtml(tm.scenarioLabel || '—')} · Periode: ${escapeHtml(tm.defaultMonth || '—')}</span>
      <button type="button" class="test-mode-banner__exit" id="testModeExitBtn">Keluar mode test</button>
    </div>
  `;

  el.querySelector('#testModeExitBtn')?.addEventListener('click', async () => {
    await endImpersonation({
      reloadFn: typeof window.bootstrapAuthed === 'function' ? window.bootstrapAuthed : null,
    });
    document.getElementById('adminPanelLauncher')?.classList.remove('hidden');
    ['#btnAdminIcon', '#btnAdminIconDesktop'].forEach((sel) => {
      document.querySelector(sel)?.classList.remove('hidden');
    });
    renderTestModeBanner(mount);
    if (typeof window.rerender === 'function') window.rerender();
  });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

if (typeof window !== 'undefined') {
  window.addEventListener('monefyi:test-mode-changed', () => renderTestModeBanner());
}
