/**
 * Budget detail modal — realisasi, linked transactions, item status.
 * @module components/budget-detail-modal
 */

import {
  calculateProgress,
  getLinkedTransactions,
  PRIORITY_LEVELS,
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

const STATUS_LABELS = {
  planned: '📋 Direncanakan',
  pending: '⏳ Berjalan',
  done: '✅ Selesai',
  skipped: '⏭️ Dilewati',
};

/**
 * @param {object} budget
 * @param {object[]} transactions
 * @param {string} month
 * @param {object} [options]
 */
export function showBudgetDetailModal(budget, transactions, month, options = {}) {
  const existing = document.getElementById('budgetDetailBackdrop');
  if (existing) existing.remove();

  const progress = calculateProgress(budget, transactions, month);
  const linked = progress.linkedTransactions || [];
  const priority = PRIORITY_LEVELS[budget.priority?.toUpperCase()] || PRIORITY_LEVELS.PENTING;

  const backdrop = document.createElement('div');
  backdrop.id = 'budgetDetailBackdrop';
  backdrop.className = 'budget-detail-overlay';
  backdrop.innerHTML = `
    <div class="budget-detail-modal" role="dialog" aria-modal="true">
      <header class="budget-detail-header">
        <div>
          <span class="budget-detail-priority" style="color:${priority.color}">${priority.icon} ${priority.label}</span>
          <h2>${escapeHtml(budget.name)}</h2>
        </div>
        <button type="button" class="close-btn" data-action="close" aria-label="Tutup">✕</button>
      </header>

      <div class="budget-detail-body">
        <div class="budget-detail-stats">
          <div class="stat">
            <span class="stat-label">Terpakai</span>
            <span class="stat-value">${progress.percentUsed}%</span>
          </div>
          <div class="stat">
            <span class="stat-label">Realisasi</span>
            <span class="stat-value">Rp ${formatIDR(progress.spent)}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Budget</span>
            <span class="stat-value">Rp ${formatIDR(budget.amount)}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Sisa</span>
            <span class="stat-value ${progress.remaining < 0 ? 'over' : ''}">Rp ${formatIDR(progress.remaining)}</span>
          </div>
        </div>

        <div class="budget-detail-progress">
          <div class="progress-fill ${progress.status}" style="width:${Math.min(progress.percentUsed, 100)}%"></div>
        </div>

        ${progress.daysLeft > 0 ? `
          <div class="budget-detail-hint">
            💡 Sisa ${progress.daysLeft} hari — Rp ${formatIDR(progress.dailyBudget)}/hari
          </div>
        ` : ''}

        <section class="budget-detail-section">
          <h3>Detail Item</h3>
          ${(budget.items?.length ? budget.items : [{ name: '(belum ada item)', qty: 0, price: 0, status: 'planned' }])
            .map((item) => {
              const subtotal = (item.qty || 1) * (item.price || 0);
              const linkedCount = (item.linked_transactions || []).length;
              return `
                <div class="detail-item-row status-${item.status || 'planned'}">
                  <div class="detail-item-name">${escapeHtml(item.name)}</div>
                  <div class="detail-item-meta">
                    <span>${STATUS_LABELS[item.status] || item.status}</span>
                    ${item.target_date ? `<span>📅 ${item.target_date}</span>` : ''}
                    ${linkedCount ? `<span>🔗 ${linkedCount} tx</span>` : ''}
                  </div>
                  <div class="detail-item-amount">Rp ${formatIDR(subtotal)}</div>
                </div>
              `;
            }).join('')}
        </section>

        <section class="budget-detail-section">
          <h3>Transaksi Terlink (${linked.length})</h3>
          ${linked.length ? linked.slice(0, 10).map((tx) => `
            <div class="detail-tx-row">
              <span class="detail-tx-date">${escapeHtml(tx.date || '')}</span>
              <span class="detail-tx-merchant">${escapeHtml(tx.merchant || tx.category || '—')}</span>
              <span class="detail-tx-amount">Rp ${formatIDR(tx.amount)}</span>
            </div>
          `).join('') : '<div class="detail-empty">Belum ada transaksi terlink.</div>'}
        </section>

        ${budget.auto_link_keywords?.length ? `
          <section class="budget-detail-section">
            <h3>Keywords</h3>
            <div class="keyword-tags-readonly">
              ${budget.auto_link_keywords.map((kw) => `<span class="keyword-tag">${escapeHtml(kw)}</span>`).join('')}
            </div>
          </section>
        ` : ''}
      </div>

      <footer class="budget-detail-footer">
        <button type="button" class="btn-secondary-budget" data-action="close">Tutup</button>
        <button type="button" class="btn-primary-budget" data-action="edit">✏️ Edit Budget</button>
      </footer>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.querySelectorAll('[data-action="close"]').forEach((btn) => btn.addEventListener('click', close));
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  backdrop.querySelector('[data-action="edit"]')?.addEventListener('click', async () => {
    close();
    const { showBudgetFormModal } = await import('./budget-form-modal.js');
    showBudgetFormModal(budget, { onSaved: options.onRefresh });
  });
}

/** @deprecated use showBudgetDetailModal */
export function closeBudgetDetail() {
  document.getElementById('budgetDetailBackdrop')?.remove();
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetDetail = { showBudgetDetailModal, closeBudgetDetail };
  window.closeBudgetDetail = closeBudgetDetail;
}
