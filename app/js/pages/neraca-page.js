/**
 * Neraca Keuangan — full-page balance sheet UI.
 * @module pages/neraca-page
 */

import { Icon } from '../components/icons.js';
import {
  computeNeracaReport,
  ensureNeracaInitialized,
  getAllJournals,
  findSuspectTransactions,
} from '../services/journal-engine.js';
import { getNeracaMeta, saveBalanceSnapshot, setNeracaMeta, upsertEquityEvent } from '../services/neraca-store.js';
import { buildFixSuggestions } from '../services/balance-checker.js';

/** @type {{ mode: 'live'|'history', month: string, sheet: object|null }} */
let _state = {
  mode: 'live',
  month: new Date().toISOString().slice(0, 7),
  sheet: null,
};

/**
 * @param {unknown} str
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/**
 * @param {number} num
 */
function formatIDR(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

/**
 * @param {number} num
 */
function formatCompact(num) {
  const n = Number(num || 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} M`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} JT`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)} rb`;
  if (abs === 0) return 'Rp -';
  return String(Math.round(n));
}

/**
 * @param {string} month YYYY-MM
 */
function monthEndISO(month) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${String(last).padStart(2, '0')}`;
}

/**
 * @returns {string}
 */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param {object} row
 * @param {'aktiva'|'pasiva'} side
 */
function amountClass(row, side) {
  if (row.isSuspense) return 'is-neg';
  if (!row.amount) return 'is-empty';
  if (row.amount < 0) return 'is-neg';
  if (side === 'pasiva' && ['modal', 'simpanan', 'laba_ditahan'].includes(row.key)) return 'is-equity';
  if (side === 'pasiva' && row.key.startsWith('hutang')) return 'is-liability';
  return '';
}

/**
 * @param {object[]} rows
 * @param {'aktiva'|'pasiva'} side
 */
function renderRows(rows, side) {
  return rows.map((row) => {
    const amt = formatCompact(row.amount);
    const title = `Rp ${formatIDR(row.amount)}`;
    return `
      <button type="button" class="neraca-row ${row.isSuspense ? 'is-suspense' : ''} tap"
        data-action="open-category" data-key="${escapeHtml(row.key)}" data-side="${side}"
        title="${escapeHtml(title)}">
        <span class="neraca-row-left">
          <span class="neraca-row-icon">${Icon(row.icon || 'tag', { size: 16 })}</span>
          <span class="neraca-row-label">${escapeHtml(row.label)}</span>
        </span>
        <span class="neraca-row-amount ${amountClass(row, side)}">${escapeHtml(amt)}</span>
      </button>
    `;
  }).join('');
}

/**
 * @param {object} sheet
 */
function scaleClass(sheet) {
  if (sheet.balanced || !sheet.suspense) return 'is-balanced';
  return sheet.diff > 0 ? 'is-aktiva-heavy' : 'is-pasiva-heavy';
}

/**
 * SVG balance scale
 * @param {object} sheet
 */
function renderScale(sheet) {
  return `
    <svg class="neraca-scale ${scaleClass(sheet)}" viewBox="0 0 280 120" aria-hidden="true">
      <line x1="140" y1="20" x2="140" y2="100" stroke="currentColor" stroke-width="4" opacity="0.35"/>
      <polygon points="120,100 160,100 150,110 130,110" fill="currentColor" opacity="0.35"/>
      <g class="neraca-scale-beam">
        <line x1="40" y1="36" x2="240" y2="36" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
        <circle cx="140" cy="36" r="6" fill="currentColor"/>
        <rect x="28" y="44" width="56" height="28" rx="6" fill="#f59e0b" opacity="0.9"/>
        <rect x="196" y="44" width="56" height="28" rx="6" fill="#ef4444" opacity="0.9"/>
      </g>
    </svg>
  `;
}

/**
 * @param {HTMLElement} container
 * @param {object} sheet
 * @param {object} options
 */
