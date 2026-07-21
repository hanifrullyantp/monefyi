/**
 * Quick access shortcut icons for mobile Beranda / desktop Dashboard.
 * @module components/quick-access
 */

import { Icon } from './icons.js';
import { shouldShowInstallShortcut } from '../services/install-prompt.js';

const QUICK_ACTIONS = [
  { id: 'transactions', label: 'Transaksi', icon: 'list', color: '#3b82f6', bg: 'rgba(59,130,246,0.14)' },
  { id: 'budgeting', label: 'Budgeting', icon: 'budget', color: '#10b981', bg: 'rgba(16,185,129,0.14)' },
  { id: 'analisa', label: 'Analisa', icon: 'chartBar', color: '#0ea5e9', bg: 'rgba(14,165,233,0.14)' },
  { id: 'tutorial', label: 'Tutorial', icon: 'academic', color: '#f59e0b', bg: 'rgba(245,158,11,0.14)' },
  { id: 'profile', label: 'Profil', icon: 'user', color: '#34d399', bg: 'rgba(52,211,153,0.14)' },
  { id: 'affiliate', label: 'Affiliate', icon: 'trophy', color: '#eab308', bg: 'rgba(234,179,8,0.14)' },
  { id: 'install', label: 'Install App', icon: 'smartphone', color: '#10b981', bg: 'rgba(16,185,129,0.14)' },
  { id: 'accounts', label: 'Akun', icon: 'wallet', color: '#14b8a6', bg: 'rgba(20,184,166,0.14)' },
  { id: 'settings', label: 'Pengaturan', icon: 'settings', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
];

/**
 * @returns {typeof QUICK_ACTIONS}
 */
function visibleActions() {
  const showInstall = shouldShowInstallShortcut();
  return QUICK_ACTIONS.filter((a) => a.id !== 'install' || showInstall);
}

/**
 * @param {object} action
 * @returns {string}
 */
function renderQuickBtn(action) {
  return `
    <button type="button" class="home-quick-btn tap" data-action="${action.id}">
      <span class="home-quick-btn__icon" style="--qa-color:${action.color};--qa-bg:${action.bg}">
        ${Icon(action.icon, { size: 22, color: action.color })}
      </span>
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
 * @param {'default'|'all-row'} [callbacks.variant]
 * @returns {HTMLElement}
 */
export function renderQuickAccess(callbacks = {}) {
  const el = document.createElement('section');
  const variant = callbacks.variant === 'all-row' ? 'all-row' : 'default';
  el.className = variant === 'all-row'
    ? 'home-quick-access home-quick-access--all-row'
    : 'home-quick-access';

  const actions = visibleActions();
  const allItems = actions.map(renderQuickBtn).join('');

  if (variant === 'all-row') {
    el.innerHTML = `
      <div class="home-section-header">
        <h2 class="home-section-title">${Icon('sparkles', { size: 18 })} Akses Cepat</h2>
      </div>
      <div class="home-quick-row home-quick-row--all">${allItems}</div>
    `;
    wireQuickButtons(el, callbacks);
    return el;
  }

  const primaryActions = actions.slice(0, 4);
  const primaryItems = primaryActions.map(renderQuickBtn).join('');

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
    if (row) row.hidden = expanded;
    grid?.classList.toggle('hidden', !expanded);
    if (grid) grid.hidden = !expanded;
    toggleBtn.innerHTML = expanded
      ? `Sembunyikan ${Icon('chevronDown', { size: 14 })}`
      : `Lihat semua ${Icon('chevronRight', { size: 14 })}`;
  });

  wireQuickButtons(el, callbacks);
  return el;
}
