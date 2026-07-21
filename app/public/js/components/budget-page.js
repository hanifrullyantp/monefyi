/**
 * Full-page budget UI — summary hero, filter/sort, compact list rows.
 * @module components/budget-page
 */

import {
  PRIORITY_LEVELS,
  calculateProgress,
  computeHistoricalBaselines,
} from '../services/budget-model.js';
import { Icon } from './icons.js';
import { filterBudgets, getFilter, onFilterChange } from '../services/global-filter.js';

const SORT_KEY = 'budget_sort';

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
 * @param {object} budget
 * @param {object[]} transactions
 * @param {string} month
 */
function renderBudgetListRow(budget, transactions, month) {
  const progress = budget._progress || calculateProgress(budget, transactions, month);
  const pl = PRIORITY_LEVELS[(budget.priority || 'penting').toUpperCase()] || PRIORITY_LEVELS.PENTING;
  const statusClass = progress.status === 'over' ? 'over' : progress.status === 'critical' ? 'critical' : progress.status === 'warning' ? 'warning' : '';
  const remaining = progress.remaining;
  const remainingLabel = remaining >= 0
    ? `Sisa: ${formatCompact(remaining)}`
    : `Over ${formatCompact(-remaining)}`;
  const allDone = budget._allDone || isBudgetFullyDone(budget);

  return `
    <button type="button" class="budget-list-row ${statusClass} ${allDone ? 'all-done' : ''}" data-budget-id="${budget.id}">
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
        <div class="budget-list-row__budget">${formatCompact(budget.amount)}</div>
        <span class="budget-list-row__chev">${Icon('chevronRight', { size: 16 })}</span>
      </div>
    </button>
  `;
}

/**
 * @param {object[]} sorted
 * @param {object[]} transactions
 * @param {string} month
 */
