/**
 * Inject financial insights into the existing edit-transaction sheet.
 * Does not own save/delete — keeps #e* fields and existing handlers.
 * @module components/transaction-detail-modal
 */

import { Icon, getCategoryIcon } from './icons.js';
import { getTransactionInsight } from '../services/transaction-insight.js';

/**
 * Build + mount insight HTML above the edit form inside #editCard.
 * @param {HTMLElement|null} editCard
 * @param {object} transaction
 * @param {object|null} [insight]
 * @returns {Promise<void>}
 */
export async function injectTransactionInsights(editCard, transaction, insight = null) {
  if (!editCard || !transaction) return;

  let host = editCard.querySelector('#txInsightHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'txInsightHost';
    host.className = 'tx-insight-host';
    const header = editCard.querySelector(':scope > .flex.items-center.justify-between');
    const formGrid = editCard.querySelector(':scope > .mt-3.grid');
    if (header && header.nextSibling) {
      editCard.insertBefore(host, header.nextSibling);
    } else if (formGrid) {
      editCard.insertBefore(host, formGrid);
    } else {
      editCard.insertBefore(host, editCard.firstChild);
    }
  }

  host.innerHTML = '<div class="tx-insight-loading">Memuat insight…</div>';

  try {
    const data =
      insight ||
      (await getTransactionInsight(transaction, undefined, undefined));
    host.innerHTML = renderInsightSection(transaction, data);
    editCard.classList.add('tx-edit-with-insights');
  } catch (err) {
    console.warn('[tx-detail] insight inject failed', err);
    host.innerHTML = '';
  }
}

/**
 * Convenience: compute insight then inject.
 * @param {HTMLElement|null} editCard
 * @param {object} transaction
 * @param {{ allTransactions?: object[], budgets?: object[] }} [options]
 */
export async function loadAndInjectInsights(editCard, transaction, options = {}) {
  const insight = await getTransactionInsight(
    transaction,
    options.allTransactions,
    options.budgets
  );
  await injectTransactionInsights(editCard, transaction, insight);
  return insight;
}

/**
 * @param {object} tx
 * @param {object|null} insight
 * @returns {string}
 */
function renderInsightSection(tx, insight) {
  if (!insight) return '';

  const isExpense = tx.type === 'expense';
  const amountColor = isExpense ? '#f87171' : tx.type === 'income' ? '#34d399' : '#93c5fd';
  const amountPrefix = isExpense ? '−' : tx.type === 'income' ? '+' : '';
  const categoryIcon = getCategoryIcon(tx.category);

  return `
    <div class="tx-insight-panel">
      <div class="tx-insight-hero">
        <div class="tx-hero-amount" style="color: ${amountColor}">
          ${amountPrefix}Rp ${fmt(tx.amount)}
        </div>
        <div class="tx-hero-merchant">
          <span class="tx-hero-icon">${Icon(categoryIcon, { size: 18 })}</span>
          <span>${escapeHtml(tx.merchant || tx.category || 'Transaksi')}</span>
        </div>
      </div>

      ${insight.categoryTrend?.hasData && isExpense ? renderTrendChart(insight.categoryTrend, tx.category) : ''}

      ${insight.comparison?.narrative && isExpense ? `
        <div class="tx-insight-narrative ${insight.comparison.status}">
          ${escapeHtml(insight.comparison.narrative)}
        </div>
      ` : ''}

      ${insight.budgetInfo?.hasBudget && isExpense ? renderBudgetProgress(insight.budgetInfo) : ''}

      ${insight.budgetInfo?.warning && isExpense ? `
        <div class="tx-insight-warning">
          ${Icon('alertTriangle', { size: 14 })}
          <span>${escapeHtml(insight.budgetInfo.warning)}</span>
        </div>
      ` : ''}

      <div class="tx-insight-meta">
        <div class="tx-meta-item">
          ${Icon('calendar', { size: 14 })}
          <span>${escapeHtml(tx.date || '')}</span>
        </div>
        <div class="tx-meta-item">
          ${Icon('tag', { size: 14 })}
          <span>${escapeHtml(tx.category || 'Lainnya')}</span>
        </div>
        <div class="tx-meta-item">
          ${Icon('wallet', { size: 14 })}
          <span>${escapeHtml(tx.account || 'Cash')}</span>
        </div>
      </div>

      ${insight.rank && isExpense ? `
        <div class="tx-insight-rank">
          Transaksi ini adalah pengeluaran ke-${insight.rank.rank} terbesar bulan ini
          (${insight.rank.percentOfTotal}% dari total).
        </div>
      ` : ''}

      <div class="tx-detail-divider" role="separator"></div>
    </div>
  `;
}

