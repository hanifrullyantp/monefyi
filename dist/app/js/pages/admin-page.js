/**
 * Admin Console — full-page responsive overlay.
 * Deep-links: #admin | #admin/dashboard | #admin/users | #admin/plans | #admin/landing | #admin/feedback | #admin/config | #admin/tutorial
 */

import { Icon } from '../components/icons.js';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'users', label: 'Users' },
  { id: 'plans', label: 'Plans & Pricing' },
  { id: 'landing', label: 'Landing' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'config', label: 'Config' },
  { id: 'tutorial', label: 'Tutorial' },
];

let _root = null;
let _tab = 'dashboard';
let _hashBound = false;
let _ctx = null;
let _usersCache = [];
let _feedbackCache = [];
let _tutRows = [];

/**
 * @param {HTMLElement} root
 * @param {object} ctx helpers from app.js
 */
export async function openAdminPage(root, ctx = {}) {
  if (!root) return;
  _root = root;
  _ctx = ctx;
  _tab = parseAdminHash().tab || 'dashboard';

  root.classList.add('admin-page-overlay', 'is-open');
  document.body.classList.add('admin-console-open');
  setAdminHash(_tab);
  renderShell();
  ensureHashListener();
  await loadTab(_tab);
}

export function closeAdminPage() {
  if (!_root) return;
  _root.classList.remove('is-open');
  _root.innerHTML = '';
  document.body.classList.remove('admin-console-open');
  if (String(location.hash || '').startsWith('#admin')) {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  }
}

