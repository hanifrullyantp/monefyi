/**
 * Wallet / bank connection panel (Fase 7.2).
 * @module components/wallet-connect-panel
 */

import { Icon } from './icons.js';
import {
  getIntegrationSummary,
  saveWalletConnection,
  removeWalletConnection,
  WALLET_PROVIDERS,
} from '../services/wallet-sync-registry.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export async function showWalletConnectPanel(opts = {}) {
  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'walletConnectHost';
    _host.className = 'wallet-connect-host';
    document.body.appendChild(_host);
  }

  const render = () => {
    const summary = getIntegrationSummary();
    const fmt = (d) => (d ? new Date(d).toLocaleDateString('id-ID') : '—');

    _host.innerHTML = `
      <div class="wallet-connect-panel" role="dialog" aria-modal="true">
        <div class="wallet-connect-panel__head">
          <div>
            <div class="wallet-connect-panel__kicker">Integrasi Ekosistem</div>
            <div class="wallet-connect-panel__title">Bank & E-Wallet</div>
            <div class="wallet-connect-panel__sub">${summary.linked_count} terhubung · ${summary.api_coming} API direct (rencana)</div>
          </div>
          <button type="button" class="wallet-connect-panel__close" data-action="close">${Icon('x', { size: 18 })}</button>
        </div>
        <p class="wallet-connect-panel__note">
          Saat ini: hubungkan via <strong>Email Auto-Import</strong> (aktif). Direct API sync membutuhkan persetujuan regulator — status ditandai "Rencana".
        </p>
        <div class="wallet-connect-grid">
          ${summary.providers.map((p) => `
            <div class="wallet-connect-card ${p.is_linked ? 'is-linked' : ''}" data-provider="${p.id}">
              <div class="wallet-connect-card__icon">${p.icon}</div>
              <div class="wallet-connect-card__name">${escapeHtml(p.name)}</div>
              <div class="wallet-connect-card__meta">
                ${p.is_linked ? `✓ ${p.connection?.method || 'email'}` : methodLabel(p)}
              </div>
              ${p.connection?.last_sync_at ? `<div class="wallet-connect-card__sync">Sync: ${fmt(p.connection.last_sync_at)}</div>` : ''}
              <div class="wallet-connect-card__actions">
                ${p.is_linked ? `
                  <button type="button" class="wallet-connect-btn wallet-connect-btn--ghost" data-unlink="${p.id}">Putus</button>
                ` : `
                  <button type="button" class="wallet-connect-btn" data-link="${p.id}" data-method="email">Via Email</button>
                  ${p.methods.includes('manual') ? `<button type="button" class="wallet-connect-btn wallet-connect-btn--ghost" data-link="${p.id}" data-method="manual">Manual</button>` : ''}
                `}
              </div>
            </div>
          `).join('')}
        </div>
        <button type="button" class="wallet-connect-panel__email tap" data-action="email-import">
          ${Icon('mail', { size: 14 })} Atur Email Auto-Import
        </button>
      </div>
    `;

    _host.classList.add('is-visible');
    bindEvents(render, opts);
  };

  render();
}

function methodLabel(p) {
  if (p.apiStatus === 'planned') return 'Email · API rencana';
  if (p.apiStatus === 'exploring') return 'Email · API eksplorasi';
  return 'Email / Manual';
}

function bindEvents(rerender, opts) {
  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.addEventListener('click', (e) => { if (e.target === _host) close(); }, { once: true });

  _host.querySelector('[data-action="email-import"]')?.addEventListener('click', async () => {
    close();
    const { showEmailImportSetup } = await import('./email-import-setup.js');
    await showEmailImportSetup();
  });

  _host.querySelectorAll('[data-link]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-link');
      const method = btn.getAttribute('data-method') || 'email';
      const provider = WALLET_PROVIDERS.find((p) => p.id === id);
      const label = prompt(`Label akun ${provider?.name || id} (opsional):`, provider?.name || '');
      saveWalletConnection(id, { method, account_label: label || provider?.name, status: 'active' });
      rerender();
      opts.onLinked?.(id);
    });
  });

  _host.querySelectorAll('[data-unlink]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeWalletConnection(btn.getAttribute('data-unlink'));
      rerender();
    });
  });
}

function close() {
  _host?.classList.remove('is-visible');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
