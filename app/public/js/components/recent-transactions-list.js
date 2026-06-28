/**
 * Recent transactions list (max 5) with SVG category icons.
 * @module components/recent-transactions-list
 */

import { Icon, getCategoryIcon } from './icons.js';

/**
 * @param {string} iso
 * @returns {string}
 */
function formatTxDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (iso === today.toISOString().slice(0, 10)) return 'Hari ini';
  if (iso === yesterday.toISOString().slice(0, 10)) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/**
 * @param {Array<object>} transactions
 * @param {Function} formatIDR
 * @param {object} [callbacks]
 * @returns {HTMLElement}
 */
export function renderRecentTransactionsList(transactions, formatIDR, callbacks = {}) {
  const el = document.createElement('section');
  el.className = 'home-section home-recent-tx';

  const rows = (transactions || []).map((tx) => {
    const isIncome = tx.type === 'income';
    const isExpense = tx.type === 'expense';
    const sign = isIncome ? '+' : isExpense ? '−' : '';
    const amountCls = isIncome ? 'home-tx-row__amount--income' : isExpense ? 'home-tx-row__amount--expense' : '';
    const catIcon = getCategoryIcon(tx.category);
    const title = tx.merchant || tx.category || tx.notes || '(tanpa keterangan)';
    return `
      <button type="button" class="home-tx-row tap" data-tx-id="${tx.id}">
        <span class="home-tx-row__icon">${Icon(catIcon, { size: 20, color: isIncome ? '#10b981' : '#94a3b8' })}</span>
        <span class="home-tx-row__body">
          <span class="home-tx-row__title">${title}</span>
          <span class="home-tx-row__meta">${formatTxDate(tx.date)} · ${tx.category || tx.type}</span>
        </span>
        <span class="home-tx-row__amount ${amountCls}">${sign}${formatIDR(tx.amount)}</span>
        ${Icon('chevronRight', { size: 16, color: 'rgba(255,255,255,0.35)' })}
      </button>
    `;
  }).join('');

  el.innerHTML = `
    <div class="home-section-header">
      <h2 class="home-section-title">${Icon('tag', { size: 18 })} Transaksi Terbaru</h2>
      <button type="button" class="home-section-action tap" data-action="view-all">
        Lihat semua ${Icon('chevronRight', { size: 14 })}
      </button>
    </div>
    <div class="home-tx-list">${rows || '<p class="home-empty">Belum ada transaksi</p>'}</div>
  `;

  el.querySelector('[data-action="view-all"]')?.addEventListener('click', () => callbacks.onViewAll?.());
  el.querySelectorAll('.home-tx-row').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-tx-id');
      const tx = transactions.find((t) => t.id === id);
      if (tx) callbacks.onTransactionClick?.(tx);
    });
  });

  return el;
}
