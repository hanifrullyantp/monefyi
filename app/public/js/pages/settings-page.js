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
  { id: 'social', label: 'Sosial' },
  { id: 'innovation', label: 'Inovasi' },
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
  // Desktop already shows title in #desktopHeader — avoid duplicate "Pengaturan"
  _root.innerHTML = `
    <header class="settings-page-header">
      <h1>Pengaturan</h1>
      <p>Kelola akun, tampilan, notifikasi, dan data</p>
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
    else if (_section === 'social') renderSocial(body);
    else if (_section === 'innovation') await renderInnovation(body);
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
        <span class="settings-status" id="spProfileStatus"></span>
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
        <span class="settings-status" id="spPassStatus"></span>
      </div>
    </div>
    <div class="settings-card">
      <h2>Affiliate</h2>
      <p class="settings-desc">Program referral Monefyi — bagikan dan dapatkan komisi.</p>
      <div class="settings-actions">
        <button type="button" class="settings-btn ghost" id="spAffiliate">Buka Program Affiliate</button>
      </div>
    </div>
    <div class="settings-card">
      <h2>Onboarding</h2>
      <p class="settings-desc">Ulangi wizard kenalan jika kondisi keuanganmu berubah.</p>
      <div class="settings-actions">
        <button type="button" class="settings-btn ghost" id="spResetOnboarding">Ulangi onboarding</button>
        <span class="settings-status" id="spResetObStatus">—</span>
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

  body.querySelector('#spAffiliate')?.addEventListener('click', () => {
    _ctx.openAffiliate?.();
  });

  body.querySelector('#spResetOnboarding')?.addEventListener('click', async () => {
    const status = body.querySelector('#spResetObStatus');
    const ok = confirm('Ulangi onboarding? Progress plan 7 hari akan direset.');
    if (!ok) return;
    status.textContent = 'Menyimpan…';
    try {
      await _ctx.saveProfile?.({
        onboarding_completed: false,
        onboarding_version: '2',
      });
      if (window.STATE?.db?.profile) {
        window.STATE.db.profile.onboarding_completed = false;
        window.STATE.db.profile.onboarding_version = '2';
      }
      status.textContent = 'Membuka wizard…';
      const mod = await import('../components/onboarding-wizard-v2.js');
      mod.openOnboardingWizardV2?.({
        onClose: () => {
          _ctx.rerender?.();
        },
      });
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
  let mkPrefs = {
    marketing_enabled: true,
    milestone_enabled: true,
    educational_enabled: true,
    frequency: 'normal',
  };
  try {
    const { loadUserPreferences } = await import('../services/marketing-engine.js');
    mkPrefs = await loadUserPreferences();
  } catch { /* ignore */ }

  const freq = mkPrefs.frequency || 'normal';

  body.innerHTML = `
    <div class="settings-card">
      <h2>Notifikasi</h2>
      <p class="settings-desc">Preferensi push & reminder transaksi.</p>
      <div id="spNotifHost"></div>
    </div>
    <div class="settings-card">
      <h2>Offer & Tips In-App</h2>
      <p class="settings-desc">Kontrol offer upgrade, milestone, dan tips edukasi di aplikasi.</p>
      ${switchRow('mkEnabled', 'Terima offer upgrade', 'Upgrade plan & fitur Pro+', mkPrefs.marketing_enabled !== false)}
      ${switchRow('mkMilestone', 'Celebration milestone', 'Badge streak & pencapaian', mkPrefs.milestone_enabled !== false)}
      ${switchRow('mkEducational', 'Tips edukasi', 'Feature discovery & tutorial singkat', mkPrefs.educational_enabled !== false)}
      <div class="settings-field" style="margin-top:12px">
        <label>Frekuensi marketing</label>
        <select class="settings-input" id="spMkFrequency">
          <option value="normal" ${freq === 'normal' ? 'selected' : ''}>Normal</option>
          <option value="minimal" ${freq === 'minimal' ? 'selected' : ''}>Minimal (hanya critical)</option>
          <option value="off" ${freq === 'off' ? 'selected' : ''}>Off (matikan semua offer)</option>
        </select>
      </div>
      <span class="settings-status" id="spMkStatus">—</span>
    </div>
  `;

  const host = body.querySelector('#spNotifHost');
  await renderNotificationSettingsPanel(host, {
    inline: true,
    onSaved: () => toast('Pengaturan notifikasi tersimpan', 'success'),
  });

  const saveMk = async (patch) => {
    const status = body.querySelector('#spMkStatus');
    status.textContent = 'Menyimpan…';
    try {
      const { saveUserMarketingPreferences } = await import('../services/marketing-engine.js');
      await saveUserMarketingPreferences(patch);
      status.textContent = 'Tersimpan.';
      toast('Preferensi offer tersimpan', 'success');
    } catch (e) {
      status.textContent = e.message || 'Gagal';
    }
  };

  body.querySelector('[data-toggle="mkEnabled"]')?.addEventListener('change', (e) => {
    saveMk({ marketing_enabled: !!e.target.checked });
  });
  body.querySelector('[data-toggle="mkMilestone"]')?.addEventListener('change', (e) => {
    saveMk({ milestone_enabled: !!e.target.checked });
  });
  body.querySelector('[data-toggle="mkEducational"]')?.addEventListener('change', (e) => {
    saveMk({ educational_enabled: !!e.target.checked });
  });
  body.querySelector('#spMkFrequency')?.addEventListener('change', (e) => {
    saveMk({ frequency: e.target.value });
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
        <button type="button" class="settings-btn ghost" id="spOpenWalletConnect">Hubungkan Bank & E-Wallet</button>
      </div>
    </div>
  `;

  body.querySelector('#spOpenEmailImport')?.addEventListener('click', () => {
    _ctx.openEmailImport?.();
  });

  body.querySelector('#spOpenWalletConnect')?.addEventListener('click', async () => {
    const { showWalletConnectPanel } = await import('../components/wallet-connect-panel.js');
    await showWalletConnectPanel();
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

/* ─── Social (Fase 5) ─── */
function renderSocial(body) {
  const benchmarkOn = (() => {
    try {
      const { isBenchmarkOptIn } = requireSyncBenchmark();
      return isBenchmarkOptIn(window.STATE || {});
    } catch {
      return localStorage.getItem('monefyi_benchmark_opt_in') === '1';
    }
  })();

  const hh = (() => {
    try {
      const { loadHousehold } = requireSyncHousehold();
      return loadHousehold();
    } catch {
      return null;
    }
  })();

  body.innerHTML = `
    <div class="settings-card">
      <h2>Bandingkan Anonim</h2>
      <p class="settings-desc">Opt-in untuk melihat perbandingan saving rate & pengeluaran vs peer dengan income bracket serupa. Data anonim, tidak pernah share detail transaksi.</p>
      ${switchRow('benchmarkOptIn', 'Aktifkan perbandingan anonim', 'Tampilkan kartu benchmark di Beranda', benchmarkOn)}
    </div>
    <div class="settings-card">
      <h2>Pencapaian</h2>
      <p class="settings-desc">Badge streak, saving rate, dan refleksi bulanan.</p>
      <div class="settings-actions">
        <button type="button" class="settings-btn" id="spViewAchievements">Lihat badge & level</button>
      </div>
    </div>
    <div class="settings-card">
      <h2>Household / Keluarga</h2>
      <p class="settings-desc">Kelola keuangan rumah tangga — undang pasangan dengan kode (sinkron cloud saat online).</p>
      ${hh ? `
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">${escapeHtml(hh.name)}</div>
            <div class="settings-row-hint">${hh.members?.length || 1} anggota${hh.invite_code ? ` · Kode: ${escapeHtml(hh.invite_code)}` : ''}${hh.remote ? ' · Cloud' : ' · Lokal'}</div>
          </div>
        </div>
        ${hh.remote && hh.invite_code ? `
        <div class="settings-actions">
          <button type="button" class="settings-btn ghost" id="spRefreshInvite">Buat kode undangan baru</button>
        </div>
        ` : ''}
        ${!hh.remote ? `
        <div class="settings-field">
          <label>Tambah anggota (lokal)</label>
          <input class="settings-input" id="spMemberName" placeholder="Nama anggota" />
        </div>
        <div class="settings-actions">
          <button type="button" class="settings-btn" id="spAddMember">Tambah</button>
        </div>
        ` : ''}
        <div class="settings-actions">
          <button type="button" class="settings-btn ghost danger" id="spLeaveHousehold">Keluar household</button>
        </div>
      ` : `
        <div class="settings-field">
          <label>Nama household</label>
          <input class="settings-input" id="spHouseholdName" placeholder="Contoh: Keluarga Santoso" />
        </div>
        <div class="settings-actions">
          <button type="button" class="settings-btn" id="spCreateHousehold">Buat household</button>
        </div>
        <div class="settings-field" style="margin-top:12px">
          <label>Atau gabung dengan kode undangan</label>
          <input class="settings-input" id="spJoinCode" placeholder="Contoh: AB12CD34" />
        </div>
        <div class="settings-actions">
          <button type="button" class="settings-btn ghost" id="spJoinHousehold">Gabung</button>
        </div>
      `}
      <span class="settings-status" id="spSocialStatus">—</span>
    </div>
  `;

  body.querySelector('[data-toggle="benchmarkOptIn"]')?.addEventListener('change', async (e) => {
    const on = !!e.target.checked;
    try {
      const { setBenchmarkOptInLocal } = await import('../services/anonymous-benchmark.js');
      setBenchmarkOptInLocal(on);
      if (window.STATE?.db?.userPreferences) {
        window.STATE.db.userPreferences.benchmark_opt_in = on;
      }
      toast(on ? 'Perbandingan anonim aktif' : 'Perbandingan anonim nonaktif', 'success');
      if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
    } catch { /* ignore */ }
  });

  body.querySelector('#spViewAchievements')?.addEventListener('click', async () => {
    const { showAchievementsPanel } = await import('../components/achievements-panel.js');
    await showAchievementsPanel();
  });

  body.querySelector('#spCreateHousehold')?.addEventListener('click', async () => {
    const name = body.querySelector('#spHouseholdName')?.value;
    const status = body.querySelector('#spSocialStatus');
    status.textContent = 'Membuat…';
    try {
      const { createHouseholdAsync } = await import('../services/household-mode.js');
      await createHouseholdAsync(name);
      status.textContent = 'Household dibuat.';
      renderSocial(body);
    } catch (e) {
      status.textContent = e.message || 'Gagal membuat household';
    }
  });

  body.querySelector('#spJoinHousehold')?.addEventListener('click', async () => {
    const code = body.querySelector('#spJoinCode')?.value;
    const status = body.querySelector('#spSocialStatus');
    status.textContent = 'Memproses…';
    try {
      const { joinHouseholdByCode } = await import('../services/household-mode.js');
      await joinHouseholdByCode(code);
      status.textContent = 'Berhasil bergabung.';
      renderSocial(body);
      if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
    } catch (e) {
      status.textContent = e.message || 'Kode tidak valid';
    }
  });

  body.querySelector('#spRefreshInvite')?.addEventListener('click', async () => {
    const status = body.querySelector('#spSocialStatus');
    status.textContent = 'Membuat kode…';
    try {
      const { refreshInviteCode } = await import('../services/household-mode.js');
      await refreshInviteCode();
      status.textContent = 'Kode undangan diperbarui.';
      renderSocial(body);
    } catch (e) {
      status.textContent = e.message || 'Gagal memperbarui kode';
    }
  });

  body.querySelector('#spAddMember')?.addEventListener('click', () => {
    const name = body.querySelector('#spMemberName')?.value;
    import('../services/household-mode.js').then(({ addHouseholdMember }) => {
      addHouseholdMember(name);
      body.querySelector('#spSocialStatus').textContent = 'Anggota ditambahkan.';
      renderSocial(body);
    });
  });

  body.querySelector('#spLeaveHousehold')?.addEventListener('click', () => {
    if (!confirm('Keluar dari household ini?')) return;
    import('../services/household-mode.js').then(({ leaveHousehold }) => {
      leaveHousehold();
      body.querySelector('#spSocialStatus').textContent = 'Household dihapus.';
      renderSocial(body);
      if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
    });
  });
}

function requireSyncBenchmark() {
  return { isBenchmarkOptIn: (s) => {
    const prefs = s?.db?.userPreferences || {};
    if (typeof prefs.benchmark_opt_in === 'boolean') return prefs.benchmark_opt_in;
    return localStorage.getItem('monefyi_benchmark_opt_in') === '1';
  } };
}

function requireSyncHousehold() {
  try {
    const raw = localStorage.getItem('monefyi_household');
    return { loadHousehold: () => (raw ? JSON.parse(raw) : null) };
  } catch {
    return { loadHousehold: () => null };
  }
}

/* ─── Innovation (Fase 8) ─── */
async function renderInnovation(body) {
  const { loadImpulseSettings } = await import('../services/impulse-guard.js');
  const impulse = loadImpulseSettings();
  body.innerHTML = `
    <div class="settings-card">
      <h2>Money Personality</h2>
      <p class="settings-desc">Tes 8 tipe kepribadian uang + strategi personal.</p>
      <div class="settings-actions">
        <button type="button" class="settings-btn" id="spPersonalityQuiz">Mulai / Lihat hasil</button>
      </div>
    </div>
    <div class="settings-card">
      <h2>Impulse Guard</h2>
      <p class="settings-desc">Cooldown sebelum belanja discretionary besar (default ≥ Rp 100rb).</p>
      ${switchRow('impulseGuard', 'Aktifkan Impulse Guard', 'Pause + impact preview saat save', !!impulse.enabled)}
    </div>
    <div class="settings-card">
      <h2>Mode Darurat</h2>
      <p class="settings-desc">Kunci kategori discretionary & fokus runway saat kondisi kritis.</p>
      <div class="settings-actions">
        <button type="button" class="settings-btn danger" id="spEmergencyOn">Aktifkan Mode Darurat</button>
        <button type="button" class="settings-btn ghost" id="spEmergencyOff">Matikan</button>
      </div>
    </div>
    <div class="settings-card">
      <h2>Financial Wellness</h2>
      <p class="settings-desc">Check-in mingguan: stres, tidur, keyakinan masa depan.</p>
      <div class="settings-actions">
        <button type="button" class="settings-btn" id="spWellnessCheckin">Check-in minggu ini</button>
      </div>
    </div>
    <div class="settings-card">
      <h2>Coaching Plans</h2>
      <p class="settings-desc">Program personalized 21–180 hari sesuai kondisi finansial.</p>
      <div class="settings-actions">
        <button type="button" class="settings-btn" id="spCoachingPlans">Buka coaching plans</button>
      </div>
    </div>
    <div class="settings-card">
      <h2>Life Event Planner</h2>
      <p class="settings-desc">Nikah, rumah, bayi, karir — hitung target & cicilan bulanan.</p>
      <div class="settings-actions">
        <button type="button" class="settings-btn" id="spLifeEventPlanner">Rencanakan milestone</button>
      </div>
    </div>
    <div class="settings-card">
      <h2>Referral & Buddy</h2>
      <p class="settings-desc">Invite teman dapat kredit · buddy accountability untuk goal serupa.</p>
      <div id="spReferralInfo" class="settings-desc" style="margin-bottom:8px">—</div>
      <div class="settings-actions">
        <button type="button" class="settings-btn ghost" id="spCopyReferral">Salin link referral</button>
        <button type="button" class="settings-btn" id="spFindBuddy">Cari buddy</button>
      </div>
    </div>
    <div class="settings-card">
      <h2>Komunitas</h2>
      <p class="settings-desc">Success stories anonim & monthly challenges.</p>
      <div class="settings-actions">
        <button type="button" class="settings-btn" id="spCommunity">Buka komunitas</button>
        <button type="button" class="settings-btn ghost" id="spMicroLearning">Learning path</button>
      </div>
    </div>
  `;

  body.querySelector('#spPersonalityQuiz')?.addEventListener('click', async () => {
    const { showMoneyPersonalityQuiz } = await import('../components/money-personality-quiz.js');
    await showMoneyPersonalityQuiz();
  });

  body.querySelector('[data-toggle="impulseGuard"]')?.addEventListener('change', async (e) => {
    const { saveImpulseSettings } = await import('../services/impulse-guard.js');
    saveImpulseSettings({ enabled: !!e.target.checked });
    toast(e.target.checked ? 'Impulse Guard aktif' : 'Impulse Guard nonaktif', 'success');
  });

  body.querySelector('#spEmergencyOn')?.addEventListener('click', async () => {
    const { setEmergencyMode } = await import('../services/emergency-mode.js');
    setEmergencyMode(true, 'manual_settings');
    toast('Mode darurat aktif', 'warn');
    if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
  });

  body.querySelector('#spEmergencyOff')?.addEventListener('click', async () => {
    const { setEmergencyMode } = await import('../services/emergency-mode.js');
    setEmergencyMode(false, 'manual_settings');
    toast('Mode darurat dimatikan', 'success');
    if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
  });

  body.querySelector('#spWellnessCheckin')?.addEventListener('click', async () => {
    const { showWellnessCheckinSheet } = await import('../components/wellness-checkin-sheet.js');
    showWellnessCheckinSheet({ force: true });
  });

  try {
    const { loadReferralProfile, getReferralCredits, matchBuddy } = await import('../services/referral-buddy.js');
    const ref = loadReferralProfile();
    const credits = getReferralCredits();
    body.querySelector('#spReferralInfo').textContent = `Kode ${ref.code} · Kredit Rp ${new Intl.NumberFormat('id-ID').format(credits)} · ${ref.link}`;
    body.querySelector('#spCopyReferral')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(ref.link);
        toast('Link referral disalin', 'success');
      } catch {
        toast(ref.link, 'info');
      }
    });
    body.querySelector('#spFindBuddy')?.addEventListener('click', async () => {
      matchBuddy();
      const { showBuddyChatSheet } = await import('../components/buddy-chat-sheet.js');
      showBuddyChatSheet();
    });
  } catch (e) {
    console.warn('[settings] referral', e);
  }

  body.querySelector('#spCoachingPlans')?.addEventListener('click', async () => {
    const { showCoachingPlansSheet } = await import('../components/coaching-plans-sheet.js');
    await showCoachingPlansSheet();
  });

  body.querySelector('#spLifeEventPlanner')?.addEventListener('click', async () => {
    const { showLifeEventPlannerSheet } = await import('../components/life-event-planner-sheet.js');
    showLifeEventPlannerSheet();
  });

  body.querySelector('#spCommunity')?.addEventListener('click', async () => {
    const { showCommunityPanel } = await import('../components/community-panel.js');
    await showCommunityPanel({ tab: 'stories' });
  });

  body.querySelector('#spMicroLearning')?.addEventListener('click', async () => {
    const { showMicroLearningSheet } = await import('../components/micro-learning-sheet.js');
    showMicroLearningSheet();
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
