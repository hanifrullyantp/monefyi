/**
 * Monthly reports page — arsip bulan ditutup + auto-generated reports.
 * @module pages/monthly-reports-page
 */

import { listClosedPeriods, computePeriodCategoryBreakdown } from '../services/monthly-period.js';
import { loadMonthlyReports, saveMonthlyReport } from '../services/monthly-report-generator.js';
import { Icon } from '../components/icons.js';

/**
 * @param {HTMLElement} container
 */
export async function renderMonthlyReportsPage(container) {
  if (!container) return;
  const userId = window.STATE?.db?.user?.id;
  if (!userId) {
    container.innerHTML = '<p class="muted">Login dulu untuk melihat laporan.</p>';
    return;
  }

  const [closed, autoReports] = await Promise.all([
    listClosedPeriods(userId),
    loadMonthlyReports(12),
  ]);
  const txs = window.STATE?.transactions || [];
  const autoMap = Object.fromEntries(autoReports.map((r) => [r.period, r]));

  container.innerHTML = `
    <div class="monthly-reports-page">
      <header class="mrp-header">
        <h1>Laporan Bulanan</h1>
        <p class="muted">Bulan ditutup buku & laporan otomatis</p>
        <div class="mrp-toolbar">
          <button type="button" class="mrp-review-btn tap" data-action="monthly-review">
            ${Icon('bookOpen', { size: 16 })} Review Bulan Ini
          </button>
          <button type="button" class="mrp-review-btn tap ghost" data-action="gen-report">
            ${Icon('sparkles', { size: 16 })} Generate Bulan Ini
          </button>
        </div>
      </header>
      ${autoReports.length ? `
        <h2 class="mrp-subtitle">Laporan Otomatis</h2>
        <ul class="mrp-list">
          ${autoReports.map((r) => renderAutoReportCard(r)).join('')}
        </ul>
      ` : ''}
      ${closed.length ? `
        <h2 class="mrp-subtitle">Periode Ditutup</h2>
        <ul class="mrp-list">
          ${closed.map((p) => renderPeriodCard(p, txs, autoMap[p.period])).join('')}
        </ul>
      ` : ''}
      ${!closed.length && !autoReports.length ? '<p class="mrp-empty">Belum ada laporan. Tutup buku atau generate manual.</p>' : ''}
    </div>
  `;

  container.querySelectorAll('[data-action="print-report"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const period = btn.getAttribute('data-period');
      printReport(period, closed.find((p) => p.period === period), txs);
    });
  });

  container.querySelectorAll('[data-action="print-auto"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const period = btn.getAttribute('data-period');
      const report = autoReports.find((r) => r.period === period);
      if (report) printAutoReport(report);
    });
  });

  container.querySelector('[data-action="gen-report"]')?.addEventListener('click', async () => {
    const period = window.STATE?.selectedMonth
      || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    await saveMonthlyReport(period);
    await renderMonthlyReportsPage(container);
  });

  container.querySelector('[data-action="monthly-review"]')?.addEventListener('click', async () => {
    const period = window.STATE?.selectedMonth
      || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const { showMonthlyReviewSheet } = await import('../components/monthly-review-sheet.js');
    await showMonthlyReviewSheet({
      period,
      transactions: txs,
      onClosing: async () => {
        const { showMonthlyClosingModal } = await import('../components/monthly-closing-modal.js');
        await showMonthlyClosingModal({
          period,
          transactions: txs,
          upsertTransaction: window.upsertTransaction,
        });
      },
    });
  });
}

/**
 * @param {object} r
 */
