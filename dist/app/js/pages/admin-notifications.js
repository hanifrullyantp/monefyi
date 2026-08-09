/**
 * Admin Notifications tab — templates & global rules (Sprint 4).
 * @module pages/admin-notifications
 */

/**
 * @param {HTMLElement} body
 * @param {object} helpers
 */
export async function renderAdminNotifications(body, helpers = {}) {
  const toast = helpers.toast || (() => {});
  const escapeHtml = helpers.escapeHtml || ((s) => String(s ?? ''));
  const fmtNum = helpers.fmtNum || ((n) => String(n));

  const client = window.STATE?.db?.supa;
  if (!client) {
    body.innerHTML = '<div class="admin-card"><p class="admin-muted">Supabase belum terhubung.</p></div>';
    return;
  }

  body.innerHTML = '<p class="admin-muted">Memuat notifikasi…</p>';

  const [tplRes, rulesRes] = await Promise.all([
    client.from('notification_templates').select('*').order('category').order('name'),
    client.from('notification_global_rules').select('*').order('category').order('key'),
  ]);

  if (tplRes.error || rulesRes.error) {
    const msg = tplRes.error?.message || rulesRes.error?.message;
    body.innerHTML = `<div class="admin-card"><p class="admin-muted">${escapeHtml(msg)}. Apply migration sprint4.</p></div>`;
    return;
  }

  const templates = tplRes.data || [];
  const rules = rulesRes.data || [];

  body.innerHTML = `
    <div class="admin-card">
      <h2>Global notification rules</h2>
      <div class="admin-form-grid" id="ntRulesForm">
        ${rules.map((r) => `
          <div class="admin-field">
            <label>${escapeHtml(r.description || r.key)}</label>
            <input class="admin-input" data-nt-rule="${escapeHtml(r.key)}" value="${escapeHtml(r.value)}" />
          </div>
        `).join('')}
      </div>
      <div class="admin-toolbar" style="margin-top:12px">
        <button type="button" class="admin-btn" id="ntSaveRules">Simpan rules</button>
      </div>
    </div>

    <div class="admin-card">
      <div class="admin-toolbar">
        <h2 style="margin:0">Templates (${fmtNum(templates.length)})</h2>
        <button type="button" class="admin-btn ghost" id="ntNewTpl">+ Template</button>
      </div>
      <div id="ntTplEditor" class="admin-form-panel" hidden></div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Nama</th><th>Kategori</th><th>Status</th><th>Send count</th><th></th></tr></thead>
          <tbody>
            ${templates.map((t) => `
              <tr>
                <td>${escapeHtml(t.name)}</td>
                <td><span class="admin-badge">${escapeHtml(t.category)}</span></td>
                <td>
                  <label class="admin-check">
                    <input type="checkbox" data-nt-active="${t.id}" ${t.active ? 'checked' : ''} /> Aktif
                  </label>
                </td>
                <td>${fmtNum(t.send_count || 0)}</td>
                <td><button type="button" class="admin-btn ghost admin-input--sm" data-nt-edit="${t.id}">Edit</button></td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="admin-muted">Belum ada template</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  body.querySelector('#ntSaveRules')?.addEventListener('click', async () => {
    for (const el of body.querySelectorAll('[data-nt-rule]')) {
      const key = el.getAttribute('data-nt-rule');
      await client.from('notification_global_rules').upsert({
        key,
        value: el.value,
        updated_at: new Date().toISOString(),
      });
    }
    toast('Notification rules tersimpan', 'success');
  });

  body.querySelectorAll('[data-nt-active]').forEach((cb) => {
    cb.addEventListener('change', async () => {
      const id = cb.getAttribute('data-nt-active');
      const { error } = await client.from('notification_templates').update({
        active: cb.checked,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) toast(error.message, 'error');
    });
  });

  body.querySelector('#ntNewTpl')?.addEventListener('click', () => {
    showTemplateEditor(body.querySelector('#ntTplEditor'), { client, toast, escapeHtml, onSaved: () => renderAdminNotifications(body, helpers) });
  });

  body.querySelectorAll('[data-nt-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tpl = templates.find((t) => t.id === btn.getAttribute('data-nt-edit'));
      showTemplateEditor(body.querySelector('#ntTplEditor'), { tpl, client, toast, escapeHtml, onSaved: () => renderAdminNotifications(body, helpers) });
    });
  });
}

