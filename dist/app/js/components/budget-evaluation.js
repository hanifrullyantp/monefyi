/**
 * Monthly budget evaluation dashboard.
 * @module components/budget-evaluation
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
 * @param {string} month YYYY-MM
 * @returns {string}
 */
function formatMonthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/**
 * @param {object} [options]
 */
export async function showEvaluation(options = {}) {
  const existing = document.querySelector('.budget-eval-overlay');
  if (existing) existing.remove();

  const state = window.STATE;
  const month = options.month || state?.selectedMonth || getCurrentPeriod();
  const transactions = options.transactions || state?.transactions || [];
  const income = Number(state?.budgetsByMonth?.[month]?.income || 0);
  const rawRows = options.rows
    || state?.budgetDraft?.rows
    || state?.budgetsByMonth?.[month]?.categories?.rows
    || [];

  const rows = computeHistoricalBaselines(rawRows, transactions, month);
  const priorityTotals = calculatePriorityTotals(rows, income);
  const totalPlanned = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalSpent = rows.reduce((s, r) => s + calculateProgress(r, transactions, month).spent, 0);
  const savingsRate = income > 0 ? Math.round(((income - totalSpent) / income) * 100) : 0;

  let recommendations = [];
  try {
    const { generateRecommendations } = await import('../services/budget-recommender.js');
    recommendations = await generateRecommendations({ month, budgets: rows, transactions, income });
  } catch (e) {
    console.warn('[budget-evaluation] recs failed', e);
  }

  const overlay = document.createElement('div');
  overlay.className = 'budget-eval-overlay';
  overlay.innerHTML = `
    <div class="budget-eval-modal" role="dialog" aria-modal="true">
      <header class="budget-eval-header">
        <div>
          <h2>📊 Evaluasi Budget</h2>
          <p>${formatMonthLabel(month)}</p>
        </div>
        <button type="button" class="close-btn" data-action="close">✕</button>
      </header>

      <div class="budget-eval-body">
        <div class="eval-summary-grid">
          <div class="eval-stat"><span>Income</span><strong>Rp ${formatIDR(income)}</strong></div>
          <div class="eval-stat"><span>Planned</span><strong>Rp ${formatIDR(totalPlanned)}</strong></div>
          <div class="eval-stat"><span>Realisasi</span><strong>Rp ${formatIDR(totalSpent)}</strong></div>
          <div class="eval-stat"><span>Savings Rate</span><strong>${savingsRate}%</strong></div>
        </div>

        <section class="eval-section">
          <h3>Breakdown Prioritas</h3>
          <table class="eval-table">
            <thead>
              <tr><th>Prioritas</th><th>Planned</th><th>Actual</th><th>% Income</th><th>Ideal</th></tr>
            </thead>
            <tbody>
              ${Object.values(PRIORITY_LEVELS).map((pl) => {
                const data = priorityTotals[pl.key] || { amount: 0, percentOfIncome: 0, budgets: [] };
                const actual = data.budgets.reduce(
                  (s, r) => s + calculateProgress(r, transactions, month).spent, 0
                );
                return `
                  <tr>
                    <td>${pl.icon} ${pl.label}</td>
                    <td>Rp ${formatIDR(data.amount)}</td>
                    <td>Rp ${formatIDR(actual)}</td>
                    <td>${data.percentOfIncome}%</td>
                    <td>${pl.typical_percent}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </section>

        <section class="eval-section">
          <h3>Per Kategori vs History</h3>
          ${rows.length ? rows.map((row) => {
            const p = calculateProgress(row, transactions, month);
            return `
              <div class="eval-cat-row">
                <div class="eval-cat-name">${escapeHtml(row.name)}</div>
                <div class="eval-cat-stats">
                  <span>${p.percentUsed}% terpakai</span>
                  <span>Bulan lalu: Rp ${formatIDR(row.last_month_actual)}</span>
                  <span>Rata 3 bln: Rp ${formatIDR(row.three_month_avg)}</span>
                </div>
              </div>
            `;
          }).join('') : '<div class="eval-empty">Belum ada budget.</div>'}
        </section>

        <section class="eval-section" id="eval-rec-section">
          <h3>Rekomendasi</h3>
          ${recommendations.length ? recommendations.map((rec) => `
            <div class="rec-item severity-${rec.severity}">
              <div class="rec-icon">${rec.icon}</div>
              <div class="rec-content">
                <div class="rec-title">${escapeHtml(rec.title)}</div>
                <div class="rec-message">${escapeHtml(rec.message)}</div>
              </div>
            </div>
          `).join('') : '<div class="rec-empty">✅ Tidak ada rekomendasi kritis.</div>'}
        </section>
      </div>

      <footer class="budget-eval-footer">
        <button type="button" class="btn-secondary-budget" data-action="close">Tutup</button>
        <button type="button" class="btn-primary-budget" data-action="advisor">🧠 Tanya Monevisor</button>
      </footer>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelectorAll('[data-action="close"]').forEach((btn) => btn.addEventListener('click', close));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('[data-action="advisor"]')?.addEventListener('click', async () => {
    try {
      const { buildAdvisorBudgetContext } = await import('../services/budget-recommender.js');
      const context = buildAdvisorBudgetContext(recommendations, priorityTotals);
      window.STATE = window.STATE || {};
      window.STATE.advisorBudgetContext = context;
    } catch (_) { /* ignore */ }
    close();
    const openOpts = {
      focus: 'over',
      context: 'over_budget',
      prefillMessage: 'Jelaskan evaluasi budget bulanan saya dan saran realokasi terbaik.',
    };
    if (typeof window.openAdvisorAuto === 'function') window.openAdvisorAuto(openOpts);
    else if (typeof window.openAdvisor === 'function') window.openAdvisor(openOpts);
  });

  if (options.tab === 'recommendations') {
    overlay.querySelector('#eval-rec-section')?.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * @returns {string}
 */
function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetEvaluation = { showEvaluation };
}
