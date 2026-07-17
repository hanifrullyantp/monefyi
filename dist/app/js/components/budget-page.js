/**
 * Enhanced budget sections for #budgetSheet.
 * @module components/budget-page
 */

import {
  PRIORITY_LEVELS,
  calculatePriorityTotals,
  calculateProgress,
  computeHistoricalBaselines,
} from '../services/budget-model.js';

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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(Math.round(n));
}

/**
 * @param {object[]} budgets
 * @param {object[]} transactions
 * @param {string} month
 * @returns {number}
 */
function calculateGroupProgress(budgets, transactions, month) {
  let totalBudget = 0;
  let totalSpent = 0;
  for (const b of budgets) {
    totalBudget += Number(b.amount || 0);
    totalSpent += calculateProgress(b, transactions, month).spent;
  }
  return totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
}

/**
 * @param {Record<string, object>} priorityTotals
 * @param {number} income
 * @returns {string}
 */
function renderPriorityBars(priorityTotals, income) {
  return Object.values(PRIORITY_LEVELS).map((pl) => {
    const data = priorityTotals[pl.key] || { amount: 0, count: 0, percentOfIncome: 0 };
    const idealPercent = pl.typical_percent;
    const actualPercent = data.percentOfIncome;
    const isOver = actualPercent > idealPercent * 1.2;
    const isUnder = pl.key === 'simpan' && actualPercent < idealPercent * 0.7;

    return `
      <div class="priority-bar-item" data-priority="${pl.key}">
        <div class="priority-bar-label">
          <span class="priority-icon">${pl.icon}</span>
          <span class="priority-name">${pl.label}</span>
          <span class="priority-count">${data.count} item</span>
        </div>
        <div class="priority-bar-visual">
          <div class="priority-bar-track">
            <div class="priority-bar-fill" style="width:${Math.min(actualPercent, 100)}%;background:${pl.color}"></div>
            <div class="priority-bar-ideal" style="left:${idealPercent}%"></div>
          </div>
          <div class="priority-bar-amount">
            <span class="amount">Rp ${formatIDR(data.amount)}</span>
            <span class="percent ${isOver ? 'over' : isUnder ? 'under' : ''}">${actualPercent}%</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * @param {object} budget
 * @param {object[]} transactions
 * @param {string} month
 * @returns {string}
 */
function renderBudgetCard(budget, transactions, month) {
  const progress = calculateProgress(budget, transactions, month);
  const statusClass = progress.status;

  return `
    <div class="budget-card ${statusClass}" data-budget-id="${budget.id}" role="button" tabindex="0">
      <div class="budget-card-header">
        <div class="budget-info">
          <div class="budget-category">${escapeHtml(budget.name)}</div>
          <div class="budget-meta">
            ${progress.transactionCount > 0
              ? `🔗 ${progress.transactionCount} transaksi`
              : 'Belum ada transaksi'}
          </div>
        </div>
        <div class="budget-amount-info">
          <div class="budget-percent">${progress.percentUsed}%</div>
          <div class="budget-amount-detail">
            <span class="spent">Rp ${formatCompact(progress.spent)}</span>
            <span class="total">/ Rp ${formatCompact(budget.amount)}</span>
          </div>
        </div>
      </div>
      <div class="budget-progress-bar">
        <div class="progress-fill ${statusClass}" style="width:${Math.min(progress.percentUsed, 100)}%"></div>
      </div>
      ${progress.remaining > 0 ? `
        <div class="budget-footer">
          <span class="remaining">Sisa Rp ${formatCompact(progress.remaining)}</span>
          ${progress.daysLeft > 0
            ? `<span class="daily-hint">💡 Rp ${formatCompact(progress.dailyBudget)}/hari</span>`
            : ''}
        </div>
      ` : progress.status === 'over' ? `
        <div class="budget-footer">
          <span class="over-alert">⚠️ Over Rp ${formatCompact(-progress.remaining)}</span>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * @param {object} priority
 * @returns {string}
 */
function renderEmptyGroup(priority) {
  return `
    <div class="budget-group-empty" data-priority="${priority.key}">
      <div class="empty-icon">${priority.icon}</div>
      <div class="empty-content">
        <div class="empty-title">Belum ada budget ${priority.label}</div>
        <div class="empty-desc">${priority.description}</div>
        <button type="button" class="btn-add-empty" data-action="add-in-priority" data-priority="${priority.key}">
          + Tambah Budget ${priority.label}
        </button>
      </div>
    </div>
  `;
}

/**
 * @param {Record<string, object>} priorityTotals
 * @param {object[]} transactions
 * @param {string} month
 * @returns {string}
 */
function renderBudgetGroups(priorityTotals, transactions, month) {
  return Object.values(PRIORITY_LEVELS).map((pl) => {
    const data = priorityTotals[pl.key] || { budgets: [], count: 0 };
    if (!data.budgets.length) return renderEmptyGroup(pl);

    return `
      <details class="budget-group" data-priority="${pl.key}" open>
        <summary class="budget-group-header">
          <div class="group-title">
            <span class="group-icon" style="color:${pl.color}">${pl.icon}</span>
            <span class="group-label">${pl.label.toUpperCase()}</span>
            <span class="group-count">(${data.count} item)</span>
          </div>
          <div class="group-progress">${calculateGroupProgress(data.budgets, transactions, month)}%</div>
        </summary>
        <div class="budget-group-content">
          ${data.budgets.map((b) => renderBudgetCard(b, transactions, month)).join('')}
          <button type="button" class="btn-add-in-group" data-action="add-in-priority" data-priority="${pl.key}">
            + Tambah di ${pl.label}
          </button>
        </div>
      </details>
    `;
  }).join('');
}

/**
 * @param {HTMLElement} listEl
 */
async function loadRecommendations(listEl) {
  if (!listEl) return;

  try {
    const { generateRecommendations } = await import('../services/budget-recommender.js');
    const recs = await generateRecommendations();

    if (!recs.length) {
      listEl.innerHTML = '<div class="rec-empty">✅ Semua budget kamu sehat, lanjutkan!</div>';
      return;
    }

    listEl.innerHTML = recs.slice(0, 3).map((rec) => `
      <div class="rec-item severity-${rec.severity}">
        <div class="rec-icon">${rec.icon}</div>
        <div class="rec-content">
          <div class="rec-title">${escapeHtml(rec.title)}</div>
          <div class="rec-message">${escapeHtml(rec.message)}</div>
          ${rec.actions?.length ? `
            <div class="rec-actions">
              ${rec.actions.map((a) => `
                <button type="button" class="rec-action-btn" data-action="${a.action}"
                  data-budget-id="${a.budgetId || ''}" data-priority="${a.priority || ''}">
                  ${escapeHtml(a.label)}
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `).join('') + (recs.length > 3 ? `
      <button type="button" class="btn-see-all-rec" data-action="see-all-recs">
        Lihat ${recs.length - 3} rekomendasi lainnya →
      </button>
    ` : '');
  } catch (e) {
    console.warn('[budget-page] recommendations failed:', e);
    listEl.innerHTML = '<div class="rec-empty">Rekomendasi tidak tersedia.</div>';
  }
}

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 */
function wireHandlers(container, ctx) {
  const { rows, transactions, month, onRefresh } = ctx;

  container.querySelectorAll('[data-action="add-budget"], [data-action="add-in-priority"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const priority = btn.dataset.priority || 'penting';
      const { showBudgetFormModal } = await import('./budget-form-modal.js');
      showBudgetFormModal({ priority, month }, {
        onSaved: () => onRefresh?.(),
      });
    });
  });

  container.querySelectorAll('.budget-card').forEach((card) => {
    const open = async () => {
      const id = card.dataset.budgetId;
      const budget = rows.find((b) => b.id === id);
      if (!budget) return;
      const { showBudgetDetailModal } = await import('./budget-detail-modal.js');
      showBudgetDetailModal(budget, transactions, month, { onRefresh });
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  container.querySelector('[data-action="ask-ai"]')?.addEventListener('click', async () => {
    if (typeof window.openAdvisorAuto === 'function') {
      window.openAdvisorAuto();
    } else if (typeof window.openAdvisor === 'function') {
      window.openAdvisor();
    }
  });

  container.querySelector('[data-action="evaluation"]')?.addEventListener('click', async () => {
    const { showEvaluation } = await import('./budget-evaluation.js');
    showEvaluation({ month, rows, transactions });
  });

  container.querySelector('[data-action="see-all-recs"]')?.addEventListener('click', async () => {
    const { showEvaluation } = await import('./budget-evaluation.js');
    showEvaluation({ month, rows, transactions, tab: 'recommendations' });
  });

  container.querySelectorAll('.rec-action-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      if (action === 'increase_budget' || action === 'review_priority') {
        const budgetId = btn.dataset.budgetId;
        const budget = rows.find((b) => b.id === budgetId);
        const priority = btn.dataset.priority || budget?.priority || 'penting';
        const { showBudgetFormModal } = await import('./budget-form-modal.js');
        showBudgetFormModal(budget || { priority }, { onSaved: () => onRefresh?.() });
      } else if (action === 'add_to_savings' || action === 'increase_savings') {
        const { showBudgetFormModal } = await import('./budget-form-modal.js');
        showBudgetFormModal({ priority: 'simpan', name: 'Tabungan', month }, { onSaved: () => onRefresh?.() });
      }
    });
  });
}

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 */
export async function renderBudgetEnhancedSections(container, ctx) {
  if (!container) return;

  const {
    month,
    rows: rawRows,
    income,
    transactions,
    onRefresh,
  } = ctx;

  const rows = computeHistoricalBaselines(rawRows || [], transactions || [], month);
  const priorityTotals = calculatePriorityTotals(rows, income);
  const totalBudget = Object.values(priorityTotals).reduce((sum, p) => sum + p.amount, 0);
  const unallocated = income - totalBudget;

  container.innerHTML = `
    <div class="budget-enhanced">
      <div class="allocation-overview">
        <div class="section-title">
          <h3>📊 Alokasi Prioritas</h3>
          <span class="allocation-total ${unallocated < 0 ? 'over' : ''}">
            ${unallocated >= 0
              ? `Sisa Rp ${formatIDR(unallocated)}`
              : `Over Rp ${formatIDR(-unallocated)}`}
          </span>
        </div>
        <div class="priority-bars">${renderPriorityBars(priorityTotals, income)}</div>
      </div>

      <div class="recommendations-section">
        <div class="section-title"><h3>💡 Rekomendasi</h3></div>
        <div class="recommendations-list" id="budgetRecList">
          <div class="rec-loading">Memuat…</div>
        </div>
      </div>

      <div class="budget-groups">${renderBudgetGroups(priorityTotals, transactions, month)}</div>

      <div class="budget-actions">
        <button type="button" class="btn-primary-budget" data-action="add-budget">+ Tambah Budget</button>
        <button type="button" class="btn-secondary-budget" data-action="ask-ai">🧠 Tanya Monevisor</button>
        <button type="button" class="btn-secondary-budget" data-action="evaluation">📊 Evaluasi Bulan</button>
      </div>
    </div>
  `;

  await loadRecommendations(container.querySelector('#budgetRecList'));
  wireHandlers(container, { rows, transactions, month, onRefresh });
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetPage = { renderBudgetEnhancedSections };
}
