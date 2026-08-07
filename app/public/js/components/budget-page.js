/**
 * Full-page budget UI — summary hero, accordion list with inline item edit, toolbar.
 * @module components/budget-page
 */

import {
  PRIORITY_LEVELS,
  BUDGET_UNITS,
  calculateProgress,
  computeHistoricalBaselines,
  createBudgetItem,
  createBudgetLineItem,
  createBudgetRow,
  getItemTotalAmount,
  hasActiveLineItems,
  syncItemAmountFromLines,
  CATEGORY_TYPES,
  inferCategoryType,
} from '../services/budget-model.js';
import { Icon } from './icons.js';
import { filterBudgets, getFilter, onFilterChange } from '../services/global-filter.js';
import { dedupeTransactions, filterMonthExpenses, sumMonthExpenses } from '../utils/transaction-utils.js';

const SORT_KEY = 'budget_sort';

/**
 * @param {object[]} rows
 * @param {object[]} transactions
 * @param {string} month
 */
function countOverBudgetRows(rows, transactions, month) {
  return rows.filter((b) => {
    if (inferCategoryType(b) === CATEGORY_TYPES.FIXED_BILL) return false;
    return calculateProgress(b, transactions, month).status === 'over';
  }).length;
}

/**
 * @param {object[]} rows
 * @param {object[]} transactions
 * @param {string} month
 */
function countAttentionRows(rows, transactions, month) {
  return rows.filter((b) => {
    if (inferCategoryType(b) === CATEGORY_TYPES.FIXED_BILL) return false;
    const s = calculateProgress(b, transactions, month).status;
    return s === 'critical' || s === 'warning';
  }).length;
}

const SORT_LABELS = {
  urgent: 'Urgent',
  priority: 'Prioritas',
  progress: 'Progress',
  amount: 'Nominal',
  name: 'Nama',
  manual: 'Urutan sendiri',
};

/** @type {string|null} */
let _expandedBudgetId = null;
/** @type {string|null} */
let _expandedItemId = null;
/** @type {string|null} */
let _expandedBreakdownItemId = null;
/** @type {string|null} */
let _selectedBudgetId = null;
/** @type {object[]|null} */
let _editBeforeRows = null;
/** @type {object|null} */
let _pageCtx = null;
/** Stable tx/month for hero realisasi during draft edits (refreshed on full page load / save) */
let _heroSnapshot = null;

/** @type {boolean} */
let _docListClickWired = false;
/** @type {boolean} */
let _docItemDblClickWired = false;
/** @type {boolean} */
let _toolbarWired = false;
/** @type {boolean} */
let _sortWired = false;
/** @type {boolean} */
let _dragWired = false;
/** @type {{ type: string, budgetId?: string, itemId?: string, lineId?: string }|null} */
let _dragState = null;
/**
 * @param {unknown} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/**
 * @param {number} num
 * @returns {string}
 */
