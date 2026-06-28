/**
 * Sync status indicator — online/offline + sync progress.
 * @module components/sync-indicator
 */

import { onSyncEvent, triggerSync, getSyncStatus } from '../services/sync-engine.js';

const ICON_ONLINE =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

const ICON_OFFLINE =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

/**
 * @param {object} [opts]
 * @param {(msg: string, type?: string) => void} [opts.showToast]
 * @returns {HTMLElement}
 */
export function renderSyncIndicator(opts = {}) {
  const showToast = opts.showToast || (() => {});

  const indicator = document.createElement('button');
  indicator.type = 'button';
  indicator.className = 'sync-indicator tap';
  indicator.setAttribute('aria-label', 'Status sinkronisasi');
  indicator.title = 'Ketuk untuk sinkron manual';

  function labelFor(status) {
    if (status.isSyncing) return 'Menyinkronkan...';
    if (status.isOnline) return 'Tersinkron';
    return 'Mode Offline';
  }

  function update() {
    const status = getSyncStatus();
    indicator.innerHTML = `
      <span class="sync-icon ${status.isSyncing ? 'syncing' : ''}" aria-hidden="true">
        ${status.isOnline ? ICON_ONLINE : ICON_OFFLINE}
      </span>
      <span class="sync-label">${labelFor(status)}</span>
    `;
    indicator.dataset.online = String(status.isOnline);
    indicator.dataset.syncing = String(status.isSyncing);
  }

  update();

  onSyncEvent((event, data) => {
    update();
    if (event === 'sync-complete' && data?.pushed > 0) {
      showToast(`✓ ${data.pushed} perubahan tersinkron`, 'success');
    }
  });

  indicator.addEventListener('click', () => {
    if (navigator.onLine) triggerSync('manual');
  });

  return indicator;
}

/**
 * Mount sync indicator into header if slot exists.
 * @param {object} [opts]
 */
export function mountSyncIndicator(opts = {}) {
  const existing = document.querySelector('.sync-indicator');
  if (existing) return existing;

  const slot =
    document.getElementById('syncIndicatorSlot') ||
    document.querySelector('.mobile-header-actions');

  if (!slot) return null;

  const indicator = renderSyncIndicator(opts);

  if (slot.id === 'syncIndicatorSlot') {
    slot.appendChild(indicator);
  } else {
    slot.prepend(indicator);
  }

  return indicator;
}
