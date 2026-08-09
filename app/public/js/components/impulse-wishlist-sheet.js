/**
 * Wishlist with 30-day review delay (Growth Sprint 20).
 * @module components/impulse-wishlist-sheet
 */

import {
  loadWishlist,
  removeWishlistItem,
  extendWishlistReview,
  getWishlistReadyForReview,
  loadImpulseSkipStats,
  updateWishlistItem,
} from '../services/impulse-wishlist.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export function showImpulseWishlistSheet(opts = {}) {
  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'impulseWishlistHost';
    _host.className = 'innovation-host';
    document.body.appendChild(_host);
  }

  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
  const list = loadWishlist();
  const ready = getWishlistReadyForReview();
  const stats = loadImpulseSkipStats();

  const daysUntil = (iso) => {
    const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
    return Math.max(0, diff);
  };

  _host.innerHTML = `
    <div class="innovation-sheet innovation-sheet--wishlist" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">💭 Wishlist · review ${ready.length ? ready.length + ' siap' : list.length + ' item'}</div>
        <button type="button" class="innovation-sheet__close" data-action="close">×</button>
      </div>
      ${stats.month_skips ? `
        <div class="wishlist-stats">
          🎉 ${stats.month_skips} skip bulan ini · hemat ~Rp ${fmt(stats.month_saved || 0)}
        </div>
      ` : ''}
      <p class="innovation-sheet__hint">Tambah ke wishlist, review setelah cooling period — bukan beli impulsif.</p>
      ${ready.length ? `
        <section class="wishlist-section">
          <h4>Siap diputuskan</h4>
          ${ready.map((w) => renderRow(w, fmt, true)).join('')}
        </section>
      ` : ''}
      <section class="wishlist-section">
        <h4>${ready.length ? 'Masih pending' : 'Wishlist kamu'}</h4>
        ${list.filter((w) => w.status === 'pending' && !ready.some((r) => r.id === w.id)).length
          ? list.filter((w) => w.status === 'pending' && !ready.some((r) => r.id === w.id))
            .map((w) => renderRow(w, fmt, false, daysUntil(w.review_at))).join('')
          : '<p class="admin-muted">Belum ada item. Gunakan Impulse Guard saat mau belanja besar.</p>'}
      </section>
    </div>
  `;

  _host.classList.add('is-visible');

  const close = () => {
    _host?.classList.remove('is-visible');
    opts.onClose?.();
  };

  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);

  _host.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-remove');
      const item = list.find((w) => w.id === id);
      removeWishlistItem(id);
      if (item?.amount) {
        import('../services/impulse-wishlist.js').then(({ recordImpulseSkip }) => {
          recordImpulseSkip({ amount: item.amount, name: item.name });
          window.showToast?.(`Hemat Rp ${fmt(item.amount)} — item dihapus`, 'success');
        });
      }
      showImpulseWishlistSheet(opts);
    });
  });

  _host.querySelectorAll('[data-extend]').forEach((btn) => {
    btn.addEventListener('click', () => {
      extendWishlistReview(btn.getAttribute('data-extend'), 30);
      window.showToast?.('Review ditunda 30 hari lagi', 'info');
      showImpulseWishlistSheet(opts);
    });
  });

  _host.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      updateWishlistItem(btn.getAttribute('data-buy'), { status: 'purchased' });
      window.showToast?.('Item ditandai dibeli — catat transaksinya ya', 'success');
      showImpulseWishlistSheet(opts);
    });
  });
}

/**
 * @param {object} w
 * @param {Function} fmt
 * @param {boolean} isReady
 * @param {number} [daysLeft]
 */
function renderRow(w, fmt, isReady, daysLeft = 0) {
  return `
    <div class="wishlist-row" data-id="${escapeHtml(w.id)}">
      <div class="wishlist-row__main">
        <strong>${escapeHtml(w.name)}</strong>
        <span>Rp ${fmt(w.amount)}${isReady ? ' · review sekarang' : ` · review ${daysLeft} hari lagi`}</span>
      </div>
      <div class="wishlist-row__actions">
        ${isReady ? `
          <button type="button" class="innovation-btn innovation-btn--ghost tap" data-remove="${escapeHtml(w.id)}">Tidak jadi</button>
          <button type="button" class="innovation-btn innovation-btn--ghost tap" data-extend="${escapeHtml(w.id)}">+30 hari</button>
          <button type="button" class="innovation-btn tap" data-buy="${escapeHtml(w.id)}">Ya, beli</button>
        ` : `
          <button type="button" class="innovation-btn innovation-btn--ghost tap" data-remove="${escapeHtml(w.id)}">Hapus</button>
        `}
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