function formatIDR(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

/**
 * @param {number} num
 * @returns {string}
 */
function formatCompact(num) {
  const n = Number(num || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} rb`;
  return String(Math.round(n));
}

/**
 * @param {string} month YYYY-MM
 * @returns {string}
 */
function formatMonthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
}

/**
 * @param {object[]} budgets
 * @param {object[]} transactions
 * @param {string} month
 */
function groupTotals(budgets, transactions, month) {
  let total = 0;
  let spent = 0;
  for (const b of budgets) {
    total += Number(b.amount || 0);
    spent += calculateProgress(b, transactions, month).spent;
  }
  return { spent, total, pct: total > 0 ? Math.round((spent / total) * 100) : 0 };
}

/**
 * @param {string|null} str
 */
function parseTargetDay(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (s.includes('-')) return parseInt(s.split('-')[0], 10);
  const day = parseInt(s, 10);
  return Number.isNaN(day) ? null : day;
}

/**
 * @param {object} budget
 */
function isBudgetFullyDone(budget) {
  if (!budget.items?.length) return false;
  return budget.items.every((i) => i.status === 'done' || i.status === 'skipped');
}

/**
 * @param {object[]} budgets
 * @param {object[]} transactions
 * @param {string} month
 * @param {string} filter
 */
function sortBudgets(budgets, transactions, month, filter) {
  const today = new Date().getDate();

  const enriched = budgets.map((b) => {
    const progress = calculateProgress(b, transactions, month);
    let urgencyScore = 0;

    for (const item of b.items || []) {
      if (item.status === 'done' || item.status === 'skipped') continue;
      const dayStr = item.target_date_day || item.target_date;
      const targetDay = parseTargetDay(dayStr);
      if (targetDay) {
        const dayDiff = Math.abs(targetDay - today);
        urgencyScore = Math.max(urgencyScore, 100 - dayDiff * 5);
      }
    }

    if (progress.status === 'over') urgencyScore += 100;
    else if (progress.status === 'critical') urgencyScore += 50;
    else if (progress.status === 'warning') urgencyScore += 20;

    return {
      ...b,
      _progress: progress,
      _urgency: urgencyScore,
      _allDone: isBudgetFullyDone(b),
    };
  });

  const priorityOrder = { harus: 0, penting: 1, mau: 2, simpan: 3 };
  const activeFirst = (a, b) => (a._allDone ? 1 : 0) - (b._allDone ? 1 : 0);

  let sorted;
  switch (filter) {
    case 'priority':
      sorted = enriched.sort((a, b) =>
        activeFirst(a, b)
        || (priorityOrder[a.priority || 'penting'] - priorityOrder[b.priority || 'penting'])
        || b._urgency - a._urgency);
      break;
    case 'progress':
      sorted = enriched.sort((a, b) => activeFirst(a, b) || b._progress.percentUsed - a._progress.percentUsed);
      break;
    case 'amount':
      sorted = enriched.sort((a, b) => activeFirst(a, b) || (b.amount || 0) - (a.amount || 0));
      break;
    case 'name':
      sorted = enriched.sort((a, b) => activeFirst(a, b) || (a.name || '').localeCompare(b.name || '', 'id'));
      break;
    case 'manual':
      sorted = enriched;
      break;
    case 'urgent':
    default:
      sorted = enriched.sort((a, b) => activeFirst(a, b) || b._urgency - a._urgency);
      break;
  }

  return sorted;
}

/**
 * @param {number} income
 * @param {object[]} rows
 * @returns {string}
 */
function renderAllocationStripHtml(income, rows) {
  const totalBudgeted = rows.reduce((s, b) => s + Math.abs(Number(b.amount || 0)), 0);
  const allocationRemaining = income - totalBudgeted;
  const allocationPct = income > 0 ? Math.min(100, Math.round((totalBudgeted / income) * 100)) : 0;
  return `
    <section class="budget-allocation-strip" aria-label="Ringkasan alokasi budgeting">
      <div class="bas-row">
        <span>Sudah dibudgetkan <strong>Rp ${formatCompact(totalBudgeted)}</strong></span>
        <span>Sisa <strong class="${allocationRemaining < 0 ? 'over' : ''}">Rp ${formatCompact(allocationRemaining)}</strong></span>
        <span>Income <strong>Rp ${formatCompact(income)}</strong></span>
      </div>
      <div class="bas-track" aria-hidden="true">
        <div class="bas-fill ${allocationRemaining < 0 ? 'over' : ''}" style="width:${allocationPct}%"></div>
      </div>
    </section>
  `;
}

/**
 * Remaining income that can still be allocated (plus current item so slider can hold its value).
 * @param {number} income
 * @param {object[]} rows
 * @param {string} [budgetId]
 * @param {string} [itemId]
 * @returns {{ max: number, remaining: number, current: number }}
 */
function getItemAllocationLimit(income, rows, budgetId, itemId) {
  const list = rows || [];
  const total = list.reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0);
  let current = 0;
  const row = list.find((r) => r.id === budgetId);
  const item = row?.items?.find((i) => i.id === itemId);
  if (item) current = Math.round(getItemTotalAmount(item));
  const remaining = Number(income || 0) - total;
  const max = Math.max(current, current + Math.max(0, remaining), 0);
  return { max, remaining, current };
}

/**
 * @param {object} item
 * @param {boolean} expanded
 * @param {{ max?: number, remaining?: number }} [limits]
 */
function renderDetailItem(item, expanded, limits = {}) {
  syncItemAmountFromLines(item);
  const isDone = item.status === 'done' || item.status === 'skipped';
  const amount = Math.round(getItemTotalAmount(item));
  const lineMode = hasActiveLineItems(item);
  const sliderMax = Math.max(Number(limits.max || 0), amount, 1000);
  const remaining = Number(limits.remaining ?? 0);
  const label = item.name?.trim() || 'Item baru';
  const breakdownExpanded = _expandedBreakdownItemId === item.id;

  return `
    <div class="bli-item ${expanded ? 'is-expanded' : ''} ${isDone ? 'item-done' : ''}" data-item-id="${escapeHtml(item.id)}" data-expanded="${expanded ? 'true' : 'false'}">
      <div class="bli-item__head">
        <span class="bli-drag-handle" draggable="true" data-drag-type="item" data-item-id="${escapeHtml(item.id)}" title="Geser item" aria-label="Geser item">${Icon('grip', { size: 14 })}</span>
        <button type="button" class="bli-item__summary tap" data-action="toggle-item" aria-expanded="${expanded ? 'true' : 'false'}" title="Klik expand · Double-click detail">
          <span class="bli-item__name">${escapeHtml(label)}</span>
          <span class="bli-item__amt">Rp ${formatIDR(amount)}</span>
          <span class="bli-item__chev">${Icon('chevronDown', { size: 14 })}</span>
        </button>
        <button type="button" class="bli-item__delete tap" data-action="delete-item" aria-label="Hapus item" title="Hapus item">
          ${Icon('trash', { size: 14 })}
        </button>
      </div>
      <div class="bli-item__detail ${expanded ? '' : 'hidden'}">
        <input type="text" class="bli-item-name form-input" placeholder="Nama detail item" value="${escapeHtml(item.name || '')}" aria-label="Nama item">
        <div class="bli-item-amount-row ${lineMode ? 'is-locked' : ''}" data-role="manual-amount">
          <input type="range" class="bli-item-slider" min="0" max="${sliderMax}" step="1000" value="${Math.min(amount, sliderMax)}" aria-label="Slider jumlah" ${lineMode ? 'disabled' : ''}>
          <div class="bli-inline-amount">
            <span>Rp</span>
            <input type="number" class="bli-item-price form-input" min="0" max="${sliderMax}" step="1000" value="${amount || ''}" inputmode="numeric" aria-label="Jumlah" ${lineMode ? 'readonly' : ''}>
          </div>
        </div>
        ${lineMode ? `
          <div class="bli-item-derived" data-role="derived-total">
            Total diambil dari rincian: <strong>Rp ${formatIDR(amount)}</strong>
          </div>
        ` : `
          <div class="bli-item-cap" data-role="item-cap">
            Maks. Rp ${formatIDR(sliderMax)}
            <span class="bli-item-cap__remain ${remaining < 0 ? 'over' : ''}">· Sisa alokasi Rp ${formatIDR(Math.max(0, remaining))}</span>
          </div>
        `}
        ${renderItemBreakdown(item, breakdownExpanded)}
      </div>
    </div>
  `;
}

/**
 * @param {object} budget
 * @param {object[]} transactions
 * @param {string} month
 * @param {number} [income]
 */
function renderBudgetListRow(budget, transactions, month, income = 0) {
  const progress = budget._progress || calculateProgress(budget, transactions, month);
  const pl = PRIORITY_LEVELS[(budget.priority || 'penting').toUpperCase()] || PRIORITY_LEVELS.PENTING;
  const statusClass = progress.status === 'over' ? 'over' : progress.status === 'critical' ? 'critical' : progress.status === 'warning' ? 'warning' : '';
  const remaining = progress.remaining;
  const remainingLabel = remaining >= 0
    ? `Sisa: ${formatCompact(remaining)}`
    : `Over ${formatCompact(-remaining)}`;
  const allDone = budget._allDone || isBudgetFullyDone(budget);
  const expanded = _expandedBudgetId === budget.id;
  const selected = _selectedBudgetId === budget.id;
  const draftRows = getDraftRows().length ? getDraftRows() : [budget];
  const items = Array.isArray(budget.items) && budget.items.length
    ? budget.items
    : [createBudgetItem({ name: budget.name || 'Item', price: Number(budget.amount || 0), qty: 1 })];

  return `
    <div class="budget-list-block ${expanded ? 'is-expanded' : ''} ${selected ? 'is-selected' : ''}" data-budget-id="${escapeHtml(budget.id)}">
      <div class="budget-list-block__head">
        <span class="budget-drag-handle" draggable="true" data-drag-type="budget" data-budget-id="${escapeHtml(budget.id)}" title="Geser kategori" aria-label="Geser kategori">${Icon('grip', { size: 14 })}</span>
        <button type="button" class="budget-list-row ${statusClass} ${allDone ? 'all-done' : ''}" data-action="toggle-budget" data-budget-id="${escapeHtml(budget.id)}" aria-expanded="${expanded ? 'true' : 'false'}">
        <div class="budget-list-row__strip" style="background:${pl.color}"></div>
        <div class="budget-list-row__icon" aria-hidden="true">${Icon('target', { size: 18 })}</div>
        <div class="budget-list-row__main">
          <div class="budget-list-row__title">
            ${escapeHtml(budget.name)}
            ${allDone ? `<span class="done-badge">${Icon('check', { size: 10 })} Selesai</span>` : ''}
          </div>
          <div class="budget-list-row__sub ${remaining < 0 ? 'over' : ''}">${remainingLabel}</div>
          <div class="budget-list-row__track">
            <div class="budget-list-row__fill ${statusClass}" style="width:${Math.min(progress.percentUsed, 100)}%"></div>
          </div>
        </div>
        <div class="budget-list-row__right">
          <div class="budget-list-row__pct">${progress.percentUsed}%</div>
          <div class="budget-list-row__budget" data-role="row-amount">${formatCompact(budget.amount)}</div>
          <span class="budget-list-row__chev ${expanded ? 'is-open' : ''}">${Icon('chevronDown', { size: 16 })}</span>
        </div>
      </button>
      </div>
      <div class="budget-list-items ${expanded ? '' : 'hidden'}" data-role="items">
        ${items.map((item) => {
          const lim = getItemAllocationLimit(income, draftRows, budget.id, item.id);
          return renderDetailItem(item, expanded && _expandedItemId === item.id, lim);
        }).join('')}
        <button type="button" class="bli-add-item tap" data-action="add-item" data-budget-id="${escapeHtml(budget.id)}">
          ${Icon('plus', { size: 14 })} Tambah item
        </button>
      </div>
    </div>
  `;
}

/**
 * @param {object[]} sorted
 * @param {object[]} transactions
 * @param {string} month
 * @param {number} [income]
 */
function renderGroupedByPriority(sorted, transactions, month, income = 0) {
  const groups = {};
  for (const pl of Object.values(PRIORITY_LEVELS)) groups[pl.key] = [];

  for (const b of sorted) {
    const key = (b.priority || 'penting').toLowerCase();
    if (groups[key]) groups[key].push(b);
  }

  return Object.values(PRIORITY_LEVELS).map((pl) => {
    const list = groups[pl.key] || [];
    if (!list.length) return '';
    const totals = groupTotals(list, transactions, month);
    return `
      <section class="budget-list-group" data-priority="${pl.key}">
        <div class="budget-list-group__head">
          <span class="budget-list-group__dot" style="background:${pl.color}"></span>
          <span class="budget-list-group__label">${pl.label.toUpperCase()}</span>
          <span class="budget-list-group__meta">${list.length} item</span>
          <span class="budget-list-group__summary">${formatCompact(totals.spent)} / ${formatCompact(totals.total)} (${totals.pct}%)</span>
        </div>
        ${list.map((b) => renderBudgetListRow(b, transactions, month, income)).join('')}
      </section>
    `;
  }).join('');
}

/**
 * @param {HTMLElement} section
 * @param {object[]} rows
 * @param {object[]} transactions
 * @param {string} month
 * @param {string} sort
 * @param {number} [income]
 */
function renderBudgetListSection(section, rows, transactions, month, sort, income = 0) {
  const sorted = sortBudgets(rows, transactions, month, sort);
  if (!sorted.length) {
    section.innerHTML = `
      <div class="blc-empty">
        <div class="blc-empty-icon">${Icon('target', { size: 40 })}</div>
        <div class="blc-empty-title">Belum ada budgeting</div>
        <div class="blc-empty-desc">Buat budgeting pertama atau gunakan Auto Budget</div>
      </div>
    `;
    return;
  }

  if (sort === 'priority') {
    section.innerHTML = renderGroupedByPriority(sorted, transactions, month, income);
  } else {
    section.innerHTML = `
      <div class="budget-list-flat">
        ${sorted.map((b) => renderBudgetListRow(b, transactions, month, income)).join('')}
      </div>
    `;
  }
}

/**
 * @returns {object[]}
 */
function getDraftRows() {
  const draft = window.STATE?.budgetDraft?.rows;
  if (Array.isArray(draft) && draft.length) return draft;
  const ctxRows = _pageCtx?.rows;
  if (Array.isArray(ctxRows) && ctxRows.length) return ctxRows;
  return Array.isArray(draft) ? draft : [];
}

/**
 * Mirror live page rows onto window.STATE.budgetDraft for save/undo.
 * @param {object[]} [rowsOverride]
 * @param {string} [monthOverride]
 * @param {number} [incomeOverride]
 */
function mirrorDraftToState(rowsOverride, monthOverride, incomeOverride) {
  const state = window.STATE;
  if (!state) return;
  const rows = rowsOverride || _pageCtx?.rows || getDraftRows();
  if (!Array.isArray(rows)) return;
  const month = monthOverride || _pageCtx?.month || resolveBudgetMonth();
  const income = Number(incomeOverride ?? _pageCtx?.income ?? state.budgetDraft?.income ?? 0);
  if (!state.budgetDraft) {
    state.budgetDraft = { month, income, rows, initialFrom: 'page' };
  } else {
    state.budgetDraft.rows = rows;
    state.budgetDraft.month = month;
    if (Number.isFinite(income)) state.budgetDraft.income = income;
  }
}

/**
 * Ensure draft row has items array mirrored from list display.
 * @param {object} row
 */
function ensureRowItems(row) {
  if (!row) return;
  if (!Array.isArray(row.items) || !row.items.length) {
    row.items = [createBudgetItem({ name: row.name || 'Item', price: Number(row.amount || 0), qty: 1 })];
  }
}

/**
 * Recalc category amount from items.
 * @param {object} row
 */
function recalcRowAmount(row) {
  if (!row?.items?.length) return;
  row.amount = row.items.reduce((s, i) => s + getItemTotalAmount(i), 0);
}

/**
 * @param {object} line
 * @returns {string}
 */
function renderLineItemRow(line) {
  const unitOptions = BUDGET_UNITS.map((u) => (
    `<option value="${escapeHtml(u.value)}" ${line.unit === u.value ? 'selected' : ''}>${escapeHtml(u.label)}</option>`
  )).join('');
  return `
    <div class="bli-line-row" data-line-id="${escapeHtml(line.id)}">
      <span class="bli-line-drag" draggable="true" data-drag-type="line" data-line-id="${escapeHtml(line.id)}" title="Geser baris" aria-label="Geser baris">${Icon('grip', { size: 12 })}</span>
      <input type="text" class="bli-line-name form-input" placeholder="Nama item" value="${escapeHtml(line.name || '')}" aria-label="Nama baris rincian">
      <div class="bli-line-meta">
        <label class="bli-line-field">
          <span class="bli-line-field-label">Qty</span>
          <input type="number" class="bli-line-qty form-input" min="0" step="1" value="${Number(line.qty) || 1}" aria-label="Qty">
        </label>
        <label class="bli-line-field">
          <span class="bli-line-field-label">Satuan</span>
          <select class="bli-line-unit form-input" aria-label="Satuan">${unitOptions}</select>
        </label>
        <label class="bli-line-field">
          <span class="bli-line-field-label">Jumlah</span>
          <input type="number" class="bli-line-amount form-input" min="0" step="1000" value="${Number(line.amount) || ''}" placeholder="0" inputmode="numeric" aria-label="Jumlah">
        </label>
      </div>
      <button type="button" class="bli-line-del tap" data-action="delete-line-item" aria-label="Hapus baris">${Icon('x', { size: 12 })}</button>
    </div>
  `;
}

/**
 * @param {object} item
 * @param {boolean} breakdownExpanded
 * @returns {string}
 */
function renderItemBreakdown(item, breakdownExpanded) {
  const lines = item.line_items || [];
  const lineMode = hasActiveLineItems(item);
  const lineTotal = lines.reduce((s, l) => s + Math.abs(Number(l.amount || 0)), 0);
  const displayLines = lines.length ? lines : [createBudgetLineItem()];

  return `
    <div class="bli-breakdown ${breakdownExpanded ? 'is-open' : ''}">
      <button type="button" class="bli-breakdown__toggle tap" data-action="toggle-breakdown" aria-expanded="${breakdownExpanded ? 'true' : 'false'}">
        <span class="bli-breakdown__label">Rincian pengeluaran</span>
        <span class="bli-breakdown__hint">opsional</span>
        ${lineMode ? `<span class="bli-breakdown__sum">Rp ${formatIDR(lineTotal)}</span>` : ''}
        <span class="bli-breakdown__chev">${Icon('chevronDown', { size: 12 })}</span>
      </button>
      <div class="bli-breakdown__body ${breakdownExpanded ? '' : 'hidden'}">
        <div class="bli-lines-table" role="table" aria-label="Rincian pengeluaran">
          <div class="bli-lines-head" role="row">
            <span role="columnheader" class="sr-only">Urut</span>
            <span role="columnheader">Item</span>
            <span role="columnheader">Qty</span>
            <span role="columnheader">Satuan</span>
            <span role="columnheader">Jumlah</span>
            <span role="columnheader" class="sr-only">Aksi</span>
          </div>
          ${displayLines.map((line) => renderLineItemRow(line)).join('')}
        </div>
        <button type="button" class="bli-add-line tap" data-action="add-line-item">
          ${Icon('plus', { size: 12 })} Tambah baris
        </button>
      </div>
    </div>
  `;
}

/**
 * @returns {string} YYYY-MM
 */
function resolveBudgetMonth() {
  const state = window.STATE;
  if (state?.budgetDraft?.month && /^\d{4}-\d{2}/.test(String(state.budgetDraft.month))) {
    return String(state.budgetDraft.month).slice(0, 7);
  }
  if (state?.period?.end) return String(state.period.end).slice(0, 7);
  if (state?.selectedMonth) return String(state.selectedMonth).slice(0, 7);
  const filterPeriod = getFilter()?.period;
  if (filterPeriod && /^\d{4}-\d{2}/.test(String(filterPeriod))) {
    return String(filterPeriod).slice(0, 7);
  }
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {string} [month] YYYY-MM
 * @returns {object[]}
 */
function resolveMonthTransactions(month) {
  const mk = month || resolveBudgetMonth();
  const allTx = window.STATE?.transactions || [];
  return filterMonthExpenses(allTx, mk);
}

/**
 * Draft rows with amounts synced from items for hero totals.
 * @returns {object[]}
 */
function getHeroRowsFromDraft() {
  const rows = getDraftRows();
  for (const row of rows) {
    ensureRowItems(row);
    recalcRowAmount(row);
  }
  return rows;
}

/**
 * @param {{ month?: string, transactions?: object[], income?: number }} snap
 */
function setHeroSnapshot(snap) {
  if (!snap?.month) return;
  const txs = Array.isArray(snap.transactions) && snap.transactions.length
    ? snap.transactions
    : resolveMonthTransactions(snap.month);
  _heroSnapshot = {
    month: snap.month,
    transactions: txs,
    income: Number(snap.income || 0),
  };
}

/**
 * Realisasi tx list — never use empty snapshot when STATE has data.
 * @param {string} month
 * @returns {object[]}
 */
function resolveHeroTransactions(month) {
  const mk = month || resolveBudgetMonth();
  if (_heroSnapshot?.month === mk && _heroSnapshot?.transactions?.length) {
    return dedupeTransactions(_heroSnapshot.transactions);
  }
  if (_pageCtx?.month === mk && _pageCtx?.transactions?.length) {
    return dedupeTransactions(_pageCtx.transactions);
  }
  return resolveMonthTransactions(mk);
}

/**
 * Patch hero amounts immediately (no full re-render flash).
 * @param {HTMLElement} container
 * @param {number} totalSpent
 * @param {number} totalBudget
 */
function patchHeroAmounts(container, totalSpent, totalBudget) {
  const hero = container?.querySelector('#budget-summary-hero');
  if (!hero) return;
  const spentEl = hero.querySelector('.bsh-spent');
  const totalEl = hero.querySelector('.bsh-total');
  const pctEl = hero.querySelector('.bsh-percent');
  const fillEl = hero.querySelector('.bsh-progress-fill');
  if (spentEl && Number.isFinite(totalSpent)) spentEl.textContent = `Rp ${formatIDR(totalSpent)}`;
  if (totalEl && Number.isFinite(totalBudget)) totalEl.textContent = `Rp ${formatIDR(totalBudget)}`;
  const pctRaw = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const pctDisplay = Math.round(pctRaw);
  if (pctEl) pctEl.textContent = `${pctDisplay}% realisasi`;
  if (fillEl) {
    fillEl.style.width = `${Math.min(100, pctRaw)}%`;
    fillEl.classList.toggle('fill-over', pctRaw > 100);
  }
}

function beginEditGesture() {
  mirrorDraftToState();
  if (!_editBeforeRows && window.STATE?.budgetDraft) {
    _editBeforeRows = JSON.parse(JSON.stringify(window.STATE.budgetDraft.rows || []));
  }
  import('../services/budget-changes-tracker.js')
    .then(({ markSessionDirty }) => markSessionDirty(true))
    .catch(() => {});
}

async function commitEditGesture(label = 'Edit item budget') {
  if (!_editBeforeRows || !window.STATE?.budgetDraft) return;
  try {
    const { recordBudgetRowsChange } = await import('../services/budget-changes-tracker.js');
    recordBudgetRowsChange(label, _editBeforeRows, window.STATE.budgetDraft.rows);
  } catch { /* ignore */ }
  _editBeforeRows = null;
  import('../services/budget-changes-tracker.js')
    .then(({ markSessionDirty }) => markSessionDirty(false))
    .catch(() => {});
  syncToolbarState(document.getElementById('budgetPageRoot'));
}

/**
 * Live-update allocation strip + row amounts without full re-render.
 * @param {HTMLElement} container
 * @param {number} income
 */
function syncLiveDashboard(container, income) {
  const liveIncome = Number(window.STATE?.budgetDraft?.income || income || 0);
  const rows = getHeroRowsFromDraft();
  const html = renderAllocationStripHtml(liveIncome, rows);
  container.querySelectorAll('[data-role="alloc-host"], [data-role="alloc-host-mobile"]').forEach((host) => {
    host.innerHTML = html;
  });

  rows.forEach((row) => {
    const block = container.querySelector(`.budget-list-block[data-budget-id="${row.id}"]`);
    if (!block) return;
    const amtEl = block.querySelector('[data-role="row-amount"]');
    if (amtEl) amtEl.textContent = formatCompact(row.amount);
  });

  const month = _heroSnapshot?.month || _pageCtx?.month || resolveBudgetMonth();
  const transactions = resolveHeroTransactions(month);
  const totalBudget = rows.reduce((s, b) => s + Math.abs(Number(b.amount || 0)), 0);
  const totalSpent = sumMonthExpenses(transactions, month);
  patchHeroAmounts(container, totalSpent, totalBudget);
  scheduleHeroRefresh(container, liveIncome);
}

let _heroTimer = null;
/**
 * Debounced hero refresh — budgeting from live draft, realisasi from stable tx snapshot.
 * @param {HTMLElement} container
 * @param {number} [income]
 */
function scheduleHeroRefresh(container, income) {
  if (_heroTimer) clearTimeout(_heroTimer);
  _heroTimer = setTimeout(async () => {
    const heroEl = container?.querySelector('#budget-summary-hero');
    if (!heroEl) return;

    const rows = getHeroRowsFromDraft();
    const month = _heroSnapshot?.month || _pageCtx?.month || resolveBudgetMonth();
    const transactions = resolveHeroTransactions(month);
    const liveIncome = Number(window.STATE?.budgetDraft?.income || income || _heroSnapshot?.income || _pageCtx?.income || 0);
    const totalBudget = rows.reduce((s, b) => s + Math.abs(Number(b.amount || 0)), 0);
    const totalSpent = sumMonthExpenses(transactions, month);
    patchHeroAmounts(container, totalSpent, totalBudget);
    try {
      const { renderBudgetSummaryHero } = await import('./budget-summary-hero.js');
      const overBudgetCount = countOverBudgetRows(rows, transactions, month);
      const criticalCount = countAttentionRows(rows, transactions, month);
      await renderBudgetSummaryHero(heroEl, {
        rows,
        transactions,
        month,
        income: liveIncome,
        overBudgetCount,
        criticalCount,
        onEvaluation: async () => {
          const { showEvaluation } = await import('./budget-evaluation.js');
          showEvaluation({ month, rows, transactions });
        },
      });
    } catch (e) {
      console.warn('[budget] hero refresh', e);
    }
  }, 120);
}

/**
 * @param {HTMLElement|null} container
 */
function syncToolbarState(container) {
  if (!container) return;
  const api = window.monefyiChanges;
  const undoBtn = container.querySelector('[data-action="toolbar-undo"]');
  const redoBtn = container.querySelector('[data-action="toolbar-redo"]');
  const saveBtn = container.querySelector('[data-action="toolbar-save"]');
  const cancelBtn = container.querySelector('[data-action="toolbar-cancel"]');
  const canUndo = !!api?.canUndo?.();
  const canRedo = !!api?.canRedo?.();
  const dirty = !!api?.isDirty?.() || !!_editBeforeRows;
  const draftTotal = getHeroRowsFromDraft().reduce((s, b) => s + Math.abs(Number(b.amount || 0)), 0);
  const toolbar = container.querySelector('.blc-toolbar');
  toolbar?.classList.toggle('blc-toolbar--dirty', dirty);
  if (undoBtn) {
    undoBtn.disabled = !canUndo;
    undoBtn.classList.toggle('is-active', canUndo);
  }
  if (redoBtn) {
    redoBtn.disabled = !canRedo;
    redoBtn.classList.toggle('is-active', canRedo);
  }
  if (saveBtn) {
    saveBtn.disabled = !dirty;
    saveBtn.classList.toggle('is-active', dirty);
    let amtEl = saveBtn.querySelector('[data-role="toolbar-save-amt"]');
    if (dirty) {
      if (!amtEl) {
        amtEl = document.createElement('span');
        amtEl.className = 'blc-save-amt';
        amtEl.dataset.role = 'toolbar-save-amt';
        saveBtn.appendChild(amtEl);
      }
      amtEl.textContent = formatCompact(draftTotal);
      amtEl.hidden = false;
    } else if (amtEl) {
      amtEl.hidden = true;
    }
  }
  if (cancelBtn) {
    cancelBtn.disabled = !dirty && !canUndo;
    cancelBtn.classList.toggle('is-active', dirty || canUndo);
  }
  const hasCategorySelection = !!(_selectedBudgetId || _expandedBudgetId);
  const canDeleteItem = !!(_expandedItemId && hasCategorySelection);
  container.querySelectorAll('[data-action="toolbar-duplicate"]').forEach((btn) => {
    btn.disabled = !hasCategorySelection;
  });
  container.querySelectorAll('[data-action="toolbar-delete"]').forEach((btn) => {
    btn.disabled = !canDeleteItem;
    btn.title = 'Hapus item terpilih';
    btn.setAttribute('aria-label', 'Hapus item terpilih');
  });
}

/**
 * Refresh page from current draft (no DB reload).
 * @param {object} ctx
 */
async function refreshFromDraft(ctx) {
  if (typeof ctx?.onRefresh === 'function') {
    await ctx.onRefresh({ fromSaved: false });
  } else if (typeof window.renderBudgetPageView === 'function') {
    await window.renderBudgetPageView();
  }
}

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 */
function wireHandlers(container, ctx) {
  const { rows, transactions, month, income, onRefresh, onSave } = ctx;
  _pageCtx = ctx;
  setHeroSnapshot({ month, transactions, income });
  const currentSort = localStorage.getItem(SORT_KEY) || 'urgent';

  if (onSave) {
    window.monefyiCurrentSaveHandler = () => onSave();
  }

  container.querySelector('[data-action="open-filter"]')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const { showFilterPopup } = await import('./global-filter-popup.js');
    await showFilterPopup();
  });

  const openIncomeManager = async (e) => {
    if (e?.target?.closest?.('[data-action="open-filter"]')) return;
    e?.stopPropagation?.();
    const { showIncomeManagerModal } = await import('./income-manager.js');
    showIncomeManagerModal(() => onRefresh?.({ fromSaved: false }), month);
  };
  container.querySelectorAll('[data-action="manage-income"]').forEach((el) => {
    el.addEventListener('click', openIncomeManager);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openIncomeManager(e);
      }
    });
  });

  wireToolbar(container, ctx);
  wireListInteractions(container, ctx);
  syncToolbarState(container);

  import('../services/budget-changes-tracker.js')
    .then(({ onChange }) => {
      onChange(() => syncToolbarState(container));
    })
    .catch(() => {});

  import('../services/notification-center.js').then((m) => m.refreshNotifications()).catch(() => {});
}

/**
 * @returns {string}
 */
function getCurrentSort() {
  return localStorage.getItem(SORT_KEY) || 'urgent';
}

/**
 * @returns {boolean}
 */
function isManualSort() {
  return getCurrentSort() === 'manual';
}

/**
 * @param {string} sort
 */
function applySortFromUi(sort) {
  localStorage.setItem(SORT_KEY, sort);
  const root = document.getElementById('budgetPageRoot');
  const ctx = _pageCtx;
  if (!root || !ctx) return;

  const sortBtn = root.querySelector('[data-action="toolbar-sort"]');
  if (sortBtn) sortBtn.title = `Urutkan: ${SORT_LABELS[sort] || sort}`;

  root.querySelectorAll('.blc-sort-option').forEach((opt) => {
    opt.classList.toggle('is-active', opt.dataset.sort === sort);
  });

  const section = root.querySelector('#budget-list-content');
  const liveRows = getDraftRows().length ? getDraftRows() : (ctx.rows || []);
  const txs = ctx.transactions?.length ? ctx.transactions : resolveMonthTransactions(ctx.month);
  if (section) renderBudgetListSection(section, liveRows, txs, ctx.month, sort, ctx.income);
  wireListInteractions(root, ctx);
}

/**
 * @param {HTMLElement} root
 */
function closeSortMenu(root) {
  const menu = root.querySelector('#budget-sort-menu');
  const btn = root.querySelector('[data-action="toolbar-sort"]');
  menu?.setAttribute('hidden', '');
  btn?.setAttribute('aria-expanded', 'false');
}

/**
 * @param {HTMLElement} root
 */
function toggleSortMenu(root) {
  const menu = root.querySelector('#budget-sort-menu');
  const btn = root.querySelector('[data-action="toolbar-sort"]');
  if (!menu || !btn) return;
  const open = menu.hasAttribute('hidden');
  if (open) {
    menu.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
  } else {
    closeSortMenu(root);
  }
}

/**
 * Document-level sort menu (survives re-render; runs before toolbar capture).
 */
function wireSortDelegation() {
  if (_sortWired) return;
  _sortWired = true;

  document.addEventListener('click', (e) => {
    const root = document.getElementById('budgetPageRoot');
    if (!root || root.classList.contains('hidden')) return;

    const sortOpt = e.target.closest?.('.blc-sort-option[data-sort]');
    if (sortOpt && root.contains(sortOpt)) {
      e.preventDefault();
      e.stopPropagation();
      applySortFromUi(sortOpt.dataset.sort);
      closeSortMenu(root);
      return;
    }

    const sortBtn = e.target.closest?.('[data-action="toolbar-sort"]');
    if (sortBtn && root.contains(sortBtn)) {
      e.preventDefault();
      e.stopPropagation();
      toggleSortMenu(root);
      return;
    }

    const menu = root.querySelector('#budget-sort-menu');
    if (menu && !menu.hasAttribute('hidden')) {
      const wrap = root.querySelector('.blc-sort-wrap');
      if (!wrap?.contains(e.target)) closeSortMenu(root);
    }
  }, true);
}

/**
 * @param {object[]} arr
 * @param {string} fromId
 * @param {string} toId
 * @returns {boolean}
 */
function reorderById(arr, fromId, toId) {
  if (!Array.isArray(arr)) return false;
  const fromIdx = arr.findIndex((x) => x.id === fromId);
  const toIdx = arr.findIndex((x) => x.id === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return false;
  const [moved] = arr.splice(fromIdx, 1);
  arr.splice(toIdx, 0, moved);
  return true;
}

/**
 * @param {EventTarget|null} target
 * @param {{ type: string, budgetId?: string, itemId?: string, lineId?: string }} state
 * @returns {{ el: Element, id: string, budgetId?: string, itemId?: string }|null}
 */
function findDropZone(target, state) {
  const el = /** @type {Element|null} */ (target instanceof Element ? target : null);
  if (!el) return null;

  if (state.type === 'budget') {
    const block = el.closest('.budget-list-block');
    if (block?.dataset.budgetId) return { el: block, id: block.dataset.budgetId };
  }
  if (state.type === 'item') {
    const item = el.closest('.bli-item');
    const block = item?.closest('.budget-list-block');
    if (item?.dataset.itemId && block?.dataset.budgetId) {
      return { el: item, id: item.dataset.itemId, budgetId: block.dataset.budgetId };
    }
  }
  if (state.type === 'line') {
    const line = el.closest('.bli-line-row');
    const item = line?.closest('.bli-item');
    const block = item?.closest('.budget-list-block');
    if (line?.dataset.lineId && item?.dataset.itemId && block?.dataset.budgetId) {
      return {
        el: line,
        id: line.dataset.lineId,
        itemId: item.dataset.itemId,
        budgetId: block.dataset.budgetId,
      };
    }
  }
  return null;
}

/**
 * @param {{ type: string, budgetId?: string, itemId?: string, lineId?: string }} from
 * @param {string} toId
 * @param {object} ctx
 * @param {HTMLElement} container
 */
async function applyDragReorder(from, toId, ctx, container) {
  beginEditGesture();
  mirrorDraftToState();
  const rows = getDraftRows();

  if (from.type === 'budget') {
    reorderById(rows, from.budgetId, toId);
  } else if (from.type === 'item') {
    const row = rows.find((r) => r.id === from.budgetId);
    if (row?.items) reorderById(row.items, from.itemId, toId);
    recalcRowAmount(row);
  } else if (from.type === 'line') {
    const row = rows.find((r) => r.id === from.budgetId);
    const item = row?.items?.find((i) => i.id === from.itemId);
    if (item?.line_items) reorderById(item.line_items, from.lineId, toId);
    syncItemAmountFromLines(item);
    recalcRowAmount(row);
  }

  mirrorDraftToState();
  await commitEditGesture('Ubah urutan');

  const sort = getCurrentSort();
  const section = container.querySelector('#budget-list-content');
  const txs = ctx.transactions?.length ? ctx.transactions : resolveMonthTransactions(ctx.month);
  if (section) renderBudgetListSection(section, getDraftRows(), txs, ctx.month, sort, ctx.income);
  wireListInteractions(container, ctx);
  syncLiveDashboard(container, Number(ctx?.income || window.STATE?.budgetDraft?.income || 0));
}

/**
 * Document-level drag-and-drop reorder for budgets, items, and line items.
 */
function wireDragReorder() {
  if (_dragWired) return;
  _dragWired = true;

  const getRoot = () => document.getElementById('budgetPageRoot');

  document.addEventListener('dragstart', (e) => {
    const root = getRoot();
    if (!root || root.classList.contains('hidden')) return;
    const handle = e.target.closest?.('[data-drag-type][draggable="true"]');
    if (!handle || !root.contains(handle)) return;

    const type = handle.dataset.dragType;
    if (type === 'budget' && !isManualSort()) {
      e.preventDefault();
      showPageToast('Pilih "Urutan sendiri" di menu sort untuk menggeser kategori');
      return;
    }

    const block = handle.closest('.budget-list-block');
    const itemEl = handle.closest('.bli-item');
    const lineEl = handle.closest('.bli-line-row');

    _dragState = {
      type,
      budgetId: handle.dataset.budgetId || block?.dataset.budgetId,
      itemId: handle.dataset.itemId || itemEl?.dataset.itemId,
      lineId: handle.dataset.lineId || lineEl?.dataset.lineId,
    };

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(_dragState));

    const dragEl = type === 'budget' ? block : type === 'item' ? itemEl : lineEl;
    dragEl?.classList.add('is-dragging');
  });

  document.addEventListener('dragover', (e) => {
    if (!_dragState) return;
    const root = getRoot();
    if (!root || !root.contains(/** @type {Node} */ (e.target))) return;

    const zone = findDropZone(e.target, _dragState);
    if (!zone) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    root.querySelectorAll('.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'));
    zone.el.classList.add('is-drop-target');
  });

  document.addEventListener('drop', async (e) => {
    if (!_dragState) return;
    const root = getRoot();
    if (!root || !root.contains(/** @type {Node} */ (e.target))) return;

    const zone = findDropZone(e.target, _dragState);
    if (!zone) return;

    e.preventDefault();
    e.stopPropagation();

    const from = { ..._dragState };
    const toId = zone.id;

    if (from.type === 'budget' && from.budgetId === toId) return;
    if (from.type === 'item' && from.itemId === toId) return;
    if (from.type === 'line' && from.lineId === toId) return;
    if (from.type === 'item' && zone.budgetId && from.budgetId !== zone.budgetId) return;
    if (from.type === 'line' && (from.itemId !== zone.itemId || from.budgetId !== zone.budgetId)) return;

    const ctx = _pageCtx;
    if (!ctx) return;

    await applyDragReorder(from, toId, ctx, root);

    root.querySelectorAll('.is-dragging, .is-drop-target').forEach((el) => {
      el.classList.remove('is-dragging', 'is-drop-target');
    });
    _dragState = null;
  });

  document.addEventListener('dragend', () => {
    const root = getRoot();
    root?.querySelectorAll('.is-dragging, .is-drop-target').forEach((el) => {
      el.classList.remove('is-dragging', 'is-drop-target');
    });
    _dragState = null;
  });
}

/**
 * Document-level toolbar delegation (survives innerHTML re-render).
 */
function wireToolbarDelegation() {
  if (_toolbarWired) return;
  _toolbarWired = true;

  document.addEventListener('click', async (e) => {
    const root = document.getElementById('budgetPageRoot');
    if (!root || root.classList.contains('hidden')) return;
    const btn = e.target.closest?.('[data-action^="toolbar-"]');
    if (!btn || !root.contains(btn)) return;
    const action = btn.dataset.action;
    if (action === 'toolbar-sort') return;
    const ctx = _pageCtx;
    if (!ctx) return;
    const { month, onRefresh, onSave } = ctx;
    e.preventDefault();
    e.stopPropagation();

    if (action === 'toolbar-undo') {
      const { undo } = await import('../services/budget-changes-tracker.js');
      await undo();
      _editBeforeRows = null;
      syncToolbarState(root);
      return;
    }
    if (action === 'toolbar-redo') {
      const { redo } = await import('../services/budget-changes-tracker.js');
      await redo();
      syncToolbarState(root);
      return;
    }
    if (action === 'toolbar-save') {
      mirrorDraftToState();
      if (_editBeforeRows) await commitEditGesture('Edit item budget');
      try {
        if (typeof onSave === 'function') await onSave();
        else if (typeof window.handleSaveBudget === 'function') await window.handleSaveBudget();
      } catch (err) {
        console.error('[budget] save failed', err);
        showPageToast('Gagal simpan budget');
      }
      return;
    }
    if (action === 'toolbar-cancel') {
      if (!confirm('Batalkan semua perubahan yang belum disimpan?')) return;
      _expandedBudgetId = null;
      _expandedItemId = null;
      _editBeforeRows = null;
      import('../services/budget-changes-tracker.js').then(({ markSessionDirty }) => markSessionDirty(false)).catch(() => {});
      await onRefresh?.({ fromSaved: true });
      return;
    }
    if (action === 'toolbar-add') {
      const { showBudgetFormModal } = await import('./budget-form-modal.js');
      showBudgetFormModal({ priority: 'penting', month }, {
        onSaved: () => onRefresh?.({ fromSaved: false }),
        showSummary: false,
      });
      return;
    }
    if (action === 'toolbar-auto') {
      const { showBudgetGeneratorModal } = await import('./budget-generator-modal.js');
      showBudgetGeneratorModal(() => onRefresh?.({ fromSaved: false }));
      return;
    }
    if (action === 'toolbar-duplicate') {
      const id = _selectedBudgetId || _expandedBudgetId;
      const draft = window.STATE?.budgetDraft;
      if (!id || !draft?.rows) {
        showPageToast('Pilih kategori budget dulu');
        return;
      }
      const src = draft.rows.find((r) => r.id === id);
      if (!src) return;
      const before = JSON.parse(JSON.stringify(draft.rows));
      const clone = createBudgetRow({
        ...src,
        id: undefined,
        name: `${src.name || 'Budget'} (salinan)`,
        items: (src.items || []).map((it) => createBudgetItem({ ...it, id: undefined })),
      });
      draft.rows.push(clone);
      _selectedBudgetId = clone.id;
      _expandedBudgetId = clone.id;
      try {
        const { recordBudgetRowsChange } = await import('../services/budget-changes-tracker.js');
        recordBudgetRowsChange('Duplikat budget', before, draft.rows);
      } catch { /* ignore */ }
      showPageToast('Kategori diduplikasi');
      await refreshFromDraft(ctx);
      return;
    }
    if (action === 'toolbar-delete') {
      const budgetId = _expandedBudgetId || _selectedBudgetId;
      const itemId = _expandedItemId;
      if (!budgetId || !itemId) {
        showPageToast('Pilih item budget dulu');
        return;
      }
      await deleteBudgetItem(root, ctx, budgetId, itemId);
      return;
    }
    if (action === 'toolbar-template') {
      const { showBudgetTemplateModal } = await import('./budget-template-modal.js');
      const liveRows = getDraftRows().length ? getDraftRows() : (ctx.rows || []);
      await showBudgetTemplateModal({
        month,
        income: Number(ctx.income || window.STATE?.budgetDraft?.income || 0),
        rows: liveRows,
        onApplied: () => refreshFromDraft(ctx),
      });
    }
  }, true);
}

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 */
function wireToolbar(container, ctx) {
  wireSortDelegation();
  wireToolbarDelegation();
  wireDragReorder();

  const { month, onRefresh } = ctx;

  const addBudget = async () => {
    const { showBudgetFormModal } = await import('./budget-form-modal.js');
    showBudgetFormModal({ priority: 'penting', month }, {
      onSaved: () => onRefresh?.({ fromSaved: false }),
      showSummary: false,
    });
  };

  container.querySelectorAll('[data-action="add-budget"], [data-action="toolbar-add"]').forEach((btn) => {
    btn.addEventListener('click', addBudget);
  });

  container.querySelectorAll('[data-action="generate-budget"], [data-action="toolbar-auto"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { showBudgetGeneratorModal } = await import('./budget-generator-modal.js');
      showBudgetGeneratorModal(() => onRefresh?.({ fromSaved: false }));
    });
  });
}

/**
 * Toggle accordion expand state in-place (no full page re-render).
 * @param {HTMLElement} container
 * @param {object} ctx
 * @param {{ rebuildItems?: boolean }} [opts]
 */
function applyExpandDom(container, ctx, opts = {}) {
  const rebuildItems = opts.rebuildItems !== false;
  const income = Number(ctx?.income || window.STATE?.budgetDraft?.income || 0);
  const rows = getDraftRows();

  container.querySelectorAll('.budget-list-block').forEach((block) => {
    const id = block.dataset.budgetId;
    const expanded = _expandedBudgetId === id;
    const selected = _selectedBudgetId === id;
    block.classList.toggle('is-expanded', expanded);
    block.classList.toggle('is-selected', selected);
    const itemsEl = block.querySelector('[data-role="items"]');
    itemsEl?.classList.toggle('hidden', !expanded);
    const rowBtn = block.querySelector('[data-action="toggle-budget"]');
    rowBtn?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    block.querySelector('.budget-list-row__chev')?.classList.toggle('is-open', expanded);

    if (!expanded || !itemsEl) return;

    const row = rows.find((r) => r.id === id);
    if (!row) return;
    ensureRowItems(row);

    if (rebuildItems) {
      itemsEl.innerHTML = `${(row.items || []).map((item) => {
        const lim = getItemAllocationLimit(income, rows, row.id, item.id);
        return renderDetailItem(item, _expandedItemId === item.id, lim);
      }).join('')}
        <button type="button" class="bli-add-item tap" data-action="add-item" data-budget-id="${escapeHtml(id)}">
          ${Icon('plus', { size: 14 })} Tambah item
        </button>`;
    } else {
      itemsEl.querySelectorAll('.bli-item').forEach((itemEl) => {
        const itemExpanded = _expandedItemId === itemEl.dataset.itemId;
        itemEl.classList.toggle('is-expanded', itemExpanded);
        itemEl.dataset.expanded = itemExpanded ? 'true' : 'false';
        itemEl.querySelector('.bli-item__detail')?.classList.toggle('hidden', !itemExpanded);
        itemEl.querySelector('[data-action="toggle-item"]')?.setAttribute('aria-expanded', itemExpanded ? 'true' : 'false');
      });
    }
  });

  wireAddItemButtons(container, ctx);
  wireItemEditors(container, ctx);
  syncToolbarState(container);
}

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 */
function wireAddItemButtons(container, ctx) {
  container.querySelectorAll('[data-action="add-item"]').forEach((btn) => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const budgetId = btn.dataset.budgetId;
      const draft = window.STATE?.budgetDraft;
      const row = draft?.rows?.find((r) => r.id === budgetId);
      if (!row) return;
      const income = Number(ctx?.income || draft?.income || 0);
      const total = (draft.rows || []).reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0);
      const room = income - total;
      if (room <= 0) {
        showPageToast('Sisa alokasi income habis — kurangi item lain dulu');
        return;
      }
      beginEditGesture();
      ensureRowItems(row);
      const item = createBudgetItem({ name: '', price: 0, qty: 1 });
      row.items.push(item);
      recalcRowAmount(row);
      _expandedBudgetId = budgetId;
      _expandedItemId = item.id;
      _selectedBudgetId = budgetId;
      await commitEditGesture('Tambah item');
      applyExpandDom(container, ctx, { rebuildItems: true });
      syncLiveDashboard(container, income);
    };
  });
}

/**
 * Remove one item from a budget category (min 1 item remains).
 * @param {HTMLElement} container
 * @param {object} ctx
 * @param {string} budgetId
 * @param {string} itemId
 * @returns {Promise<boolean>}
 */
async function deleteBudgetItem(container, ctx, budgetId, itemId) {
  mirrorDraftToState();
  const row = getDraftRows().find((r) => r.id === budgetId);
  if (!row || !itemId) return false;
  ensureRowItems(row);
  if ((row.items || []).length <= 1) {
    showPageToast('Minimal 1 item per kategori');
    return false;
  }
  if (!confirm('Hapus item budget ini?')) return false;

  const before = JSON.parse(JSON.stringify(getDraftRows()));
  row.items = row.items.filter((i) => i.id !== itemId);
  recalcRowAmount(row);
  mirrorDraftToState();

  if (_expandedItemId === itemId) {
    _expandedItemId = row.items[0]?.id || null;
  }
  if (_expandedBreakdownItemId === itemId) _expandedBreakdownItemId = null;

  try {
    const { recordBudgetRowsChange } = await import('../services/budget-changes-tracker.js');
    recordBudgetRowsChange('Hapus item budget', before, getDraftRows());
  } catch { /* ignore */ }

  const income = Number(ctx?.income || window.STATE?.budgetDraft?.income || 0);
  applyExpandDom(container, ctx, { rebuildItems: true });
  syncLiveDashboard(container, income);
  syncToolbarState(container);
  showPageToast('Item dihapus');
  return true;
}

/**
 * Delegated clicks for accordion rows/items — survives list DOM rebuilds.
 * @param {MouseEvent} e
 */
function handleBudgetListClick(e, containerOverride) {
  const container = containerOverride || document.getElementById('budgetPageRoot');
  const ctx = _pageCtx;
  if (!container || !ctx) return;

  const lineAction = e.target.closest?.('[data-action="toggle-breakdown"], [data-action="add-line-item"], [data-action="delete-line-item"]');
  if (lineAction) {
    e.preventDefault();
    e.stopPropagation();
    const itemEl = lineAction.closest('.bli-item');
    const block = itemEl?.closest('.budget-list-block');
    const itemId = itemEl?.dataset.itemId;
    const budgetId = block?.dataset.budgetId;
    if (!itemId || !budgetId) return;

    const row = getDraftRows().find((r) => r.id === budgetId);
    const item = row?.items?.find((i) => i.id === itemId);
    if (!row || !item) return;

    if (lineAction.dataset.action === 'toggle-breakdown') {
      const opening = _expandedBreakdownItemId !== itemId;
      _expandedBreakdownItemId = opening ? itemId : null;
      _expandedItemId = itemId;
      _expandedBudgetId = budgetId;
      _selectedBudgetId = budgetId;
      if (opening && !(item.line_items || []).length) {
        item.line_items = [createBudgetLineItem()];
        mirrorDraftToState();
      }
      applyExpandDom(container, ctx, { rebuildItems: true });
      return;
    }

    if (lineAction.dataset.action === 'add-line-item') {
      beginEditGesture();
      if (!Array.isArray(item.line_items)) item.line_items = [];
      item.line_items.push(createBudgetLineItem());
      _expandedBreakdownItemId = itemId;
      _expandedItemId = itemId;
      mirrorDraftToState();
      applyExpandDom(container, ctx, { rebuildItems: true });
      commitEditGesture('Tambah baris rincian');
      return;
    }

    if (lineAction.dataset.action === 'delete-line-item') {
      const lineEl = lineAction.closest('.bli-line-row');
      const lineId = lineEl?.dataset.lineId;
      if (!lineId) return;
      beginEditGesture();
      syncLinesFromDom(itemEl, budgetId, itemId);
      item.line_items = (item.line_items || []).filter((line) => line.id !== lineId);
      syncItemAmountFromLines(item);
      recalcRowAmount(row);
      mirrorDraftToState();
      applyExpandDom(container, ctx, { rebuildItems: true });
      syncLiveDashboard(container, Number(ctx?.income || window.STATE?.budgetDraft?.income || 0));
      syncToolbarState(container);
      commitEditGesture('Hapus baris rincian');
      return;
    }
  }

  const deleteItemBtn = e.target.closest?.('[data-action="delete-item"]');
  if (deleteItemBtn) {
    e.preventDefault();
    e.stopPropagation();
    const itemEl = deleteItemBtn.closest('.bli-item');
    const block = itemEl?.closest('.budget-list-block');
    const targetItemId = itemEl?.dataset.itemId;
    const targetBudgetId = block?.dataset.budgetId;
    if (!targetItemId || !targetBudgetId) return;
    deleteBudgetItem(container, ctx, targetBudgetId, targetItemId);
    return;
  }

  const toggleBudget = e.target.closest?.('[data-action="toggle-budget"]');
  if (toggleBudget) {
    e.preventDefault();
    e.stopPropagation();
    const id = toggleBudget.dataset.budgetId;
    if (!id) return;
    _selectedBudgetId = id;
    const opening = _expandedBudgetId !== id;
    _expandedBudgetId = opening ? id : null;
    if (!opening) {
      _expandedItemId = null;
      _expandedBreakdownItemId = null;
    } else {
      const row = getDraftRows().find((r) => r.id === id);
      if (row) {
        ensureRowItems(row);
        if (!_expandedItemId && row.items?.length) {
          _expandedItemId = row.items[0].id;
        }
      }
    }
    applyExpandDom(container, ctx, { rebuildItems: true });
    return;
  }

  const toggleItem = e.target.closest?.('[data-action="toggle-item"]');
  if (toggleItem) {
    e.preventDefault();
    e.stopPropagation();
    const itemEl = toggleItem.closest('.bli-item');
    const block = itemEl?.closest('.budget-list-block');
    const itemId = itemEl?.dataset.itemId;
    const budgetId = block?.dataset.budgetId;
    if (!itemId || !budgetId) return;
    _selectedBudgetId = budgetId;
    _expandedBudgetId = budgetId;
    _expandedItemId = _expandedItemId === itemId ? null : itemId;
    applyExpandDom(container, ctx, { rebuildItems: false });
  }
}

/**
 * Read line-item table from DOM into draft item.
 * @param {HTMLElement} itemEl
 * @param {string} budgetId
 * @param {string} itemId
 */
function syncLinesFromDom(itemEl, budgetId, itemId) {
  const row = getDraftRows().find((r) => r.id === budgetId);
  const item = row?.items?.find((i) => i.id === itemId);
  if (!row || !item || !itemEl) return;
  const nextLines = [];
  itemEl.querySelectorAll('.bli-line-row').forEach((lineEl) => {
    nextLines.push(createBudgetLineItem({
      id: lineEl.dataset.lineId,
      name: lineEl.querySelector('.bli-line-name')?.value || '',
      qty: Number(lineEl.querySelector('.bli-line-qty')?.value || 1),
      unit: lineEl.querySelector('.bli-line-unit')?.value || 'pcs',
      amount: Number(lineEl.querySelector('.bli-line-amount')?.value || 0),
    }));
  });
  item.line_items = nextLines;
  syncItemAmountFromLines(item);
  recalcRowAmount(row);
  mirrorDraftToState();
}

/**
 * Wire only item editors (slider/name/price) — safe to call after partial rebuild.
 * @param {HTMLElement} container
 * @param {object} ctx
 */
function wireItemEditors(container, ctx) {
  const income = Number(ctx?.income || window.STATE?.budgetDraft?.income || 0);

  container.querySelectorAll('.bli-item').forEach((itemEl) => {
    if (itemEl.dataset.wired === '1') return;
    itemEl.dataset.wired = '1';

    const nameInput = itemEl.querySelector('.bli-item-name');
    const priceInput = itemEl.querySelector('.bli-item-price');
    const slider = itemEl.querySelector('.bli-item-slider');
    const block = itemEl.closest('.budget-list-block');
    const budgetId = block?.dataset.budgetId;
    const itemId = itemEl.dataset.itemId;

    const applyToDraft = (patch, { allowZero = true } = {}) => {
      const row = getDraftRows().find((r) => r.id === budgetId);
      if (!row) return null;
      ensureRowItems(row);
      const item = row.items.find((i) => i.id === itemId);
      if (!item) return null;
      if (hasActiveLineItems(item)) return row;
      if (patch.price !== undefined) {
        let price = Number(patch.price);
        if (!Number.isFinite(price)) return row;
        if (!allowZero && price === 0 && String(patch.raw || '') === '') {
          return row; // keep previous while typing
        }
        const lim = getItemAllocationLimit(income, getDraftRows(), budgetId, itemId);
        // lim.max already includes current; clamp against room
        const othersTotal = getDraftRows().reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0) - getItemTotalAmount(item);
        const hardMax = Math.max(0, Number(income || 0) - othersTotal);
        price = Math.max(0, Math.min(price, hardMax));
        patch = { ...patch, price, qty: 1 };
        delete patch.raw;
      }
      Object.assign(item, patch);
      recalcRowAmount(row);
      mirrorDraftToState();
      return row;
    };

    const syncSummaryLabels = (row) => {
      const item = row?.items?.find((i) => i.id === itemId);
      if (!item) return;
      const nameEl = itemEl.querySelector('.bli-item__name');
      const amtEl = itemEl.querySelector('.bli-item__amt');
      const amt = Math.round(getItemTotalAmount(item));
      const lineMode = hasActiveLineItems(item);
      if (nameEl) nameEl.textContent = item.name?.trim() || 'Item baru';
      if (amtEl) amtEl.textContent = `Rp ${formatIDR(amt)}`;
      const manualRow = itemEl.querySelector('[data-role="manual-amount"]');
      manualRow?.classList.toggle('is-locked', lineMode);
      if (slider) {
        slider.disabled = lineMode;
        if (!lineMode) {
          const lim = getItemAllocationLimit(income, getDraftRows(), budgetId, itemId);
          slider.max = String(Math.max(lim.max, amt, 1000));
          slider.value = String(Math.min(amt, Number(slider.max)));
        }
      }
      if (priceInput) {
        priceInput.readOnly = lineMode;
        priceInput.value = String(amt);
        if (!lineMode) {
          const lim = getItemAllocationLimit(income, getDraftRows(), budgetId, itemId);
          priceInput.max = slider?.max || String(lim.max);
        }
      }
      const breakdownSum = itemEl.querySelector('.bli-breakdown__sum');
      if (breakdownSum && lineMode) {
        breakdownSum.textContent = `Rp ${formatIDR(amt)}`;
      }
      const derivedEl = itemEl.querySelector('[data-role="derived-total"] strong');
      if (derivedEl) derivedEl.textContent = `Rp ${formatIDR(amt)}`;
      const cap = itemEl.querySelector('[data-role="item-cap"]');
      if (cap && !lineMode) {
        const lim = getItemAllocationLimit(income, getDraftRows(), budgetId, itemId);
        cap.innerHTML = `Maks. Rp ${formatIDR(Number(slider?.max || lim.max))} <span class="bli-item-cap__remain ${lim.remaining < 0 ? 'over' : ''}">· Sisa alokasi Rp ${formatIDR(Math.max(0, lim.remaining))}</span>`;
      }
    };

    const syncLinesAndRefresh = () => {
      beginEditGesture();
      syncLinesFromDom(itemEl, budgetId, itemId);
      const row = getDraftRows().find((r) => r.id === budgetId);
      syncSummaryLabels(row);
      syncLiveDashboard(container, income);
      syncToolbarState(container);
    };

    nameInput?.addEventListener('focus', beginEditGesture);
    priceInput?.addEventListener('focus', beginEditGesture);
    slider?.addEventListener('pointerdown', beginEditGesture);

    nameInput?.addEventListener('input', () => {
      beginEditGesture();
      const row = applyToDraft({ name: nameInput.value });
      syncSummaryLabels(row);
      syncLiveDashboard(container, income);
    });
    nameInput?.addEventListener('change', () => commitEditGesture('Edit nama item'));
    nameInput?.addEventListener('blur', () => commitEditGesture('Edit nama item'));

    const syncFromPrice = () => {
      beginEditGesture();
      const raw = priceInput?.value;
      if (raw === '' || raw === null || raw === undefined) {
        // Don't wipe draft to 0 while user clears the field to type a new number
        return;
      }
      const v = Math.max(0, Number(raw || 0));
      const row = applyToDraft({ price: v, raw });
      if (slider && row) {
        const item = row.items.find((i) => i.id === itemId);
        const amt = item ? Number(item.price || 0) : v;
        if (amt > Number(slider.max)) slider.max = String(amt);
        slider.value = String(amt);
        if (priceInput) priceInput.value = String(amt);
      }
      syncSummaryLabels(row);
      syncLiveDashboard(container, income);
      syncToolbarState(container);
    };
    const syncFromSlider = () => {
      beginEditGesture();
      const v = Number(slider?.value || 0);
      if (priceInput) priceInput.value = String(v);
      const row = applyToDraft({ price: v });
      syncSummaryLabels(row);
      syncLiveDashboard(container, income);
      syncToolbarState(container);
    };

    priceInput?.addEventListener('input', syncFromPrice);
    priceInput?.addEventListener('change', () => {
      syncFromPrice();
      commitEditGesture('Edit nominal item');
    });
    priceInput?.addEventListener('blur', () => {
      if (priceInput.value === '') {
        const row = getDraftRows().find((r) => r.id === budgetId);
        const item = row?.items?.find((i) => i.id === itemId);
        if (item) priceInput.value = String(Math.round(Number(item.price || 0)));
      }
      commitEditGesture('Edit nominal item');
    });
    slider?.addEventListener('input', syncFromSlider);
    slider?.addEventListener('change', () => commitEditGesture('Edit nominal item'));

    itemEl.querySelectorAll('.bli-line-name, .bli-line-qty, .bli-line-amount').forEach((input) => {
      input.addEventListener('focus', beginEditGesture);
      input.addEventListener('input', syncLinesAndRefresh);
      input.addEventListener('change', () => commitEditGesture('Edit rincian item'));
      input.addEventListener('blur', () => commitEditGesture('Edit rincian item'));
    });
    itemEl.querySelectorAll('.bli-line-unit').forEach((select) => {
      select.addEventListener('focus', beginEditGesture);
      select.addEventListener('change', () => {
        syncLinesAndRefresh();
        commitEditGesture('Edit rincian item');
      });
    });
  });
}

/**
 * Open item detail modal (double-click on item row).
 * @param {HTMLElement} container
 * @param {object} ctx
 * @param {string} budgetId
 * @param {string} itemId
 */
async function openBudgetItemDetailModal(container, ctx, budgetId, itemId) {
  const itemEl = container.querySelector(`.bli-item[data-item-id="${CSS.escape(itemId)}"]`);
  if (itemEl) syncLinesFromDom(itemEl, budgetId, itemId);

  const row = getDraftRows().find((r) => r.id === budgetId);
  const item = row?.items?.find((i) => i.id === itemId);
  if (!row || !item) return;

  const month = ctx.month || resolveBudgetMonth();
  const transactions = ctx.transactions?.length ? ctx.transactions : resolveMonthTransactions(month);
  const income = Number(ctx.income || window.STATE?.budgetDraft?.income || 0);

  const { showBudgetItemDetailModal } = await import('./budget-item-detail-modal.js');
  showBudgetItemDetailModal({
    budgetId,
    itemId,
    month,
    budgetRow: row,
    item,
    transactions,
    onSave: async (patch) => {
      beginEditGesture();
      const liveRow = getDraftRows().find((r) => r.id === budgetId);
      const liveItem = liveRow?.items?.find((i) => i.id === itemId);
      if (!liveItem) return;
      Object.assign(liveItem, patch);
      recalcRowAmount(liveRow);
      mirrorDraftToState();
      await commitEditGesture('Edit detail item');
      applyExpandDom(container, ctx, { rebuildItems: true });
      syncLiveDashboard(container, income);
      syncToolbarState(container);
      import('../services/notification-center.js').then((m) => m.refreshNotifications()).catch(() => {});
    },
  });
}

/**
 * Accordion + inline item editing.
 * @param {HTMLElement} container
 * @param {object} ctx
 */
function wireListInteractions(container, ctx) {
  _pageCtx = ctx;

  const listEl = container.querySelector('#budget-list-content');
  if (listEl) {
    listEl.onclick = (e) => {
      const action = e.target.closest?.('[data-action="toggle-budget"], [data-action="toggle-item"], [data-action="add-item"], [data-action="delete-item"], [data-action="toggle-breakdown"], [data-action="add-line-item"], [data-action="delete-line-item"]');
      if (!action) return;
      handleBudgetListClick(e, container);
    };
  }

  if (!_docListClickWired) {
    _docListClickWired = true;
    document.addEventListener('click', (e) => {
      const root = document.getElementById('budgetPageRoot');
      const inBudget = !!(root && !root.classList.contains('hidden') && root.contains(e.target));
      if (!inBudget) return;
      const action = e.target.closest?.('[data-action="toggle-budget"], [data-action="toggle-item"], [data-action="add-item"], [data-action="delete-item"], [data-action="toggle-breakdown"], [data-action="add-line-item"], [data-action="delete-line-item"]');
      if (!action) return;
      handleBudgetListClick(e, root);
    }, true);
  }

  if (!_docItemDblClickWired) {
    _docItemDblClickWired = true;
    document.addEventListener('dblclick', (e) => {
      const root = document.getElementById('budgetPageRoot');
      if (!root || root.classList.contains('hidden') || !root.contains(e.target)) return;
      if (e.target.closest?.('[data-drag-type], [data-action="delete-item"], .bli-line-row, .bli-item-name, .bli-item-price, .bli-item-slider')) return;

      const summary = e.target.closest?.('.bli-item__summary, .bli-item__name, .bli-item__amt');
      const itemEl = summary?.closest('.bli-item') || e.target.closest?.('.bli-item');
      if (!itemEl) return;

      const block = itemEl.closest('.budget-list-block');
      const itemId = itemEl.dataset.itemId;
      const budgetId = block?.dataset.budgetId;
      if (!itemId || !budgetId) return;

      e.preventDefault();
      e.stopPropagation();
      const ctx = _pageCtx;
      if (!ctx) return;
      openBudgetItemDetailModal(root, ctx, budgetId, itemId);
    }, true);
  }

  wireAddItemButtons(container, ctx);
  wireItemEditors(container, ctx);
  syncToolbarState(container);
}

/**
 * Render full budget page into container.
 * @param {HTMLElement} container
 * @param {object} ctx
 */
export async function renderBudgetPage(container, ctx) {
  if (!container) return;

  const {
    month: ctxMonth,
    rows: rawRows,
    income: ctxIncome,
    transactions: ctxTransactions,
    onRefresh,
    onSave,
  } = ctx;

  const filter = getFilter();
  const periodMonth = window.STATE?.period?.end
    ? String(window.STATE.period.end).slice(0, 7)
    : null;
  const displayMonth = periodMonth
    || window.STATE?.selectedMonth
    || ctxMonth
    || filter.period
    || (() => {
      const n = new Date();
      return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
    })();

  if (window.STATE) {
    window.STATE.selectedMonth = displayMonth;
    if (window.STATE.budgetDraft) window.STATE.budgetDraft.month = displayMonth;
  }
  try {
    const { syncPeriodFromState } = await import('../services/global-filter.js');
    syncPeriodFromState(displayMonth);
  } catch { /* ignore */ }

  const allTx = Array.isArray(window.STATE?.transactions) && window.STATE.transactions.length
    ? window.STATE.transactions
    : (ctxTransactions || []);
  const monthTransactions = filterMonthExpenses(allTx, displayMonth);

  let rows = computeHistoricalBaselines(rawRows || [], monthTransactions, displayMonth);
  rows = filterBudgets(rows);

  const { getTotalIncome, migrateLegacyIncome, getIncomeSources } = await import('../services/income-source.js');
  const legacy = Number(ctxIncome || 0);
  if (legacy > 0 && legacy !== 5500000) {
    await migrateLegacyIncome(displayMonth, legacy);
  }
  const sources = await getIncomeSources(displayMonth);
  const income = await getTotalIncome(displayMonth);

  mirrorDraftToState(rows, displayMonth, income);

  const currentSort = localStorage.getItem(SORT_KEY) || 'urgent';
  const sourcesLen = sources.length;

  const overBudgetCount = countOverBudgetRows(rows, monthTransactions, displayMonth);
  const criticalCount = countAttentionRows(rows, monthTransactions, displayMonth);

  container.className = 'budget-page-container';

  const allocHtml = renderAllocationStripHtml(income, rows);

  container.innerHTML = `
    <div class="budget-page">
      <header class="budget-page-header">
        <div>
          <h1 class="budget-page-title">Budgeting</h1>
        </div>
        <button type="button" class="budget-page-add tap" data-action="add-budget" aria-label="Tambah budgeting">${Icon('plus', { size: 20 })}</button>
      </header>

      <div class="budget-page-main">
        <div class="budget-page-aside">
          <div id="budget-summary-hero"></div>
          <div id="budget-focus-panel"></div>

          <section class="income-sources-card" data-action="manage-income" role="button" tabindex="0" aria-label="Kelola budget income">
            <div class="isc-header">
              <button type="button" class="isc-month-trigger tap" data-action="open-filter" aria-label="Pilih periode budgeting">
                <span class="isc-title-icon">${Icon('wallet', { size: 16 })}</span>
                <span class="isc-title-text">Budget Income</span>
                <span class="isc-month-pill">
                  ${formatMonthLabel(displayMonth)}
                  ${Icon('chevronDown', { size: 12 })}
                </span>
              </button>
              <span class="isc-edit" aria-hidden="true">
                Kelola ${Icon('chevronRight', { size: 12 })}
              </span>
            </div>
            <div class="isc-amount">Rp ${formatIDR(income)}</div>
            <div class="isc-hint">${sourcesLen === 0 ? 'Belum ada sumber income — tap untuk menambah' : `${sourcesLen} sumber income`}</div>
          </section>

          <div class="budget-alloc-mobile-only" data-role="alloc-host-mobile">
            ${allocHtml}
          </div>
        </div>

        <div class="budget-page-list-col">
          <div class="budget-alloc-list-top" data-role="alloc-host">
            ${allocHtml}
          </div>

          <section class="budget-list-card budget-page-list">
            <div class="blc-header">
              <div class="blc-header-top">
                <h3 class="blc-title">
                  ${Icon('target', { size: 16 })}
                  Daftar Budgeting
                  <span class="blc-count">(${rows.length})</span>
                </h3>
                <div class="blc-header-actions">
                  <div class="blc-toolbar" role="toolbar" aria-label="Aksi daftar budget">
                    <button type="button" class="blc-tool tap" data-action="toolbar-undo" title="Undo" aria-label="Undo">${Icon('undo', { size: 15 })}</button>
                    <button type="button" class="blc-tool tap" data-action="toolbar-redo" title="Redo" aria-label="Redo">${Icon('redo', { size: 15 })}</button>
                    <button type="button" class="blc-tool blc-tool-save tap" data-action="toolbar-save" title="Simpan" aria-label="Simpan">${Icon('save', { size: 15 })}</button>
                    <button type="button" class="blc-tool tap" data-action="toolbar-cancel" title="Batalkan" aria-label="Batalkan">${Icon('x', { size: 15 })}</button>
                    <span class="blc-tool-sep" aria-hidden="true"></span>
                    <button type="button" class="blc-tool tap" data-action="toolbar-duplicate" title="Duplikat" aria-label="Duplikat">${Icon('copy', { size: 15 })}</button>
                    <button type="button" class="blc-tool danger tap" data-action="toolbar-delete" title="Hapus item terpilih" aria-label="Hapus item terpilih">${Icon('trash', { size: 15 })}</button>
                    <button type="button" class="blc-tool tap" data-action="toolbar-add" title="Tambah" aria-label="Tambah">${Icon('plus', { size: 15 })}</button>
                    <button type="button" class="blc-tool tap" data-action="toolbar-auto" title="Auto Budget" aria-label="Auto Budget">${Icon('wand', { size: 15 })}</button>
                    <button type="button" class="blc-tool tap" data-action="toolbar-template" title="Template" aria-label="Template">${Icon('template', { size: 15 })}</button>
                    <span class="blc-tool-sep" aria-hidden="true"></span>
                    <div class="blc-sort-wrap">
                      <button type="button" class="blc-tool tap" data-action="toolbar-sort" title="Urutkan: ${escapeHtml(SORT_LABELS[currentSort] || 'Urgent')}" aria-label="Urutkan" aria-haspopup="menu" aria-expanded="false">
                        ${Icon('sort', { size: 15 })}
                      </button>
                      <div class="blc-sort-menu" id="budget-sort-menu" role="menu" hidden>
                        ${Object.entries(SORT_LABELS).map(([value, label]) => `
                          <button type="button" class="blc-sort-option ${currentSort === value ? 'is-active' : ''}" role="menuitem" data-sort="${value}">
                            ${escapeHtml(label)}
                          </button>
                        `).join('')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              ${filter.priority !== 'all' ? `
                <div class="blc-filter-active">
                  ${Icon('filter', { size: 12 })}
                  <span>Filter: Prioritas ${PRIORITY_LEVELS[filter.priority.toUpperCase()]?.label || filter.priority}</span>
                </div>
              ` : ''}
            </div>
            <div class="blc-content" id="budget-list-content"></div>
            <div class="blc-footer">
              <button type="button" class="btn-add-budget-full tap" data-action="add-budget">
                ${Icon('plus', { size: 16 })}
                <span>Tambah Budgeting</span>
              </button>
              <button type="button" class="btn-generate-budget tap" data-action="generate-budget">
                ${Icon('wand', { size: 16 })}
                <span>Auto Budget</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;

  const heroEl = container.querySelector('#budget-summary-hero');
  setHeroSnapshot({ month: displayMonth, transactions: monthTransactions, income });
  const { renderBudgetSummaryHero } = await import('./budget-summary-hero.js');
  await renderBudgetSummaryHero(heroEl, {
    rows,
    transactions: monthTransactions,
    month: displayMonth,
    income,
    overBudgetCount,
    criticalCount,
    onEvaluation: async () => {
      const { showEvaluation } = await import('./budget-evaluation.js');
      showEvaluation({ month: displayMonth, rows, transactions: monthTransactions });
    },
  });

  try {
    const { loadUserPreferences } = await import('../services/onboarding-prefs.js');
    await loadUserPreferences();
  } catch { /* ignore */ }

  const focusEl = container.querySelector('#budget-focus-panel');
  const { renderBudgetFocusPanel } = await import('./budget-focus-panel.js');
  renderBudgetFocusPanel(focusEl, {
    rows,
    transactions: monthTransactions,
    month: displayMonth,
    income,
    onModeChange: () => onRefresh?.({ fromSaved: false }),
  });

  const listSection = container.querySelector('#budget-list-content');
  renderBudgetListSection(listSection, rows, monthTransactions, displayMonth, currentSort, income);

  wireHandlers(container, {
    ...ctx,
    month: displayMonth,
    rows,
    income,
    transactions: monthTransactions,
    onSave,
  });

  if (!container.dataset.filterWired) {
    container.dataset.filterWired = '1';
    let lastPeriod = getFilter().period;
    onFilterChange((f) => {
      if (!window.STATE?.ui?.budgetPageOpen) return;
      const periodChanged = f?.period && f.period !== lastPeriod;
      lastPeriod = f?.period || lastPeriod;
      // Period change must reload draft from saved month; priority-only keeps draft
      onRefresh?.({ fromSaved: !!periodChanged });
    });
  }
}

/** @deprecated */
export async function renderBudgetEnhancedSections(container, ctx) {
  return renderBudgetPage(container, ctx);
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetPage = { renderBudgetPage, renderBudgetEnhancedSections };
}

function showPageToast(msg) {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, 'success');
    return;
  }
  if (window.MonefyiUI?.showToast) window.MonefyiUI.showToast(msg, 'success');
  else {
    const t = document.createElement('div');
    t.className = 'action-toast success';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }
}
