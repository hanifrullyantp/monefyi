/**
 * Household summary card for home (Fase 5.3).
 * @module components/household-card
 */

/**
 * @param {object} summary from getHouseholdSummary
 * @param {object} [callbacks]
 * @returns {HTMLElement}
 */
export function renderHouseholdCard(summary, callbacks = {}) {
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
  const el = document.createElement('section');
  el.className = 'home-section household-card';

  el.innerHTML = `
    <div class="household-card__inner">
      <div class="household-card__head">
        <span>👨‍👩‍👧</span>
        <div>
          <div class="household-card__title">${escapeHtml(summary.name)}</div>
          <div class="household-card__meta">${summary.member_count} anggota · kode ${escapeHtml(summary.invite_code)}</div>
        </div>
      </div>
      <div class="household-card__stat">
        Pengeluaran rumah tangga bulan ini: <strong>Rp ${fmt(summary.month_expense)}</strong>
      </div>
      <button type="button" class="household-card__cta tap">Kelola household</button>
    </div>
  `;

  el.querySelector('.household-card__cta')?.addEventListener('click', () => {
    callbacks.onManage?.();
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
