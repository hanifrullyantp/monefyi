/**
 * Admin Marketing tab — campaigns, offers, global rules, basic editor.
 * @module pages/admin-marketing
 */

/**
 * @param {HTMLElement} body
 * @param {object} helpers
 */
export async function renderAdminMarketing(body, helpers = {}) {
  const toast = helpers.toast || (() => {});
  const escapeHtml = helpers.escapeHtml || ((s) => String(s ?? ''));
  const fmtNum = helpers.fmtNum || ((n) => String(n));

  const client = window.STATE?.db?.supa;
  if (!client) {
    body.innerHTML = '<div class="admin-card"><p class="admin-muted">Supabase belum terhubung.</p></div>';
    return;
  }

  body.innerHTML = '<p class="admin-muted">Memuat marketing…</p>';

  const [rulesRes, campRes, offerRes] = await Promise.all([
    client.from('marketing_global_rules').select('*').order('key'),
    client.from('marketing_campaigns').select('*').order('created_at', { ascending: false }),
    client.from('marketing_offers').select('*, marketing_campaigns(name, status)').order('priority', { ascending: false }),
  ]);

  if (rulesRes.error || campRes.error || offerRes.error) {
    const msg = rulesRes.error?.message || campRes.error?.message || offerRes.error?.message;
    body.innerHTML = `<div class="admin-card"><p class="admin-muted">Gagal memuat: ${escapeHtml(msg)}. Pastikan migration product_marketing_sync sudah di-apply.</p></div>`;
    return;
  }

  const rules = rulesRes.data || [];
  const campaigns = campRes.data || [];
  const offers = offerRes.data || [];

  body.innerHTML = '<div id="mkAnalyticsHost"></div><div id="mkMainHost"></div>';
  const analyticsHost = body.querySelector('#mkAnalyticsHost');
  const mainHost = body.querySelector('#mkMainHost');

  import('./admin-marketing-analytics.js').then(({ renderMarketingAnalytics }) => {
    renderMarketingAnalytics(analyticsHost, { toast, escapeHtml, fmtNum });
  }).catch(() => {});

  const reload = () => renderAdminMarketing(body, helpers);
  renderMarketingShell(mainHost, { rules, campaigns, offers, client, toast, escapeHtml, fmtNum, reload });
}

/**
 * @param {HTMLElement} body
 * @param {object} ctx
 */
