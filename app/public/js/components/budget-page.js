/**
 * Full-page budget UI — summary hero, accordion list with inline item edit, toolbar.
 * @module components/budget-page
 */

import {
  PRIORITY_LEVELS,
  calculateProgress,
  computeHistoricalBaselines,
  createBudgetItem,
  createBudgetRow,
} from '../services/budget-model.js';
import { Icon } from './icons.js';
import { filterBudgets, getFilter, onFilterChange } from '../services/global-filter.js';

const SORT_KEY = 'budget_sort';

const SORT_LABELS = {
  urgent: 'Urgent',
  priority: 'Prioritas',
  progress: 'Progress',
  amount: 'Nominal',
  name: 'Nama',
};

/** @type {string|null} */
let _expandedBudgetId = null;
/** @type {string|null} */
let _expandedItemId = null;
/** @type {string|null} */
let _selectedBudgetId = null;
/** @type {object[]|null} */
let _editBeforeRows = null;

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
  if (item) current = Math.round(Number(item.qty || 1) * Number(item.price || 0));
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
  const isDone = item.status === 'done' || item.status === 'skipped';
  const amount = Math.round(Number(item.qty || 1) * Number(item.price || 0));
  const sliderMax = Math.max(Number(limits.max || 0), amount, 1000);
  const remaining = Number(limits.remaining ?? 0);
  const label = item.name?.trim() || 'Item baru';

  return `
    <div class="bli-item ${expanded ? 'is-expanded' : ''} ${isDone ? 'item-done' : ''}" data-item-id="${escapeHtml(item.id)}" data-expanded="${expanded ? 'true' : 'false'}">
      <button type="button" class="bli-item__summary tap" data-action="toggle-item" aria-expanded="${expanded ? 'true' : 'false'}">
        <span class="bli-item__name">${escapeHtml(label)}</span>
        <span class="bli-item__amt">Rp ${formatIDR(amount)}</span>
        <span class="bli-item__chev">${Icon('chevronDown', { size: 14 })}</span>
      </button>
      <div class="bli-item__detail ${expanded ? '' : 'hidden'}">
        <input type="text" class="bli-item-name form-input" placeholder="Nama detail item" value="${escapeHtml(item.name || '')}" aria-label="Nama item">
        <div class="bli-item-amount-row">
          <input type="range" class="bli-item-slider" min="0" max="${sliderMax}" step="1000" value="${Math.min(amount, sliderMax)}" aria-label="Slider jumlah">
          <div class="bli-inline-amount">
            <span>Rp</span>
            <input type="number" class="bli-item-price form-input" min="0" max="${sliderMax}" step="1000" value="${amount || ''}" inputmode="numeric" aria-label="Jumlah">
          </div>
        </div>
        <div class="bli-item-cap" data-role="item-cap">
          Maks. Rp ${formatIDR(sliderMax)}
          <span class="bli-item-cap__remain ${remaining < 0 ? 'over' : ''}">· Sisa alokasi Rp ${formatIDR(Math.max(0, remaining))}</span>
        </div>
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
  return window.STATE?.budgetDraft?.rows || [];
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
  row.amount = row.items.reduce((s, i) => s + Number(i.qty || 1) * Number(i.price || 0), 0);
  row.items.forEach((i) => {
    i.subtotal = Number(i.qty || 1) * Number(i.price || 0);
  });
}

function beginEditGesture() {
  if (!_editBeforeRows && window.STATE?.budgetDraft) {
    _editBeforeRows = JSON.parse(JSON.stringify(window.STATE.budgetDraft.rows || []));
  }
}

async function commitEditGesture(label = 'Edit item budget') {
  if (!_editBeforeRows || !window.STATE?.budgetDraft) return;
  try {
    const { recordBudgetRowsChange } = await import('../services/budget-changes-tracker.js');
    recordBudgetRowsChange(label, _editBeforeRows, window.STATE.budgetDraft.rows);
  } catch { /* ignore */ }
  _editBeforeRows = null;
  syncToolbarState(document.getElementById('budgetPageRoot'));
}

/**
 * Live-update allocation strip + row amounts without full re-render.
 * @param {HTMLElement} container
 * @param {number} income
 */
function syncLiveDashboard(container, income) {
  const liveIncome = Number(window.STATE?.budgetDraft?.income || income || 0);
  const rows = getDraftRows();
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

  scheduleHeroRefresh(container, liveIncome, rows);
}

let _heroTimer = null;
/**
 * @param {HTMLElement} container
 * @param {number} income
 * @param {object[]} rows
 */
function scheduleHeroRefresh(container, income, rows) {
  if (_heroTimer) clearTimeout(_heroTimer);
  _heroTimer = setTimeout(async () => {
    const heroEl = container.querySelector('#budget-summary-hero');
    if (!heroEl) return;
    const month = window.STATE?.budgetDraft?.month
      || window.STATE?.selectedMonth
      || '';
    const allTx = window.STATE?.transactions || [];
    const monthTransactions = allTx.filter((t) => String(t.date || '').slice(0, 10).startsWith(month));
    try {
      const { renderBudgetSummaryHero } = await import('./budget-summary-hero.js');
      const overBudgetCount = rows.filter((b) => calculateProgress(b, monthTransactions, month).status === 'over').length;
      const criticalCount = rows.filter((b) => {
        const s = calculateProgress(b, monthTransactions, month).status;
        return s === 'critical' || s === 'warning';
      }).length;
      await renderBudgetSummaryHero(heroEl, {
        rows,
        transactions: monthTransactions,
        month,
        income,
        overBudgetCount,
        criticalCount,
        onEvaluation: async () => {
          const { showEvaluation } = await import('./budget-evaluation.js');
          showEvaluation({ month, rows, transactions: monthTransactions });
        },
      });
    } catch (e) {
      console.warn('[budget] hero refresh', e);
    }
  }, 180);
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
  if (undoBtn) undoBtn.disabled = !canUndo;
  if (redoBtn) redoBtn.disabled = !canRedo;
  if (saveBtn) saveBtn.disabled = false;
  if (cancelBtn) cancelBtn.disabled = !dirty && !canUndo;
  const hasSelection = !!(_selectedBudgetId || _expandedBudgetId);
  container.querySelectorAll('[data-action="toolbar-duplicate"], [data-action="toolbar-delete"]').forEach((btn) => {
    btn.disabled = !hasSelection;
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

  const sortBtn = container.querySelector('[data-action="toolbar-sort"]');
  const sortMenu = container.querySelector('#budget-sort-menu');
  const applySort = (sort) => {
    localStorage.setItem(SORT_KEY, sort);
    if (sortBtn) sortBtn.title = `Urutkan: ${SORT_LABELS[sort] || sort}`;
    sortMenu?.querySelectorAll('.blc-sort-option').forEach((opt) => {
      opt.classList.toggle('is-active', opt.dataset.sort === sort);
    });
    const section = container.querySelector('#budget-list-content');
    const liveRows = getDraftRows().length ? getDraftRows() : rows;
    if (section) renderBudgetListSection(section, liveRows, transactions, month, sort, income);
    wireListInteractions(container, ctx);
  };
  sortBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = sortMenu?.hasAttribute('hidden');
    if (open) {
      sortMenu.removeAttribute('hidden');
      sortBtn.setAttribute('aria-expanded', 'true');
    } else {
      sortMenu.setAttribute('hidden', '');
      sortBtn.setAttribute('aria-expanded', 'false');
    }
  });
  sortMenu?.querySelectorAll('[data-sort]').forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      applySort(opt.dataset.sort);
      sortMenu.setAttribute('hidden', '');
      sortBtn?.setAttribute('aria-expanded', 'false');
    });
  });
  if (!container.dataset.sortOutsideWired) {
    container.dataset.sortOutsideWired = '1';
    document.addEventListener('click', (e) => {
      if (!container.isConnected) return;
      const wrap = container.querySelector('.blc-sort-wrap');
      const menu = container.querySelector('#budget-sort-menu');
      const btn = container.querySelector('[data-action="toolbar-sort"]');
      if (!menu || menu.hasAttribute('hidden')) return;
      if (wrap?.contains(e.target)) return;
      menu.setAttribute('hidden', '');
      btn?.setAttribute('aria-expanded', 'false');
    });
  }

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
 * @param {HTMLElement} container
 * @param {object} ctx
 */
function wireToolbar(container, ctx) {
  const { month, onRefresh, onSave } = ctx;

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

  container.querySelector('[data-action="toolbar-undo"]')?.addEventListener('click', async () => {
    const { undo } = await import('../services/budget-changes-tracker.js');
    await undo();
    syncToolbarState(container);
  });

  container.querySelector('[data-action="toolbar-redo"]')?.addEventListener('click', async () => {
    const { redo } = await import('../services/budget-changes-tracker.js');
    await redo();
    syncToolbarState(container);
  });

  container.querySelector('[data-action="toolbar-save"]')?.addEventListener('click', async () => {
    await commitEditGesture('Edit item budget');
    if (typeof onSave === 'function') await onSave();
    else if (typeof window.handleSaveBudget === 'function') await window.handleSaveBudget();
  });

  container.querySelector('[data-action="toolbar-cancel"]')?.addEventListener('click', async () => {
    if (!confirm('Batalkan semua perubahan yang belum disimpan?')) return;
    _expandedBudgetId = null;
    _expandedItemId = null;
    _editBeforeRows = null;
    await onRefresh?.({ fromSaved: true });
  });

  container.querySelector('[data-action="toolbar-duplicate"]')?.addEventListener('click', async () => {
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
  });

  container.querySelector('[data-action="toolbar-delete"]')?.addEventListener('click', async () => {
    const id = _selectedBudgetId || _expandedBudgetId;
    const draft = window.STATE?.budgetDraft;
    if (!id || !draft?.rows) {
      showPageToast('Pilih kategori budget dulu');
      return;
    }
    if (!confirm('Hapus kategori budget ini?')) return;
    const before = JSON.parse(JSON.stringify(draft.rows));
    draft.rows = draft.rows.filter((r) => r.id !== id);
    if (_expandedBudgetId === id) _expandedBudgetId = null;
    if (_selectedBudgetId === id) _selectedBudgetId = null;
    if (_expandedItemId) _expandedItemId = null;
    try {
      const { recordBudgetRowsChange } = await import('../services/budget-changes-tracker.js');
      recordBudgetRowsChange('Hapus budget', before, draft.rows);
    } catch { /* ignore */ }
    showPageToast('Kategori dihapus');
    await refreshFromDraft(ctx);
  });

  container.querySelector('[data-action="toolbar-template"]')?.addEventListener('click', async () => {
    const { showBudgetTemplateModal } = await import('./budget-template-modal.js');
    const liveRows = getDraftRows().length ? getDraftRows() : (ctx.rows || []);
    await showBudgetTemplateModal({
      month,
      income: Number(ctx.income || window.STATE?.budgetDraft?.income || 0),
      rows: liveRows,
      onApplied: () => refreshFromDraft(ctx),
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
 * Wire only item editors (slider/name/price) — safe to call after partial rebuild.
 * @param {HTMLElement} container
 * @param {object} ctx
 */
function wireItemEditors(container, ctx) {
  const income = Number(ctx?.income || window.STATE?.budgetDraft?.income || 0);

  container.querySelectorAll('.bli-item').forEach((itemEl) => {
    if (itemEl.dataset.wired === '1') return;
    itemEl.dataset.wired = '1';

    const summary = itemEl.querySelector('[data-action="toggle-item"]');
    summary?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const itemId = itemEl.dataset.itemId;
      const block = itemEl.closest('.budget-list-block');
      const budgetId = block?.dataset.budgetId;
      _selectedBudgetId = budgetId || _selectedBudgetId;
      _expandedBudgetId = budgetId || _expandedBudgetId;
      _expandedItemId = _expandedItemId === itemId ? null : itemId;
      applyExpandDom(container, ctx, { rebuildItems: false });
    });

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
      if (patch.price !== undefined) {
        let price = Number(patch.price);
        if (!Number.isFinite(price)) return row;
        if (!allowZero && price === 0 && String(patch.raw || '') === '') {
          return row; // keep previous while typing
        }
        const lim = getItemAllocationLimit(income, getDraftRows(), budgetId, itemId);
        // lim.max already includes current; clamp against room
        const othersTotal = getDraftRows().reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0) - (Number(item.qty || 1) * Number(item.price || 0));
        const hardMax = Math.max(0, Number(income || 0) - othersTotal);
        price = Math.max(0, Math.min(price, hardMax));
        patch = { ...patch, price, qty: 1 };
        delete patch.raw;
      }
      Object.assign(item, patch);
      recalcRowAmount(row);
      return row;
    };

    const syncSummaryLabels = (row) => {
      const item = row?.items?.find((i) => i.id === itemId);
      if (!item) return;
      const nameEl = itemEl.querySelector('.bli-item__name');
      const amtEl = itemEl.querySelector('.bli-item__amt');
      const amt = Math.round(Number(item.qty || 1) * Number(item.price || 0));
      if (nameEl) nameEl.textContent = item.name?.trim() || 'Item baru';
      if (amtEl) amtEl.textContent = `Rp ${formatIDR(amt)}`;
      const lim = getItemAllocationLimit(income, getDraftRows(), budgetId, itemId);
      if (slider) {
        slider.max = String(Math.max(lim.max, amt, 1000));
        slider.value = String(Math.min(amt, Number(slider.max)));
      }
      if (priceInput) {
        priceInput.max = slider?.max || String(lim.max);
      }
      const cap = itemEl.querySelector('[data-role="item-cap"]');
      if (cap) {
        cap.innerHTML = `Maks. Rp ${formatIDR(Number(slider?.max || lim.max))} <span class="bli-item-cap__remain ${lim.remaining < 0 ? 'over' : ''}">· Sisa alokasi Rp ${formatIDR(Math.max(0, lim.remaining))}</span>`;
      }
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
  });
}

/**
 * Accordion + inline item editing.
 * @param {HTMLElement} container
 * @param {object} ctx
 */
function wireListInteractions(container, ctx) {
  container.querySelectorAll('[data-action="toggle-budget"]').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      const id = btn.dataset.budgetId;
      _selectedBudgetId = id;
      _expandedBudgetId = _expandedBudgetId === id ? null : id;
      if (_expandedBudgetId !== id) _expandedItemId = null;
      const row = getDraftRows().find((r) => r.id === id);
      if (row) ensureRowItems(row);
      applyExpandDom(container, ctx, { rebuildItems: true });
    };
  });

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
  const monthTransactions = allTx.filter((t) => {
    const d = String(t.date || '').slice(0, 10);
    return d.startsWith(displayMonth);
  });

  let rows = computeHistoricalBaselines(rawRows || [], monthTransactions, displayMonth);
  rows = filterBudgets(rows);

  const { getTotalIncome, migrateLegacyIncome, getIncomeSources } = await import('../services/income-source.js');
  const legacy = Number(ctxIncome || 0);
  if (legacy > 0 && legacy !== 5500000) {
    await migrateLegacyIncome(displayMonth, legacy);
  }
  const sources = await getIncomeSources(displayMonth);
  const income = await getTotalIncome(displayMonth);

  if (window.STATE?.budgetDraft) {
    window.STATE.budgetDraft.income = income;
  }

  const currentSort = localStorage.getItem(SORT_KEY) || 'urgent';
  const sourcesLen = sources.length;

  const overBudgetCount = rows.filter((b) => calculateProgress(b, monthTransactions, displayMonth).status === 'over').length;
  const criticalCount = rows.filter((b) => {
    const s = calculateProgress(b, monthTransactions, displayMonth).status;
    return s === 'critical' || s === 'warning';
  }).length;

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
                    <button type="button" class="blc-tool tap" data-action="toolbar-save" title="Simpan" aria-label="Simpan">${Icon('save', { size: 15 })}</button>
                    <button type="button" class="blc-tool tap" data-action="toolbar-cancel" title="Batalkan" aria-label="Batalkan">${Icon('x', { size: 15 })}</button>
                    <span class="blc-tool-sep" aria-hidden="true"></span>
                    <button type="button" class="blc-tool tap" data-action="toolbar-duplicate" title="Duplikat" aria-label="Duplikat">${Icon('copy', { size: 15 })}</button>
                    <button type="button" class="blc-tool danger tap" data-action="toolbar-delete" title="Hapus" aria-label="Hapus">${Icon('trash', { size: 15 })}</button>
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
