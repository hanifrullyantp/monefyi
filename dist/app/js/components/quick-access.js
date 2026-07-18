/**
 * Quick access shortcut icons for mobile Beranda.
 * @module components/quick-access
 */

import { Icon } from './icons.js';

/** Shown in compact row when collapsed */
const PRIMARY_ACTIONS = [
  { id: 'budget', label: 'Budget', icon: 'budget' },
  { id: 'scan', label: 'Scan', icon: 'camera' },
  { id: 'analytics', label: 'Analitik', icon: 'chartBar' },
  { id: 'add', label: 'Tambah', icon: 'plus' },
  { id: 'search', label: 'Cari', icon: 'search' },
];

/** Full list when expanded */
const ALL_ACTIONS = [
  ...PRIMARY_ACTIONS,
  { id: 'tutorial', label: 'Tutorial', icon: 'academic' },
  { id: 'profile', label: 'Profil', icon: 'user' },
  { id: 'affiliate', label: 'Affiliate', icon: 'trophy' },
  { id: 'install', label: 'Install App', icon: 'smartphone' },
  { id: 'accounts', label: 'Akun', icon: 'wallet' },
  { id: 'advisor', label: 'Monevisor', icon: 'lightBulb' },
  { id: 'settings', label: 'Pengaturan', icon: 'settings' },
];

/**
 * @param {object} action
 * @returns {string}
 */
function renderQuickBtn(action) {
  return `
    <button type="button" class="home-quick-btn tap" data-action="${action.id}">
      <span class="home-quick-btn__icon">${Icon(action.icon, { size: 22, color: '#10b981' })}</span>
      <span class="home-quick-btn__label">${action.label}</span>
    </button>
  `;
}

/**
 * @param {HTMLElement} root
 * @param {object} callbacks
 */
function wireQuickButtons(root, callbacks) {
  root.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => callbacks.onActionClick?.(btn.getAttribute('data-action')));
  });
}

/**
 * @param {object} [callbacks]
 * @returns {HTMLElement}
 */
export function renderQuickAccess(callbacks = {}) {
  const el = document.createElement('section');
  el.className = 'home-quick-access';

  const primaryItems = PRIMARY_ACTIONS.map(renderQuickBtn).join('');
  const allItems = ALL_ACTIONS.map(renderQuickBtn).join('');

  el.innerHTML = `
    <div class="home-section-header">
      <h2 class="home-section-title">${Icon('sparkles', { size: 18 })} Akses Cepat</h2>
      <button type="button" class="home-section-action tap" data-toggle-quick-access aria-expanded="false">
        Lihat semua ${Icon('chevronRight', { size: 14 })}
      </button>
    </div>
    <div class="home-quick-row">${primaryItems}</div>
    <div class="home-quick-grid hidden" hidden>${allItems}</div>
  `;

  const toggleBtn = el.querySelector('[data-toggle-quick-access]');
  const row = el.querySelector('.home-quick-row');
  const grid = el.querySelector('.home-quick-grid');

  toggleBtn?.addEventListener('click', () => {
    const expanded = el.classList.toggle('is-expanded');
    toggleBtn.setAttribute('aria-expanded', String(expanded));
    row?.classList.toggle('hidden', expanded);
    grid?.classList.toggle('hidden', !expanded);
    if (grid) grid.hidden = !expanded;
    toggleBtn.innerHTML = expanded
      ? `Sembunyikan ${Icon('chevronDown', { size: 14 })}`
      : `Lihat semua ${Icon('chevronRight', { size: 14 })}`;
  });

  wireQuickButtons(el, callbacks);
  return el;
}
