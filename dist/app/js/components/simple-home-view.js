/**
 * Mode Simpel — "Hanya Hari Ini" home layer (TASK 3.3).
 * @module components/simple-home-view
 */

import { computeDailySituation } from '../services/daily-situation.js';
import { Icon } from './icons.js';

/**
 * @param {object} ctx
 * @param {object} callbacks
 * @returns {HTMLElement}
 */
export function renderSimpleHomeView(ctx, callbacks = {}) {
  const state = ctx.state || window.STATE || {};
  const situation = computeDailySituation(state);
  const today = new Date().toISOString().slice(0, 10);
  const todaySpend = (state.transactions || [])
    .filter((t) => {
      if (String(t.date || '').slice(0, 10) !== today) return false;
      const type = String(t.type || 'expense').toLowerCase();
      return type === 'expense' || type === 'pengeluaran';
    })
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const safe = situation.status === 'incomplete' ? 0 : Number(situation.safeToSpend || 0);
  const remaining = Math.max(0, safe - todaySpend);
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));

  const wrap = document.createElement('div');
  wrap.className = 'simple-home-view';
  wrap.innerHTML = `
    <div class="simple-home-toolbar">
      <span class="simple-home-mode-label">Mode Simpel</span>
      <button type="button" class="simple-home-toggle tap" data-action="toggle-full">
        Mode Lengkap ${Icon('chevronRight', { size: 14 })}
      </button>
    </div>
    <div class="simple-home-card">
      ${situation.status === 'incomplete' ? `
        <p class="simple-home-incomplete">Isi pemasukan dulu supaya kami bisa hitung batas aman harianmu.</p>
        <button type="button" class="simple-home-cta tap" data-action="complete">Lengkapi Data</button>
      ` : `
        <p class="simple-home-label">Hari ini aman pakai:</p>
        <p class="simple-home-amount">Rp ${fmt(safe)}</p>
        <div class="simple-home-stats">
          <span>Sudah dipakai: Rp ${fmt(todaySpend)}</span>
          <span>Sisa: Rp ${fmt(remaining)}</span>
        </div>
        <button type="button" class="simple-home-cta tap" data-action="add">
          ${Icon('plus', { size: 18 })} Catat Pengeluaran
        </button>
      `}
      <button type="button" class="simple-home-expand tap" data-action="expand">
        Lihat selengkapnya ↓
      </button>
    </div>
  `;

  wrap.querySelector('[data-action="add"]')?.addEventListener('click', () => {
    callbacks.onAddTransaction?.();
  });
  wrap.querySelector('[data-action="complete"]')?.addEventListener('click', () => {
    callbacks.onCompleteData?.();
  });
  wrap.querySelector('[data-action="expand"]')?.addEventListener('click', () => {
    callbacks.onExpand?.();
  });
  wrap.querySelector('[data-action="toggle-full"]')?.addEventListener('click', () => {
    callbacks.onSwitchFull?.();
  });

  return wrap;
}

/**
 * Toggle chip for full mode header.
 * @param {object} callbacks
 * @returns {HTMLElement}
 */
export function renderHomeModeToggle(callbacks = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'home-mode-toggle tap';
  btn.textContent = 'Mode Simpel';
  btn.addEventListener('click', () => callbacks.onSwitchSimple?.());
  return btn;
}
