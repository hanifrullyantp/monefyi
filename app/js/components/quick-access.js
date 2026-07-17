/**
 * Quick access shortcut icons for mobile Beranda.
 * @module components/quick-access
 */

import { Icon } from './icons.js';

const ACTIONS = [
  { id: 'budget', label: 'Budget', icon: 'budget' },
  { id: 'scan', label: 'Scan', icon: 'camera' },
  { id: 'analytics', label: 'Analitik', icon: 'chartBar' },
  { id: 'add', label: 'Tambah', icon: 'plus' },
  { id: 'search', label: 'Cari', icon: 'search' },
  { id: 'settings', label: 'Pengaturan', icon: 'settings' },
];

/**
 * @param {object} [callbacks]
 * @returns {HTMLElement}
 */
export function renderQuickAccess(callbacks = {}) {
  const el = document.createElement('section');
  el.className = 'home-quick-access';

  const items = ACTIONS.map((a) => `
    <button type="button" class="home-quick-btn tap" data-action="${a.id}">
      <span class="home-quick-btn__icon">${Icon(a.icon, { size: 22, color: '#10b981' })}</span>
      <span class="home-quick-btn__label">${a.label}</span>
    </button>
  `).join('');

  el.innerHTML = `
    <div class="home-section-header">
      <h2 class="home-section-title">${Icon('sparkles', { size: 18 })} Akses Cepat</h2>
    </div>
    <div class="home-quick-scroll hide-scrollbar">${items}</div>
  `;

  el.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => callbacks.onActionClick?.(btn.getAttribute('data-action')));
  });

  return el;
}