export function parseAdminHash() {
  const raw = String(location.hash || '').replace(/^#/, '');
  if (!raw.startsWith('admin')) return {};
  const parts = raw.split('/').filter(Boolean);
  const tab = parts[1] && TABS.some((t) => t.id === parts[1]) ? parts[1] : 'dashboard';
  return { tab };
}

function setAdminHash(tab) {
  const hash = `#admin/${tab || 'dashboard'}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

function ensureHashListener() {
  if (_hashBound) return;
  _hashBound = true;
  window.addEventListener('hashchange', () => {
    if (!_root?.classList.contains('is-open')) return;
    if (!String(location.hash || '').startsWith('#admin')) {
      closeAdminPage();
      return;
    }
    const { tab } = parseAdminHash();
    if (tab && tab !== _tab) {
      _tab = tab;
      renderShell();
      loadTab(_tab);
    }
  });
}

function cfg() {
  return window.MONEFYI_CONFIG || window.__monefyiConfig || {};
}

function toast(msg, type = 'info') {
  if (window.MonefyiUI?.showToast) window.MonefyiUI.showToast(msg, type);
  else if (_ctx?.toast) _ctx.toast(msg);
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtNum(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
}

function fmtDate(v) {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('id-ID'); } catch { return '—'; }
}

async function edgePost(fnName, body = {}) {
  const base = String(cfg().supabaseUrl || '').replace(/\/+$/, '');
  const anon = cfg().supabaseAnonKey || cfg().supabaseKey || '';
  const tok = _ctx?.getAccessToken?.() || window.STATE?.db?.session?.access_token || '';
  if (!base || !tok) throw new Error('Not authenticated');
  const res = await fetch(`${base}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${tok}`,
    },
    body: JSON.stringify(body || {}),
  });
  const txt = await res.text().catch(() => '');
  let data = {};
  try { data = JSON.parse(txt || '{}'); } catch { data = { raw: txt }; }
  if (!res.ok) throw new Error(data.error || txt || `HTTP ${res.status}`);
  return data;
}

function renderShell() {
  if (!_root) return;
  _root.innerHTML = `
    <div class="admin-page-top">
      <div class="admin-page-brand">
        <div class="admin-page-brand-icon">${Icon('shield', { size: 20 })}</div>
        <div>
          <h1>Admin Console</h1>
          <p>Super Admin · Monefyi</p>
        </div>
      </div>
      <button type="button" class="admin-btn ghost" id="adminCloseBtn" aria-label="Tutup">Tutup</button>
    </div>
    <nav class="admin-page-nav" role="tablist">
      ${TABS.map((t) => `
        <button type="button" class="admin-nav-btn ${_tab === t.id ? 'is-active' : ''}" data-admin-tab="${t.id}">${t.label}</button>
      `).join('')}
    </nav>
    <div class="admin-page-body" id="adminPageBody">
      <p class="admin-muted">Memuat…</p>
    </div>
  `;
  _root.querySelector('#adminCloseBtn')?.addEventListener('click', () => {
    closeAdminPage();
    _ctx?.onClose?.();
  });
  _root.querySelectorAll('[data-admin-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-admin-tab');
      if (!id || id === _tab) return;
      _tab = id;
      setAdminHash(id);
      renderShell();
      loadTab(id);
    });
  });
}

async function loadTab(tab) {
  const body = _root?.querySelector('#adminPageBody');
  if (!body) return;
  body.innerHTML = '<p class="admin-muted">Memuat…</p>';
  try {
    if (tab === 'dashboard') await renderDashboard(body);
    else if (tab === 'users') await renderUsers(body);
    else if (tab === 'plans') await renderPlans(body);
    else if (tab === 'landing') await renderLanding(body);
    else if (tab === 'feedback') await renderFeedback(body);
    else if (tab === 'config') await renderConfig(body);
    else if (tab === 'tutorial') await renderTutorial(body);
  } catch (e) {
    console.error('[admin]', e);
    body.innerHTML = `<div class="admin-card"><p class="admin-muted">Gagal memuat: ${escapeHtml(e.message)}</p></div>`;
  }
}

/* ─── Dashboard ─── */
async function renderDashboard(body) {
  const fn = cfg().fnAdminDashboard || 'monefyi-admin-dashboard';
  const data = await edgePost(fn, {});
  const t = data.totals || {};
  const byPlan = data.byPlan || {};
  const fb = data.feedbackByType || {};

  body.innerHTML = `
    <div class="admin-kpi-grid">
      <div class="admin-kpi"><div class="admin-kpi-label">Total users</div><div class="admin-kpi-value">${fmtNum(t.users)}</div><div class="admin-kpi-sub">+${fmtNum(t.new7)} / 7h · +${fmtNum(t.new30)} / 30h</div></div>
      <div class="admin-kpi"><div class="admin-kpi-label">Aktif 7 hari</div><div class="admin-kpi-value">${fmtNum(t.activeUsers7d)}</div><div class="admin-kpi-sub">Ada transaksi</div></div>
      <div class="admin-kpi"><div class="admin-kpi-label">Trial / Paid</div><div class="admin-kpi-value">${fmtNum(t.trialActive)} / ${fmtNum(t.paidActive)}</div><div class="admin-kpi-sub">MRR ≈ Rp ${fmtNum(t.mrr)}</div></div>
      <div class="admin-kpi"><div class="admin-kpi-label">Feedback open</div><div class="admin-kpi-value">${fmtNum(t.feedbackOpen)}</div><div class="admin-kpi-sub">Bug ${fb.bug || 0} · Fitur ${fb.feature || 0}</div></div>
    </div>
    <div class="admin-card">
      <h2>Plan mix</h2>
      <div class="admin-row-list">
        ${['none', 'trial', 'monthly', 'lifetime'].map((k) => `
          <div class="admin-row"><span>${k}</span><strong>${fmtNum(byPlan[k] || 0)}</strong></div>
        `).join('')}
      </div>
    </div>
    <div class="admin-card">
      <h2>Signup terbaru</h2>
      <div class="admin-row-list">
        ${(data.recentSignups || []).map((u) => `
          <div class="admin-row">
            <span>${escapeHtml(u.name || u.id?.slice(0, 8))}</span>
            <span class="admin-badge">${escapeHtml(u.plan_type || 'none')}</span>
          </div>
        `).join('') || '<p class="admin-muted">Belum ada data</p>'}
      </div>
      <div class="admin-toolbar" style="margin-top:12px">
        <button type="button" class="admin-btn ghost" data-go="users">Kelola users</button>
        <button type="button" class="admin-btn ghost" data-go="feedback">Lihat feedback</button>
      </div>
    </div>
    <div class="admin-card">
      <h2>Feedback terbaru</h2>
      <div class="admin-row-list">
        ${(data.recentFeedback || []).map((f) => `
          <div class="admin-row">
            <span><span class="admin-badge">${escapeHtml(f.type)}</span> ${escapeHtml(f.title)}</span>
            <span class="admin-muted">${escapeHtml(f.status)}</span>
          </div>
        `).join('') || '<p class="admin-muted">Belum ada tiket</p>'}
      </div>
    </div>
  `;
  body.querySelectorAll('[data-go]').forEach((b) => {
    b.addEventListener('click', () => {
      _tab = b.getAttribute('data-go');
      setAdminHash(_tab);
      renderShell();
      loadTab(_tab);
    });
  });
}

/* ─── Users ─── */
async function renderUsers(body) {
  body.innerHTML = `
    <div class="admin-toolbar">
      <input type="search" id="admUserQ" class="admin-input" placeholder="Cari email…" style="flex:1;min-width:140px" />
      <select id="admUserPlan" class="admin-input">
        <option value="all">Semua plan</option>
        <option value="none">none</option>
        <option value="trial">trial</option>
        <option value="monthly">monthly</option>
        <option value="lifetime">lifetime</option>
      </select>
      <select id="admUserStatus" class="admin-input">
        <option value="all">Semua status</option>
        <option value="active">plan active</option>
        <option value="expired">plan expired</option>
        <option value="suspended">suspended</option>
        <option value="pending">pending</option>
      </select>
      <button type="button" class="admin-btn" id="admUserRefresh">Refresh</button>
      <button type="button" class="admin-btn ghost" id="admUserAdd">+ User</button>
    </div>
    <div id="admUsersStatus" class="admin-muted" style="margin-bottom:8px">—</div>
    <div id="admUsersList"></div>
  `;

  const refresh = async () => {
    const statusEl = body.querySelector('#admUsersStatus');
    const list = body.querySelector('#admUsersList');
    statusEl.textContent = 'Memuat…';
    try {
      const fn = cfg().fnAdminUsers || 'monefyi-admin-users';
      const out = await edgePost(fn, {
        q: body.querySelector('#admUserQ')?.value || '',
        plan: body.querySelector('#admUserPlan')?.value || 'all',
        status: body.querySelector('#admUserStatus')?.value || 'all',
        page: 1,
        pageSize: 100,
      });
      _usersCache = Array.isArray(out.items) ? out.items : [];
      statusEl.textContent = `${_usersCache.length} user`;
      list.innerHTML = _usersCache.length
        ? _usersCache.map(renderUserCard).join('')
        : '<div class="admin-card"><p class="admin-muted">Tidak ada user.</p></div>';
      wireUserCards(list);
    } catch (e) {
      console.error(e);
      statusEl.textContent = 'Gagal';
      list.innerHTML = `<div class="admin-card"><p class="admin-muted">${escapeHtml(e.message)}</p></div>`;
    }
  };

  body.querySelector('#admUserRefresh')?.addEventListener('click', refresh);
  body.querySelector('#admUserAdd')?.addEventListener('click', () => showAddUserModal(refresh));
  let t = null;
  body.querySelector('#admUserQ')?.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(refresh, 300);
  });
  body.querySelector('#admUserPlan')?.addEventListener('change', refresh);
  body.querySelector('#admUserStatus')?.addEventListener('change', refresh);
  await refresh();
}

function renderUserCard(u) {
  const id = escapeHtml(u.id);
  const st = String(u.status || 'active');
  const badge = st === 'suspended' ? 'danger' : st === 'pending' ? 'warn' : '';
  return `
    <div class="admin-user-card" data-uid="${id}">
      <div class="admin-user-head">
        <div>
          <div class="admin-user-email">${escapeHtml(u.email || '—')}</div>
          <div class="admin-user-meta">${escapeHtml(u.profile_role || 'user')} · dibuat ${fmtDate(u.created_at)}</div>
        </div>
        <span class="admin-badge ${badge}">${escapeHtml(st)}</span>
      </div>
      <div class="admin-user-grid">
        <label>Nama<input class="admin-input" data-f="name" value="${escapeHtml(u.name || '')}" /></label>
        <label>Phone<input class="admin-input" data-f="phone" value="${escapeHtml(u.phone || '')}" /></label>
        <label>Plan
          <select class="admin-input" data-f="plan_type">
            ${['none', 'trial', 'monthly', 'lifetime'].map((p) =>
              `<option value="${p}" ${p === (u.plan_type || 'none') ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </label>
        <label>Expiry<input type="date" class="admin-input" data-f="expiry" value="${u.expires_at ? String(u.expires_at).slice(0, 10) : ''}" /></label>
        <label>Status akun
          <select class="admin-input" data-f="status">
            ${['active', 'suspended', 'pending'].map((s) =>
              `<option value="${s}" ${s === st ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </label>
        <label>Password baru<input type="password" class="admin-input" data-f="new_password" placeholder="min 8 char" autocomplete="new-password" /></label>
        <label style="flex-direction:row;align-items:center;gap:8px;text-transform:none">
          <input type="checkbox" data-f="email_notifications" ${u.email_notifications !== false ? 'checked' : ''} /> Email notif
        </label>
        <label style="flex-direction:row;align-items:center;gap:8px;text-transform:none">
          <input type="checkbox" data-f="push_notifications" ${u.push_notifications !== false ? 'checked' : ''} /> Push notif
        </label>
      </div>
      <div class="admin-user-actions">
        <button type="button" class="admin-btn" data-act="save">Simpan</button>
        <button type="button" class="admin-btn ghost" data-act="trial">Grant Trial</button>
        <button type="button" class="admin-btn ghost" data-act="pw">Set Password</button>
        ${st === 'suspended'
          ? '<button type="button" class="admin-btn ghost" data-act="activate">Activate</button>'
          : '<button type="button" class="admin-btn danger" data-act="suspend">Suspend</button>'}
      </div>
    </div>
  `;
}

function wireUserCards(list) {
  const fn = cfg().fnAdminUpdateUser || 'monefyi-admin-update-user';
  list.querySelectorAll('.admin-user-card').forEach((card) => {
    const uid = card.getAttribute('data-uid');
    const val = (f) => card.querySelector(`[data-f="${f}"]`);
    card.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const act = btn.getAttribute('data-act');
        btn.disabled = true;
        try {
          if (act === 'save') {
            const plan = val('plan_type')?.value;
            const dateVal = val('expiry')?.value;
            await edgePost(fn, {
              user_id: uid,
              name: val('name')?.value || '',
              phone: val('phone')?.value || '',
              status: val('status')?.value,
              plan_type: plan,
              plan_expires_at: plan === 'lifetime' ? null : (dateVal ? new Date(dateVal).toISOString() : null),
              email_notifications: !!val('email_notifications')?.checked,
              push_notifications: !!val('push_notifications')?.checked,
            });
            toast('User disimpan', 'success');
          } else if (act === 'trial') {
            await edgePost(fn, { user_id: uid, grant_trial: true, trial_days: 7 });
            toast('Trial 7 hari di-grant', 'success');
          } else if (act === 'pw') {
            const pw = val('new_password')?.value || '';
            if (pw.length < 8) throw new Error('Password min 8 karakter');
            await edgePost(fn, { user_id: uid, new_password: pw });
            toast('Password diubah', 'success');
            if (val('new_password')) val('new_password').value = '';
          } else if (act === 'suspend') {
            await edgePost(fn, { action: 'suspend', user_id: uid });
            toast('User di-suspend', 'success');
          } else if (act === 'activate') {
            await edgePost(fn, { action: 'activate', user_id: uid });
            toast('User diaktifkan', 'success');
          }
          const body = _root?.querySelector('#adminPageBody');
          if (body) await renderUsers(body);
        } catch (e) {
          console.error(e);
          toast(e.message || 'Gagal', 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });
  });
}

function showAddUserModal(onDone) {
  const backdrop = document.createElement('div');
  backdrop.className = 'admin-modal-backdrop';
  backdrop.innerHTML = `
    <div class="admin-modal">
      <h3>Tambah user</h3>
      <div class="admin-user-grid">
        <label>Email<input class="admin-input" id="addEmail" type="email" /></label>
        <label>Password<input class="admin-input" id="addPw" type="password" minlength="8" /></label>
        <label>Nama<input class="admin-input" id="addName" /></label>
        <label>Phone<input class="admin-input" id="addPhone" /></label>
        <label>Plan
          <select class="admin-input" id="addPlan">
            <option value="none">none</option>
            <option value="trial">trial</option>
            <option value="monthly">monthly</option>
            <option value="lifetime">lifetime</option>
          </select>
        </label>
      </div>
      <div class="admin-modal-actions">
        <button type="button" class="admin-btn ghost" data-cancel>Batal</button>
        <button type="button" class="admin-btn" data-ok>Buat</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector('[data-cancel]')?.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('[data-ok]')?.addEventListener('click', async () => {
    const fn = cfg().fnAdminUpdateUser || 'monefyi-admin-update-user';
    try {
      await edgePost(fn, {
        action: 'create',
        email: backdrop.querySelector('#addEmail')?.value,
        password: backdrop.querySelector('#addPw')?.value,
        name: backdrop.querySelector('#addName')?.value,
        phone: backdrop.querySelector('#addPhone')?.value,
        plan_type: backdrop.querySelector('#addPlan')?.value || 'none',
      });
      toast('User dibuat', 'success');
      close();
      onDone?.();
    } catch (e) {
      toast(e.message || 'Gagal membuat user', 'error');
    }
  });
}

/* ─── Plans ─── */
async function renderPlans(body) {
  const ac = window.STATE?.appConfig || {};
  const plans = ac.platform_settings?.plans || {};
  const t = plans.trial || {};
  const m = plans.monthly || {};
  const l = plans.lifetime || {};

  body.innerHTML = `
    <div class="admin-card">
      <h2>Plans & Pricing</h2>
      <p class="admin-muted" style="margin-bottom:12px">Kontrol SKU trial / monthly / lifetime yang tampil di app & landing.</p>
      <div class="admin-user-grid">
        <label style="flex-direction:row;gap:8px;align-items:center;text-transform:none">
          <input type="checkbox" id="plTrialEn" ${t.enabled !== false ? 'checked' : ''} /> Trial enabled
        </label>
        <label>Trial days<input class="admin-input" type="number" id="plTrialDays" value="${t.duration_days ?? 7}" /></label>
        <label>Max tx trial<input class="admin-input" type="number" id="plTrialMax" value="${t.max_transactions ?? 50}" /></label>
        <label style="flex-direction:row;gap:8px;align-items:center;text-transform:none">
          <input type="checkbox" id="plMonEn" ${m.enabled !== false ? 'checked' : ''} /> Monthly enabled
        </label>
        <label>Monthly price display<input class="admin-input" id="plMonPrice" value="${escapeHtml(m.price_display || 'Rp 49rb/bln')}" /></label>
        <label style="flex-direction:row;gap:8px;align-items:center;text-transform:none">
          <input type="checkbox" id="plLifeEn" ${l.enabled !== false ? 'checked' : ''} /> Lifetime enabled
        </label>
        <label>Lifetime price display<input class="admin-input" id="plLifePrice" value="${escapeHtml(l.price_display || 'Rp 499rb')}" /></label>
      </div>
      <div class="admin-toolbar" style="margin-top:12px">
        <button type="button" class="admin-btn" id="plSave">Simpan Plans</button>
        <span id="plStatus" class="admin-muted">—</span>
      </div>
    </div>
    <div class="admin-card">
      <h2>Checkout URLs</h2>
      <div class="admin-user-grid">
        <label style="grid-column:1/-1">Monthly URL<input class="admin-input" id="plMonUrl" value="${escapeHtml(ac.checkout_monthly_url || '')}" /></label>
        <label style="grid-column:1/-1">Lifetime URL<input class="admin-input" id="plLifeUrl" value="${escapeHtml(ac.checkout_lifetime_url || '')}" /></label>
      </div>
      <div class="admin-toolbar" style="margin-top:12px">
        <button type="button" class="admin-btn" id="plSaveUrls">Simpan URLs</button>
        <span id="plUrlStatus" class="admin-muted">—</span>
      </div>
    </div>
  `;

  const savePlans = async () => {
    const status = body.querySelector('#plStatus');
    status.textContent = 'Menyimpan…';
    try {
      const platform_settings = {
        ...(ac.platform_settings || {}),
        plans: {
          trial: {
            enabled: !!body.querySelector('#plTrialEn')?.checked,
            duration_days: Number(body.querySelector('#plTrialDays')?.value) || 7,
            max_transactions: Number(body.querySelector('#plTrialMax')?.value) || 50,
            price_display: 'Gratis',
          },
          monthly: {
            enabled: !!body.querySelector('#plMonEn')?.checked,
            duration_days: 30,
            price_display: (body.querySelector('#plMonPrice')?.value || '').trim(),
          },
          lifetime: {
            enabled: !!body.querySelector('#plLifeEn')?.checked,
            duration_days: null,
            price_display: (body.querySelector('#plLifePrice')?.value || '').trim(),
          },
        },
      };
      const data = await _ctx.upsertAppConfigAdmin({
        checkout_monthly_url: ac.checkout_monthly_url,
        checkout_lifetime_url: ac.checkout_lifetime_url,
        platform_settings,
      });
      if (window.STATE) window.STATE.appConfig = data;
      status.textContent = 'Tersimpan.';
      toast('Plans tersimpan', 'success');
    } catch (e) {
      status.textContent = e.message || 'Gagal';
    }
  };

  const saveUrls = async () => {
    const status = body.querySelector('#plUrlStatus');
    status.textContent = 'Menyimpan…';
    try {
      const data = await _ctx.upsertAppConfigAdmin({
        checkout_monthly_url: (body.querySelector('#plMonUrl')?.value || '').trim(),
        checkout_lifetime_url: (body.querySelector('#plLifeUrl')?.value || '').trim(),
      });
      if (window.STATE) window.STATE.appConfig = data;
      status.textContent = 'Tersimpan.';
      toast('Checkout URLs tersimpan', 'success');
    } catch (e) {
      status.textContent = e.message || 'Gagal';
    }
  };

  body.querySelector('#plSave')?.addEventListener('click', savePlans);
  body.querySelector('#plSaveUrls')?.addEventListener('click', saveUrls);
}

/* ─── Landing bridge ─── */
async function renderLanding(body) {
  const ac = window.STATE?.appConfig || {};
  const origin = location.origin.replace(/\/app\/?$/, '') || 'https://monefyi.com';
  const cmsUrl = `${origin}/admin/`;

  body.innerHTML = `
    <div class="admin-card">
      <h2>Landing & Pricing bridge</h2>
      <p class="admin-muted">Checkout URL & price display di sini sinkron lewat <code>app_config</code>. Untuk copy/media marketing penuh, buka Landing CMS.</p>
      <div class="admin-toolbar" style="margin-top:12px">
        <a class="admin-btn" href="${escapeHtml(cmsUrl)}" target="_blank" rel="noopener">Buka Landing CMS</a>
        <button type="button" class="admin-btn ghost" data-go="plans">Edit Plans & Checkout</button>
      </div>
    </div>
    <div class="admin-card">
      <h2>Snapshot app_config</h2>
      <div class="admin-row-list">
        <div class="admin-row"><span>Monthly URL</span><span class="admin-muted" style="word-break:break-all">${escapeHtml(ac.checkout_monthly_url || '—')}</span></div>
        <div class="admin-row"><span>Lifetime URL</span><span class="admin-muted" style="word-break:break-all">${escapeHtml(ac.checkout_lifetime_url || '—')}</span></div>
        <div class="admin-row"><span>Affiliate commission</span><span>Rp ${fmtNum(ac.affiliate_commission || 100000)}</span></div>
      </div>
    </div>
  `;
  body.querySelector('[data-go]')?.addEventListener('click', () => {
    _tab = 'plans';
    setAdminHash('plans');
    renderShell();
    loadTab('plans');
  });
}

/* ─── Feedback ─── */
async function renderFeedback(body) {
  body.innerHTML = `
    <div class="admin-toolbar">
      <select id="fbType" class="admin-input">
        <option value="all">Semua tipe</option>
        <option value="bug">bug</option>
        <option value="feature">feature</option>
        <option value="complaint">complaint</option>
        <option value="general">general</option>
      </select>
      <select id="fbStatus" class="admin-input">
        <option value="all">Semua status</option>
        <option value="open">open</option>
        <option value="in_progress">in_progress</option>
        <option value="resolved">resolved</option>
        <option value="closed">closed</option>
      </select>
      <button type="button" class="admin-btn" id="fbRefresh">Refresh</button>
    </div>
    <div id="fbList"></div>
  `;

  const load = async () => {
    const list = body.querySelector('#fbList');
    list.innerHTML = '<p class="admin-muted">Memuat…</p>';
    try {
      const fn = cfg().fnAdminFeedback || 'monefyi-admin-feedback';
      const out = await edgePost(fn, {
        action: 'list',
        type: body.querySelector('#fbType')?.value || 'all',
        status: body.querySelector('#fbStatus')?.value || 'all',
      });
      _feedbackCache = out.items || [];
      if (!_feedbackCache.length) {
        list.innerHTML = '<div class="admin-card"><p class="admin-muted">Tidak ada tiket.</p></div>';
        return;
      }
      list.innerHTML = _feedbackCache.map((f) => `
        <div class="admin-card" data-fid="${escapeHtml(f.id)}">
          <div class="admin-user-head">
            <div>
              <div class="admin-user-email">${escapeHtml(f.title)}</div>
              <div class="admin-user-meta">
                <span class="admin-badge">${escapeHtml(f.type)}</span>
                ${escapeHtml(f.user_email || f.user_name || 'anon')} · ${fmtDate(f.created_at)}
              </div>
            </div>
            <span class="admin-badge ${f.status === 'open' ? 'warn' : ''}">${escapeHtml(f.status)}</span>
          </div>
          <p class="admin-muted" style="white-space:pre-wrap;margin:8px 0">${escapeHtml(f.body)}</p>
          <label class="admin-muted" style="display:flex;flex-direction:column;gap:4px;font-size:11px">
            Admin notes
            <textarea class="admin-input" data-f="notes" rows="2">${escapeHtml(f.admin_notes || '')}</textarea>
          </label>
          <div class="admin-user-actions">
            <select class="admin-input" data-f="status">
              ${['open', 'in_progress', 'resolved', 'closed'].map((s) =>
                `<option value="${s}" ${s === f.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button type="button" class="admin-btn" data-act="save-fb">Update</button>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('[data-act="save-fb"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const card = btn.closest('[data-fid]');
          const id = card?.getAttribute('data-fid');
          btn.disabled = true;
          try {
            await edgePost(cfg().fnAdminFeedback || 'monefyi-admin-feedback', {
              action: 'update',
              id,
              status: card.querySelector('[data-f="status"]')?.value,
              admin_notes: card.querySelector('[data-f="notes"]')?.value || '',
            });
            toast('Tiket diupdate', 'success');
            await load();
          } catch (e) {
            toast(e.message || 'Gagal', 'error');
          } finally {
            btn.disabled = false;
          }
        });
      });
    } catch (e) {
      list.innerHTML = `<div class="admin-card"><p class="admin-muted">${escapeHtml(e.message)}</p></div>`;
    }
  };

  body.querySelector('#fbRefresh')?.addEventListener('click', load);
  body.querySelector('#fbType')?.addEventListener('change', load);
  body.querySelector('#fbStatus')?.addEventListener('change', load);
  await load();
}

/* ─── Config ─── */
async function renderConfig(body) {
  const ac = window.STATE?.appConfig || {};
  body.innerHTML = `
    <div class="admin-card">
      <h2>App config</h2>
      <div class="admin-user-grid">
        <label style="grid-column:1/-1">Monthly checkout<input class="admin-input" id="cfgMon" value="${escapeHtml(ac.checkout_monthly_url || '')}" /></label>
        <label style="grid-column:1/-1">Lifetime checkout<input class="admin-input" id="cfgLife" value="${escapeHtml(ac.checkout_lifetime_url || '')}" /></label>
        <label>Affiliate commission<input class="admin-input" type="number" id="cfgAff" value="${Number(ac.affiliate_commission || 100000)}" /></label>
        <label>Notif threshold %<input class="admin-input" type="number" id="cfgTh" value="${Number(ac.notif_threshold || 80)}" /></label>
        <label style="grid-column:1/-1">Tutorial video URL<input class="admin-input" id="cfgVid" value="${escapeHtml(ac.tutorial?.videoUrl || '')}" /></label>
      </div>
      <div class="admin-toolbar" style="margin-top:12px">
        <button type="button" class="admin-btn" id="cfgSave">Simpan</button>
        <span id="cfgSt" class="admin-muted">—</span>
      </div>
    </div>
  `;
  body.querySelector('#cfgSave')?.addEventListener('click', async () => {
    const st = body.querySelector('#cfgSt');
    st.textContent = 'Menyimpan…';
    try {
      const data = await _ctx.upsertAppConfigAdmin({
        checkout_monthly_url: (body.querySelector('#cfgMon')?.value || '').trim(),
        checkout_lifetime_url: (body.querySelector('#cfgLife')?.value || '').trim(),
        affiliate_commission: Number(body.querySelector('#cfgAff')?.value) || 0,
        notif_threshold: Number(body.querySelector('#cfgTh')?.value) || 80,
        tutorial: { videoUrl: (body.querySelector('#cfgVid')?.value || '').trim(), steps: ac.tutorial?.steps || [] },
        logo_url: ac.logo_url || null,
      });
      if (window.STATE) window.STATE.appConfig = data;
      st.textContent = 'Tersimpan.';
      toast('Config tersimpan', 'success');
    } catch (e) {
      st.textContent = e.message || 'Gagal';
    }
  });
}

/* ─── Tutorial admin ─── */
async function renderTutorial(body) {
  body.innerHTML = `
    <div class="admin-card">
      <h2>Tutorial / Help Center</h2>
      <div class="admin-toolbar">
        <button type="button" class="admin-btn" id="tutSeed">Seed konten default</button>
        <button type="button" class="admin-btn ghost" id="tutRefresh">Refresh</button>
        <input class="admin-input" id="tutFilter" placeholder="Filter…" style="flex:1" />
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
      <div class="admin-row" style="flex-direction:column;align-items:stretch">
        <div><strong>${escapeHtml(r.categoryTitle)}</strong> · ${escapeHtml(r.articleTitle)} · #${r.stepIndex + 1}</div>
        <div class="admin-muted">${escapeHtml(r.text).slice(0, 120)}</div>
        <div class="admin-user-actions">
          ${r.media_url ? `<span class="admin-badge">${escapeHtml(r.media_type || 'media')}</span>` : '<span class="admin-muted">tanpa media</span>'}
          <label class="admin-btn ghost" style="cursor:pointer">Upload
            <input type="file" accept="image/*,video/*,.gif" class="hidden" data-tut-up="${escapeHtml(r.id)}" style="display:none" />
          </label>
          ${r.media_url ? `<button type="button" class="admin-btn danger" data-tut-clear="${escapeHtml(r.id)}">Hapus</button>` : ''}
        </div>
      </div>
    `).join('');

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
