/**
 * Admin Tutorial CMS — seed, edit step text, upload media.
 * @module pages/admin-tutorial
 */

let _tutRows = [];
let _ctx = {};

/**
 * @param {HTMLElement} body
 * @param {object} ctx
 */
export async function renderAdminTutorial(body, ctx = {}) {
  _ctx = ctx;
  body.innerHTML = `
    <div class="admin-card">
      <h2>Tutorial / Help Center</h2>
      <p class="admin-muted">Kelola langkah tutorial in-app. Konten disimpan di Supabase; app user memuat dari server dengan fallback default.</p>
      <div class="admin-toolbar">
        <button type="button" class="admin-btn" id="tutSeed">Seed konten default</button>
        <button type="button" class="admin-btn ghost" id="tutRefresh">Refresh</button>
        <input class="admin-input" id="tutFilter" placeholder="Filter kategori / artikel…" style="flex:1" />
        <span id="tutSt" class="admin-muted">—</span>
      </div>
      <div id="tutList" class="admin-row-list" style="margin-top:12px"></div>
    </div>
  `;

  const load = async () => {
    const st = body.querySelector('#tutSt');
    const list = body.querySelector('#tutList');
    st.textContent = 'Memuat…';
    try {
      if (window.STATE?.db?.supa) window.__monefyiSupabase = window.STATE.db.supa;
      if (window.STATE?.db?.user) window.currentUser = window.STATE.db.user;
      const mod = await import('../services/tutorial-service.js');
      _tutRows = await mod.listTutorialStepsForAdmin();
      paintTut(list, body.querySelector('#tutFilter')?.value || '', mod);
      st.textContent = `${_tutRows.length} langkah`;
    } catch (e) {
      st.textContent = 'Error';
      list.innerHTML = `<p class="admin-muted">${escapeHtml(e.message)}. Jalankan migration tutorial + Seed.</p>`;
    }
  };

  const paintTut = (list, q, mod) => {
    const qq = String(q || '').toLowerCase();
    const rows = qq
      ? _tutRows.filter((r) => `${r.categoryTitle} ${r.articleTitle} ${r.text}`.toLowerCase().includes(qq))
      : _tutRows;
    if (!rows.length) {
      list.innerHTML = '<p class="admin-muted">Tidak ada langkah.</p>';
      return;
    }
    list.innerHTML = rows.map((r) => `
      <div class="admin-row" style="flex-direction:column;align-items:stretch;gap:8px">
        <div><strong>${escapeHtml(r.categoryTitle)}</strong> · ${escapeHtml(r.articleTitle)} · #${r.stepIndex + 1}</div>
        <textarea class="admin-input tut-step-text" data-step-id="${escapeHtml(r.id)}" rows="3" style="width:100%;resize:vertical;font-size:12px">${escapeHtml(r.text)}</textarea>
        <div class="admin-user-actions">
          <button type="button" class="admin-btn ghost tut-save-text" data-step-id="${escapeHtml(r.id)}">Simpan teks</button>
          ${r.media_url ? `<span class="admin-badge">${escapeHtml(r.media_type || 'media')}</span>` : '<span class="admin-muted">tanpa media</span>'}
          <label class="admin-btn ghost" style="cursor:pointer">Upload
            <input type="file" accept="image/*,video/*,.gif" class="hidden" data-tut-up="${escapeHtml(r.id)}" style="display:none" />
          </label>
          ${r.media_url ? `<button type="button" class="admin-btn danger" data-tut-clear="${escapeHtml(r.id)}">Hapus media</button>` : ''}
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.tut-save-text').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const stepId = btn.getAttribute('data-step-id');
        const ta = list.querySelector(`.tut-step-text[data-step-id="${stepId}"]`);
        if (!stepId || !ta) return;
        btn.disabled = true;
        body.querySelector('#tutSt').textContent = 'Menyimpan…';
        const res = await mod.updateTutorialStepText(stepId, ta.value);
        if (!res.success) toast(res.error || 'Gagal simpan', 'error');
        else toast('Teks tersimpan', 'success');
        await load();
        btn.disabled = false;
      });
    });

    list.querySelectorAll('[data-tut-up]').forEach((input) => {
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        const stepId = input.getAttribute('data-tut-up');
        if (!file || !stepId) return;
        body.querySelector('#tutSt').textContent = 'Uploading…';
        const res = await mod.uploadTutorialMedia(file, stepId);
        if (!res.success) toast(res.error || 'Upload gagal', 'error');
        else toast('Media tersimpan', 'success');
        await load();
      });
    });

    list.querySelectorAll('[data-tut-clear]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const res = await mod.clearTutorialMedia(btn.getAttribute('data-tut-clear'));
        if (!res.success) toast(res.error || 'Gagal', 'error');
        else toast('Media dihapus', 'success');
        await load();
      });
    });
  };

  body.querySelector('#tutRefresh')?.addEventListener('click', load);
  body.querySelector('#tutFilter')?.addEventListener('input', (e) => {
    const list = body.querySelector('#tutList');
    import('../services/tutorial-service.js').then((mod) => paintTut(list, e.target.value, mod));
  });
  body.querySelector('#tutSeed')?.addEventListener('click', async () => {
    const st = body.querySelector('#tutSt');
    st.textContent = 'Seeding…';
    try {
      const mod = await import('../services/tutorial-service.js');
      const res = await mod.seedTutorialDefaults();
      if (!res.success) throw new Error(res.error || 'seed failed');
      st.textContent = `Seed OK: ${res.counts.categories} kat`;
      await load();
    } catch (e) {
      st.textContent = e.message || 'Seed gagal';
    }
  });
  await load();
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toast(msg, type) {
  if (_ctx.toast) _ctx.toast(msg, type);
  else if (window.MonefyiUI?.showToast) window.MonefyiUI.showToast(msg, type);
}
