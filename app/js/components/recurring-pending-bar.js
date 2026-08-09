/**
 * Banner for due recurring bills — one-click confirm.
 * @module components/recurring-pending-bar
 */

import { Icon } from './icons.js';

/**
 * @param {object} [callbacks]
 * @returns {Promise<HTMLElement|null>}
 */
export async function renderRecurringPendingBar(callbacks = {}) {
  const mod = await import('../services/recurring-transactions.js');
  mod.generateDueRecurring();
  const pending = mod.loadRecurringPending().filter((p) => p.status === 'pending');
  if (!pending.length) return null;

  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
  const el = document.createElement('section');
  el.className = 'home-section recurring-pending-bar';

  el.innerHTML = `
    <div class="recurring-pending-bar__inner">
      <div class="recurring-pending-bar__head">
        ${Icon('calendar', { size: 18 })}
        <strong>${pending.length} tagihan rutin jatuh tempo</strong>
      </div>
      <div class="recurring-pending-list">
        ${pending.slice(0, 3).map((p) => `
          <div class="recurring-pending-item" data-id="${p.id}">
            <div>
              <div class="recurring-pending-item__name">${escapeHtml(p.name)}</div>
              <div class="recurring-pending-item__meta">Rp ${fmt(p.amount)} · ${escapeHtml(p.due_date || '')}</div>
            </div>
            <div class="recurring-pending-item__actions">
              <button type="button" class="tap recurring-confirm-btn" data-confirm="${p.id}">Konfirmasi</button>
              <button type="button" class="tap recurring-dismiss-btn" data-dismiss="${p.id}" aria-label="Abaikan">×</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  el.querySelectorAll('[data-confirm]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-confirm');
      await mod.confirmRecurringPending(id);
      callbacks.onConfirmed?.();
      el.remove();
      if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
      else if (typeof window.refreshAllUI === 'function') window.refreshAllUI({ syncRemote: false });
    });
  });

  el.querySelectorAll('[data-dismiss]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mod.dismissRecurringPending(btn.getAttribute('data-dismiss'));
      btn.closest('.recurring-pending-item')?.remove();
      if (!el.querySelector('.recurring-pending-item')) el.remove();
    });
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