function renderAutoReportCard(r) {
  const c = r.content_json || {};
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n || 0)));
  const score = r.health_score ?? c.cover?.health_score;
  return `
    <li class="mrp-card mrp-card--auto">
      <div class="mrp-card-head">
        <strong>${formatMonth(r.period)}</strong>
        <span class="mrp-badge">✨ Auto</span>
        ${score != null ? `<span class="mrp-score">Score ${score}</span>` : ''}
      </div>
      <div class="mrp-card-stats">
        <span>Income Rp ${fmt(c.summary?.income)}</span>
        <span>Pengeluaran Rp ${fmt(c.summary?.expense)}</span>
        <span class="${(c.summary?.net || 0) >= 0 ? 'pos' : 'neg'}">Net Rp ${fmt(c.summary?.net)}</span>
      </div>
      ${c.insights?.length ? `<ul class="mrp-top">${c.insights.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : ''}
      <button type="button" class="mrp-print tap" data-action="print-auto" data-period="${escapeHtml(r.period)}">
        ${Icon('download', { size: 14 })} Export / Print
      </button>
    </li>
  `;
}

/**
 * @param {object} p
 * @param {object[]} txs
 * @param {object} [autoReport]
 */
function renderPeriodCard(p, txs, autoReport) {
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n || 0)));
  const net = Number(p.closing_balance || 0) - Number(p.opening_balance || 0);
  const cats = computePeriodCategoryBreakdown(txs, p.period).slice(0, 3);
  return `
    <li class="mrp-card">
      <div class="mrp-card-head">
        <strong>${formatMonth(p.period)}</strong>
        <span class="mrp-badge">✅ Ditutup</span>
      </div>
      <div class="mrp-card-stats">
        <span>Income Rp ${fmt(p.total_income)}</span>
        <span>Pengeluaran Rp ${fmt(p.total_expense)}</span>
        <span class="${net >= 0 ? 'pos' : 'neg'}">Net ${net >= 0 ? '+' : ''}Rp ${fmt(net)}</span>
      </div>
      ${cats.length ? `<ul class="mrp-top">${cats.map((c) => `<li>${escapeHtml(c.category)}: Rp ${fmt(c.amount)}</li>`).join('')}</ul>` : ''}
      <button type="button" class="mrp-print tap" data-action="print-report" data-period="${escapeHtml(p.period)}">
        ${Icon('download', { size: 14 })} Export / Print
      </button>
    </li>
  `;
}

/**
 * @param {object} report
 */
function printAutoReport(report) {
  const c = report.content_json || {};
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n || 0)));
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`
    <html><head><title>Laporan ${report.period}</title>
    <style>body{font-family:sans-serif;padding:24px}</style></head><body>
    <h1>${escapeHtml(c.cover?.title || report.period)}</h1>
    <p>Health score: ${report.health_score ?? c.cover?.health_score ?? '—'}</p>
    <p>Income: Rp ${fmt(c.summary?.income)} · Pengeluaran: Rp ${fmt(c.summary?.expense)} · Net: Rp ${fmt(c.summary?.net)}</p>
    <h2>Insights</h2>
    <ul>${(c.insights || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
    </body></html>
  `);
  w.document.close();
  w.print();
}

/**
 * @param {string} period
 * @param {object} row
 * @param {object[]} txs
 */
function printReport(period, row, txs) {
  if (!row) return;
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n || 0)));
  const cats = computePeriodCategoryBreakdown(txs, period);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`
    <html><head><title>Laporan ${period}</title>
    <style>body{font-family:sans-serif;padding:24px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ddd;padding:8px}</style>
    </head><body>
    <h1>Laporan ${formatMonth(period)}</h1>
    <p>Status: Sudah Ditutup</p>
    <h2>Cash Flow</h2>
    <p>Income: Rp ${fmt(row.total_income)}</p>
    <p>Pengeluaran: Rp ${fmt(row.total_expense)}</p>
    <p>Net: Rp ${fmt(Number(row.closing_balance) - Number(row.opening_balance))}</p>
    <h2>Top Kategori</h2>
    <table><tr><th>Kategori</th><th>Nominal</th></tr>
    ${cats.map((c) => `<tr><td>${c.category}</td><td>Rp ${fmt(c.amount)}</td></tr>`).join('')}
    </table>
    </body></html>
  `);
  w.document.close();
  w.print();
}

function formatMonth(period) {
  const [y, m] = String(period).slice(0, 7).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

if (typeof window !== 'undefined') {
  window.monefyiMonthlyReportsPage = { renderMonthlyReportsPage };
}
