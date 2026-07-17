/**
 * Full-page budget UI — compact priority bar, list rows, top recommendations.
 * @module components/budget-page
 */

import {
  PRIORITY_LEVELS,
  calculatePriorityTotals,
  calculateProgress,
  computeHistoricalBaselines,
} from '../services/budget-model.js';

const DISMISSED_REC_KEY = 'monefyi_budget_rec_dismissed';

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
 * @returns {{ spent: number, total: number, pct: number }}
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
 * @param {Record<string, object>} priorityTotals
 * @param {object[]} transactions
 * @param {string} month
 * @param {number} totalBudget
 * @returns {string}
 */
function renderPriorityStackBar(priorityTotals, transactions, month, totalBudget) {
  const segments = Object.values(PRIORITY_LEVELS).map((pl) => {
    const data = priorityTotals[pl.key] || { amount: 0, budgets: [] };
    const widthPct = totalBudget > 0 ? (data.amount / totalBudget) * 100 : 0;
    const groupSpent = groupTotals(data.budgets || [], transactions, month).spent;
    return { pl, data, widthPct, groupSpent };
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
 * @param {object} budget
 * @param {object[]} transactions
 * @param {string} month
 * @returns {string}
 */
function renderBudgetListRow(budget, transactions, month) {
  const progress = calculateProgress(budget, transactions, month);
  const statusClass = progress.status === 'over' ? 'over' : progress.status === 'critical' ? 'critical' : progress.status === 'warning' ? 'warning' : '';
  const remaining = progress.remaining;
  const remainingLabel = remaining >= 0
    ? `Sisa: ${formatCompact(remaining)}`
    : `Over ${formatCompact(-remaining)}`;

  return `
    <button type="button" class="budget-list-row ${statusClass}" data-budget-id="${budget.id}">
      <div class="budget-list-row__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18"/></svg>
      </div>
      <div class="budget-list-row__main">
        <div class="budget-list-row__title">${escapeHtml(budget.name)}</div>
        <div class="budget-list-row__sub ${remaining < 0 ? 'over' : ''}">${remainingLabel}</div>
        <div class="budget-list-row__track">
          <div class="budget-list-row__fill ${statusClass}" style="width:${Math.min(progress.percentUsed, 100)}%"></div>
        </div>
      </div>
      <div class="budget-list-row__right">
        <div class="budget-list-row__budget">${formatCompact(budget.amount)}</div>
        <svg class="budget-list-row__chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </button>
  `;
}

/**
 * @param {Record<string, object>} priorityTotals
 * @param {object[]} transactions
 * @param {string} month
 * @returns {string}
 */
function renderBudgetList(priorityTotals, transactions, month) {
  return Object.values(PRIORITY_LEVELS).map((pl) => {
    const data = priorityTotals[pl.key] || { budgets: [], count: 0 };
    const totals = groupTotals(data.budgets || [], transactions, month);

    return `
      <section class="budget-list-group" data-priority="${pl.key}">
        <div class="budget-list-group__head">
          <span class="budget-list-group__dot" style="background:${pl.color}"></span>
          <span class="budget-list-group__label">${pl.label.toUpperCase()}</span>
          <span class="budget-list-group__meta">${data.count} item</span>
          <span class="budget-list-group__summary">${formatCompact(totals.spent)} / ${formatCompact(totals.total)} (${totals.pct}%)</span>
        </div>
        ${data.budgets.length
          ? data.budgets.map((b) => renderBudgetListRow(b, transactions, month)).join('')
          : `<div class="budget-list-empty">Belum ada budget ${pl.label.toLowerCase()}</div>`}
        <button type="button" class="budget-list-add tap" data-action="add-in-priority" data-priority="${pl.key}">
          + Tambah ${pl.label}
        </button>
      </section>
    `;
  }).join('');
}

/**
 * @param {HTMLElement} bannerEl
 * @param {object} ctx
 */
async function renderRecBanner(bannerEl, ctx) {
  if (!bannerEl) return;
  const dismissed = sessionStorage.getItem(DISMISSED_REC_KEY);
  if (dismissed) {
    bannerEl.classList.add('hidden');
    return;
  }

  try {
    const { generateRecommendations } = await import('../services/budget-recommender.js');
    const recs = await generateRecommendations({
      month: ctx.month,
      budgets: ctx.rows,
      transactions: ctx.transactions,
      income: ctx.income,
    });

    if (!recs.length) {
      bannerEl.classList.add('hidden');
      return;
    }

    const rec = recs[0];
    bannerEl.classList.remove('hidden');
    bannerEl.innerHTML = `
      <div class="budget-rec-banner severity-${rec.severity}">
        <div class="budget-rec-banner__icon">${rec.icon}</div>
        <div class="budget-rec-banner__body">
          <div class="budget-rec-banner__title">Rekomendasi untukmu</div>
          <div class="budget-rec-banner__msg">${escapeHtml(rec.message)}</div>
          ${rec.actions?.[0] ? `
            <button type="button" class="budget-rec-banner__action" data-action="${rec.actions[0].action}"
              data-budget-id="${rec.actions[0].budgetId || ''}" data-priority="${rec.actions[0].priority || ''}">
              ${escapeHtml(rec.actions[0].label)}
            </button>
          ` : ''}
        </div>
        <button type="button" class="budget-rec-banner__close" data-action="dismiss-rec" aria-label="Tutup">✕</button>
      </div>
    `;
  } catch {
    bannerEl.classList.add('hidden');
  }
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

  container.querySelector('[data-action="allocation-detail"]')?.addEventListener('click', () => {
    const priorityTotals = calculatePriorityTotals(rows, ctx.income);
    showAllocationDetail(priorityTotals, transactions, month, ctx.income);
  });

  container.querySelector('[data-action="evaluation"]')?.addEventListener('click', async () => {
    const { showEvaluation } = await import('./budget-evaluation.js');
    showEvaluation({ month, rows, transactions });
  });

  container.querySelector('[data-action="save-budget"]')?.addEventListener('click', () => onSave?.());

  container.querySelector('#budgetPageIncome')?.addEventListener('input', (e) => {
    if (window.STATE?.budgetDraft) {
      window.STATE.budgetDraft.income = Number(String(e.target.value).replace(/\D/g, '')) || 0;
    }
  });

  container.querySelectorAll('[data-action="add-budget"], [data-action="add-in-priority"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const priority = btn.dataset.priority || 'penting';
      const { showBudgetFormModal } = await import('./budget-form-modal.js');
      showBudgetFormModal({ priority, month }, { onSaved: () => onRefresh?.(), showSummary: false });
    });
  });

  container.querySelectorAll('.budget-list-row').forEach((row) => {
    row.addEventListener('click', async () => {
      const budget = rows.find((b) => b.id === row.dataset.budgetId);
      if (!budget) return;
      const { showBudgetFormModal } = await import('./budget-form-modal.js');
      showBudgetFormModal(budget, {
        onSaved: () => onRefresh?.(),
        showSummary: true,
        transactions,
        month,
      });
    });
  });

  container.querySelector('[data-action="dismiss-rec"]')?.addEventListener('click', () => {
    sessionStorage.setItem(DISMISSED_REC_KEY, '1');
    container.querySelector('#budgetRecBanner')?.classList.add('hidden');
  });

  container.querySelectorAll('.budget-rec-banner__action').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const budgetId = btn.dataset.budgetId;
      const budget = rows.find((b) => b.id === budgetId);
      const priority = btn.dataset.priority || budget?.priority || 'simpan';
      const { showBudgetFormModal } = await import('./budget-form-modal.js');
      if (action === 'add_to_savings' || action === 'increase_savings') {
        showBudgetFormModal({ priority: 'simpan', name: 'Tabungan', month }, { onSaved: () => onRefresh?.() });
      } else {
        showBudgetFormModal(budget || { priority }, { onSaved: () => onRefresh?.(), showSummary: true, transactions, month });
      }
    });
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
    income,
    transactions,
    onRefresh,
    onSave,
  } = ctx;

  const rows = computeHistoricalBaselines(rawRows || [], transactions || [], month);
  const priorityTotals = calculatePriorityTotals(rows, income);
  const totalBudget = Object.values(priorityTotals).reduce((sum, p) => sum + p.amount, 0);
  const totalSpent = rows.reduce((s, r) => s + calculateProgress(r, transactions, month).spent, 0);
  const unallocated = income - totalBudget;
  const usedPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  container.innerHTML = `
    <div class="budget-page">
      <header class="budget-page-header">
        <div>
          <p class="budget-page-kicker">Budgeting</p>
          <h1 class="budget-page-title">Bulan budget: ${formatMonthLabel(month)}</h1>
        </div>
        <button type="button" class="budget-page-add tap" data-action="add-budget" aria-label="Tambah budget">+</button>
      </header>

      <div id="budgetRecBanner" class="budget-rec-banner-host hidden"></div>

      <button type="button" class="budget-eval-link tap" data-action="evaluation">
        <span>📊 Evaluasi Bulan</span>
        <span class="budget-eval-link__cta">Lihat detail ›</span>
      </button>

      <section class="budget-allocation-card">
        <div class="budget-allocation-card__head">
          <h2>Alokasi Prioritas</h2>
          <span class="budget-allocation-card__remain ${unallocated < 0 ? 'over' : ''}">
            ${unallocated >= 0 ? `Sisa budget Rp ${formatIDR(unallocated)}` : `Over Rp ${formatIDR(-unallocated)}`}
          </span>
        </div>
        ${renderPriorityStackBar(priorityTotals, transactions, month, totalBudget)}
        <div class="budget-allocation-card__foot">
          <span>Total budget: Rp ${formatIDR(totalBudget)}</span>
          <span>Terpakai: Rp ${formatIDR(totalSpent)} (${usedPct}%)</span>
        </div>
      </section>

      <section class="budget-income-row">
        <label for="budgetPageIncome">Income bulan ini</label>
        <input id="budgetPageIncome" type="text" inputmode="numeric" class="budget-income-input"
          value="${income ? formatIDR(income) : ''}" placeholder="Rp 0">
      </section>

      <section class="budget-list-section">
        <h2 class="budget-list-section__title">Daftar Budget</h2>
        ${renderBudgetList(priorityTotals, transactions, month)}
      </section>

      <div class="budget-page-footer">
        <button type="button" class="btn-primary-budget tap" data-action="save-budget">💾 Simpan Budget</button>
      </div>
    </div>
  `;

  await renderRecBanner(container.querySelector('#budgetRecBanner'), { ...ctx, rows });
  wireHandlers(container, { ...ctx, rows });
}

/** @deprecated sheet sections — use renderBudgetPage */
export async function renderBudgetEnhancedSections(container, ctx) {
  return renderBudgetPage(container, ctx);
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetPage = { renderBudgetPage, renderBudgetEnhancedSections };
}
