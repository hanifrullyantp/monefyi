/**
 * Desktop Transaksi widgets — compact saldo bar (collapsed sidebar only).
 * @module components/tx-page-widgets
 */

import { Icon } from './icons.js';

/**
 * @param {{
 *   saldo: number,
 *   income: number,
 *   expense: number,
 *   periodLabel: string,
 *   masked?: boolean,
 *   txCount?: number,
 *   budgetPercent?: number|null,
 *   budgetPlanned?: number,
 *   budgetSpent?: number,
 *   healthScore?: number|null,
 *   healthLabel?: string,
 * }} data
 * @returns {HTMLElement}
 */
export function renderSaldoBarDesktop(data) {
  const el = document.createElement('div');
  el.className = 'saldo-bar-desktop';
  el.id = 'saldoBarDesktop';
  el.innerHTML = buildSaldoBarHtml(data);
  return el;
}

/**
 * @param {HTMLElement|null} root
 * @param {Parameters<typeof renderSaldoBarDesktop>[0]} data
 */
export function updateSaldoBarDesktop(root, data) {
  if (!root) return;
  root.innerHTML = buildSaldoBarHtml(data);
}

function buildSaldoBarHtml(data) {
  const saldo = Number(data.saldo || 0);
  const income = Number(data.income || 0);
  const expense = Number(data.expense || 0);
  const net = income - expense;
  const masked = !!data.masked;
  const txCount = Number(data.txCount || 0);
  const planned = Number(data.budgetPlanned || 0);
  const spent = Number(data.budgetSpent || 0);
  const budgetPct = data.budgetPercent != null
    ? data.budgetPercent
    : (planned > 0 ? Math.round((spent / planned) * 100) : null);
  const score = data.healthScore;
  const healthLabel = data.healthLabel || '—';

  return `
    <div class="saldo-bar-main">
      <div class="min-w-0">
        <div class="saldo-bar-label">Saldo (estimasi)</div>
        <div class="saldo-bar-amount${masked ? ' saldo-masked' : ''}" id="kpiSaldoBarDesktop">${masked ? '••••••••' : `Rp ${fmt(saldo)}`}</div>
      </div>
      <button type="button" class="saldo-bar-eye tap" id="btnSaldoMaskBarDesktop" title="Sembunyikan saldo" aria-label="Sembunyikan saldo">
        ${Icon('eye', { size: 15 })}
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
      <div class="saldo-bar-metric saldo-bar-metric--soft">
        <div class="saldo-bar-metric-label">Transaksi</div>
        <div class="saldo-bar-metric-value" id="kpiTxCountBarDesktop">${txCount}</div>
      </div>
      <button type="button" class="saldo-bar-metric saldo-bar-metric--action" id="btnBudgetBarDesktop" title="Buka Budgeting">
        <div class="saldo-bar-metric-label">Budget</div>
        <div class="saldo-bar-metric-value" id="kpiBudgetBarDesktop">${budgetPct == null ? '—' : `${budgetPct}%`}</div>
      </button>
      <button type="button" class="saldo-bar-metric saldo-bar-metric--action" id="btnScoreBarDesktop" title="Buka Monevisor">
        <div class="saldo-bar-metric-label">Monevisor</div>
        <div class="saldo-bar-metric-value" id="kpiScoreBarDesktop" style="${score == null ? '' : `color:${scoreColor(score)}`}">${score == null ? '—' : `${score}`}<span class="saldo-bar-metric-suffix">${score == null ? '' : '/100'}</span></div>
        <div class="saldo-bar-metric-hint">${escapeHtml(healthLabel)}</div>
      </button>
    </div>
    <button type="button" class="saldo-bar-period tap" id="btnPeriodBarDesktop" aria-label="Filter periode">
      ${Icon('calendar', { size: 13 })}
      <span id="saldoPeriodBarDesktop">${escapeHtml(data.periodLabel || '—')}</span>
      ${Icon('chevronDown', { size: 11 })}
    </button>
  `;
}

/** @deprecated Kept for API compat — summary strip removed from UI */
export function renderTxSummaryStrip() {
  const el = document.createElement('div');
  el.className = 'tx-summary-strip';
  el.hidden = true;
  return el;
}

/** @deprecated Kept for API compat — insight cards removed from UI */
export function renderTxQuickInsights() {
  const el = document.createElement('div');
  el.className = 'tx-quick-insights';
  el.hidden = true;
  return el;
}

function scoreColor(score) {
  if (score >= 70) return '#34d399';
  if (score >= 45) return '#fbbf24';
  return '#f87171';
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
