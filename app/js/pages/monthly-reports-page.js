/**
 * Monthly reports page — arsip bulan ditutup.
 * @module pages/monthly-reports-page
 */

import { listClosedPeriods, computePeriodCategoryBreakdown } from '../services/monthly-period.js';
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

  const closed = await listClosedPeriods(userId);
  const txs = window.STATE?.transactions || [];

  container.innerHTML = `
    <div class="monthly-reports-page">
      <header class="mrp-header">
        <h1>Laporan Bulanan</h1>
        <p class="muted">Bulan yang sudah ditutup buku</p>
        <button type="button" class="mrp-review-btn tap" data-action="monthly-review">
          ${Icon('bookOpen', { size: 16 })} Review Bulan Ini
        </button>
      </header>
      ${closed.length ? `
        <ul class="mrp-list">
          ${closed.map((p) => renderPeriodCard(p, txs)).join('')}
        </ul>
      ` : '<p class="mrp-empty">Belum ada bulan yang ditutup. Tutup buku dari menu Neraca atau notifikasi akhir bulan.</p>'}
    </div>
  `;

  container.querySelectorAll('[data-action="print-report"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const period = btn.getAttribute('data-period');
      printReport(period, closed.find((p) => p.period === period), txs);
    });
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
 * @param {object} p
 * @param {object[]} txs
 */
function renderPeriodCard(p, txs) {
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
