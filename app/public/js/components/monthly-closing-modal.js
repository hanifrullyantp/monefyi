/**
 * Monthly closing modal — tutup buku ritual.
 * @module components/monthly-closing-modal
 */

import { Icon } from './icons.js';
import { buildClosingSummary } from '../services/monthly-closing.js';
import { getOrCreateActivePeriod } from '../services/monthly-period.js';

/**
 * @param {object} opts
 */
export async function showMonthlyClosingModal(opts = {}) {
  const {
    period,
    transactions = window.STATE?.transactions || [],
    onComplete,
    upsertTransaction,
  } = opts;

  const userId = window.STATE?.db?.user?.id;
  if (!userId) return;

  const periodRow = await getOrCreateActivePeriod(userId, period, transactions);
  const summary = buildClosingSummary(periodRow.period, transactions);

  const overlay = document.createElement('div');
  overlay.className = 'monthly-close-overlay';
  overlay.innerHTML = renderModalHtml(summary, periodRow);

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.querySelector('[data-action="close"]')?.addEventListener('click', close);
  overlay.querySelector('[data-action="dismiss"]')?.addEventListener('click', () => {
    try {
      sessionStorage.setItem(`closing_dismiss_${periodRow.period}`, '1');
    } catch { /* ignore */ }
    close();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelectorAll('[data-allocation]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const type = btn.getAttribute('data-allocation');
      const amount = Math.abs(summary.net);
      btn.disabled = true;
      try {
        const { executeMonthlyClosing } = await import('../services/monthly-closing.js');
        const result = await executeMonthlyClosing({
          periodId: periodRow.id,
          period: periodRow.period,
          allocation: {
            type,
            amount,
            label: btn.textContent?.trim(),
            fromAccount: 'BCA',
            toAccount: type === 'emergency_fund' ? 'Tabungan' : 'BCA',
          },
          transactions,
          upsertTransaction,
        });
        close();
        onComplete?.(result);
        if (window.showToast) window.showToast('Buku bulan ini sudah ditutup', 'success');
      } catch (e) {
        console.error('[closing]', e);
        if (window.showToast) window.showToast('Gagal tutup buku', 'error');
        btn.disabled = false;
      }
    });
  });
}

/**
 * @param {object} summary
 * @param {object} periodRow
 */
function renderModalHtml(summary, periodRow) {
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n || 0)));
  const isSurplus = summary.isSurplus;
  const netLabel = isSurplus ? 'SURPLUS' : 'KURANG';
  const netClass = isSurplus ? 'is-surplus' : 'is-deficit';

  const allocationButtons = isSurplus ? `
    <button type="button" class="mclose-opt tap" data-allocation="emergency_fund">${Icon('shield', { size: 14 })} Dana Darurat</button>
    <button type="button" class="mclose-opt tap" data-allocation="investment">${Icon('trendingUp', { size: 14 })} Investasi</button>
    <button type="button" class="mclose-opt tap" data-allocation="debt_extra">${Icon('creditCard', { size: 14 })} Bayar Cicilan Extra</button>
    <button type="button" class="mclose-opt tap" data-allocation="carry_over">${Icon('calendar', { size: 14 })} Carry-over ke bulan depan</button>
    <button type="button" class="mclose-opt tap mclose-opt--muted" data-allocation="personal">Ambil untuk kebutuhan pribadi</button>
  ` : `
    <button type="button" class="mclose-opt tap" data-allocation="cover_from_savings">${Icon('wallet', { size: 14 })} Ambil dari Tabungan</button>
    <button type="button" class="mclose-opt tap" data-allocation="new_debt">${Icon('creditCard', { size: 14 })} Catat sebagai utang</button>
  `;

  const topCats = (summary.topCategories || []).slice(0, 3).map((c) =>
    `<li>${escapeHtml(c.category)}: Rp ${fmt(c.amount)}</li>`,
  ).join('');

  return `
    <div class="monthly-close-modal" role="dialog" aria-modal="true">
      <header class="monthly-close-header">
        <h2>${isSurplus ? '🎉' : '📊'} Ringkasan ${escapeHtml(summary.period)}</h2>
        <button type="button" class="close-btn" data-action="close" aria-label="Tutup">×</button>
      </header>
      <div class="monthly-close-body">
        <div class="mclose-stats">
          <div><span>Income</span><strong>Rp ${fmt(summary.income)}</strong></div>
          <div><span>Pengeluaran</span><strong>Rp ${fmt(summary.expense)}</strong></div>
          <div class="mclose-net ${netClass}"><span>${netLabel}</span><strong>${isSurplus ? '+' : '-'}Rp ${fmt(Math.abs(summary.net))}</strong></div>
        </div>
        ${topCats ? `<ul class="mclose-cats">${topCats}</ul>` : ''}
        <p class="mclose-prompt">${isSurplus ? 'Mau alokasikan surplus ke mana?' : 'Kekurangan dari mana?'}</p>
        <div class="mclose-options">${allocationButtons}</div>
        <button type="button" class="mclose-skip tap" data-action="dismiss">Ingatkan nanti</button>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

if (typeof window !== 'undefined') {
  window.monefyiMonthlyClosingModal = { showMonthlyClosingModal };
}
