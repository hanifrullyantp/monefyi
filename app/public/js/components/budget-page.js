/**
 * Full-page budget UI — summary hero, filter/sort, compact list rows.
 * @module components/budget-page
 */

import {
  PRIORITY_LEVELS,
  calculatePriorityTotals,
  calculateProgress,
  computeHistoricalBaselines,
} from '../services/budget-model.js';

const FILTER_KEY = 'monefyi_budget_filter';

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
      <div class="budget-list-row__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18"/></svg>
      </div>
      <div class="budget-list-row__main">
        <div class="budget-list-row__title">
          ${escapeHtml(budget.name)}
          ${allDone ? '<span class="done-badge">✓ Selesai</span>' : ''}
        </div>
        <div class="budget-list-row__sub ${remaining < 0 ? 'over' : ''}">${remainingLabel}</div>
        <div class="budget-list-row__track">
          <div class="budget-list-row__fill ${statusClass}" style="width:${Math.min(progress.percentUsed, 100)}%"></div>
        </div>
      </div>
      <div class="budget-list-row__right">
        <div class="budget-list-row__pct">${progress.percentUsed}%</div>
        <div class="budget-list-row__budget">${formatCompact(budget.amount)}</div>
        <svg class="budget-list-row__chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
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
function renderBudgetListSection(section, rows, transactions, month, filter) {
  const sorted = sortBudgets(rows, transactions, month, filter);
  if (!sorted.length) {
    section.innerHTML = '<div class="budget-list-empty">Belum ada budget. Tap + untuk tambah.</div>';
    return;
  }

  if (filter === 'priority') {
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
 * @param {Record<string, object>} priorityTotals
 * @param {object[]} transactions
 * @param {string} month
 * @param {number} totalBudget
 */
function renderPriorityStackBar(priorityTotals, transactions, month, totalBudget) {
  const segments = Object.values(PRIORITY_LEVELS).map((pl) => {
    const data = priorityTotals[pl.key] || { amount: 0, budgets: [] };
    const widthPct = totalBudget > 0 ? (data.amount / totalBudget) * 100 : 0;
    return { pl, data, widthPct };
  }).filter((s) => s.widthPct > 0.5);

  if (!segments.length) {
    return '<div class="priority-stack-empty">Belum ada alokasi budget</div>';
  }

  const bar = segments.map(({ pl, widthPct }) => `
    <div class="priority-stack-segment" style="width:${widthPct}%;background:${pl.color}" title="${pl.label}"></div>
  `).join('');

  const legend = Object.values(PRIORITY_LEVELS).map((pl) => {
    const data = priorityTotals[pl.key] || { amount: 0, count: 0, percentOfIncome: 0 };
    if (!data.count && !data.amount) return '';
    return `
      <span class="priority-legend-item">
        <span class="priority-legend-dot" style="background:${pl.color}"></span>
        ${pl.label} ${data.percentOfIncome}%
      </span>
    `;
  }).filter(Boolean).join('');

  return `
    <button type="button" class="priority-stack-wrap tap" data-action="allocation-detail" aria-label="Detail alokasi prioritas">
      <div class="priority-stack-bar">${bar}</div>
      <div class="priority-stack-legend">${legend}</div>
    </button>
  `;
}

/**
 * @param {Record<string, object>} priorityTotals
 * @param {object[]} transactions
 * @param {string} month
 * @param {number} income
 */
function showAllocationDetail(priorityTotals, transactions, month, income) {
  const existing = document.querySelector('.allocation-detail-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'allocation-detail-overlay';
  overlay.innerHTML = `
    <div class="allocation-detail-sheet">
      <header class="allocation-detail-head">
        <h3>Alokasi Prioritas</h3>
        <button type="button" class="close-btn" data-action="close">✕</button>
      </header>
      <div class="allocation-detail-body">
        ${Object.values(PRIORITY_LEVELS).map((pl) => {
          const data = priorityTotals[pl.key] || { amount: 0, percentOfIncome: 0, budgets: [] };
          const spent = groupTotals(data.budgets || [], transactions, month).spent;
          return `
            <div class="allocation-detail-row">
              <div class="allocation-detail-row__label">
                <span style="color:${pl.color}">${pl.icon}</span> ${pl.label}
              </div>
              <div class="allocation-detail-row__vals">
                <div><span>Budget</span><strong>Rp ${formatIDR(data.amount)}</strong></div>
                <div><span>Realisasi</span><strong>Rp ${formatIDR(spent)}</strong></div>
                <div><span>% Income</span><strong>${data.percentOfIncome}%</strong></div>
              </div>
            </div>
          `;
        }).join('')}
        <div class="allocation-detail-footer">
          <div>Total budget: Rp ${formatIDR(Object.values(priorityTotals).reduce((s, p) => s + p.amount, 0))}</div>
          <div>Income: Rp ${formatIDR(income)}</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('[data-action="close"]')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 */
function wireHandlers(container, ctx) {
  const { rows, transactions, month, onRefresh, onSave } = ctx;
  const currentFilter = localStorage.getItem(FILTER_KEY) || 'urgent';

  container.querySelector('[data-action="allocation-detail"]')?.addEventListener('click', () => {
    const priorityTotals = calculatePriorityTotals(rows, ctx.income);
    showAllocationDetail(priorityTotals, transactions, month, ctx.income);
  });

  container.querySelector('[data-action="evaluation"]')?.addEventListener('click', async () => {
    const { showEvaluation } = await import('./budget-evaluation.js');
    showEvaluation({ month, rows, transactions });
  });

  container.querySelector('[data-action="save-budget"]')?.addEventListener('click', () => onSave?.());

  container.querySelector('[data-action="manage-income"]')?.addEventListener('click', async () => {
    const { showIncomeManagerModal } = await import('./income-manager.js');
    showIncomeManagerModal(() => onRefresh?.());
  });

  container.querySelector('[data-action="ask-ai"]')?.addEventListener('click', () => {
    if (typeof window.openAdvisorAuto === 'function') window.openAdvisorAuto({ context: 'budget' });
  });

  container.querySelector('#budget-filter')?.addEventListener('change', (e) => {
    const filter = e.target.value;
    localStorage.setItem(FILTER_KEY, filter);
    const section = container.querySelector('#budget-list-inner');
    if (section) renderBudgetListSection(section, rows, transactions, month, filter);
    wireRowClicks(container, ctx);
  });

  container.querySelectorAll('[data-action="add-budget"], [data-action="add-in-priority"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const priority = btn.dataset.priority || 'penting';
      const { showBudgetFormModal } = await import('./budget-form-modal.js');
      showBudgetFormModal({ priority, month }, { onSaved: () => onRefresh?.(), showSummary: false });
    });
  });

  wireRowClicks(container, ctx);

  import('../services/notification-center.js').then((m) => m.refreshNotifications()).catch(() => {});
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
    month,
    rows: rawRows,
    income: ctxIncome,
    transactions,
    onRefresh,
    onSave,
  } = ctx;

  const rows = computeHistoricalBaselines(rawRows || [], transactions || [], month);
  const { getTotalIncome, migrateLegacyIncome, getIncomeSources } = await import('../services/income-source.js');
  await migrateLegacyIncome(month, Number(ctxIncome || 0));
  const sources = await getIncomeSources(month);
  const incomeFromSources = await getTotalIncome(month);
  const income = incomeFromSources > 0 ? incomeFromSources : Number(ctxIncome || 0);

  if (window.STATE?.budgetDraft) {
    window.STATE.budgetDraft.income = income;
  }

  const priorityTotals = calculatePriorityTotals(rows, income);
  const totalBudget = Object.values(priorityTotals).reduce((sum, p) => sum + p.amount, 0);
  const totalSpent = rows.reduce((s, r) => s + calculateProgress(r, transactions, month).spent, 0);
  const usedPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const currentFilter = localStorage.getItem(FILTER_KEY) || 'urgent';
  const sourcesLen = sources.length;

  container.innerHTML = `
    <div class="budget-page">
      <header class="budget-page-header">
        <div>
          <p class="budget-page-kicker">Budgeting</p>
          <h1 class="budget-page-title">Bulan budget: ${formatMonthLabel(month)}</h1>
        </div>
        <button type="button" class="budget-page-add tap" data-action="add-budget" aria-label="Tambah budget">+</button>
      </header>

      <div id="budget-summary-hero"></div>

      <button type="button" class="budget-eval-link tap" data-action="evaluation">
        <span>📊 Evaluasi Bulan</span>
        <span class="budget-eval-link__cta">Lihat detail ›</span>
      </button>

      <section class="budget-allocation-card">
        <div class="budget-allocation-card__head">
          <h2>Alokasi Prioritas</h2>
          <span class="budget-allocation-card__remain ${income - totalBudget < 0 ? 'over' : ''}">
            ${income - totalBudget >= 0
              ? `Sisa alokasi Rp ${formatIDR(income - totalBudget)}`
              : `Over Rp ${formatIDR(-(income - totalBudget))}`}
          </span>
        </div>
        ${renderPriorityStackBar(priorityTotals, transactions, month, totalBudget)}
        <div class="budget-allocation-card__foot">
          <span>Total budget: Rp ${formatIDR(totalBudget)}</span>
          <span>Terpakai: Rp ${formatIDR(totalSpent)} (${usedPct}%)</span>
        </div>
      </section>

      <section class="income-sources-card tap" data-action="manage-income" role="button" tabindex="0">
        <div class="isc-header">
          <div class="isc-title">
            <span class="isc-icon">💰</span>
            <span>Income Bulan Ini</span>
          </div>
          <span class="isc-edit">Kelola →</span>
        </div>
        <div class="isc-amount">Rp ${formatIDR(income)}</div>
        <div class="isc-hint">${sourcesLen === 0 ? 'Belum ada sumber income — tap untuk kelola' : `${sourcesLen} sumber · tap untuk kelola`}</div>
      </section>

      <section class="budget-filter-bar">
        <label class="filter-label" for="budget-filter">Urutkan:</label>
        <select class="filter-select" id="budget-filter">
          <option value="urgent" ${currentFilter === 'urgent' ? 'selected' : ''}>🔥 Urgent</option>
          <option value="priority" ${currentFilter === 'priority' ? 'selected' : ''}>🎯 Prioritas</option>
          <option value="progress" ${currentFilter === 'progress' ? 'selected' : ''}>📊 Progress</option>
          <option value="amount" ${currentFilter === 'amount' ? 'selected' : ''}>💵 Nominal</option>
          <option value="name" ${currentFilter === 'name' ? 'selected' : ''}>🔤 Nama</option>
        </select>
      </section>

      <section class="budget-list-section">
        <h2 class="budget-list-section__title">Daftar Budget (${rows.length})</h2>
        <div id="budget-list-inner"></div>
      </section>

      <div class="budget-page-footer">
        <button type="button" class="btn-primary-budget tap" data-action="save-budget">💾 Simpan Budget</button>
        <div class="budget-actions-row">
          <button type="button" class="btn-secondary-budget tap" data-action="ask-ai">🧠 Tanya Monevisor</button>
        </div>
      </div>
    </div>
  `;

  const heroEl = container.querySelector('#budget-summary-hero');
  const { renderBudgetSummaryHero } = await import('./budget-summary-hero.js');
  await renderBudgetSummaryHero(heroEl, { rows, transactions, month, income });

  const listSection = container.querySelector('#budget-list-inner');
  renderBudgetListSection(listSection, rows, transactions, month, currentFilter);

  wireHandlers(container, { ...ctx, rows, income });
}

/** @deprecated */
export async function renderBudgetEnhancedSections(container, ctx) {
  return renderBudgetPage(container, ctx);
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetPage = { renderBudgetPage, renderBudgetEnhancedSections };
}
