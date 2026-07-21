/**
 * Desktop Transaksi page widgets: saldo bar, summary strip, quick insights.
 * @module components/tx-page-widgets
 */

import { Icon } from './icons.js';

/**
 * @param {{ saldo: number, income: number, expense: number, periodLabel: string, masked?: boolean }} data
 * @returns {HTMLElement}
 */
export function renderSaldoBarDesktop(data) {
  const saldo = Number(data.saldo || 0);
  const income = Number(data.income || 0);
  const expense = Number(data.expense || 0);
  const net = income - expense;
  const masked = !!data.masked;

  const el = document.createElement('div');
  el.className = 'saldo-bar-desktop';
  el.id = 'saldoBarDesktop';
  el.innerHTML = `
    <div class="saldo-bar-main">
      <div class="min-w-0">
        <div class="saldo-bar-label">Saldo (estimasi)</div>
        <div class="saldo-bar-amount${masked ? ' saldo-masked' : ''}" id="kpiSaldoBarDesktop">${masked ? '••••••••' : `Rp ${fmt(saldo)}`}</div>
      </div>
      <button type="button" class="saldo-bar-eye tap" id="btnSaldoMaskBarDesktop" title="Sembunyikan saldo" aria-label="Sembunyikan saldo">
        ${Icon('eye', { size: 16 })}
      </button>
    </div>
    <div class="saldo-bar-metrics">
      <div class="saldo-bar-metric">
        <div class="saldo-bar-metric-label">Income</div>
        <div class="saldo-bar-metric-value income" id="kpiIncomeBarDesktop">${masked ? '••••' : `+${fmtShort(income)}`}</div>
      </div>
      <div class="saldo-bar-metric">
        <div class="saldo-bar-metric-label">Expense</div>
        <div class="saldo-bar-metric-value expense" id="kpiExpenseBarDesktop">${masked ? '••••' : `−${fmtShort(expense)}`}</div>
      </div>
      <div class="saldo-bar-metric">
        <div class="saldo-bar-metric-label">Net</div>
        <div class="saldo-bar-metric-value net${net < 0 ? ' negative' : ''}" id="kpiNetBarDesktop">${masked ? '••••' : `${net >= 0 ? '+' : '−'}${fmtShort(Math.abs(net))}`}</div>
      </div>
    </div>
    <button type="button" class="saldo-bar-period tap" id="btnPeriodBarDesktop" aria-label="Filter periode">
      ${Icon('calendar', { size: 14 })}
      <span id="saldoPeriodBarDesktop">${escapeHtml(data.periodLabel || '—')}</span>
      ${Icon('chevronDown', { size: 12 })}
    </button>
  `;
  return el;
}

/**
 * Update existing saldo bar in place.
 * @param {HTMLElement|null} root
 * @param {{ saldo: number, income: number, expense: number, periodLabel: string, masked?: boolean }} data
 */
export function updateSaldoBarDesktop(root, data) {
  if (!root) return;
  const saldo = Number(data.saldo || 0);
  const income = Number(data.income || 0);
  const expense = Number(data.expense || 0);
  const net = income - expense;
  const masked = !!data.masked;
  const amt = root.querySelector('#kpiSaldoBarDesktop');
  if (amt) {
    amt.textContent = masked ? '••••••••' : `Rp ${fmt(saldo)}`;
    amt.classList.toggle('saldo-masked', masked);
  }
  const elIn = root.querySelector('#kpiIncomeBarDesktop');
  if (elIn) elIn.textContent = masked ? '••••' : `+${fmtShort(income)}`;
  const elEx = root.querySelector('#kpiExpenseBarDesktop');
  if (elEx) elEx.textContent = masked ? '••••' : `−${fmtShort(expense)}`;
  const elNet = root.querySelector('#kpiNetBarDesktop');
  if (elNet) {
    elNet.textContent = masked ? '••••' : `${net >= 0 ? '+' : '−'}${fmtShort(Math.abs(net))}`;
    elNet.classList.toggle('negative', net < 0);
  }
  const period = root.querySelector('#saldoPeriodBarDesktop');
  if (period) period.textContent = data.periodLabel || '—';
}

/**
 * @param {{ count: number, income: number, expense: number }} data
 * @returns {HTMLElement}
 */
export function renderTxSummaryStrip(data) {
  const count = Number(data.count || 0);
  const income = Number(data.income || 0);
  const expense = Number(data.expense || 0);
  const net = income - expense;

  const el = document.createElement('div');
  el.className = 'tx-summary-strip';
  el.innerHTML = `
    <div class="tx-summary-item">
      ${Icon('chartBar', { size: 14 })}
      <span><strong>${count}</strong> transaksi</span>
    </div>
    <div class="tx-summary-divider"></div>
    <div class="tx-summary-item income">
      ${Icon('trendingUp', { size: 14 })}
      <span>Income: <strong>${fmtShort(income)}</strong></span>
    </div>
    <div class="tx-summary-divider"></div>
    <div class="tx-summary-item expense">
      ${Icon('trendingDown', { size: 14 })}
      <span>Expense: <strong>${fmtShort(expense)}</strong></span>
    </div>
    <div class="tx-summary-divider"></div>
    <div class="tx-summary-item${net < 0 ? ' negative' : ''}">
      <span>Net: <strong>${net >= 0 ? '+' : '−'}${fmtShort(Math.abs(net))}</strong></span>
    </div>
  `;
  return el;
}