function renderGroupedByPriority(sorted, transactions, month) {
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
        ${list.map((b) => renderBudgetListRow(b, transactions, month)).join('')}
      </section>
    `;
  }).join('');
}

/**
 * @param {HTMLElement} section
 * @param {object[]} rows
 * @param {object[]} transactions
 * @param {string} month
 * @param {string} filter
 */
function renderBudgetListSection(section, rows, transactions, month, sort) {
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
    section.innerHTML = renderGroupedByPriority(sorted, transactions, month);
  } else {
    section.innerHTML = `
      <div class="budget-list-flat">
        ${sorted.map((b) => renderBudgetListRow(b, transactions, month)).join('')}
      </div>
    `;
  }
}

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 */
function wireHandlers(container, ctx) {
  const { rows, transactions, month, onRefresh, onSave } = ctx;
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
    showIncomeManagerModal(() => onRefresh?.(), month);
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

  container.querySelector('#budget-sort')?.addEventListener('change', (e) => {
    const sort = e.target.value;
    localStorage.setItem(SORT_KEY, sort);
    const section = container.querySelector('#budget-list-content');
    if (section) renderBudgetListSection(section, rows, transactions, month, sort);
    wireRowClicks(container, ctx);
  });

  container.querySelector('[data-action="add-budget"]')?.addEventListener('click', async () => {
    const { showBudgetFormModal } = await import('./budget-form-modal.js');
    showBudgetFormModal({ priority: 'penting', month }, { onSaved: () => onRefresh?.(), showSummary: false });
  });

  container.querySelector('[data-action="generate-budget"]')?.addEventListener('click', async () => {
    const { showBudgetGeneratorModal } = await import('./budget-generator-modal.js');
    showBudgetGeneratorModal(() => onRefresh?.());
  });

  wireTemplateCard(container, ctx);
  wireRowClicks(container, ctx);

  import('../services/notification-center.js').then((m) => m.refreshNotifications()).catch(() => {});
}

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 */
function wireTemplateCard(container, ctx) {
  const { rows, month, income, onRefresh } = ctx;
  const select = container.querySelector('#budget-template-select');
  const syncActions = () => {
    const id = select?.value || '';
    const builtin = String(id).startsWith('builtin_');
    const editBtn = container.querySelector('[data-action="template-edit"]');
    const delBtn = container.querySelector('[data-action="template-delete"]');
    if (editBtn) editBtn.disabled = !id || builtin;
    if (delBtn) delBtn.disabled = !id || builtin;
  };
  select?.addEventListener('change', syncActions);
  syncActions();

  container.querySelector('[data-action="template-apply"]')?.addEventListener('click', async () => {
    const id = select?.value;
    if (!id) return;
    if (!confirm('Terapkan template ini? Budget bulan ini akan diganti.')) return;
    try {
      const { applyTemplateById } = await import('../services/budget-template.js');
      const applied = await applyTemplateById(id, month);
      if (!applied?.rows?.length) {
        showPageToast('Template kosong atau income belum diisi');
        return;
      }
      if (window.STATE?.budgetDraft) {
        window.STATE.budgetDraft.rows = applied.rows;
        window.STATE.budgetDraft.income = applied.income || income || 0;
        window.STATE.budgetDraft.initialFrom = 'template';
        window.STATE.budgetDraft.month = month;
      }
      showPageToast(`Template "${applied.template_label}" diterapkan — simpan budget untuk persist`);
      // Re-render from draft without reloading saved month (would wipe apply)
      if (typeof window.renderBudgetPageView === 'function') {
        await window.renderBudgetPageView();
      } else {
        onRefresh?.();
      }
    } catch (e) {
      showPageToast('Gagal terapkan: ' + e.message);
    }
  });

  container.querySelector('[data-action="template-save"]')?.addEventListener('click', async () => {
    if (!rows.length) {
      showPageToast('Belum ada budget untuk disimpan');
      return;
    }
    const label = prompt('Nama template', `Template ${formatMonthLabel(month)}`);
    if (label === null) return;
    try {
      const { saveBudgetTemplate } = await import('../services/budget-template.js');
      await saveBudgetTemplate(month, income, rows, { label: label.trim() || `Template ${month}` });
      showPageToast('Template tersimpan');
      onRefresh?.();
    } catch (e) {
      showPageToast('Gagal simpan: ' + e.message);
    }
  });

  container.querySelector('[data-action="template-edit"]')?.addEventListener('click', async () => {
    const id = select?.value;
    if (!id || String(id).startsWith('builtin_')) return;
    const label = prompt('Rename template');
    if (!label?.trim()) return;
    try {
      const { updateBudgetTemplate } = await import('../services/budget-template.js');
      await updateBudgetTemplate(id, { label: label.trim() });
      showPageToast('Template diupdate');
      onRefresh?.();
    } catch (e) {
      showPageToast(e.message);
    }
  });

  container.querySelector('[data-action="template-delete"]')?.addEventListener('click', async () => {
    const id = select?.value;
    if (!id || String(id).startsWith('builtin_')) return;
    if (!confirm('Hapus template ini?')) return;
    try {
      const { deleteBudgetTemplate } = await import('../services/budget-template.js');
      await deleteBudgetTemplate(id);
      showPageToast('Template dihapus');
      onRefresh?.();
    } catch (e) {
      showPageToast(e.message);
    }
  });
}

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 */
function wireRowClicks(container, ctx) {
  const { rows, transactions, month, onRefresh } = ctx;
  container.querySelectorAll('.budget-list-row').forEach((row) => {
    row.onclick = async () => {
      const budget = rows.find((b) => b.id === row.dataset.budgetId);
      if (!budget) return;
      const { showBudgetFormModal } = await import('./budget-form-modal.js');
      showBudgetFormModal(budget, {
        onSaved: () => onRefresh?.(),
        showSummary: true,
        transactions,
        month,
      });
    };
  });
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
  // Source of truth: main period chip (same as "Jun 2026" in header), not stale filter.period
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

  // Keep draft / selected month / global filter in sync with period chip
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
  // Match by YYYY-MM prefix; also accept date objects / ISO timestamps
  const monthTransactions = allTx.filter((t) => {
    const d = String(t.date || '').slice(0, 10);
    return d.startsWith(displayMonth);
  });

  let rows = computeHistoricalBaselines(rawRows || [], monthTransactions, displayMonth);
  rows = filterBudgets(rows);

  const { getTotalIncome, migrateLegacyIncome, getIncomeSources } = await import('../services/income-source.js');
  // Only migrate real legacy income (never 5.5jt mock)
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

  const {
    listBudgetTemplates,
    getActiveTemplateId,
  } = await import('../services/budget-template.js');
  const templates = await listBudgetTemplates();
  const activeId = await getActiveTemplateId();
  const selectedTemplateId = activeId || templates[0]?.id || '';

  const totalBudgeted = rows.reduce((s, b) => s + Math.abs(Number(b.amount || 0)), 0);
  const allocationRemaining = income - totalBudgeted;
  const allocationPct = income > 0 ? Math.min(100, Math.round((totalBudgeted / income) * 100)) : 0;

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
        </div>

        <section class="budget-list-card budget-page-list">
          <div class="blc-header">
            <div class="blc-header-top">
              <h3 class="blc-title">
                ${Icon('target', { size: 16 })}
                Daftar Budgeting
                <span class="blc-count">(${rows.length})</span>
              </h3>
              <select class="blc-sort" id="budget-sort">
                <option value="urgent" ${currentSort === 'urgent' ? 'selected' : ''}>Urgent</option>
                <option value="priority" ${currentSort === 'priority' ? 'selected' : ''}>Prioritas</option>
                <option value="progress" ${currentSort === 'progress' ? 'selected' : ''}>Progress</option>
                <option value="amount" ${currentSort === 'amount' ? 'selected' : ''}>Nominal</option>
                <option value="name" ${currentSort === 'name' ? 'selected' : ''}>Nama</option>
              </select>
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

      <section class="budget-template-card">
        <div class="btc-header">
          <span class="btc-title">${Icon('save', { size: 14 })} Template Budget</span>
        </div>
        <p class="btc-hint">Pilih template bawaan atau simpan setup bulan ini</p>
        <select class="btc-select" id="budget-template-select" aria-label="Pilih template">
          ${templates.map((t) => `
            <option value="${escapeHtml(t.id)}" ${t.id === selectedTemplateId ? 'selected' : ''}>
              ${escapeHtml(t.label)}${t.builtin ? ' (bawaan)' : ''}
            </option>
          `).join('')}
        </select>
        <div class="btc-actions">
          <button type="button" class="btc-btn primary tap" data-action="template-apply">${Icon('check', { size: 14 })} Terapkan</button>
          <button type="button" class="btc-btn tap" data-action="template-save" ${rows.length === 0 ? 'disabled' : ''}>${Icon('save', { size: 14 })} Simpan</button>
          <button type="button" class="btc-btn tap" data-action="template-edit">${Icon('edit', { size: 14 })} Edit</button>
          <button type="button" class="btc-btn danger tap" data-action="template-delete">${Icon('trash', { size: 14 })} Hapus</button>
        </div>
      </section>
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
  renderBudgetListSection(listSection, rows, monthTransactions, displayMonth, currentSort);

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
    onFilterChange(() => {
      if (window.STATE?.ui?.budgetPageOpen) onRefresh?.();
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
  const t = document.createElement('div');
  t.className = 'action-toast success';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
