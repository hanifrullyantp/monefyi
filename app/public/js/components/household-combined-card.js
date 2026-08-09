/**
 * Combined household dashboard card — shared income/expense/goals.
 * @module components/household-combined-card
 */

/**
 * @param {object} dashboard from buildCombinedHouseholdDashboard
 * @param {object} [callbacks]
 * @returns {HTMLElement}
 */
export function renderHouseholdCombinedCard(dashboard, callbacks = {}) {
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
  const s = dashboard.shared;
  const netPositive = s.net >= 0;

  const el = document.createElement('section');
  el.className = 'home-section household-combined-card';
  el.innerHTML = `
    <div class="household-combined-card__inner">
      <div class="household-combined-card__head">
        <span>🏠</span>
        <div>
          <div class="household-combined-card__title">Dashboard Bersama</div>
          <div class="household-combined-card__meta">${escapeHtml(dashboard.householdName)} · ${dashboard.memberCount} anggota</div>
        </div>
      </div>
      <div class="household-combined-card__grid">
        <div class="household-combined-card__kpi">
          <span class="label">Pemasukan</span>
          <strong>Rp ${fmt(s.income)}</strong>
        </div>
        <div class="household-combined-card__kpi">
          <span class="label">Pengeluaran</span>
          <strong>Rp ${fmt(s.expense)}</strong>
        </div>
        <div class="household-combined-card__kpi ${netPositive ? 'is-positive' : 'is-negative'}">
          <span class="label">Net</span>
          <strong>${netPositive ? '+' : ''}Rp ${fmt(s.net)}</strong>
          <span class="hint">${s.savingsRate}% saving</span>
        </div>
      </div>
      ${s.topCategories.length ? `
        <div class="household-combined-card__cats">
          <span class="label">Top kategori bersama</span>
          <ul>${s.topCategories.map((c) => `<li>${escapeHtml(c.name)} · Rp ${fmt(c.amount)}</li>`).join('')}</ul>
        </div>
      ` : '<p class="household-combined-card__empty">Belum ada transaksi shared bulan ini — tandai transaksi sebagai Bersama saat input.</p>'}
      ${dashboard.sharedGoals?.length ? `
        <div class="household-combined-card__goals">
          <span class="label">Goals bersama</span>
          ${dashboard.sharedGoals.slice(0, 2).map((g) => `
            <div class="household-combined-card__goal">
              <span>${escapeHtml(g.name)}</span>
              <strong>${g.pct}%</strong>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <button type="button" class="household-combined-card__cta tap" data-action="open-page">Buka halaman Bersama</button>
      <button type="button" class="household-combined-card__cta tap ghost" data-action="manage">Kelola household</button>
    </div>
  `;

  el.querySelector('[data-action="manage"]')?.addEventListener('click', () => {
    callbacks.onManage?.();
  });
  el.querySelector('[data-action="open-page"]')?.addEventListener('click', () => {
    if (typeof window.openHousehold === 'function') window.openHousehold();
    else callbacks.onOpenPage?.();
  });

  return el;
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
