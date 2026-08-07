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
  rebuildJournalsFromTransactions,
  reconcileNeracaWithTransactions,
} from '../services/journal-engine.js';
import { getNeracaMeta, saveBalanceSnapshot, setNeracaMeta, upsertEquityEvent } from '../services/neraca-store.js';
import { buildFixSuggestions } from '../services/balance-checker.js';
import { isCategoryEditable, mountInlineCategoryItems } from '../components/neraca-category-items.js';

/** @type {{ mode: 'live'|'history', month: string, sheet: object|null, expanded: Set<string> }} */
let _state = {
  mode: 'live',
  month: new Date().toISOString().slice(0, 7),
  sheet: null,
  expanded: new Set(),
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
 */
function filterVisibleRows(rows) {
  return (rows || []).filter((r) => r.isSuspense || Math.abs(Number(r.amount || 0)) >= 1);
}

/**
 * @param {object[]} pasiva
 */
function splitPasivaSections(pasiva) {
  const liabilityKeys = new Set(['hutang_dagang', 'hutang_pajak', 'hutang_lainnya', 'kewajiban_lainnya']);
  const liabilities = filterVisibleRows(pasiva.filter((r) => liabilityKeys.has(r.key) || String(r.key).startsWith('hutang')));
  const equity = filterVisibleRows(pasiva.filter((r) => !liabilityKeys.has(r.key) && !String(r.key).startsWith('hutang') && !r.isSuspense));
  const suspense = pasiva.filter((r) => r.isSuspense);
  return { liabilities, equity, suspense };
}

/**
 * @param {object} sheet
 * @param {object|null} reconciliation
 */
function renderReconciliationBanner(sheet, reconciliation) {
  const suspenseAmt = Number(sheet.suspense?.amount || 0);
  const showSuspense = suspenseAmt >= 1000;
  const showRecon = reconciliation && !reconciliation.balanced;
  if (!showSuspense && !showRecon) return '';

  const lines = [];
  if (showSuspense) {
    lines.push(`Ada Rp ${formatIDR(suspenseAmt)} yang belum tercatat sumbernya.`);
  }
  if (showRecon) {
    lines.push(`Selisih kas journal vs transaksi: Rp ${formatIDR(Math.abs(reconciliation.diff))}.`);
  }

  return `
    <div class="neraca-recon-banner" role="status">
      <span>${Icon('alertTriangle', { size: 16 })} ${escapeHtml(lines.join(' '))}</span>
      <button type="button" class="neraca-btn neraca-btn-ghost tap" data-action="rebuild">Rebuild dari Transaksi</button>
    </div>
  `;
}

/**
 * @param {object} sheet
 */
function renderNetWorthFooter(sheet) {
  const net = Number(sheet.totalAktiva || 0) - Number(sheet.totalPasiva || 0);
  return `
    <footer class="neraca-net-worth">
      <span class="neraca-net-worth__label">NILAI BERSIH</span>
      <strong class="neraca-net-worth__value">Rp ${formatIDR(net)}</strong>
    </footer>
  `;
}

/**
 * @param {object} row
 * @param {'aktiva'|'pasiva'} side
 */
function expandKey(row, side) {
  return `${side}:${row.key}`;
}

/**
 * @param {object[]} rows
 * @param {'aktiva'|'pasiva'} side
 * @param {object} options
 */
function renderRows(rows, side, options) {
  return rows.map((row) => {
    const amt = formatCompact(row.amount);
    const title = `Rp ${formatIDR(row.amount)}`;
    const ek = expandKey(row, side);
    const isOpen = _state.expanded.has(ek);
    const editable = isCategoryEditable(row.key) && !row.isSuspense;
    return `
      <div class="neraca-cat-block ${isOpen ? 'is-open' : ''}" data-cat-block="${escapeHtml(ek)}">
        <div class="neraca-row ${row.isSuspense ? 'is-suspense' : ''} ${isOpen ? 'is-expanded' : ''}"
          data-action="toggle-category" data-key="${escapeHtml(row.key)}" data-side="${side}" role="button" tabindex="0"
          title="${escapeHtml(title)}" aria-expanded="${isOpen ? 'true' : 'false'}">
          <span class="neraca-row-left">
            <span class="neraca-row-chevron ${isOpen ? 'is-open' : ''}" aria-hidden="true">${Icon('chevronDown', { size: 14 })}</span>
            <span class="neraca-row-icon">${Icon(row.icon || 'tag', { size: 16 })}</span>
            <span class="neraca-row-label">${escapeHtml(row.label)}</span>
          </span>
          <span class="neraca-row-right">
            <span class="neraca-row-amount ${amountClass(row, side)}">${escapeHtml(amt)}</span>
            ${editable ? `
              <button type="button" class="neraca-row-add tap" data-action="add-category" data-key="${escapeHtml(row.key)}" data-side="${side}"
                title="Tambah item" aria-label="Tambah item">${Icon('plus', { size: 14 })}</button>
            ` : ''}
          </span>
        </div>
        <div class="neraca-cat-detail ${isOpen ? '' : 'hidden'}" data-role="cat-detail" data-key="${escapeHtml(row.key)}" data-side="${side}"></div>
      </div>
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
  const aktivaRows = filterVisibleRows(sheet.aktiva);
  const pasivaSplit = splitPasivaSections(sheet.pasiva);
  const pasivaRows = [...pasivaSplit.liabilities, ...pasivaSplit.equity, ...pasivaSplit.suspense];
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
          <button type="button" class="neraca-btn neraca-btn-ghost tap" data-action="rebuild" title="Rebuild dari transaksi">Rebuild</button>
          <button type="button" class="neraca-icon-btn tap" data-action="refresh" title="Refresh" aria-label="Refresh">
            ${Icon('refresh', { size: 16 })}
          </button>
          <button type="button" class="neraca-icon-btn tap" data-action="close-books" title="Tutup buku bulan ini" aria-label="Tutup buku">
            ${Icon('calendar', { size: 16 })}
          </button>
        </div>
      </header>

      ${renderReconciliationBanner(sheet, options.reconciliation)}

      <div class="neraca-columns">
        <section class="neraca-panel neraca-panel--aktiva" aria-label="Yang Saya Miliki">
          <div class="neraca-panel-head">YANG SAYA MILIKI</div>
          <div class="neraca-panel-cols"><span>Kategori</span><span>Nilai (Rp)</span></div>
          ${renderRows(aktivaRows, 'aktiva', options)}
          <div class="neraca-panel-foot">
            <span>TOTAL MILIK</span>
            <span class="neraca-panel-foot-amt">Rp ${formatIDR(sheet.totalAktiva)}</span>
          </div>
        </section>

        <section class="neraca-panel neraca-panel--pasiva" aria-label="Kewajiban dan Modal">
          <div class="neraca-panel-head">KEWAJIBAN</div>
          <div class="neraca-panel-cols"><span>Kategori</span><span>Nilai (Rp)</span></div>
          ${pasivaSplit.liabilities.length ? renderRows(pasivaSplit.liabilities, 'pasiva', options) : '<div class="neraca-empty-row muted">Tidak ada kewajiban tercatat</div>'}
          <div class="neraca-panel-subhead">MODAL &amp; LABA</div>
          ${pasivaSplit.equity.length ? renderRows(pasivaSplit.equity, 'pasiva', options) : '<div class="neraca-empty-row muted">Belum ada entri modal</div>'}
          ${pasivaSplit.suspense.length ? renderRows(pasivaSplit.suspense, 'pasiva', options) : ''}
          <div class="neraca-panel-foot">
            <span>TOTAL PASIVA</span>
            <span class="neraca-panel-foot-amt">Rp ${formatIDR(sheet.totalPasiva)}</span>
          </div>
        </section>
      </div>

      ${renderNetWorthFooter(sheet)}

      <section class="neraca-balance" aria-live="polite">
        ${renderScale(sheet)}
        ${sheet.balanced ? `
          <div class="neraca-badge is-ok">${Icon('check', { size: 14 })} POSISI SEIMBANG</div>
        ` : `
          <div class="neraca-badge is-warn">${Icon('alertTriangle', { size: 14 })} POSISI BELUM SEIMBANG</div>
          <div class="neraca-diff">SELISIH: RP ${formatIDR(Math.abs(sheet.diff))}</div>
          <button type="button" class="neraca-trace-link tap" data-action="trace">LACAK PENYEBAB →</button>
        `}
      </section>
    </div>
  `;

  wire(container, options);
}

/**
 * @param {HTMLElement} detailHost
 * @param {string} key
 * @param {string} side
 * @param {object} options
 */
async function mountCategoryDetail(detailHost, key, side, options) {
  await mountInlineCategoryItems(detailHost, {
    key,
    sheet: _state.sheet,
    endISO: resolveEndISO(),
    onChanged: () => refresh(options.__container, options),
  });
}

/**
 * @param {HTMLElement} container
 * @param {object} options
 */
function wire(container, options) {
  options.__container = container;

  const toggleCategory = async (key, side, forceOpen = null) => {
    const ek = `${side}:${key}`;
    const open = forceOpen === null ? !_state.expanded.has(ek) : forceOpen;
    if (open) _state.expanded.add(ek);
    else _state.expanded.delete(ek);

    const block = container.querySelector(`[data-cat-block="${ek}"]`);
    if (!block) return;

    block.classList.toggle('is-open', open);
    const row = block.querySelector('[data-action="toggle-category"]');
    row?.classList.toggle('is-expanded', open);
    row?.setAttribute('aria-expanded', open ? 'true' : 'false');
    block.querySelector('.neraca-row-chevron')?.classList.toggle('is-open', open);

    const detail = block.querySelector('[data-role="cat-detail"]');
    if (!detail) return;

    if (open) {
      detail.classList.remove('hidden');
      detail.innerHTML = `<div class="neraca-inline-loading">Memuat…</div>`;
      await mountCategoryDetail(detail, key, side, options);
      if (forceOpen === true) {
        detail.querySelector('.is-new [data-f="name"]')?.focus();
      }
    } else {
      detail.classList.add('hidden');
      detail.innerHTML = '';
    }
  };

  container.querySelector('[data-action="mode-live"]')?.addEventListener('click', () => {
    _state.mode = 'live';
    refresh(container, options);
  });
  container.querySelector('[data-action="mode-history"]')?.addEventListener('click', () => {
    _state.mode = 'history';
    refresh(container, options);
  });
  container.querySelector('[data-action="refresh"]')?.addEventListener('click', () => refresh(container, options));
  container.querySelectorAll('[data-action="rebuild"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await rebuildJournalsFromTransactions(window.STATE?.transactions || []);
        const recon = await reconcileNeracaWithTransactions({ endISO: resolveEndISO() });
        if (window.showToast) {
          window.showToast(
            recon.balanced ? 'Neraca selaras dengan transaksi' : `Masih ada selisih Rp ${formatIDR(Math.abs(recon.diff))}`,
            recon.balanced ? 'success' : 'warn',
          );
        }
        await refresh(container, options);
      } catch (e) {
        console.error('[neraca] rebuild', e);
        if (window.showToast) window.showToast('Gagal rebuild neraca', 'error');
      } finally {
        btn.disabled = false;
      }
    });
  });
  container.querySelector('[data-action="close-books"]')?.addEventListener('click', async () => {
    try {
      const { showMonthlyClosingModal } = await import('../components/monthly-closing-modal.js');
      const { toPeriodKey } = await import('../services/monthly-period.js');
      await showMonthlyClosingModal({
        period: toPeriodKey(window.STATE?.period?.end),
        upsertTransaction: window.dbUpsertTransaction,
        onComplete: () => refresh(container, options),
      });
    } catch (e) {
      console.error('[neraca] close books', e);
    }
  });
  container.querySelector('[data-role="month"]')?.addEventListener('change', (e) => {
    _state.month = e.target.value || _state.month;
    refresh(container, options);
  });

  container.querySelectorAll('[data-action="toggle-category"]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="add-category"]')) return;
      toggleCategory(row.dataset.key, row.dataset.side);
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (e.target.closest('[data-action="add-category"]')) return;
        toggleCategory(row.dataset.key, row.dataset.side);
      }
    });
  });

  container.querySelectorAll('[data-action="add-category"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCategory(btn.dataset.key, btn.dataset.side, true);
    });
  });

  // Mount already-expanded sections after paint
  _state.expanded.forEach((ek) => {
    const [side, key] = ek.split(':');
    const detail = container.querySelector(`[data-role="cat-detail"][data-key="${key}"][data-side="${side}"]`);
    if (detail && !detail.innerHTML.trim()) {
      mountCategoryDetail(detail, key, side, options);
    }
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
    const periodStart = _state.mode === 'live' ? `${endISO.slice(0, 7)}-01` : null;
    const sheet = await computeNeracaReport({
      endISO,
      transactions: window.STATE?.transactions || [],
      accounts: window.STATE?.settings?.accounts || [],
      periodStart,
    });
    _state.sheet = sheet;

    let reconciliation = null;
    try {
      reconciliation = await reconcileNeracaWithTransactions({ endISO });
    } catch { /* non-blocking */ }

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

    paint(container, sheet, { ...options, reconciliation });
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
        <div class="neraca-empty-title">Mulai Setup Posisi Keuangan</div>
        <div class="neraca-empty-desc">
          Catat nilai bersih awal supaya posisi keuanganmu seimbang.
          Akun Kas mengikuti saldo dari transaksi &amp; daftar akun Monefyi.
        </div>
        <label class="form-label" for="neraca-setup-modal" style="display:block;text-align:left;max-width:280px;margin:0 auto 6px">Nilai bersih awal (Rp)</label>
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
        name: 'Nilai bersih awal',
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
