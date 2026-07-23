/**
 * Settings full page — in-shell (Budget/Monevisor pattern).
 * Deep-links: #settings | #settings/account | #settings/appearance | ...
 */

import { Icon } from '../components/icons.js';
import { renderNotificationSettingsPanel } from '../components/notification-settings.js';
import { getImportConfig } from '../services/email-import-client.js';
import { initMonevisor, getState as getMonevisorState, updatePrefs } from '../services/monevisor-client.js';

const SECTIONS = [
  { id: 'account', label: 'Akun' },
  { id: 'appearance', label: 'Tampilan' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'accounts', label: 'Akun keuangan' },
  { id: 'notifications', label: 'Notifikasi' },
  { id: 'email-import', label: 'Email Import' },
  { id: 'ai', label: 'AI' },
  { id: 'monevisor', label: 'Monevisor' },
  { id: 'data', label: 'Data' },
];

let _root = null;
let _ctx = null;
let _section = 'account';
let _hashBound = false;

/**
 * @param {HTMLElement} container
 * @param {object} ctx helpers from app.js
 * @param {{ section?: string }} [opts]
 */
export async function renderSettingsPage(container, ctx = {}, opts = {}) {
  if (!container) return;
  _root = container;
  _ctx = ctx;
  ensureCss();

  const fromHash = parseSettingsHash().section;
  _section = opts.section || fromHash || 'account';
  if (!SECTIONS.some((s) => s.id === _section)) _section = 'account';

  setSettingsHash(_section);
  renderShell();
  ensureHashListener();
  await renderActiveSection();
}

