/**
 * Investment portfolio panel (Fase 6.1).
 * @module components/investment-panel
 */

import { Icon } from './icons.js';
import {
  loadInvestments,
  upsertInvestment,
  deleteInvestment,
  computePortfolioSummary,
  ASSET_TYPES,
} from '../services/investment-tracker.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export async function showInvestmentPanel(opts = {}) {
  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'investmentPanelHost';
    _host.className = 'pro-panel-host';
    document.body.appendChild(_host);
  }

  const render = () => {
    const summary = computePortfolioSummary();
    const holdings = loadInvestments();
    const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));

    _host.innerHTML = `
      <div class="pro-panel" role="dialog" aria-modal="true">
        <div class="pro-panel__head">
          <div>
            <div class="pro-panel__kicker">Pro+ · Investasi</div>
            <div class="pro-panel__title">Portfolio Tracker</div>
          </div>
          <button type="button" class="pro-panel__close" data-action="close">${Icon('x', { size: 18 })}</button>
        </div>
        <div class="pro-panel__summary">
          <div><span>Nilai</span><strong>Rp ${fmt(summary.total_value)}</strong></div>
          <div><span>Modal</span><strong>Rp ${fmt(summary.total_cost)}</strong></div>
          <div><span>Return</span><strong class="${summary.return_pct >= 0 ? 'positive' : 'negative'}">${summary.return_pct >= 0 ? '+' : ''}${summary.return_pct}%</strong></div>
        </div>
        <div class="pro-panel__list">
          ${holdings.length ? holdings.map((h) => `
            <div class="pro-panel__item" data-id="${h.id}">
              <div>
                <strong>${escapeHtml(h.name)}</strong>
                <div class="pro-panel__meta">${escapeHtml(h.asset_type)} · ${h.units} unit · Rp ${fmt(h.current_price)}/unit</div>
              </div>
              <button type="button" class="pro-panel__del" data-delete="${h.id}" aria-label="Hapus">×</button>
            </div>
          `).join('') : '<p class="pro-panel__empty">Belum ada investasi. Tambah manual di bawah.</p>'}
        </div>
        <form class="pro-panel__form" id="invForm">
          <input name="name" placeholder="Nama (e.g. RDPU Bibit)" required />
          <select name="asset_type">${ASSET_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('')}</select>
          <div class="pro-panel__form-row">
            <input name="units" type="number" step="any" min="0" placeholder="Unit" required />
            <input name="avg_cost" type="number" step="any" min="0" placeholder="Harga beli/unit" required />
            <input name="current_price" type="number" step="any" min="0" placeholder="Harga sekarang" />
          </div>
          <input name="platform" placeholder="Platform (Bibit, Ajaib…)" />
          <button type="submit" class="pro-panel__submit tap">+ Tambah Holding</button>
        </form>
      </div>
    `;

    _host.classList.add('is-visible');
    bindEvents(render, opts);
  };

  render();
}

function bindEvents(rerender, opts) {
  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.addEventListener('click', (e) => { if (e.target === _host) close(); }, { once: true });

  _host.querySelector('#invForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    upsertInvestment({
      name: fd.get('name'),
      asset_type: fd.get('asset_type'),
      units: fd.get('units'),
      avg_cost: fd.get('avg_cost'),
      current_price: fd.get('current_price') || fd.get('avg_cost'),
      platform: fd.get('platform'),
    });
    e.target.reset();
    rerender();
    opts.onChange?.();
  });

  _host.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteInvestment(btn.getAttribute('data-delete'));
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
