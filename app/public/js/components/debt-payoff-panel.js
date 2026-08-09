/**
 * Debt payoff planner panel (Fase 6.2).
 * @module components/debt-payoff-panel
 */

import { Icon } from './icons.js';
import {
  loadDebts,
  upsertDebt,
  deleteDebt,
  compareStrategies,
} from '../services/debt-payoff-planner.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export async function showDebtPayoffPanel(opts = {}) {
  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'debtPanelHost';
    _host.className = 'pro-panel-host';
    document.body.appendChild(_host);
  }

  let extra = 500000;

  const render = () => {
    const debts = loadDebts();
    const cmp = debts.length ? compareStrategies(debts, extra) : null;
    const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
    const rec = cmp?.recommended || 'avalanche';
    const plan = cmp?.[rec];

    _host.innerHTML = `
      <div class="pro-panel" role="dialog" aria-modal="true">
        <div class="pro-panel__head">
          <div>
            <div class="pro-panel__kicker">Pro+ · Utang</div>
            <div class="pro-panel__title">Debt Payoff Planner</div>
          </div>
          <button type="button" class="pro-panel__close" data-action="close">${Icon('x', { size: 18 })}</button>
        </div>
        ${cmp ? `
          <div class="pro-panel__summary pro-panel__summary--debt">
            <div><span>Strategi rekomendasi</span><strong>${rec === 'avalanche' ? 'Avalanche' : 'Snowball'}</strong></div>
            <div><span>Lunas estimasi</span><strong>${plan.months} bulan</strong></div>
            <div><span>Bunga total</span><strong>Rp ${fmt(plan.total_interest)}</strong></div>
          </div>
          <label class="pro-panel__slider-label">Extra payment / bulan: Rp ${fmt(extra)}</label>
          <input type="range" id="debtExtra" min="0" max="5000000" step="100000" value="${extra}" />
          <div class="pro-panel__compare">
            <div>Snowball: ${cmp.snowball.months} bln · Rp ${fmt(cmp.snowball.total_interest)} bunga</div>
            <div>Avalanche: ${cmp.avalanche.months} bln · Rp ${fmt(cmp.avalanche.total_interest)} bunga</div>
          </div>
        ` : '<p class="pro-panel__empty">Tambah utang di bawah atau isi di onboarding.</p>'}
        <div class="pro-panel__list">
          ${debts.map((d) => `
            <div class="pro-panel__item">
              <div>
                <strong>${escapeHtml(d.name)}</strong>
                <div class="pro-panel__meta">Rp ${fmt(d.balance)} · ${d.interest_rate}% · min Rp ${fmt(d.min_payment)}</div>
              </div>
              ${d.source !== 'onboarding' ? `<button type="button" class="pro-panel__del" data-delete="${d.id}">×</button>` : ''}
            </div>
          `).join('')}
        </div>
        <form class="pro-panel__form" id="debtForm">
          <input name="name" placeholder="Nama utang (Kartu BCA, KPR…)" required />
          <div class="pro-panel__form-row">
            <input name="balance" type="number" min="0" placeholder="Sisa utang" required />
            <input name="min_payment" type="number" min="0" placeholder="Cicilan/bulan" required />
            <input name="interest_rate" type="number" min="0" step="0.1" placeholder="Bunga %/tahun" />
          </div>
          <button type="submit" class="pro-panel__submit tap">+ Tambah Utang</button>
        </form>
      </div>
    `;

    _host.classList.add('is-visible');
    bindEvents(render, opts, () => extra, (v) => { extra = v; });
  };

  render();
}

function bindEvents(rerender, opts, getExtra, setExtra) {
  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.addEventListener('click', (e) => { if (e.target === _host) close(); }, { once: true });

  _host.querySelector('#debtExtra')?.addEventListener('input', (e) => {
    setExtra(Number(e.target.value) || 0);
    rerender();
  });

  _host.querySelector('#debtForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    upsertDebt({
      name: fd.get('name'),
      balance: fd.get('balance'),
      min_payment: fd.get('min_payment'),
      interest_rate: fd.get('interest_rate') || 12,
    });
    e.target.reset();
    rerender();
    opts.onChange?.();
  });

  _host.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteDebt(btn.getAttribute('data-delete'));
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
