/**
 * Sheet — prompt user to setup auto-detected recurring bills.
 * @module components/recurring-detect-sheet
 */

/**
 * @param {object} candidate
 * @param {object} [callbacks]
 */
export async function showRecurringDetectSheet(candidate, callbacks = {}) {
  if (!candidate) return;

  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
  const host = document.createElement('div');
  host.className = 'pro-panel-host is-visible';
  host.innerHTML = `
    <div class="pro-panel recurring-detect-sheet" role="dialog" aria-modal="true">
      <div class="pro-panel__head">
        <div>
          <div class="pro-panel__kicker">Otomasi</div>
          <div class="pro-panel__title">🔄 Transaksi Berulang Terdeteksi</div>
        </div>
        <button type="button" class="pro-panel__close" data-close aria-label="Tutup">✕</button>
      </div>
      <p class="recurring-detect-sheet__body">
        <strong>${escapeHtml(candidate.name)}</strong> muncul ~${candidate.occurrences}x dalam 3 bulan,
        rata-rata <strong>Rp ${fmt(candidate.amount)}</strong> setiap tanggal <strong>${candidate.due_day}</strong>.
      </p>
      <label class="recurring-detect-sheet__opt">
        <input type="checkbox" id="recAutoCreate" /> Auto-create transaksi di hari H (tanpa konfirmasi)
      </label>
      <div class="recurring-detect-sheet__actions">
        <button type="button" class="admin-btn" data-setup>Ya, Setup Recurring</button>
        <button type="button" class="admin-btn ghost" data-manual>Setup Manual</button>
        <button type="button" class="admin-btn ghost" data-skip>Tidak</button>
      </div>
    </div>
  `;
  document.body.appendChild(host);

  const close = () => host.remove();
  host.querySelector('[data-close]')?.addEventListener('click', close);
  host.addEventListener('click', (e) => { if (e.target === host) close(); });

  host.querySelector('[data-setup]')?.addEventListener('click', async () => {
    const { addScheduleFromCandidate } = await import('../services/recurring-transactions.js');
    addScheduleFromCandidate(candidate, {
      auto_create: !!host.querySelector('#recAutoCreate')?.checked,
    });
    window.showToast?.('Tagihan rutin disimpan', 'success');
    callbacks.onSaved?.();
    close();
  });

  host.querySelector('[data-manual]')?.addEventListener('click', () => {
    close();
    window.location.hash = '#settings/recurring';
    callbacks.onManual?.();
  });

  host.querySelector('[data-skip]')?.addEventListener('click', async () => {
    const { dismissRecurringCandidate } = await import('../services/recurring-transactions.js');
    dismissRecurringCandidate(candidate.key);
    close();
  });
}

/**
 * Show first undismissed candidate if any.
 * @param {object} [state]
 */
export async function maybePromptRecurringDetection(state = window.STATE) {
  const key = 'monefyi_recurring_detect_prompted';
  if (sessionStorage.getItem(key)) return;

  const { detectRecurringCandidates } = await import('../services/recurring-transactions.js');
  const candidates = detectRecurringCandidates(state?.transactions || [], { months: 3 });
  if (!candidates.length) return;

  sessionStorage.setItem(key, '1');
  await showRecurringDetectSheet(candidates[0]);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
