/**
 * Global filter icon + top popup (period, priority, account, type).
 * @module components/global-filter-popup
 */

import { Icon } from './icons.js';
import { getFilter, updateFilter, resetFilter, onFilterChange } from '../services/global-filter.js';

/** @type {object[]|null} */
let _accountsCache = null;

async function getAccounts() {
  if (_accountsCache) return _accountsCache;
  try {
    const { getAccounts } = await import('../services/data-store.js');
    _accountsCache = await getAccounts();
  } catch {
    _accountsCache = [];
  }
  return _accountsCache;
}

function getDefaultPeriod() {
  const state = typeof window !== 'undefined' ? window.STATE : null;
  if (state?.period?.end && /^\d{4}-\d{2}/.test(String(state.period.end))) {
    return String(state.period.end).slice(0, 7);
  }
  if (state?.selectedMonth) return state.selectedMonth;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function countActive(f) {
  let count = 0;
  if (f.period !== getDefaultPeriod()) count++;
  if (f.priority !== 'all') count++;
  if (f.account !== 'all') count++;
  if (f.type !== 'all') count++;
  return count;
}

/**
 * @returns {HTMLButtonElement}
 */
export function renderFilterIcon() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'global-filter-btn top-bar__icon-btn';
  btn.setAttribute('aria-label', 'Filter');
  btn.setAttribute('title', 'Filter');

  async function update() {
    const f = getFilter();
    const activeCount = countActive(f);
    btn.innerHTML = `
      ${Icon('filter', { size: 20 })}
      ${activeCount > 0 ? `<span class="filter-badge">${activeCount}</span>` : ''}
    `;
    btn.classList.toggle('has-active', activeCount > 0);
  }

  update();
  onFilterChange(update);
  btn.onclick = () => showFilterPopup();

  return btn;
}

/**
 * @returns {Promise<HTMLButtonElement|null>}
 */
export async function showFilterPopup() {
  const accounts = await getAccounts();
  const f = getFilter();
  const periods = generatePeriodOptions();

  const existing = document.querySelector('.filter-popup-overlay');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.className = 'filter-popup-overlay';
  popup.innerHTML = `
    <div class="filter-popup" role="dialog" aria-modal="true">
      <div class="filter-popup-header">
        <h3>${Icon('filter', { size: 16 })} Filter</h3>
        <button type="button" class="close-btn" data-action="close">${Icon('x', { size: 18 })}</button>
      </div>
      <div class="filter-popup-content">
        <div class="filter-field">
          <label>${Icon('calendar', { size: 14 })} Periode</label>
          <select class="filter-select" data-filter="period">
            ${periods.map((p) => `
              <option value="${p.value}" ${f.period === p.value ? 'selected' : ''}>${escapeHtml(p.label)}</option>
            `).join('')}
          </select>
        </div>
        <div class="filter-field">
          <label>${Icon('target', { size: 14 })} Prioritas Budget</label>
          <select class="filter-select" data-filter="priority">
            <option value="all" ${f.priority === 'all' ? 'selected' : ''}>Semua Prioritas</option>
            <option value="harus" ${f.priority === 'harus' ? 'selected' : ''}>Wajib</option>
            <option value="penting" ${f.priority === 'penting' ? 'selected' : ''}>Kebutuhan</option>
            <option value="mau" ${f.priority === 'mau' ? 'selected' : ''}>Keinginan</option>
            <option value="simpan" ${f.priority === 'simpan' ? 'selected' : ''}>Simpan</option>
          </select>
        </div>
        <div class="filter-field">
          <label>${Icon('wallet', { size: 14 })} Akun</label>
          <select class="filter-select" data-filter="account">
            <option value="all" ${f.account === 'all' ? 'selected' : ''}>Semua Akun</option>
            ${accounts.map((a) => {
              const val = a.name || a.id;
              return `<option value="${escapeHtml(val)}" ${f.account === val ? 'selected' : ''}>${escapeHtml(val)}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="filter-field">
          <label>${Icon('trendingUp', { size: 14 })} Tipe Transaksi</label>
          <select class="filter-select" data-filter="type">
            <option value="all" ${f.type === 'all' ? 'selected' : ''}>Semua Tipe</option>
            <option value="expense" ${f.type === 'expense' ? 'selected' : ''}>Pengeluaran</option>
            <option value="income" ${f.type === 'income' ? 'selected' : ''}>Pemasukan</option>
            <option value="transfer" ${f.type === 'transfer' ? 'selected' : ''}>Transfer</option>
          </select>
        </div>
      </div>
      <div class="filter-popup-footer">
        <button type="button" class="btn-secondary" data-action="reset">${Icon('refresh', { size: 14 })} Reset</button>
        <button type="button" class="btn-primary" data-action="apply">${Icon('check', { size: 14 })} Terapkan</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => popup.classList.add('show'));
  });

  const localState = { ...f };
  popup.querySelectorAll('[data-filter]').forEach((sel) => {
    sel.onchange = () => { localState[sel.dataset.filter] = sel.value; };
  });

  const close = () => {
    popup.classList.remove('show');
    setTimeout(() => popup.remove(), 280);
  };

  popup.querySelectorAll('[data-action="close"]').forEach((b) => { b.onclick = close; });
  popup.onclick = (e) => { if (e.target === popup) close(); };
  popup.querySelector('[data-action="reset"]').onclick = () => {
    resetFilter();
    if (typeof window.rerender === 'function') window.rerender();
    close();
  };
  popup.querySelector('[data-action="apply"]').onclick = () => {
    const prevPeriod = getFilter().period;
    updateFilter(localState);
    // Always sync app period chip — previously skipped when selectedMonth already matched,
    // which left STATE.period / budget draft stuck on a stale month (e.g. October).
    if (localState.period && typeof window.monefyiSetPeriodMonth === 'function') {
      window.monefyiSetPeriodMonth(localState.period);
    }
    if (typeof window.rerender === 'function') window.rerender();
    // If only non-period filters changed, still refresh budget list
    if (localState.period === prevPeriod && window.STATE?.ui?.budgetPageOpen) {
      window.renderBudgetPageView?.();
    }
    close();
  };

  return popup;
}