/**
 * @param {HTMLElement} host
 * @param {object} ctx
 */
function showTemplateEditor(host, ctx) {
  if (!host) return;
  const t = ctx.tpl;

  host.hidden = false;
  host.innerHTML = `
    <h3>${t ? 'Edit template' : 'Template baru'}</h3>
    <div class="admin-form-grid">
      <div class="admin-field"><label>Key (unique)</label><input class="admin-input" id="ntKey" value="${ctx.escapeHtml(t?.template_key || '')}" ${t ? 'readonly' : ''} /></div>
      <div class="admin-field"><label>Nama</label><input class="admin-input" id="ntName" value="${ctx.escapeHtml(t?.name || '')}" /></div>
      <div class="admin-field"><label>Kategori</label>
        <select class="admin-input" id="ntCat">
          ${['transaction', 'budget', 'analysis', 'marketing', 'milestone', 'system'].map((c) => `
            <option value="${c}" ${t?.category === c ? 'selected' : ''}>${c}</option>
          `).join('')}
        </select>
      </div>
      <div class="admin-field"><label>Frequency</label>
        <select class="admin-input" id="ntFreq">
          ${['once', 'daily', 'weekly', 'monthly', 'custom'].map((f) => `
            <option value="${f}" ${t?.frequency === f ? 'selected' : ''}>${f}</option>
          `).join('')}
        </select>
      </div>
      <div class="admin-field admin-field--full"><label>Title template</label><input class="admin-input" id="ntTitle" value="${ctx.escapeHtml(t?.title_template || '')}" placeholder="{user_name}, {amount}" /></div>
      <div class="admin-field admin-field--full"><label>Body template</label><textarea class="admin-input" id="ntBody" rows="2">${ctx.escapeHtml(t?.body_template || '')}</textarea></div>
      <div class="admin-field"><label>Deep link</label><input class="admin-input" id="ntLink" value="${ctx.escapeHtml(t?.deep_link || '/app/#home')}" /></div>
      <div class="admin-field"><label>Rate limit / day</label><input class="admin-input" type="number" id="ntRate" value="${t?.rate_limit_per_day ?? 1}" /></div>
    </div>
    <div class="admin-toolbar" style="margin-top:12px">
      <button type="button" class="admin-btn" id="ntSave">Simpan</button>
      <button type="button" class="admin-btn ghost" id="ntCancel">Batal</button>
    </div>
  `;

  host.querySelector('#ntCancel')?.addEventListener('click', () => { host.hidden = true; host.innerHTML = ''; });

  host.querySelector('#ntSave')?.addEventListener('click', async () => {
    const row = {
      template_key: host.querySelector('#ntKey')?.value?.trim(),
      name: host.querySelector('#ntName')?.value?.trim(),
      category: host.querySelector('#ntCat')?.value,
      frequency: host.querySelector('#ntFreq')?.value,
      title_template: host.querySelector('#ntTitle')?.value?.trim() || '',
      body_template: host.querySelector('#ntBody')?.value?.trim() || '',
      deep_link: host.querySelector('#ntLink')?.value?.trim() || '/app/#home',
      rate_limit_per_day: Number(host.querySelector('#ntRate')?.value) || 1,
      trigger_type: t?.trigger_type || 'schedule',
      trigger_config_json: t?.trigger_config_json || {},
      active: t?.active ?? true,
      updated_at: new Date().toISOString(),
    };
    if (!row.template_key || !row.name) return ctx.toast('Key & nama wajib', 'error');

    const q = t?.id
      ? ctx.client.from('notification_templates').update(row).eq('id', t.id)
      : ctx.client.from('notification_templates').insert({ ...row, created_at: new Date().toISOString() });

    const { error } = await q;
    if (error) ctx.toast(error.message, 'error');
    else {
      ctx.toast('Template tersimpan', 'success');
      ctx.onSaved?.();
    }
  });
}