/**
 * @param {{
 *   transactions: Array<{type?:string,category?:string,amount?:number}>,
 *   budgetPlanned?: number,
 *   budgetSpent?: number,
 *   healthScore?: number|null,
 *   healthLabel?: string,
 *   healthColor?: string,
 *   onBudget?: () => void,
 *   onAdvisor?: () => void,
 * }} opts
 * @returns {HTMLElement}
 */
export function renderTxQuickInsights(opts) {
  const txs = opts.transactions || [];
  const planned = Number(opts.budgetPlanned || 0);
  const spent = Number(opts.budgetSpent || 0);
  const percent = planned > 0 ? Math.round((spent / planned) * 100) : 0;
  const status = percent > 100 ? 'over' : percent > 90 ? 'critical' : percent > 75 ? 'warning' : 'healthy';

  const expenses = txs.filter((t) => t.type === 'expense');
  const categoryMap = {};
  for (const t of expenses) {
    const cat = t.category || 'Lainnya';
    categoryMap[cat] = (categoryMap[cat] || 0) + (Number(t.amount) || 0);
  }
  const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];
  const totalExpense = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const topPercent = topCategory && totalExpense > 0
    ? Math.round((topCategory[1] / totalExpense) * 100)
    : 0;

  const score = opts.healthScore;
  const healthLabel = opts.healthLabel || 'Lihat analisa';
  const healthColor = opts.healthColor || '#34d399';

  const el = document.createElement('div');
  el.className = 'tx-quick-insights';
  el.innerHTML = `
    <button type="button" class="tx-insight-card" data-action="go-budget">
      <div class="tx-insight-icon budget">${Icon('target', { size: 18 })}</div>
      <div class="tx-insight-info">
        <div class="tx-insight-label">Realisasi Budget</div>
        <div class="tx-insight-value">${planned > 0 ? `${percent}%` : '—'}</div>
        ${planned > 0 ? `
          <div class="tx-insight-progress">
            <div class="tx-insight-progress-fill ${status}" style="width:${Math.min(percent, 100)}%"></div>
          </div>
          <div class="tx-insight-sub">${fmtShort(spent)} / ${fmtShort(planned)}</div>
        ` : `<div class="tx-insight-sub">Belum ada budget</div>`}
      </div>
    </button>
    <button type="button" class="tx-insight-card" data-action="go-advisor">
      <div class="tx-insight-icon category">${Icon('chartPie', { size: 18 })}</div>
      <div class="tx-insight-info">
        <div class="tx-insight-label">Top Pengeluaran</div>
        <div class="tx-insight-value">${topCategory ? escapeHtml(topCategory[0]) : '—'}</div>
        <div class="tx-insight-sub">${topCategory ? `${topPercent}% · ${fmtShort(topCategory[1])}` : 'Belum ada data'}</div>
      </div>
    </button>
    <button type="button" class="tx-insight-card" data-action="go-advisor">
      <div class="tx-insight-icon health">${Icon('sparkles', { size: 18 })}</div>
      <div class="tx-insight-info">
        <div class="tx-insight-label">Monevisor Score</div>
        <div class="tx-insight-value" style="color:${score == null ? 'inherit' : healthColor}">${score == null ? '—' : `${score}/100`}</div>
        <div class="tx-insight-sub">${escapeHtml(healthLabel)}</div>
      </div>
    </button>
  `;

  el.querySelectorAll('[data-action]').forEach((card) => {
    card.addEventListener('click', () => {
      const action = card.getAttribute('data-action');
      if (action === 'go-budget') opts.onBudget?.();
      else if (action === 'go-advisor') opts.onAdvisor?.();
    });
  });

  return el;
}

function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(n || 0)));
}

function fmtShort(n) {
  const num = Math.abs(n || 0);
  if (num >= 1e6) return `${(num / 1e6).toFixed(num < 1e7 ? 1 : 0)}jt`;
  if (num >= 1e3) return `${Math.round(num / 1e3)}rb`;
  return String(Math.round(num));
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s || '');
  return d.innerHTML;
}

if (typeof window !== 'undefined') {
  window.monefyiTxWidgets = {
    renderSaldoBarDesktop,
    updateSaldoBarDesktop,
    renderTxSummaryStrip,
    renderTxQuickInsights,
  };
}
