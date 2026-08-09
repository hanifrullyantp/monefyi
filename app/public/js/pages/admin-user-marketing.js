/**
 * Admin user marketing tools — offer history & test offer queue.
 * @module pages/admin-user-marketing
 */

/**
 * @param {string} userId
 * @param {string} userEmail
 * @param {object} helpers
 */
export async function showUserMarketingPanel(userId, userEmail, helpers = {}) {
  const toast = helpers.toast || (() => {});
  const escapeHtml = helpers.escapeHtml || ((s) => String(s ?? ''));
  const client = window.STATE?.db?.supa;
  if (!client || !userId) return;

  const host = document.createElement('div');
  host.className = 'admin-modal-backdrop';
  host.innerHTML = '<p class="admin-muted">Memuat…</p>';
  document.body.appendChild(host);

  const close = () => host.remove();
  host.addEventListener('click', (e) => { if (e.target === host) close(); });

  const [{ data: interactions }, { data: offers }] = await Promise.all([
    client.from('user_offer_interactions')
      .select('action, shown_at, offer_id, metadata')
      .eq('user_id', userId)
      .order('shown_at', { ascending: false })
      .limit(20),
    client.from('marketing_offers')
      .select('id, offer_type, content_json')
      .eq('active', true)
      .order('priority', { ascending: false }),
  ]);

  host.innerHTML = `
    <div class="admin-card admin-modal-card" style="max-width:520px;margin:auto">
      <div class="admin-toolbar">
        <h2 style="margin:0">Marketing — ${escapeHtml(userEmail || userId.slice(0, 8))}</h2>
        <button type="button" class="admin-btn ghost" data-close>Tutup</button>
      </div>
      <h3 style="font-size:14px;margin:12px 0 8px">Riwayat offer (20 terakhir)</h3>
      <ul class="admin-row-list" style="max-height:200px;overflow:auto">
        ${(interactions || []).map((i) => `
          <li class="admin-row">
            <span>${escapeHtml(i.action)} · ${escapeHtml(String(i.shown_at || '').slice(0, 16))}</span>
            <span class="admin-muted">${escapeHtml(String(i.offer_id || '').slice(0, 8))}</span>
          </li>
        `).join('') || '<li class="admin-muted">Belum ada interaksi</li>'}
      </ul>
      <h3 style="font-size:14px;margin:12px 0 8px">Kirim test offer</h3>
      <p class="admin-muted" style="font-size:12px">Offer akan tampil saat user login berikutnya.</p>
      <select class="admin-input" id="admTestOffer" style="margin-bottom:8px">
        <option value="">— Pilih offer —</option>
        ${(offers || []).map((o) => `
          <option value="${o.id}">${escapeHtml(o.content_json?.headline || o.offer_type)}</option>
        `).join('')}
      </select>
      <button type="button" class="admin-btn" id="admSendTest">Queue test offer</button>
    </div>
  `;

  host.querySelector('[data-close]')?.addEventListener('click', close);
  host.querySelector('#admSendTest')?.addEventListener('click', async () => {
    const offerId = host.querySelector('#admTestOffer')?.value;
    if (!offerId) return toast('Pilih offer dulu', 'error');
    try {
      const { queueTestOffer } = await import('../services/marketing-engine.js');
      await queueTestOffer(userId, offerId);
      toast('Test offer di-queue', 'success');
      close();
    } catch (e) {
      toast(e.message || 'Gagal', 'error');
    }
  });
}