function generatePeriodOptions() {
  const options = [];
  const now = new Date();
  for (let i = -6; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const suffix = i === 0 ? ' (Bulan ini)' : i === -1 ? ' (Bulan lalu)' : '';
    options.push({ value, label: label + suffix });
  }
  return options.reverse();
}

/**
 * @returns {HTMLButtonElement|null}
 */
export function mountFilterIcon() {
  let btn = document.getElementById('globalFilterBtn');
  if (!btn) {
    btn = renderFilterIcon();
    btn.id = 'globalFilterBtn';
  }

  const isDesktop = typeof window !== 'undefined'
    && window.matchMedia('(min-width: 768px)').matches;

  /** @type {HTMLElement|null} */
  let parent = null;
  /** @type {HTMLElement|null} */
  let before = null;

  if (isDesktop) {
    const desktopBell = document.getElementById('btnNotifDesktop');
    if (desktopBell?.parentElement) {
      parent = desktopBell.parentElement;
      before = desktopBell;
    }
  }

  if (!parent) {
    const bell = document.getElementById('notifBellMobile');
    if (bell?.parentElement) {
      parent = bell.parentElement;
      before = bell;
    } else {
      const searchBtn = document.getElementById('btnTopSearchMobile');
      if (searchBtn?.parentElement) {
        parent = searchBtn.parentElement;
        before = null;
      } else {
        parent = document.querySelector('.mobile-header-actions');
        before = null;
      }
    }
  }

  if (parent) {
    if (btn.parentElement !== parent || (before && btn.nextElementSibling !== before)) {
      parent.insertBefore(btn, before);
    }
  } else if (!btn.parentElement) {
    btn.style.position = 'fixed';
    btn.style.top = 'calc(env(safe-area-inset-top, 0px) + 12px)';
    btn.style.right = '60px';
    btn.style.zIndex = '999';
    document.body.appendChild(btn);
  }

  if (typeof window !== 'undefined' && !window._filterIconResizeWired) {
    window._filterIconResizeWired = true;
    window.addEventListener('resize', () => {
      clearTimeout(window._filterIconResizeT);
      window._filterIconResizeT = setTimeout(() => mountFilterIcon(), 160);
    });
  }

  return btn;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}

if (typeof window !== 'undefined') {
  window.monefyiFilterUI = { renderFilterIcon, mountFilterIcon, showFilterPopup };
}
