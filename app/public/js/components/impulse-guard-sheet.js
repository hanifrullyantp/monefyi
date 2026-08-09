/**
 * Impulse guard confirmation sheet (Fase 8.2).
 * @module components/impulse-guard-sheet
 */

import { computeImpulseImpact, loadImpulseSettings } from '../services/impulse-guard.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} tx
 * @param {object} callbacks
 * @returns {Promise<boolean>} true if user confirms purchase
 */
export function showImpulseGuardSheet(tx, callbacks = {}) {
  return new Promise((resolve) => {
    const settings = loadImpulseSettings();
    const impact = computeImpulseImpact(tx, window.STATE || {});
    const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));

    if (!_host) {
      _host = document.createElement('div');
      _host.id = 'impulseGuardHost';
      _host.className = 'innovation-host';
      document.body.appendChild(_host);
    }

    let remaining = settings.cooldown_sec || 30;
    let timerId = null;

    const render = () => {
      _host.innerHTML = `
        <div class="innovation-sheet innovation-sheet--impulse" role="dialog" aria-modal="true">
          <div class="innovation-sheet__head">
            <div class="innovation-sheet__kicker">⏸️ Impulse Guard</div>
            <button type="button" class="innovation-sheet__close" data-action="cancel">×</button>
          </div>
          <p class="impulse-impact">Belanja <strong>Rp ${fmt(impact.amount)}</strong> akan mengurangi aman-harian jadi ~Rp ${fmt(impact.daily_after)}/hari.</p>
          <div class="impulse-stats">
            <div><span>Safe-to-spend sekarang</span><strong>Rp ${fmt(impact.safe_before)}</strong></div>
            <div><span>Setelah belanja</span><strong class="${impact.safe_after < 0 ? 'negative' : ''}">Rp ${fmt(impact.safe_after)}</strong></div>
          </div>
          <ul class="impulse-alts">
            ${impact.alternatives.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}
          </ul>
          ${impact.goal_note ? `<p class="impulse-goal-note">${escapeHtml(impact.goal_note)}</p>` : ''}
          <div class="impulse-cooldown">Tunggu <strong id="impulseTimer">${remaining}</strong> detik sebelum lanjut…</div>
          <div class="impulse-actions">
            <button type="button" class="innovation-btn innovation-btn--ghost tap" data-action="wishlist">💭 Wishlist 30 hari</button>
            ${impact.amount >= 300000 ? '<button type="button" class="innovation-btn innovation-btn--ghost tap" data-action="whatif">Simulasi what-if</button>' : ''}
          </div>
          <button type="button" class="innovation-btn innovation-btn--ghost tap" data-action="cancel">Batal belanja</button>
          <button type="button" class="innovation-btn tap" data-action="confirm" disabled id="impulseConfirm">Tetap beli</button>
        </div>
      `;
      _host.classList.add('is-visible');

      _host.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
        import('../services/impulse-wishlist.js').then(({ recordImpulseSkip }) => {
          recordImpulseSkip({ amount: impact.amount, name: tx.merchant || tx.category });
        }).catch(() => {});
        cleanup();
        resolve(false);
      });

      _host.querySelector('[data-action="wishlist"]')?.addEventListener('click', async () => {
        const { wishlistFromTransaction } = await import('../services/impulse-wishlist.js');
        wishlistFromTransaction(tx);
        cleanup();
        window.showToast?.('Ditambah ke wishlist — review 30 hari lagi', 'success');
        resolve(false);
      });

      _host.querySelector('[data-action="whatif"]')?.addEventListener('click', async () => {
        cleanup();
        resolve(false);
        const { showWhatIfSimulator } = await import('./what-if-simulator.js');
        await showWhatIfSimulator({ tab: 'purchase' });
      });

      const confirmBtn = _host.querySelector('#impulseConfirm');
      timerId = setInterval(() => {
        remaining -= 1;
        const el = _host.querySelector('#impulseTimer');
        if (el) el.textContent = String(Math.max(0, remaining));
        if (remaining <= 0) {
          clearInterval(timerId);
          if (confirmBtn) confirmBtn.disabled = false;
          const cd = _host.querySelector('.impulse-cooldown');
          if (cd) cd.textContent = 'Kamu bisa lanjut jika yakin.';
        }
      }, 1000);

      confirmBtn?.addEventListener('click', () => {
        cleanup();
        callbacks.onConfirm?.();
        resolve(true);
      });
    };

    const cleanup = () => {
      if (timerId) clearInterval(timerId);
      _host?.classList.remove('is-visible');
    };

    render();
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
