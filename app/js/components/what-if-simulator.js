/**
 * What-if financial simulator — savings, purchase, debt tabs (Growth Phase Sprint 3).
 * @module components/what-if-simulator
 */

import { Icon } from './icons.js';
import { computeTargetStats } from '../services/financial-targets.js';
import {
  simulateSavingsExtra,
  simulatePurchaseImpact,
  simulateDebtScenarios,
  fmtCompact,
} from '../services/what-if-engine.js';
import { loadDebts } from '../services/debt-payoff-planner.js';

/**
 * @param {object} [options]
 */
export async function showWhatIfSimulator(options = {}) {
  const state = window.STATE || {};
  const target = options.target
    || state.db?.primaryTargetDisplay
    || state.db?.financialTargets?.find((t) => t.is_primary)
    || state.db?.financialTargets?.[0];

  const overlay = document.createElement('div');
  overlay.className = 'budget-modal-overlay what-if-overlay';
  const debts = loadDebts().filter((d) => Number(d.balance || d.current_balance) > 0);
  const defaultTab = options.tab || (target ? 'savings' : debts.length ? 'debt' : 'purchase');

  overlay.innerHTML = `
    <div class="budget-modal what-if-modal what-if-modal--tabs" role="dialog" aria-modal="true">
      <header class="modal-header">
        <div>
          <h2>Simulasi What-If</h2>
          <p class="modal-subtitle">Uji dampak keputusan sebelum commit</p>
        </div>
        <button type="button" class="close-btn" data-action="close">${Icon('x', { size: 18 })}</button>
      </header>
      <nav class="what-if-tabs" role="tablist">
        <button type="button" class="what-if-tab ${defaultTab === 'savings' ? 'is-active' : ''}" data-tab="savings" ${!target ? 'disabled' : ''}>Nabung</button>
        <button type="button" class="what-if-tab ${defaultTab === 'purchase' ? 'is-active' : ''}" data-tab="purchase">Beli</button>
        <button type="button" class="what-if-tab ${defaultTab === 'debt' ? 'is-active' : ''}" data-tab="debt" ${!debts.length ? 'disabled' : ''}>Utang</button>
      </nav>
      <div class="modal-body" id="what-if-body"></div>
      <footer class="modal-footer">
        <button type="button" class="btn-secondary-budget tap" data-action="close">Tutup</button>
      </footer>
    </div>
  `;

  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelectorAll('[data-action="close"]').forEach((b) => { b.onclick = close; });
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  const body = overlay.querySelector('#what-if-body');
  let activeTab = defaultTab;

  const renderTab = (tab) => {
    activeTab = tab;
    overlay.querySelectorAll('.what-if-tab').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab') === tab);
    });
    if (tab === 'savings') renderSavingsTab(body, target, options, close);
    else if (tab === 'purchase') renderPurchaseTab(body, state);
    else renderDebtTab(body, debts);
  };

  overlay.querySelectorAll('.what-if-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      renderTab(btn.getAttribute('data-tab'));
    });
  });

  renderTab(activeTab);
}

/**
 * @param {HTMLElement} body
 * @param {object|null} target
 * @param {object} options
 * @param {Function} close
 */
function renderSavingsTab(body, target, options, close) {
  if (!target) {
    body.innerHTML = '<p class="admin-muted">Buat target finansial dulu.</p>';
    return;
  }

  const stats = computeTargetStats(target);
  const baseMonthly = Number(stats.monthly || target.monthly_contribution || 200000);
  const remaining = stats.remaining;
  let extra = 200000;

  const paint = () => {
    const sim = simulateSavingsExtra({ remaining, baseMonthly, extraMonthly: extra });
    const eta = sim.monthsNew
      ? new Date(new Date().getFullYear(), new Date().getMonth() + sim.monthsNew, 1)
          .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      : '—';

    body.innerHTML = `
      <p class="modal-subtitle">${escapeHtml(target.name)} · sisa Rp ${fmt(remaining)}</p>
      <label class="tgt-label">Tambahan sisih per bulan</label>
      <input type="range" id="what-if-slider" min="0" max="2000000" step="50000" value="${extra}" />
      <div class="what-if-slider-val">+Rp ${fmt(extra)}/bulan</div>
      <div class="what-if-preview">
        <div class="what-if-row"><span>Sekarang</span><strong>${sim.monthsBase ?? '—'} bulan</strong></div>
        <div class="what-if-row what-if-row--highlight">
          <span>Dengan tambahan</span><strong>${eta}${sim.monthsSaved ? ` (${sim.monthsSaved} bln lebih cepat)` : ''}</strong>
        </div>
        <div class="what-if-row"><span>Extra 1 tahun</span><strong>Rp ${fmt(sim.extraYear1)}</strong></div>
        <div class="what-if-row"><span>5 tahun @ 6%</span><strong>Rp ${fmt(sim.extraYear5)}</strong></div>
        <div class="what-if-row"><span>10 tahun @ 6%</span><strong>Rp ${fmt(sim.extraYear10)}</strong></div>
      </div>
      <button type="button" class="btn-primary-budget tap" id="what-if-apply" style="margin-top:12px;width:100%">Terapkan ke target</button>
    `;

    body.querySelector('#what-if-slider')?.addEventListener('input', (e) => {
      extra = Number(e.target.value || 0);
      paint();
    });

    body.querySelector('#what-if-apply')?.addEventListener('click', async () => {
      try {
        const { saveFinancialTarget } = await import('../services/financial-targets.js');
        await saveFinancialTarget({
          id: target.id,
          name: target.name,
          target_amount: target.target_amount,
          current_amount: target.current_amount,
          monthly_contribution: baseMonthly + extra,
          target_date: target.target_date,
          is_primary: true,
        });
        options.onSaved?.();
        close();
      } catch (e) {
        console.error('[what-if]', e);
        window.showToast?.('Gagal menyimpan', 'error');
      }
    });
  };

  paint();
}