export function parseSettingsHash() {
  const raw = String(location.hash || '').replace(/^#/, '');
  if (!raw.startsWith('settings')) return {};
  const parts = raw.split('/').filter(Boolean);
  const section = parts[1] && SECTIONS.some((s) => s.id === parts[1]) ? parts[1] : 'account';
  return { section };
}

function setSettingsHash(section) {
  const hash = `#settings/${section || 'account'}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

function ensureHashListener() {
  if (_hashBound) return;
  _hashBound = true;
  window.addEventListener('hashchange', () => {
    if (!_root || !document.body.contains(_root)) return;
    if (!String(location.hash || '').startsWith('#settings')) return;
    if (!window.STATE?.ui?.settingsPageOpen) return;
    const { section } = parseSettingsHash();
    if (section && section !== _section) {
      _section = section;
      renderShell();
      renderActiveSection();
    }
  });
}

function ensureCss() {
  if (document.getElementById('settings-page-css')) return;
  const link = document.createElement('link');
  link.id = 'settings-page-css';
  link.rel = 'stylesheet';
  link.href = new URL('../../css/settings-page.css', import.meta.url).href.replace('/js/pages/', '/css/').replace('/pages/', '/');
  // Prefer relative app path used by PWA
  link.href = 'css/settings-page.css';
  document.head.appendChild(link);
}

function toast(msg, type = 'info') {
  try {
    if (_ctx?.toast) _ctx.toast(msg, type);
    else window.MonefyiUI?.showToast?.(msg, type);
  } catch { /* ignore */ }
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getSettings() {
  return window.STATE?.settings || {};
}

function getProfile() {
  return window.STATE?.db?.profile || {};
}

function getUser() {
  return window.STATE?.db?.user || {};
}

function renderShell() {
  if (!_root) return;
  _root.className = 'settings-page-root settings-page';
  _root.innerHTML = `
    <header class="settings-page-header">
      <h1>Pengaturan</h1>
      <p>Kelola akun, tampilan, notifikasi, dan data aplikasi</p>
    </header>
    <nav class="settings-section-nav" role="tablist" aria-label="Bagian pengaturan">
      ${SECTIONS.map((s) => `
        <button type="button" class="settings-sec-btn ${_section === s.id ? 'is-active' : ''}"
          data-sec="${s.id}" role="tab" aria-selected="${_section === s.id}">${s.label}</button>
      `).join('')}
    </nav>
    <div class="settings-section-body" id="settingsSectionBody">
      <p class="settings-status">Memuat…</p>
    </div>
  `;
  _root.querySelectorAll('[data-sec]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-sec');
      if (!id || id === _section) return;
      _section = id;
      setSettingsHash(id);
      renderShell();
      renderActiveSection();
    });
  });
}

async function renderActiveSection() {
  const body = _root?.querySelector('#settingsSectionBody');
  if (!body) return;
  body.innerHTML = '<p class="settings-status">Memuat…</p>';
  try {
    if (_section === 'account') renderAccount(body);
    else if (_section === 'appearance') renderAppearance(body);
    else if (_section === 'dashboard') renderDashboard(body);
    else if (_section === 'accounts') renderAccounts(body);
    else if (_section === 'notifications') await renderNotifications(body);
    else if (_section === 'email-import') await renderEmailImport(body);
    else if (_section === 'ai') renderAi(body);
    else if (_section === 'monevisor') await renderMonevisor(body);
    else if (_section === 'data') renderData(body);
  } catch (e) {
    console.error('[settings]', e);
    body.innerHTML = `<div class="settings-card"><p class="settings-status">${escapeHtml(e.message || 'Gagal memuat')}</p></div>`;
  }
}

function switchRow(id, label, hint, checked) {
  return `
    <div class="settings-row">
      <div class="settings-row-info">
        <div class="settings-row-label">${escapeHtml(label)}</div>
        ${hint ? `<div class="settings-row-hint">${escapeHtml(hint)}</div>` : ''}
      </div>
      <label class="settings-switch">
        <input type="checkbox" data-toggle="${id}" ${checked ? 'checked' : ''} />
        <span class="slider"></span>
      </label>
    </div>
  `;
}

/* ─── Account & security ─── */
function renderAccount(body) {
  const profile = getProfile();
  const user = getUser();
  const name = profile.name || window.STATE?.user?.name || '';
  const email = user.email || window.STATE?.user?.email || '';
  const role = profile.role || 'user';
  const plan = window.STATE?.subscription?.planType || profile.plan_type || 'none';
  const days = window.STATE?.subscription?.daysLeft;

  body.innerHTML = `
    <div class="settings-card">
      <h2>Profil</h2>
      <p class="settings-desc">Informasi akun dan status langganan.</p>
      <div class="settings-field">
        <label>Nama</label>
        <input class="settings-input" id="spName" value="${escapeHtml(name)}" autocomplete="name" />
      </div>
      <div class="settings-field">
        <label>Email</label>
        <input class="settings-input" id="spEmail" value="${escapeHtml(email)}" disabled />
      </div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Role</div>
          <div class="settings-row-hint">${escapeHtml(role)}</div>
        </div>
        <span class="settings-badge">${escapeHtml(plan)}${days != null ? ` · ${days}h` : ''}</span>
      </div>
      <div class="settings-actions">
        <button type="button" class="settings-btn" id="spSaveProfile">Simpan profil</button>
        <span class="settings-status" id="spProfileStatus">—</span>
      </div>
    </div>
    <div class="settings-card">
      <h2>Ganti password</h2>
      <p class="settings-desc">Minimal 8 karakter.</p>
      <div class="settings-field">
        <label>Password baru</label>
        <input class="settings-input" id="spPass1" type="password" autocomplete="new-password" />
      </div>
      <div class="settings-field">
        <label>Ulangi password</label>
        <input class="settings-input" id="spPass2" type="password" autocomplete="new-password" />
      </div>
      <div class="settings-actions">
        <button type="button" class="settings-btn ghost" id="spUpdatePass">Update password</button>
        <span class="settings-status" id="spPassStatus">—</span>
      </div>
    </div>
    <div class="settings-card">
      <h2>Sesi</h2>
      <div class="settings-actions">
        <button type="button" class="settings-btn danger" id="spSignOut">Log Out</button>
        <span class="settings-status" id="spSignOutStatus">—</span>
      </div>
      ${_ctx?.isAdmin?.() ? `
        <div class="settings-actions" style="margin-top:12px">
          <button type="button" class="settings-btn ghost" id="spOpenAdmin">Buka Admin Console</button>
        </div>
      ` : ''}
    </div>
  `;

  body.querySelector('#spSaveProfile')?.addEventListener('click', async () => {
    const status = body.querySelector('#spProfileStatus');
    const n = (body.querySelector('#spName')?.value || '').trim();
    status.textContent = 'Menyimpan…';
    try {
      await _ctx.saveProfile?.({ name: n });
      if (window.STATE) {
        window.STATE.user = { ...(window.STATE.user || {}), name: n };
        if (window.STATE.db?.profile) window.STATE.db.profile.name = n;
      }
      status.textContent = 'Tersimpan.';
      toast('Profil disimpan', 'success');
      _ctx.rerender?.();
    } catch (e) {
      status.textContent = e.message || 'Gagal';
    }
  });

  body.querySelector('#spUpdatePass')?.addEventListener('click', async () => {
    const status = body.querySelector('#spPassStatus');
    const p1 = body.querySelector('#spPass1')?.value || '';
    const p2 = body.querySelector('#spPass2')?.value || '';
    if (p1.length < 8) { status.textContent = 'Minimal 8 karakter.'; return; }
    if (p1 !== p2) { status.textContent = 'Password tidak sama.'; return; }
    status.textContent = 'Mengupdate…';
    try {
      await _ctx.updatePassword?.(p1);
      status.textContent = 'Password diubah.';
      body.querySelector('#spPass1').value = '';
      body.querySelector('#spPass2').value = '';
      toast('Password diubah', 'success');
    } catch (e) {
      status.textContent = e.message || 'Gagal';
    }
  });

  body.querySelector('#spSignOut')?.addEventListener('click', async () => {
    const status = body.querySelector('#spSignOutStatus');
    status.textContent = 'Keluar…';
    try {
      await _ctx.signOut?.();
    } catch (e) {
      status.textContent = e.message || 'Gagal';
    }
  });

  body.querySelector('#spOpenAdmin')?.addEventListener('click', () => {
    _ctx.openAdmin?.();
  });
}

/* ─── Appearance ─── */
function renderAppearance(body) {
  const s = getSettings();
  body.innerHTML = `
    <div class="settings-card">
      <h2>Tampilan</h2>
      <p class="settings-desc">Tema dan bahasa aplikasi.</p>
      ${switchRow('theme', 'Mode terang', 'Ubah tema tampilan', s.theme === 'light')}
      <div class="settings-field" style="margin-top:12px">
        <label>Bahasa</label>
        <select class="settings-select" id="spLang">
          <option value="id" ${s.lang !== 'en' ? 'selected' : ''}>Bahasa Indonesia</option>
          <option value="en" ${s.lang === 'en' ? 'selected' : ''}>English</option>
        </select>
      </div>
      <div class="settings-actions">
        <button type="button" class="settings-btn" id="spSaveLang">Simpan bahasa</button>
        <span class="settings-status" id="spLangStatus">—</span>
      </div>
    </div>
  `;

  body.querySelector('[data-toggle="theme"]')?.addEventListener('change', async (e) => {
    if (!window.STATE) return;
    window.STATE.settings.theme = e.target.checked ? 'light' : 'dark';
    try {
      await _ctx.saveSettings?.();
      _ctx.applyTheme?.();
      toast('Tema disimpan', 'success');
    } catch { /* ignore */ }
  });

  body.querySelector('#spSaveLang')?.addEventListener('click', async () => {
    const status = body.querySelector('#spLangStatus');
    const lang = body.querySelector('#spLang')?.value === 'en' ? 'en' : 'id';
    window.STATE.settings.lang = lang;
    status.textContent = 'Menyimpan…';
    try {
      await _ctx.saveSettings?.();
      try {
        await updatePrefs({ language: lang });
      } catch { /* ignore */ }
      status.textContent = 'Tersimpan.';
      _ctx.applyLanguageAndReload?.();
    } catch {
      status.textContent = 'Gagal.';
    }
  });
}

/* ─── Dashboard ─── */
function renderDashboard(body) {
  const s = getSettings();
  body.innerHTML = `
    <div class="settings-card">
      <h2>Data yang ditampilkan</h2>
      <p class="settings-desc">Kontrol kartu di dashboard (terutama desktop).</p>
      ${switchRow('showKPI', 'Tampilkan KPI', 'Income / expense / net / saving', !!s.showKPI)}
      ${switchRow('showBudget', 'Tampilkan budgeting', 'Ringkasan budget di dashboard', !!s.showBudget)}
    </div>
    <div class="settings-card">
      <h2>Grafik di dashboard</h2>
      ${switchRow('showTrend', 'Tren', '', !!s.showTrend)}
      ${switchRow('showCategory', 'Donut kategori', '', !!s.showCategory)}
      ${switchRow('showWeek', 'Bar pengeluaran per hari', '', !!s.showWeek)}
    </div>
  `;

  body.querySelectorAll('[data-toggle]').forEach((el) => {
    el.addEventListener('change', async () => {
      const key = el.getAttribute('data-toggle');
      if (!key || !window.STATE) return;
      window.STATE.settings[key] = !!el.checked;
      try {
        await _ctx.saveSettings?.();
        _ctx.destroyCharts?.();
        _ctx.rerender?.();
      } catch { /* ignore */ }
    });
  });
}

/* ─── Financial accounts ─── */
function renderAccounts(body) {
  const list = [...(getSettings().accounts || [])];
  body.innerHTML = `
    <div class="settings-card">
      <h2>Akun keuangan</h2>
      <p class="settings-desc">Daftar akun untuk filter & input transaksi. Hapus hanya menghilangkan dari daftar; transaksi lama tetap menyimpan nama akun.</p>
      <div class="settings-actions" style="margin-bottom:12px">
        <input class="settings-input" id="spNewAcc" placeholder="contoh: Jago" style="flex:1" />
        <button type="button" class="settings-btn" id="spAddAcc">Tambah</button>
      </div>
      <div class="settings-account-list" id="spAccList"></div>
      <div class="settings-status" id="spAccStatus" style="margin-top:8px">Total: ${list.length}</div>
      <div class="settings-actions" style="margin-top:12px">
        <button type="button" class="settings-btn ghost" id="spViewBalances">Lihat saldo akun</button>
      </div>
    </div>
  `;

  const paint = () => {
    const wrap = body.querySelector('#spAccList');
    const accounts = window.STATE?.settings?.accounts || [];
    wrap.innerHTML = accounts.map((a) => `
      <div class="settings-account-item" data-acc="${escapeHtml(a)}">
        <div class="name">${escapeHtml(a)}</div>
        <button type="button" class="settings-btn ghost" data-act="rename">Rename</button>
        <button type="button" class="settings-btn danger" data-act="delete">Hapus</button>
      </div>
    `).join('') || '<p class="settings-status">Belum ada akun.</p>';
    body.querySelector('#spAccStatus').textContent = `Total: ${accounts.length}`;

    wrap.querySelectorAll('.settings-account-item').forEach((row) => {
      const name = row.getAttribute('data-acc');
      row.querySelector('[data-act="rename"]')?.addEventListener('click', async () => {
        const next = prompt('Nama baru akun:', name);
        if (!next || !next.trim() || next.trim() === name) return;
        try {
          await _ctx.renameAccountEverywhere?.(name, next.trim());
          toast('Akun di-rename', 'success');
          paint();
          _ctx.rerender?.();
        } catch (e) {
          toast(e.message || 'Gagal rename', 'error');
        }
      });
      row.querySelector('[data-act="delete"]')?.addEventListener('click', async () => {
        if (!confirm(`Hapus "${name}" dari daftar akun? Transaksi lama tetap menyimpan nama ini.`)) return;
        if (!window.STATE) return;
        window.STATE.settings.accounts = (window.STATE.settings.accounts || []).filter((x) => x !== name);
        try {
          await _ctx.saveSettings?.();
          toast('Akun dihapus dari daftar', 'success');
          paint();
          _ctx.ensureSelectOptions?.();
          _ctx.rerender?.();
        } catch (e) {
          toast(e.message || 'Gagal hapus', 'error');
        }
      });
    });
  };

  paint();

  body.querySelector('#spAddAcc')?.addEventListener('click', async () => {
    const v = (body.querySelector('#spNewAcc')?.value || '').trim();
    if (!v) return;
    if (!window.STATE) return;
    const set = new Set(window.STATE.settings.accounts || []);
    set.add(v);
    window.STATE.settings.accounts = [...set].sort((a, b) => a.localeCompare(b));
    try {
      await _ctx.saveSettings?.();
      body.querySelector('#spNewAcc').value = '';
      paint();
      _ctx.ensureSelectOptions?.();
      toast('Akun ditambah', 'success');
    } catch (e) {
      toast(e.message || 'Gagal', 'error');
    }
  });

  body.querySelector('#spViewBalances')?.addEventListener('click', () => {
    _ctx.openAccounts?.();
  });
}

/* ─── Notifications ─── */
async function renderNotifications(body) {
  body.innerHTML = `
    <div class="settings-card">
      <h2>Notifikasi</h2>
      <p class="settings-desc">Preferensi disimpan di perangkat ini (belum sync cloud).</p>
      <div id="spNotifHost"></div>
    </div>
  `;
  const host = body.querySelector('#spNotifHost');
  await renderNotificationSettingsPanel(host, {
    inline: true,
    onSaved: () => toast('Pengaturan notifikasi tersimpan', 'success'),
  });
}

/* ─── Email import ─── */
async function renderEmailImport(body) {
  let cfg = null;
  try { cfg = await getImportConfig(); } catch { /* ignore */ }

  body.innerHTML = `
    <div class="settings-card">
      <h2>Email Auto-Import</h2>
      <p class="settings-desc">Forward email bank ke alamat unik → transaksi otomatis (dengan konfirmasi).</p>
      ${cfg ? `
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Status</div>
            <div class="settings-row-hint">${cfg.is_active ? 'Aktif' : 'Nonaktif'}${cfg.auto_confirm ? ' · auto-confirm on' : ''}</div>
          </div>
          <span class="settings-badge">${cfg.is_active ? 'ON' : 'OFF'}</span>
        </div>
        <div class="settings-field">
          <label>Alamat import</label>
          <input class="settings-input" readonly value="${escapeHtml(cfg.import_address || '')}" />
        </div>
      ` : `
        <p class="settings-status">Belum disetup. Buka wizard untuk membuat alamat import.</p>
      `}
      <div class="settings-actions">
        <button type="button" class="settings-btn" id="spOpenEmailImport">Atur Email Import</button>
      </div>
    </div>
  `;

  body.querySelector('#spOpenEmailImport')?.addEventListener('click', () => {
    _ctx.openEmailImport?.();
  });
}

/* ─── AI / Gemini ─── */
function renderAi(body) {
  const s = getSettings();
  body.innerHTML = `
    <div class="settings-card">
      <h2>AI / Gemini</h2>
      <p class="settings-desc">Bring-your-own-key untuk fitur AI (parse & coach). Key disimpan di profil terenkripsi kolom terpisah.</p>
      ${switchRow('useGemini', 'Aktifkan Gemini', 'Gunakan key pribadi untuk AI', !!s.useGemini)}
      <div class="settings-field" style="margin-top:12px">
        <label>Gemini API Key</label>
        <input class="settings-input" id="spGeminiKey" type="password" value="${escapeHtml(s.geminiKey || '')}" autocomplete="off" placeholder="AIza…" />
      </div>
      <div class="settings-actions">
        <button type="button" class="settings-btn" id="spSaveGemini">Simpan</button>
        <span class="settings-status" id="spGeminiStatus">—</span>
      </div>
    </div>
  `;

  body.querySelector('[data-toggle="useGemini"]')?.addEventListener('change', async (e) => {
    if (!window.STATE) return;
    window.STATE.settings.useGemini = !!e.target.checked;
    try { await _ctx.saveSettings?.(); } catch { /* ignore */ }
  });

  body.querySelector('#spSaveGemini')?.addEventListener('click', async () => {
    const status = body.querySelector('#spGeminiStatus');
    if (!window.STATE) return;
    window.STATE.settings.geminiKey = (body.querySelector('#spGeminiKey')?.value || '').trim();
    window.STATE.settings.useGemini = !!body.querySelector('[data-toggle="useGemini"]')?.checked;
    status.textContent = 'Menyimpan…';
    try {
      await _ctx.saveSettings?.();
      status.textContent = 'Tersimpan.';
      toast('AI settings tersimpan', 'success');
    } catch (e) {
      status.textContent = e.message || 'Gagal';
    }
  });
}

/* ─── Monevisor ─── */
async function renderMonevisor(body) {
  body.innerHTML = `<div class="settings-card"><p class="settings-status">Memuat preferensi Monevisor…</p></div>`;
  try { await initMonevisor(); } catch { /* ignore */ }
  const prefs = getMonevisorState()?.prefs || {};

  body.innerHTML = `
    <div class="settings-card">
      <h2>Monevisor</h2>
      <p class="settings-desc">Preferensi coach AI (tersimpan di cloud).</p>
      <div class="settings-field">
        <label>Primary goal</label>
        <select class="settings-select" id="spMvGoal">
          ${['save_more', 'track_spending', 'reduce_debt', 'build_budget', 'invest'].map((g) => `
            <option value="${g}" ${prefs.primary_goal === g ? 'selected' : ''}>${g.replace(/_/g, ' ')}</option>
          `).join('')}
        </select>
      </div>
      <div class="settings-field">
        <label>Tone</label>
        <select class="settings-select" id="spMvTone">
          ${['friendly', 'professional', 'direct', 'encouraging'].map((t) => `
            <option value="${t}" ${prefs.tone === t ? 'selected' : ''}>${t}</option>
          `).join('')}
        </select>
      </div>
      <div class="settings-field">
        <label>Notification style</label>
        <select class="settings-select" id="spMvNotif">
          ${['minimal', 'balanced', 'detailed'].map((t) => `
            <option value="${t}" ${(prefs.notification_style || 'balanced') === t ? 'selected' : ''}>${t}</option>
          `).join('')}
        </select>
      </div>
      ${switchRow('proactive', 'Proactive tips', 'Izinkan insight proaktif', prefs.proactive_enabled !== false)}
      <div class="settings-actions">
        <button type="button" class="settings-btn" id="spSaveMv">Simpan</button>
        <span class="settings-status" id="spMvStatus">—</span>
      </div>
    </div>
  `;

  body.querySelector('#spSaveMv')?.addEventListener('click', async () => {
    const status = body.querySelector('#spMvStatus');
    status.textContent = 'Menyimpan…';
    try {
      const lang = window.STATE?.settings?.lang || 'id';
      await updatePrefs({
        primary_goal: body.querySelector('#spMvGoal')?.value,
        tone: body.querySelector('#spMvTone')?.value,
        notification_style: body.querySelector('#spMvNotif')?.value,
        proactive_enabled: !!body.querySelector('[data-toggle="proactive"]')?.checked,
        language: lang,
      });
      status.textContent = 'Tersimpan.';
      toast('Preferensi Monevisor tersimpan', 'success');
    } catch (e) {
      status.textContent = e.message || 'Gagal';
    }
  });
}

/* ─── Data ─── */
function renderData(body) {
  body.innerHTML = `
    <div class="settings-card">
      <h2>Export / Import</h2>
      <p class="settings-desc">Backup dan pindahkan data transaksi (Excel atau CSV).</p>
      <div class="settings-actions">
        <button type="button" class="settings-btn ghost" id="spExportExcel">Export Excel</button>
        <button type="button" class="settings-btn ghost" id="spExportCsv">Export CSV</button>
        <label class="settings-btn" style="cursor:pointer">
          Import Excel/CSV
          <input type="file" id="spImportFile" accept=".xlsx,.xls,text/csv,.csv" class="hidden" style="display:none" />
        </label>
      </div>
      <p class="settings-status" id="spDataStatus" style="margin-top:10px">—</p>
    </div>
  `;

  body.querySelector('#spExportExcel')?.addEventListener('click', async () => {
    const status = body.querySelector('#spDataStatus');
    status.textContent = 'Exporting…';
    try {
      await _ctx.exportExcel?.();
      status.textContent = 'Excel diunduh.';
    } catch (e) {
      status.textContent = e.message || 'Gagal export';
    }
  });
  body.querySelector('#spExportCsv')?.addEventListener('click', async () => {
    const status = body.querySelector('#spDataStatus');
    status.textContent = 'Exporting…';
    try {
      await _ctx.exportCSV?.();
      status.textContent = 'CSV diunduh.';
    } catch (e) {
      status.textContent = e.message || 'Gagal export';
    }
  });
  body.querySelector('#spImportFile')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    const status = body.querySelector('#spDataStatus');
    if (!file) return;
    status.textContent = 'Importing…';
    try {
      await _ctx.importFile?.(file);
      status.textContent = 'Import selesai.';
      toast('Import selesai', 'success');
    } catch (err) {
      status.textContent = err.message || 'Gagal import';
    } finally {
      e.target.value = '';
    }
  });
}
