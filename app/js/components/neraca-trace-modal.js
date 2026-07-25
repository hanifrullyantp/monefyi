/**
 * Imbalance trace modal — suspects + auto-balance to suspense (already applied in sheet).
 * @module components/neraca-trace-modal
 */

import { Icon } from './icons.js';
import { saveSuspenseLog, setNeracaMeta, upsertEquityEvent, upsertDebt, upsertAsset } from '../services/neraca-store.js';

/**
 * @param {unknown} str
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/**
 * @param {number} num
 */
function formatIDR(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

/**
 * @param {object} opts
 * @param {object} opts.sheet
 * @param {object[]} opts.suspects
 * @param {string[]} opts.tips
 * @param {() => void} [opts.onBalanced]
 */
export function showNeracaTraceModal(opts) {
  const { sheet, suspects = [], tips = [], onBalanced } = opts;
  document.getElementById('neracaTraceBackdrop')?.remove();

  const amount = Math.abs(Number(sheet?.diff || sheet?.suspense?.amount || 0));
  const message = sheet?.suspense?.message
    || (sheet?.diff > 0
      ? `Aktiva lebih besar Rp ${formatIDR(amount)} dari Pasiva`
      : `Pasiva lebih besar Rp ${formatIDR(amount)} dari Aktiva`);

  const backdrop = document.createElement('div');
  backdrop.id = 'neracaTraceBackdrop';
  backdrop.className = 'neraca-overlay';
  backdrop.innerHTML = `
    <div class="neraca-modal" role="dialog" aria-modal="true" aria-labelledby="neraca-trace-title">
      <header class="neraca-modal-head">
        <h2 id="neraca-trace-title">${Icon('alertTriangle', { size: 16 })} Lacak Penyebab</h2>
        <button type="button" class="neraca-icon-btn" data-action="close" aria-label="Tutup">${Icon('x', { size: 16 })}</button>
      </header>
      <div class="neraca-modal-body">
        <div class="neraca-suspect">
          <div class="neraca-suspect-title">Ringkasan selisih</div>
          <div>${escapeHtml(message)}</div>
          <div style="margin-top:6px;font-weight:800">Rp ${formatIDR(amount)}</div>
        </div>

        <section>
          <h3 style="margin:0 0 8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em">Saran perbaikan</h3>
          <ul class="neraca-tips">
            ${tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}
          </ul>
        </section>

        <section>
          <h3 style="margin:0 0 8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em">
            Transaksi suspect (${suspects.length})
          </h3>
          <div class="neraca-item-list">
            ${suspects.length ? suspects.slice(0, 20).map((s) => `
              <div class="neraca-item">
                <div>
                  <div class="neraca-item-name">${escapeHtml(s.tx?.merchant || s.tx?.category || s.tx?.id || 'Transaksi')}</div>
                  <div class="neraca-item-meta">${escapeHtml(s.tx?.date || '')} · ${escapeHtml(s.reason)}</div>
                </div>
                <div class="neraca-item-amt">Rp ${formatIDR(Math.abs(Number(s.tx?.amount || 0)))}</div>
              </div>
            `).join('') : `<p style="font-size:12px;color:var(--app-muted)">Tidak ada transaksi suspect.</p>`}
          </div>
        </section>

        <section>
          <h3 style="margin:0 0 8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em">Quick assign selisih</h3>
          <p style="font-size:11px;color:var(--app-muted);margin:0 0 8px">
            Tetapkan seluruh selisih ke salah satu kategori agar neraca seimbang tanpa akun Suspense.
          </p>
          <div class="neraca-form-grid">
            <select class="form-input" data-role="assign-target">
              ${sheet?.diff > 0 ? `
                <option value="modal">Modal</option>
                <option value="hutang_lainnya">Hutang Lainnya</option>
                <option value="simpanan">Simpanan</option>
              ` : `
                <option value="aset_lainnya">Aset Lainnya</option>
                <option value="properti">Properti</option>
                <option value="investasi">Investasi</option>
                <option value="piutang">Piutang (nama: Selisih)</option>
              `}
            </select>
            <input type="text" class="form-input" data-role="assign-name" placeholder="Nama entri" value="Penyeimbang selisih">
          </div>
        </section>
      </div>
      <footer class="neraca-modal-foot">
        <button type="button" class="neraca-btn neraca-btn-primary" data-action="assign">Terapkan Quick Assign</button>
        <button type="button" class="neraca-btn" data-action="keep-suspense">Biarkan di Suspense</button>
        <button type="button" class="neraca-btn" data-action="close">Tutup</button>
      </footer>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();

  backdrop.addEventListener('click', async (e) => {
    if (e.target === backdrop || e.target.closest('[data-action="close"]')) {
      close();
      return;
    }
    if (e.target.closest('[data-action="keep-suspense"]')) {
      try {
        await saveSuspenseLog({
          as_of: sheet?.endISO || new Date().toISOString().slice(0, 10),
          side: sheet?.suspense?.side || (sheet?.diff > 0 ? 'pasiva' : 'aktiva'),
          amount,
          reasons: tips,
        });
        await setNeracaMeta('suspense_acknowledged', true);
      } catch { /* ignore */ }
      close();
      onBalanced?.();
      return;
    }
    if (e.target.closest('[data-action="assign"]')) {
      const target = backdrop.querySelector('[data-role="assign-target"]')?.value;
      const name = backdrop.querySelector('[data-role="assign-name"]')?.value?.trim() || 'Penyeimbang selisih';
      if (!amount || !target) return;
      try {
        if (target === 'modal' || target === 'simpanan') {
          await upsertEquityEvent({
            kind: target,
            name,
            amount,
            event_date: sheet?.endISO || new Date().toISOString().slice(0, 10),
            notes: 'Quick assign dari Lacak Penyebab',
          });
        } else if (target.startsWith('hutang')) {
          await upsertDebt({
            category: target,
            name,
            amount,
            notes: 'Quick assign dari Lacak Penyebab',
          });
        } else if (target === 'piutang') {
          await upsertReceivable({
            name,
            amount,
            notes: 'Quick assign dari Lacak Penyebab',
          });
        } else {
          await upsertAsset({
            category: target,
            name,
            amount,
            notes: 'Quick assign dari Lacak Penyebab',
          });
        }
        close();
        onBalanced?.();
      } catch (err) {
        console.error('[neraca-trace] assign failed', err);
      }
    }
  });
}