function renderMarketingShell(body, ctx) {
  const { rules, campaigns, offers, client, toast, escapeHtml, fmtNum } = ctx;

  const ruleFields = [
    { key: 'max_offers_per_day', label: 'Max offer / hari', type: 'number' },
    { key: 'allowed_hours_start', label: 'Jam mulai', type: 'number' },
    { key: 'allowed_hours_end', label: 'Jam akhir', type: 'number' },
    { key: 'startup_delay_seconds', label: 'Delay startup (detik)', type: 'number' },
    { key: 'auto_dismiss_after_seconds', label: 'Auto dismiss (detik)', type: 'number' },
    { key: 'cooldown_after_dismiss_days', label: 'Cooldown dismiss (hari)', type: 'number' },
    { key: 'cooldown_after_not_interested_days', label: 'Cooldown not interested (hari)', type: 'number' },
    { key: 'max_dismiss_before_stop', label: 'Max dismiss sebelum stop', type: 'number' },
    { key: 'skip_when_danger', label: 'Skip saat danger', type: 'boolean' },
    { key: 'skip_weekend', label: 'Skip weekend', type: 'boolean' },
    { key: 'show_only_first_login_of_day', label: 'Hanya login pertama / hari', type: 'boolean' },
  ];

  const ruleMap = Object.fromEntries(rules.map((r) => [r.key, r]));

  body.innerHTML = `
    <div class="admin-card">
      <h2>Global rules</h2>
      <p class="admin-muted">Frekuensi & batas tampil offer in-app.</p>
      <div class="admin-form-grid" id="mkRulesForm">
        ${ruleFields.map((f) => {
          const row = ruleMap[f.key];
          const val = row?.value ?? '';
          if (f.type === 'boolean') {
            return `
              <label class="admin-check">
                <input type="checkbox" data-mk-rule="${f.key}" ${val === 'true' ? 'checked' : ''} />
                ${escapeHtml(f.label)}
              </label>
            `;
          }
          return `
            <div class="admin-field">
              <label>${escapeHtml(f.label)}</label>
              <input class="admin-input" type="number" data-mk-rule="${f.key}" value="${escapeHtml(val)}" />
            </div>
          `;
        }).join('')}
      </div>
      <div class="admin-toolbar" style="margin-top:12px">
        <button type="button" class="admin-btn" id="mkSaveRules">Simpan rules</button>
        <span class="admin-muted" id="mkRulesStatus">—</span>
      </div>
    </div>

    <div class="admin-card">
      <div class="admin-toolbar">
        <h2 style="margin:0">Campaigns (${fmtNum(campaigns.length)})</h2>
        <button type="button" class="admin-btn ghost" id="mkNewCampaign">+ Campaign</button>
      </div>
      <div id="mkCampaignEditor" class="admin-form-panel" hidden></div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Nama</th><th>Tipe</th><th>Status</th><th></th><th></th></tr></thead>
          <tbody>
            ${campaigns.map((c) => `
              <tr>
                <td>${escapeHtml(c.name)}</td>
                <td><span class="admin-badge">${escapeHtml(c.type)}</span></td>
                <td><span class="admin-badge">${escapeHtml(c.status)}</span></td>
                <td>
                  <select class="admin-input admin-input--sm" data-mk-campaign="${c.id}">
                    ${['draft', 'active', 'paused', 'archived'].map((s) => `
                      <option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>
                    `).join('')}
                  </select>
                </td>
                <td><button type="button" class="admin-btn ghost admin-input--sm" data-mk-edit-campaign="${c.id}">Edit</button></td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="admin-muted">Belum ada campaign</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="admin-card">
      <div class="admin-toolbar">
        <h2 style="margin:0">Offers (${fmtNum(offers.length)})</h2>
        <button type="button" class="admin-btn ghost" id="mkNewOffer">+ Offer</button>
      </div>
      <div id="mkOfferEditor" class="admin-form-panel" hidden></div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Headline</th><th>Trigger</th><th>Format</th><th>Priority</th><th>Aktif</th><th></th></tr></thead>
          <tbody>
            ${offers.map((o) => {
              const headline = o.content_json?.headline || o.offer_type;
              const trigger = o.display_rules_json?.trigger || 'app_startup';
              const format = o.content_json?.display_format || 'modal';
              return `
                <tr>
                  <td>${escapeHtml(headline)}</td>
                  <td class="admin-muted">${escapeHtml(trigger)}</td>
                  <td class="admin-muted">${escapeHtml(format)}</td>
                  <td>${o.priority ?? '—'}</td>
                  <td>
                    <label class="admin-check">
                      <input type="checkbox" data-mk-offer="${o.id}" ${o.active ? 'checked' : ''} />
                    </label>
                  </td>
                  <td><button type="button" class="admin-btn ghost admin-input--sm" data-mk-edit-offer="${o.id}">Edit</button></td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="6" class="admin-muted">Belum ada offer</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  body.querySelector('#mkSaveRules')?.addEventListener('click', async () => {
    const status = body.querySelector('#mkRulesStatus');
    status.textContent = 'Menyimpan…';
    try {
      const patch = {};
      body.querySelectorAll('[data-mk-rule]').forEach((el) => {
        const key = el.getAttribute('data-mk-rule');
        if (el.type === 'checkbox') patch[key] = el.checked;
        else patch[key] = Number(el.value);
      });
      const { saveGlobalRules } = await import('../services/marketing-engine.js');
      await saveGlobalRules(patch);
      status.textContent = 'Tersimpan.';
      toast('Marketing rules tersimpan', 'success');
    } catch (e) {
      status.textContent = e.message || 'Gagal';
    }
  });

  body.querySelectorAll('[data-mk-campaign]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const id = sel.getAttribute('data-mk-campaign');
      const status = sel.value;
      const { error } = await client.from('marketing_campaigns').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) toast(error.message, 'error');
      else toast('Campaign diperbarui', 'success');
    });
  });

  body.querySelectorAll('[data-mk-offer]').forEach((cb) => {
    cb.addEventListener('change', async () => {
      const id = cb.getAttribute('data-mk-offer');
      const active = cb.checked;
      const { error } = await client.from('marketing_offers').update({ active, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) {
        cb.checked = !active;
        toast(error.message, 'error');
      } else {
        toast(active ? 'Offer diaktifkan' : 'Offer dinonaktifkan', 'success');
      }
    });
  });

  body.querySelector('#mkNewCampaign')?.addEventListener('click', () => {
    showCampaignEditor(body.querySelector('#mkCampaignEditor'), { client, toast, escapeHtml, onSaved: ctx.reload || (() => renderAdminMarketing(body, { toast, escapeHtml, fmtNum })) });
  });

  body.querySelector('#mkNewOffer')?.addEventListener('click', () => {
    showOfferEditor(body.querySelector('#mkOfferEditor'), { campaigns, offers, client, toast, escapeHtml, onSaved: ctx.reload || (() => renderAdminMarketing(body, { toast, escapeHtml, fmtNum })) });
  });

  body.querySelectorAll('[data-mk-edit-offer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-mk-edit-offer');
      const offer = offers.find((o) => o.id === id);
      if (!offer) return;
      showOfferEditor(body.querySelector('#mkOfferEditor'), { campaigns, offers, offer, client, toast, escapeHtml, onSaved: ctx.reload || (() => renderAdminMarketing(body, { toast, escapeHtml, fmtNum })) });
    });
  });

  body.querySelectorAll('[data-mk-edit-campaign]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-mk-edit-campaign');
      const camp = campaigns.find((c) => c.id === id);
      if (!camp) return;
      showCampaignEditor(body.querySelector('#mkCampaignEditor'), { campaign: camp, client, toast, escapeHtml, onSaved: ctx.reload || (() => renderAdminMarketing(body, { toast, escapeHtml, fmtNum })) });
    });
  });
}

/**
 * @param {HTMLElement} host
 * @param {object} ctx
 */
function showCampaignEditor(host, ctx) {
  if (!host) return;
  const camp = ctx.campaign;
  host.hidden = false;
  host.innerHTML = `
    <h3>${camp ? 'Edit campaign' : 'Campaign baru'}</h3>
    <div class="admin-form-grid">
      <div class="admin-field"><label>Nama</label><input class="admin-input" id="mkCampName" value="${ctx.escapeHtml(camp?.name || '')}" /></div>
      <div class="admin-field admin-field--full"><label>Deskripsi</label><textarea class="admin-input" id="mkCampDesc" rows="2">${ctx.escapeHtml(camp?.description || '')}</textarea></div>
      <div class="admin-field"><label>Tipe</label>
        <select class="admin-input" id="mkCampType">
          ${['conversion', 'upsell', 'retention', 'reactivation', 'announcement'].map((t) => `
            <option value="${t}" ${camp?.type === t ? 'selected' : ''}>${t}</option>
          `).join('')}
        </select>
      </div>
      <div class="admin-field"><label>Status</label>
        <select class="admin-input" id="mkCampStatus">
          ${['draft', 'active', 'paused', 'archived'].map((s) => `
            <option value="${s}" ${(camp?.status || 'draft') === s ? 'selected' : ''}>${s}</option>
          `).join('')}
        </select>
      </div>
      <div class="admin-field"><label>Start date</label><input class="admin-input" type="date" id="mkCampStart" value="${camp?.start_date ? String(camp.start_date).slice(0, 10) : ''}" /></div>
      <div class="admin-field"><label>End date</label><input class="admin-input" type="date" id="mkCampEnd" value="${camp?.end_date ? String(camp.end_date).slice(0, 10) : ''}" /></div>
    </div>
    <div class="admin-toolbar">
      <button type="button" class="admin-btn" id="mkCampSave">Simpan</button>
      <button type="button" class="admin-btn ghost" id="mkCampCancel">Batal</button>
    </div>
  `;

  host.querySelector('#mkCampCancel')?.addEventListener('click', () => { host.hidden = true; host.innerHTML = ''; });
  host.querySelector('#mkCampSave')?.addEventListener('click', async () => {
    const name = host.querySelector('#mkCampName')?.value?.trim();
    const type = host.querySelector('#mkCampType')?.value || 'conversion';
    if (!name) return ctx.toast('Nama wajib', 'error');
    const row = {
      name,
      description: host.querySelector('#mkCampDesc')?.value?.trim() || null,
      type,
      status: host.querySelector('#mkCampStatus')?.value || 'draft',
      start_date: host.querySelector('#mkCampStart')?.value || null,
      end_date: host.querySelector('#mkCampEnd')?.value || null,
      updated_at: new Date().toISOString(),
    };
    const q = camp?.id
      ? ctx.client.from('marketing_campaigns').update(row).eq('id', camp.id)
      : ctx.client.from('marketing_campaigns').insert({ ...row, created_at: new Date().toISOString() });
    const { error } = await q;
    if (error) ctx.toast(error.message, 'error');
    else {
      ctx.toast('Campaign tersimpan', 'success');
      ctx.onSaved?.();
    }
  });
}

/**
 * @param {HTMLElement} host
 * @param {object} ctx
 */
function showOfferEditor(host, ctx) {
  if (!host) return;
  const o = ctx.offer;
  const c = o?.content_json || {};
  const aud = o?.target_audience_json || {};
  const disp = o?.display_rules_json || {};

  host.hidden = false;
  host.innerHTML = `
    <h3>${o ? 'Edit offer' : 'Offer baru'}</h3>
    <div class="admin-form-grid">
      <div class="admin-field"><label>Campaign</label>
        <select class="admin-input" id="mkOffCampaign">
          <option value="">—</option>
          ${ctx.campaigns.map((c) => `<option value="${c.id}" ${o?.campaign_id === c.id ? 'selected' : ''}>${ctx.escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="admin-field"><label>Offer type</label><input class="admin-input" id="mkOffType" value="${ctx.escapeHtml(o?.offer_type || 'custom_offer')}" /></div>
      <div class="admin-field"><label>Priority (1-10)</label><input class="admin-input" type="number" id="mkOffPriority" value="${o?.priority ?? 5}" min="1" max="10" /></div>
      <div class="admin-field"><label>Max shows / user</label><input class="admin-input" type="number" id="mkOffMaxShows" value="${o?.max_shows_per_user ?? 3}" /></div>
      <div class="admin-field"><label>Cooldown (hari)</label><input class="admin-input" type="number" id="mkOffCooldown" value="${o?.cooldown_days ?? 7}" /></div>
      <div class="admin-field"><label>Trigger</label>
        <select class="admin-input" id="mkOffTrigger">
          ${['app_startup', 'goal_creation_attempted', 'monthly_close_completed', 'dashboard_persistent'].map((t) => `
            <option value="${t}" ${(disp.trigger || 'app_startup') === t ? 'selected' : ''}>${t}</option>
          `).join('')}
        </select>
      </div>
      <div class="admin-field"><label>Display format</label>
        <select class="admin-input" id="mkOffFormat">
          ${['modal', 'banner', 'sheet', 'card', 'toast'].map((f) => `
            <option value="${f}" ${(c.display_format || 'modal') === f ? 'selected' : ''}>${f}</option>
          `).join('')}
        </select>
      </div>
      <div class="admin-field"><label>Headline</label><input class="admin-input" id="mkOffHeadline" value="${ctx.escapeHtml(c.headline || '')}" /></div>
      <div class="admin-field admin-field--full"><label>Body</label><textarea class="admin-input" id="mkOffBody" rows="3">${ctx.escapeHtml(c.body || '')}</textarea></div>
      <div class="admin-field"><label>CTA text</label><input class="admin-input" id="mkOffCta" value="${ctx.escapeHtml(c.cta_text || 'Lihat Detail')}" /></div>
      <div class="admin-field"><label>CTA action / URL</label><input class="admin-input" id="mkOffCtaAction" value="${ctx.escapeHtml(c.cta_action || c.cta_url || '#paket')}" placeholder="open_settings_household | #paket" /></div>
      <div class="admin-field admin-field--full"><label>Audience JSON</label><textarea class="admin-input" id="mkOffAudience" rows="2">${ctx.escapeHtml(JSON.stringify(aud.plans ? aud : { plans: ['trial'] }, null, 0))}</textarea></div>
    </div>
    <div id="mkVariantEditor" class="admin-form-panel" hidden></div>
    <div class="admin-toolbar" style="margin-top:12px">
      <button type="button" class="admin-btn" id="mkOffSave">Simpan</button>
      <button type="button" class="admin-btn ghost" id="mkOffCancel">Batal</button>
    </div>
  `;

  host.querySelector('#mkOffCancel')?.addEventListener('click', () => { host.hidden = true; host.innerHTML = ''; });

  if (o?.id) loadVariantEditor(host, ctx, o.id);

  host.querySelector('#mkOffSave')?.addEventListener('click', async () => {
    let audience = {};
    try {
      audience = JSON.parse(host.querySelector('#mkOffAudience')?.value || '{}');
    } catch {
      return ctx.toast('Audience JSON tidak valid', 'error');
    }

    const ctaRaw = host.querySelector('#mkOffCtaAction')?.value?.trim() || '#paket';
    const content_json = {
      headline: host.querySelector('#mkOffHeadline')?.value?.trim() || 'Monefyi',
      body: host.querySelector('#mkOffBody')?.value?.trim() || '',
      cta_text: host.querySelector('#mkOffCta')?.value?.trim() || 'Lihat',
      display_format: host.querySelector('#mkOffFormat')?.value || 'modal',
      dismiss_label: 'Nanti',
    };
    if (ctaRaw.startsWith('#') || ctaRaw.startsWith('http')) content_json.cta_url = ctaRaw;
    else content_json.cta_action = ctaRaw;

    const row = {
      campaign_id: host.querySelector('#mkOffCampaign')?.value || null,
      offer_type: host.querySelector('#mkOffType')?.value?.trim() || 'custom_offer',
      priority: Number(host.querySelector('#mkOffPriority')?.value) || 5,
      max_shows_per_user: Number(host.querySelector('#mkOffMaxShows')?.value) || 3,
      cooldown_days: Number(host.querySelector('#mkOffCooldown')?.value) || 7,
      content_json,
      target_audience_json: audience,
      display_rules_json: { trigger: host.querySelector('#mkOffTrigger')?.value || 'app_startup' },
      active: o?.active ?? true,
      updated_at: new Date().toISOString(),
    };

    const q = o?.id
      ? ctx.client.from('marketing_offers').update(row).eq('id', o.id)
      : ctx.client.from('marketing_offers').insert({ ...row, created_at: new Date().toISOString() });

    const { error } = await q;
    if (error) ctx.toast(error.message, 'error');
    else {
      ctx.toast('Offer tersimpan', 'success');
      ctx.onSaved?.();
    }
  });
}

/**
 * A/B variant editor for an offer.
 * @param {HTMLElement} host
 * @param {object} ctx
 * @param {string} offerId
 */
async function loadVariantEditor(host, ctx, offerId) {
  const panel = host.querySelector('#mkVariantEditor');
  if (!panel) return;
  const { data: variants } = await ctx.client.from('marketing_offer_variants').select('*').eq('offer_id', offerId).order('variant_key');
  const list = variants || [];

  panel.hidden = false;
  panel.innerHTML = `
    <h4>A/B Variants</h4>
    <p class="admin-muted">Split traffic by weight (total ~100).</p>
    ${list.map((v) => `
      <div class="admin-field admin-field--full mk-variant-row" data-vid="${v.id}">
        <label>Variant ${ctx.escapeHtml(v.variant_key)} (${v.weight}%)</label>
        <input class="admin-input" data-v-headline value="${ctx.escapeHtml(v.content_json?.headline || '')}" placeholder="Headline override" />
      </div>
    `).join('') || '<p class="admin-muted">Belum ada variant — tambah A/B di bawah.</p>'}
    <div class="admin-form-grid">
      <div class="admin-field"><label>Variant key</label><input class="admin-input" id="mkVarKey" placeholder="B" /></div>
      <div class="admin-field"><label>Weight %</label><input class="admin-input" type="number" id="mkVarWeight" value="50" min="0" max="100" /></div>
      <div class="admin-field admin-field--full"><label>Headline override</label><input class="admin-input" id="mkVarHeadline" /></div>
    </div>
    <button type="button" class="admin-btn ghost" id="mkVarAdd">+ Tambah variant</button>
  `;

  panel.querySelector('#mkVarAdd')?.addEventListener('click', async () => {
    const key = panel.querySelector('#mkVarKey')?.value?.trim() || 'B';
    const weight = Number(panel.querySelector('#mkVarWeight')?.value) || 50;
    const headline = panel.querySelector('#mkVarHeadline')?.value?.trim() || '';
    const { error } = await ctx.client.from('marketing_offer_variants').insert({
      offer_id: offerId,
      variant_key: key,
      weight,
      content_json: headline ? { headline } : {},
      active: true,
    });
    if (error) ctx.toast(error.message, 'error');
    else {
      ctx.toast('Variant ditambahkan', 'success');
      loadVariantEditor(host, ctx, offerId);
    }
  });
}