function paint(container, sheet, options) {
  const showMonth = _state.mode === 'history';
  container.innerHTML = `
    <div class="neraca-page">
      <header class="neraca-header">
        <h1 class="neraca-title">NERACA KEUANGAN</h1>
        <div class="neraca-header-actions">
          <div class="neraca-seg" role="tablist" aria-label="Mode neraca">
            <button type="button" class="neraca-seg-btn ${_state.mode === 'history' ? 'is-active' : ''}" data-action="mode-history" role="tab">
              ${Icon('clock', { size: 12 })} HISTORY
            </button>
            <button type="button" class="neraca-seg-btn ${_state.mode === 'live' ? 'is-active' : ''}" data-action="mode-live" role="tab">
              <span class="neraca-live-dot" aria-hidden="true"></span> LIVE
            </button>
          </div>
          ${showMonth ? `
            <input type="month" class="neraca-month-input" data-role="month" value="${escapeHtml(_state.month)}" aria-label="Pilih periode">
          ` : ''}
          <button type="button" class="neraca-icon-btn tap" data-action="refresh" title="Refresh" aria-label="Refresh">
            ${Icon('refresh', { size: 16 })}
          </button>
        </div>
      </header>

      <div class="neraca-columns">
        <section class="neraca-panel neraca-panel--aktiva" aria-label="Aktiva">
          <div class="neraca-panel-head">AKTIVA (ASET)</div>
          <div class="neraca-panel-cols"><span>Kategori</span><span>Nilai (Rp)</span></div>
          ${renderRows(sheet.aktiva, 'aktiva')}
          <div class="neraca-panel-foot">
            <span>TOTAL AKTIVA</span>
            <span class="neraca-panel-foot-amt">Rp ${formatIDR(sheet.totalAktiva)}</span>
          </div>
        </section>

        <section class="neraca-panel neraca-panel--pasiva" aria-label="Pasiva">
          <div class="neraca-panel-head">PASIVA (KEWAJIBAN &amp; MODAL)</div>
          <div class="neraca-panel-cols"><span>Kategori</span><span>Nilai (Rp)</span></div>
          ${renderRows(sheet.pasiva, 'pasiva')}
          <div class="neraca-panel-foot">
            <span>TOTAL PASIVA</span>
            <span class="neraca-panel-foot-amt">Rp ${formatIDR(sheet.totalPasiva)}</span>
          </div>
        </section>
      </div>

      <section class="neraca-balance" aria-live="polite">
        ${renderScale(sheet)}
        ${sheet.balanced ? `
          <div class="neraca-badge is-ok">${Icon('check', { size: 14 })} NERACA SEIMBANG</div>
        ` : `
          <div class="neraca-badge is-warn">${Icon('alertTriangle', { size: 14 })} NERACA TIDAK SEIMBANG</div>
          <div class="neraca-diff">SELISIH: RP ${formatIDR(Math.abs(sheet.diff))}</div>
          <button type="button" class="neraca-trace-link tap" data-action="trace">LACAK PENYEBAB →</button>
        `}
      </section>
    </div>
  `;

  wire(container, options);
}

/**
 * @param {HTMLElement} container
 * @param {object} options
 */
function wire(container, options) {
  container.querySelector('[data-action="mode-live"]')?.addEventListener('click', () => {
    _state.mode = 'live';
    refresh(container, options);
  });
  container.querySelector('[data-action="mode-history"]')?.addEventListener('click', () => {
    _state.mode = 'history';
    refresh(container, options);
  });
  container.querySelector('[data-action="refresh"]')?.addEventListener('click', () => refresh(container, options));
  container.querySelector('[data-role="month"]')?.addEventListener('change', (e) => {
    _state.month = e.target.value || _state.month;
    refresh(container, options);
  });

  container.querySelectorAll('[data-action="open-category"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      const side = btn.dataset.side;
      const { showNeracaCategoryModal } = await import('../components/neraca-category-modal.js');
      showNeracaCategoryModal({
        key,
        side,
        sheet: _state.sheet,
        endISO: resolveEndISO(),
        onChanged: () => refresh(container, options),
      });
    });
  });

  container.querySelector('[data-action="trace"]')?.addEventListener('click', async () => {
    const journals = await getAllJournals();
    const txs = window.STATE?.transactions || [];
    const suspects = findSuspectTransactions(txs, journals);
    const tips = buildFixSuggestions(_state.sheet, suspects);
    const { showNeracaTraceModal } = await import('../components/neraca-trace-modal.js');
    showNeracaTraceModal({
      sheet: _state.sheet,
      suspects,
      tips,
      onBalanced: () => refresh(container, options),
    });
  });
}

function resolveEndISO() {
  return _state.mode === 'history' ? monthEndISO(_state.month) : todayISO();
}

