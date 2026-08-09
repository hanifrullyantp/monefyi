/**
 * Split transaction UI — ROADMAP 3.3.
 * @module components/transaction-split-sheet
 */

import { buildSplitTransactions } from '../services/transaction-split.js';

/**
 * @param {object} original
 * @param {object} [opts]
 * @returns {Promise<object[]|null>} new transactions or null if cancelled
 */
export function showTransactionSplitSheet(original, opts = {}) {
  if (!original || Number(original.amount) <= 0) {
    window.showToast?.('Transaksi tidak valid untuk split', 'warn');
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'budget-modal-overlay tx-split-overlay';
    const catA = original.category || 'Lainnya';
    const half = Math.round(Number(original.amount) / 2);
    const rest = Number(original.amount) - half;

    overlay.innerHTML = `
      <div class="budget-modal tx-split-modal" role="dialog" aria-modal="true">
        <header class="modal-header">
          <div>
            <h2>Split Transaksi</h2>
            <p class="modal-subtitle">Total Rp ${fmt(original.amount)} · ${escapeHtml(original.merchant || original.category || '')}</p>
          </div>
          <button type="button" class="close-btn" data-act="close">×</button>
        </header>
        <div class="modal-body">
          <div class="tx-split-row">
            <label>Kategori 1</label>
            <input class="admin-input" id="txsCat1" value="${escapeHtml(catA)}" />
            <input class="admin-input" type="number" id="txsAmt1" value="${half}" min="0" />
          </div>
          <div class="tx-split-row">
            <label>Kategori 2</label>
            <input class="admin-input" id="txsCat2" value="Lainnya" />
            <input class="admin-input" type="number" id="txsAmt2" value="${rest}" min="0" />
          </div>
          <p class="settings-desc" id="txsStatus">—</p>
        </div>
        <footer class="modal-footer">
          <button type="button" class="btn-secondary-budget" data-act="close">Batal</button>
          <button type="button" class="btn-primary-budget" data-act="apply">Terapkan split</button>
        </footer>
      </div>
    `;

    const close = (result = null) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelectorAll('[data-act="close"]').forEach((b) => {
      b.addEventListener('click', () => close(null));
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });

    overlay.querySelector('[data-act="apply"]')?.addEventListener('click', () => {
      const status = overlay.querySelector('#txsStatus');
      const splits = [
        { category: overlay.querySelector('#txsCat1')?.value, amount: overlay.querySelector('#txsAmt1')?.value },
        { category: overlay.querySelector('#txsCat2')?.value, amount: overlay.querySelector('#txsAmt2')?.value },
      ];
      const res = buildSplitTransactions(original, splits);
      if (!res.success) {
        status.textContent = res.error || 'Gagal';
        return;
      }
      close(res.transactions);
    });

    document.body.appendChild(overlay);
  });
}

function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