/**
 * @param {object} trend
 * @param {string} category
 * @returns {string}
 */
function renderTrendChart(trend, category) {
  const { data, max } = trend;
  const chartHeight = 80;
  const width = 100;
  const padding = 5;
  const usableWidth = width - padding * 2;
  const stepX = usableWidth / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = padding + i * stepX;
    const y =
      chartHeight -
      padding -
      (d.amount / Math.max(max, 1)) * (chartHeight - padding * 2);
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L${points[points.length - 1].x.toFixed(1)},${chartHeight - padding}` +
    ` L${points[0].x.toFixed(1)},${chartHeight - padding} Z`;

  const trendColor =
    trend.trendDirection === 'up'
      ? '#f59e0b'
      : trend.trendDirection === 'down'
        ? '#10b981'
        : '#3b82f6';

  const gradId = `trendGrad_${Math.random().toString(36).slice(2, 8)}`;
  const last = points[points.length - 1];
  const peakIdx = data.reduce(
    (best, d, i) => (d.amount >= data[best].amount ? i : best),
    0
  );
  const peak = points[peakIdx];

  return `
    <div class="tx-trend-section">
      <div class="tx-trend-header">
        <div class="tx-trend-title">
          ${Icon('trendingUp', { size: 14 })}
          <span>Tren Pengeluaran Kategori</span>
        </div>
        <div class="tx-trend-category">
          ${Icon(getCategoryIcon(category), { size: 12 })}
          <span>${escapeHtml(category)}</span>
          <span class="tx-trend-period">Last 6 Months</span>
        </div>
      </div>

      <div class="tx-trend-chart">
        <svg viewBox="0 0 ${width} ${chartHeight}" preserveAspectRatio="none" class="tx-sparkline" aria-hidden="true">
          <defs>
            <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${trendColor}" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="${trendColor}" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          ${peak ? `<line x1="${peak.x}" y1="${padding}" x2="${peak.x}" y2="${chartHeight - padding}" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>` : ''}
          <path d="${areaPath}" fill="url(#${gradId})" />
          <path d="${linePath}" fill="none" stroke="${trendColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${last ? `
            <circle cx="${last.x}" cy="${last.y}" r="3" fill="${trendColor}" stroke="#0f1524" stroke-width="1.5"/>
          ` : ''}
        </svg>
        <div class="tx-trend-labels">
          ${data.map((d) => `<span class="${d.isCurrent ? 'current' : ''}">${escapeHtml(d.label)}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * @param {object} budget
 * @returns {string}
 */
function renderBudgetProgress(budget) {
  const { budgetName, spent, budgetAmount, percentUsed, status, priority } = budget;

  const statusColors = {
    healthy: '#10b981',
    warning: '#f59e0b',
    critical: '#f97316',
    over: '#ef4444',
  };
  const color = statusColors[status] || '#6b7280';
  const priorityKey = String(priority || '').toLowerCase();

  return `
    <div class="tx-budget-section">
      <div class="tx-budget-header">
        <span class="tx-budget-name">${escapeHtml(budgetName)} Budget</span>
        ${priorityKey ? `<span class="tx-budget-priority priority-${escapeHtml(priorityKey)}">${escapeHtml(priorityKey)}</span>` : ''}
      </div>
      <div class="tx-budget-stats">
        <span>Terpakai: Rp ${fmt(spent)} / Rp ${fmt(budgetAmount)}</span>
        <span class="tx-budget-percent" style="color: ${color}">(${percentUsed}%)</span>
      </div>
      <div class="tx-budget-bar">
        <div class="tx-budget-bar-fill" style="width: ${Math.min(percentUsed, 100)}%; background: ${color}"></div>
      </div>
    </div>
  `;
}

/**
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(n || 0)));
}

/**
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s || '');
  return d.innerHTML;
}

if (typeof window !== 'undefined') {
  window.monefyiTxDetail = { injectTransactionInsights, loadAndInjectInsights };
}