/**
 * @param {HTMLElement} body
 * @param {object} state
 */
function renderPurchaseTab(body, state) {
  let name = '';
  let amount = 500000;
  let installments = 1;

  const paint = () => {
    const sim = simulatePurchaseImpact({ name, amount, installments }, state);
    const verdictClass = sim.verdict === 'safe' ? 'ok' : sim.verdict === 'warn' ? 'warn' : 'danger';

    body.innerHTML = `
      <label class="tgt-label">Nama item</label>
      <input class="admin-input" id="wi-p-name" value="${escapeHtml(name)}" placeholder="Contoh: Laptop kerja" />
      <label class="tgt-label">Harga (Rp)</label>
      <input class="admin-input" type="number" id="wi-p-amt" value="${amount}" min="0" step="50000" />
      <label class="tgt-label">Cicilan (bulan, 1 = lunas)</label>
      <input class="admin-input" type="number" id="wi-p-inst" value="${installments}" min="1" max="36" />
      <div class="what-if-preview" style="margin-top:12px">
        <div class="what-if-row"><span>Cicilan/bulan</span><strong>Rp ${fmt(sim.monthlyPay)}</strong></div>
        <div class="what-if-row"><span>Sisa flexible</span><strong>Rp ${fmt(sim.flexibleBefore)} → Rp ${fmt(sim.flexibleAfter)}</strong></div>
        ${sim.targetDelayMonths ? `<div class="what-if-row"><span>Target mundur</span><strong>~${sim.targetDelayMonths} bulan</strong></div>` : ''}
        <div class="what-if-verdict what-if-verdict--${verdictClass}">${escapeHtml(sim.verdictLabel)}</div>
      </div>
    `;

    body.querySelector('#wi-p-name')?.addEventListener('input', (e) => { name = e.target.value; });
    body.querySelector('#wi-p-amt')?.addEventListener('input', (e) => { amount = Number(e.target.value) || 0; paint(); });
    body.querySelector('#wi-p-inst')?.addEventListener('input', (e) => { installments = Number(e.target.value) || 1; paint(); });
    body.querySelector('#wi-p-name')?.addEventListener('change', paint);
  };

  paint();
}

/**
 * @param {HTMLElement} body
 * @param {object[]} debts
 */
function renderDebtTab(body, debts) {
  const scenarios = simulateDebtScenarios(debts, [0, 200000, 500000]);
  const baseline = scenarios[0];

  body.innerHTML = `
    <p class="modal-subtitle">${debts.length} utang aktif · baseline ${baseline?.months ?? '—'} bulan</p>
    <div class="what-if-scenarios">
      ${scenarios.map((s, i) => `
        <div class="what-if-scenario ${i === 0 ? '' : 'what-if-scenario--alt'}">
          <strong>${escapeHtml(s.label)}</strong>
          <div>Lunas: ${s.months} bulan · bunga Rp ${fmt(s.totalInterest)}</div>
          ${s.debtFreeDate ? `<div class="admin-muted">Estimasi: ${s.debtFreeDate}</div>` : ''}
          ${baseline && i > 0 && s.months < baseline.months
            ? `<div class="what-if-row--highlight">${baseline.months - s.months} bulan lebih cepat</div>` : ''}
        </div>
      `).join('')}
    </div>
    <button type="button" class="btn-primary-budget tap" id="wi-open-debt" style="margin-top:12px;width:100%">Buka Debt Planner</button>
  `;

  body.querySelector('#wi-open-debt')?.addEventListener('click', async () => {
    const { showDebtPayoffPanel } = await import('./debt-payoff-panel.js');
    overlayCloseParent(body);
    await showDebtPayoffPanel();
  });
}

function overlayCloseParent(body) {
  body.closest('.what-if-overlay')?.remove();
}

function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
