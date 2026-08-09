/**
 * Household "Bersama" page — combined dashboard + shared transactions.
 * @module pages/household-page
 */

/**
 * @param {HTMLElement} container
 * @param {object} [ctx]
 */
export async function renderHouseholdPage(container, ctx = {}) {
  if (!container) return;

  const state = ctx.state || window.STATE || {};
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));

  const {
    hasActiveHousehold,
    getDashboardViewMode,
    setDashboardViewMode,
    filterTransactionsForView,
    renderHouseholdViewToggle,
  } = await import('../services/household-shared.js');

  if (!hasActiveHousehold()) {
    container.innerHTML = `
      <div class="household-page household-page--empty">
        <h1>Bersama</h1>
        <p class="muted">Buat atau gabung household dulu di Pengaturan → Sosial.</p>
        <button type="button" class="tap btn-primary household-page__cta" data-action="settings">Buka Pengaturan</button>
      </div>
    `;
    container.querySelector('[data-action="settings"]')?.addEventListener('click', () => {
      window.openSettings?.('social');
    });
    return;
  }

  setDashboardViewMode('shared');

  try {
    const { pullSharedTransactionsFromRemote } = await import('../services/household-shared-sync.js');
    await pullSharedTransactionsFromRemote();
  } catch (e) {
    console.warn('[household-page] sync', e);
  }

  const { buildCombinedHouseholdDashboard } = await import('../services/household-combined-dashboard.js');
  const { renderHouseholdCombinedCard } = await import('../components/household-combined-card.js');

  const dash = buildCombinedHouseholdDashboard(state);
  const month = dash?.month || state.selectedMonth || '';
  const sharedTxs = filterTransactionsForView(state.transactions || [], 'shared')
    .filter((t) => String(t.date || '').startsWith(month))
    .slice(0, 20);

  container.innerHTML = '';
  container.className = 'household-page-root';

  const header = document.createElement('header');
  header.className = 'household-page__header';
  header.innerHTML = `
    <h1>Bersama</h1>
    <p class="muted">Transaksi & ringkasan household · ${escapeHtml(month)}</p>
  `;
  container.appendChild(header);

  const toggle = renderHouseholdViewToggle();
  if (toggle) container.appendChild(toggle);

  if (dash) {
    container.appendChild(renderHouseholdCombinedCard(dash, {
      onManage: () => window.openSettings?.('social'),
    }));
  }

  const listSection = document.createElement('section');
  listSection.className = 'household-page__txs home-section';
  listSection.innerHTML = `
    <div class="household-page__txs-head">
      <h2>Transaksi shared</h2>
      <button type="button" class="tap ghost household-page__sync" data-action="sync">Sync</button>
    </div>
    ${sharedTxs.length ? `
      <ul class="household-page__tx-list">
        ${sharedTxs.map((t) => `
          <li class="household-page__tx-item" data-id="${escapeHtml(t.id)}">
            <span class="household-page__tx-date">${escapeHtml(String(t.date || '').slice(5))}</span>
            <span class="household-page__tx-cat">${escapeHtml(t.category || 'Lainnya')}</span>
            <span class="household-page__tx-amt ${t.type === 'income' ? 'is-income' : 'is-expense'}">
              ${t.type === 'income' ? '+' : '-'}Rp ${fmt(t.amount)}
            </span>
          </li>
        `).join('')}
      </ul>
    ` : '<p class="household-page__empty">Belum ada transaksi shared bulan ini.</p>'}
  `;
  container.appendChild(listSection);

  listSection.querySelector('[data-action="sync"]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const { pullSharedTransactionsFromRemote } = await import('../services/household-shared-sync.js');
      const r = await pullSharedTransactionsFromRemote();
      window.toast?.(`Sync OK · ${r.total} transaksi shared`, 'success');
      await renderHouseholdPage(container, ctx);
    } catch (err) {
      window.toast?.(err.message || 'Sync gagal', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  listSection.querySelectorAll('.household-page__tx-item').forEach((row) => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-id');
      if (id && typeof window.openTransactionDetail === 'function') window.openTransactionDetail(id);
    });
  });
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