/**
 * @param {HTMLElement} container
 * @param {object} options
 */
async function refresh(container, options) {
  container.innerHTML = `<div class="neraca-page"><div class="neraca-skeleton" aria-busy="true"></div></div>`;
  try {
    await ensureNeracaInitialized(window.STATE?.transactions || []);
    const endISO = resolveEndISO();
    const sheet = await computeNeracaReport({
      endISO,
      transactions: window.STATE?.transactions || [],
      accounts: window.STATE?.settings?.accounts || [],
    });
    _state.sheet = sheet;

    if (_state.mode === 'history') {
      saveBalanceSnapshot(_state.month, {
        totalAktiva: sheet.totalAktiva,
        totalPasiva: sheet.totalPasiva,
        diff: sheet.diff,
        endISO,
      }).catch(() => {});
    }

    const setupDone = await getNeracaMeta('neraca_setup_done');
    const hasTx = (window.STATE?.transactions || []).length > 0;
    if (!setupDone && !hasTx && !sheet.totalAktiva && !sheet.totalPasiva) {
      renderEmpty(container, options);
      return;
    }

    paint(container, sheet, options);
  } catch (err) {
    console.error('[neraca] refresh failed', err);
    container.innerHTML = `
      <div class="neraca-page">
        <div class="neraca-empty">
          <div class="neraca-empty-title">Gagal memuat neraca</div>
          <div class="neraca-empty-desc">${escapeHtml(err.message || 'Error')}</div>
          <button type="button" class="neraca-btn neraca-btn-primary" data-action="retry">Coba lagi</button>
        </div>
      </div>
    `;
    container.querySelector('[data-action="retry"]')?.addEventListener('click', () => refresh(container, options));
  }
}

/**
 * @param {HTMLElement} container
 * @param {object} options
 */
function renderEmpty(container, options) {
  container.innerHTML = `
    <div class="neraca-page">
      <header class="neraca-header">
        <h1 class="neraca-title">NERACA KEUANGAN</h1>
      </header>
      <div class="neraca-empty">
        <div class="neraca-row-icon" style="margin:0 auto;width:48px;height:48px">${Icon('bank', { size: 24 })}</div>
        <div class="neraca-empty-title">Mulai Setup Neraca</div>
        <div class="neraca-empty-desc">
          Catat modal awal agar struktur keuanganmu seimbang.
          Akun Kas akan mengikuti saldo dari transaksi &amp; daftar akun Monefyi.
        </div>
        <label class="form-label" for="neraca-setup-modal" style="display:block;text-align:left;max-width:280px;margin:0 auto 6px">Modal awal (Rp)</label>
        <input id="neraca-setup-modal" class="form-input" type="number" min="0" step="1000" placeholder="0" style="max-width:280px;margin:0 auto 12px;display:block">
        <button type="button" class="neraca-btn neraca-btn-primary" data-action="setup">Simpan &amp; Buka Neraca</button>
        <button type="button" class="neraca-btn" data-action="skip-setup" style="margin-top:8px">Lewati dulu</button>
      </div>
    </div>
  `;
  container.querySelector('[data-action="setup"]')?.addEventListener('click', async () => {
    const raw = Number(container.querySelector('#neraca-setup-modal')?.value || 0);
    if (raw > 0) {
      await upsertEquityEvent({
        kind: 'modal',
        name: 'Modal awal',
        amount: raw,
        event_date: todayISO(),
        notes: 'Setup neraca',
      });
      await setNeracaMeta('opening_kas', raw);
    }
    await setNeracaMeta('neraca_setup_done', true);
    refresh(container, options);
  });
  container.querySelector('[data-action="skip-setup"]')?.addEventListener('click', async () => {
    await setNeracaMeta('neraca_setup_done', true);
    refresh(container, options);
  });
}

/**
 * @param {HTMLElement} container
 * @param {object} [options]
 */
export async function renderNeracaPage(container, options = {}) {
  if (!container) return;
  container.className = 'neraca-page-root';
  await refresh(container, options);
}

/**
 * Force refresh if page already open.
 */
export async function refreshNeracaPage() {
  const root = document.getElementById('neracaPageRoot');
  if (root && !root.classList.contains('hidden')) {
    await refresh(root, {});
  }
}

if (typeof window !== 'undefined') {
  window.monefyiNeraca = { renderNeracaPage, refreshNeracaPage };
}
