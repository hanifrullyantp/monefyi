/**
 * Email Import Setup & Management modal + setup wizard.
 * @module components/email-import-setup
 */

import { Icon } from './icons.js';
import {
  setupEmailImport,
  getImportConfig,
  toggleImport,
  toggleAutoConfirm,
  getPendingImports,
  confirmImport,
  rejectImport,
  getImportStats,
  subscribeToImports,
} from '../services/email-import-client.js';

const GMAIL_FILTER =
  'noreply@klikbca.co.id OR notification@bankmandiri.co.id OR noreply@bni.co.id OR noreply@bri.co.id OR no-reply@gopay.co.id OR noreply@ovo.id OR no-reply@dana.id';

/** @type {(() => void)|null} */
let _modalUnsub = null;

/**
 * Open email import setup modal.
 */
export async function showEmailImportSetup() {
  document.querySelector('.email-import-overlay')?.remove();
  cleanupModalRealtime();

  const [config, pending, stats] = await Promise.all([
    getImportConfig(),
    getPendingImports(),
    getImportStats(),
  ]);

  const modal = document.createElement('div');
  modal.className = 'email-import-overlay';
  modal.innerHTML = `
    <div class="email-import-modal" role="dialog" aria-modal="true" aria-label="Email Auto-Import">
      <header class="ei-header">
        <div>
          <h2>${Icon('mail', { size: 18 })} Email Auto-Import</h2>
          <p class="ei-subtitle">Otomatis catat transaksi dari email bank</p>
        </div>
        <button type="button" class="ei-close" data-action="close" aria-label="Tutup">${Icon('x', { size: 18 })}</button>
      </header>

      <div class="ei-body">
        <section class="ei-section">
          <h3 class="ei-section-title">Setup</h3>
          ${config ? renderConfigActive(config) : renderSetupInstructions()}
        </section>

        <section class="ei-section" id="ei-pending-section" ${pending.length === 0 ? 'hidden' : ''}>
          <h3 class="ei-section-title" id="ei-pending-title">
            ${Icon('clock', { size: 14 })} Menunggu Konfirmasi (<span id="ei-pending-count">${pending.length}</span>)
          </h3>
          <div class="ei-pending-list" id="ei-pending-list">
            ${pending.map((p) => renderPendingImport(p)).join('')}
          </div>
        </section>

        ${stats ? `
          <section class="ei-section">
            <h3 class="ei-section-title">${Icon('chartBar', { size: 14 })} Statistik</h3>
            <div class="ei-stats-grid">
              <div class="ei-stat"><div class="ei-stat-value">${stats.total}</div><div class="ei-stat-label">Total</div></div>
              <div class="ei-stat"><div class="ei-stat-value">${stats.confirmed}</div><div class="ei-stat-label">Dikonfirmasi</div></div>
              <div class="ei-stat"><div class="ei-stat-value">${stats.pending}</div><div class="ei-stat-label">Menunggu</div></div>
              <div class="ei-stat"><div class="ei-stat-value">${stats.rejected}</div><div class="ei-stat-label">Ditolak</div></div>
            </div>
            ${stats.byBank.length > 0 ? `
              <div class="ei-bank-list">
                ${stats.byBank.map(([bank, count]) => `
                  <div class="ei-bank-row">
                    <span class="ei-bank-name">${escapeHtml(bank)}</span>
                    <span class="ei-bank-count">${count}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </section>
        ` : ''}

        <section class="ei-section">
          <h3 class="ei-section-title">${Icon('helpCircle', { size: 14 })} Cara Kerja</h3>
          <div class="ei-instructions">
            <div class="ei-step"><div class="ei-step-num">1</div><div class="ei-step-text"><strong>Aktifkan import</strong> dan copy alamat email unik kamu</div></div>
            <div class="ei-step"><div class="ei-step-num">2</div><div class="ei-step-text"><strong>Buat filter/rule</strong> di Gmail/Outlook untuk forward email dari bank ke alamat <code>tx-…@support.monefyi.com</code></div></div>
            <div class="ei-step"><div class="ei-step-num">3</div><div class="ei-step-text"><strong>Setiap transaksi bank masuk</strong>, Monefyi parse dan tampilkan untuk konfirmasi</div></div>
            <div class="ei-step"><div class="ei-step-num">4</div><div class="ei-step-text"><strong>Konfirmasi atau edit</strong> sebelum disimpan sebagai transaksi</div></div>
          </div>
          <div class="ei-supported">
            <div class="ei-supported-title">Bank &amp; E-Wallet yang Didukung:</div>
            <div class="ei-bank-chips">
              ${['BCA', 'Mandiri', 'BNI', 'BRI', 'GoPay', 'OVO', 'DANA', 'ShopeePay', 'Tokopedia', 'Grab']
    .map((b) => `<span class="ei-chip">${b}</span>`).join('')}
            </div>
          </div>
          <div class="ei-privacy">
            ${Icon('lock', { size: 12 })}
            <span>Privasi: email hanya diproses untuk extract transaksi. Cuplikan mentah dihapus setelah 7 hari.</span>
          </div>
        </section>
      </div>

      <footer class="ei-footer">
        <button type="button" class="ei-btn-primary" data-action="close">Selesai</button>
      </footer>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('show'));
  wireHandlers(modal);
  startModalPendingRefresh(modal);
}

/**
 * 3-step setup wizard after activation (or re-guide).
 * @param {string} importAddress
 */
export function showSetupWizard(importAddress) {
  document.querySelector('.ei-wizard-overlay')?.remove();

  const wizard = document.createElement('div');
  wizard.className = 'ei-wizard-overlay';
  wizard.innerHTML = `
    <div class="ei-wizard" role="dialog" aria-modal="true" aria-label="Setup Email Auto-Import">
      <header class="ei-wizard-header">
        <h2>Setup Email Auto-Import</h2>
        <div class="ei-wizard-progress">
          <div class="ei-progress-step active" data-step="1">1</div>
          <div class="ei-progress-line"></div>
          <div class="ei-progress-step" data-step="2">2</div>
          <div class="ei-progress-line"></div>
          <div class="ei-progress-step" data-step="3">3</div>
        </div>
      </header>

      <div class="ei-wizard-body">
        <div class="ei-wizard-step" data-step="1">
          <div class="ei-step-icon" aria-hidden="true">${Icon('mail', { size: 40 })}</div>
          <h3>Alamat Import Kamu</h3>
          <p>Copy alamat ini — kamu butuhkan di langkah berikutnya:</p>
          <div class="ei-address-hero">
            <code id="ei-wizard-address">${escapeHtml(importAddress)}</code>
            <button type="button" class="ei-copy-btn-large" data-action="copy-address">
              ${Icon('copy', { size: 14 })} Copy Alamat
            </button>
          </div>
          <div class="ei-important">
            Alamat ini unik untuk akun kamu. Jangan bagikan ke orang lain.
          </div>
        </div>

        <div class="ei-wizard-step" data-step="2" hidden>
          <div class="ei-step-icon" aria-hidden="true">${Icon('settings', { size: 40 })}</div>
          <h3>Pilih Email Kamu</h3>
          <p>Kamu pakai email apa untuk menerima notifikasi bank?</p>
          <div class="ei-provider-cards">
            <button type="button" class="ei-provider-card" data-provider="gmail">
              <div class="ei-provider-name">Gmail</div>
              <div class="ei-provider-hint">Paling umum di Indonesia</div>
            </button>
            <button type="button" class="ei-provider-card" data-provider="outlook">
              <div class="ei-provider-name">Outlook / Hotmail</div>
              <div class="ei-provider-hint">Microsoft email</div>
            </button>
            <button type="button" class="ei-provider-card" data-provider="yahoo">
              <div class="ei-provider-name">Yahoo Mail</div>
              <div class="ei-provider-hint">Yahoo email</div>
            </button>
            <button type="button" class="ei-provider-card" data-provider="other">
              <div class="ei-provider-name">Lainnya</div>
              <div class="ei-provider-hint">Email provider lain</div>
            </button>
          </div>
        </div>

        <div class="ei-wizard-step" data-step="3" hidden>
          <div class="ei-step-icon" aria-hidden="true">${Icon('check', { size: 40 })}</div>
          <h3>Ikuti Langkah Ini</h3>
          <div id="ei-provider-instructions"></div>
        </div>
      </div>

      <footer class="ei-wizard-footer">
        <button type="button" class="ei-btn-secondary" data-action="back" hidden>Kembali</button>
        <button type="button" class="ei-btn-primary" data-action="next">Lanjut</button>
      </footer>
    </div>
  `;

  document.body.appendChild(wizard);
  requestAnimationFrame(() => wizard.classList.add('show'));

  let currentStep = 1;
  /** @type {string|null} */
  let selectedProvider = null;

  const steps = wizard.querySelectorAll('.ei-wizard-step');
  const progressSteps = wizard.querySelectorAll('.ei-progress-step');
  const backBtn = /** @type {HTMLButtonElement} */ (wizard.querySelector('[data-action="back"]'));
  const nextBtn = /** @type {HTMLButtonElement} */ (wizard.querySelector('[data-action="next"]'));

  /**
   * @param {number} step
   */
  function showStep(step) {
    steps.forEach((s) => {
      const n = Number(s.getAttribute('data-step'));
      s.hidden = n !== step;
    });
    progressSteps.forEach((s) => {
      const n = Number(s.getAttribute('data-step'));
      s.classList.toggle('active', n <= step);
      s.classList.toggle('completed', n < step);
    });
    backBtn.hidden = step <= 1;
    nextBtn.textContent = step === 3 ? 'Selesai' : 'Lanjut';
    currentStep = step;
  }

  const closeWizard = () => {
    wizard.classList.remove('show');
    setTimeout(() => wizard.remove(), 200);
  };

  wizard.querySelector('[data-action="copy-address"]')?.addEventListener('click', async () => {
    const btn = wizard.querySelector('[data-action="copy-address"]');
    try {
      await navigator.clipboard.writeText(importAddress);
      if (btn) btn.textContent = 'Tersalin!';
      setTimeout(() => {
        if (btn) btn.innerHTML = `${Icon('copy', { size: 14 })} Copy Alamat`;
      }, 2000);
    } catch {
      prompt('Copy alamat ini:', importAddress);
    }
  });

  wizard.querySelectorAll('.ei-provider-card').forEach((card) => {
    card.addEventListener('click', () => {
      wizard.querySelectorAll('.ei-provider-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedProvider = card.getAttribute('data-provider');
    });
  });

  nextBtn.onclick = () => {
    if (currentStep === 1) {
      showStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!selectedProvider) {
        showToast('Pilih email provider dulu');
        return;
      }
      showProviderInstructions(wizard, selectedProvider, importAddress);
      showStep(3);
      return;
    }
    closeWizard();
    showToast('Setup selesai! Email bank akan otomatis ter-import setelah filter aktif.');
    showEmailImportSetup();
  };

  backBtn.onclick = () => {
    if (currentStep > 1) showStep(currentStep - 1);
  };

  wizard.onclick = (e) => {
    if (e.target === wizard) closeWizard();
  };

  showStep(1);
}

/**
 * @param {HTMLElement} wizard
 * @param {string} provider
 * @param {string} address
 */
function showProviderInstructions(wizard, provider, address) {
  const container = wizard.querySelector('#ei-provider-instructions');
  if (!container) return;

  const safeAddr = escapeHtml(address);

  /** @type {Record<string, string>} */
  const instructions = {
    gmail: `
      <div class="ei-instruction-block">
        <h4>Setup Gmail Auto-Forward</h4>
        <ol class="ei-instruction-list">
          <li>
            <strong>Buka Gmail</strong> di browser desktop:
            <a href="https://mail.google.com" target="_blank" rel="noopener" class="ei-link">mail.google.com</a>
          </li>
          <li>Klik <strong>Settings</strong> (pojok kanan atas) → <strong>See all settings</strong></li>
          <li>Buka tab <strong>Forwarding and POP/IMAP</strong></li>
          <li>Klik <strong>Add a forwarding address</strong></li>
          <li>
            Masukkan: <code class="ei-code">${safeAddr}</code>
            <button type="button" class="ei-copy-mini" data-action="copy-inline" title="Copy">Copy</button>
          </li>
          <li>
            Gmail akan mengirim <strong>email verifikasi</strong> ke alamat Monefyi.
            Selesaikan konfirmasi di Gmail (buka email verifikasi / masukkan kode) —
            Monefyi tidak bisa mengklik link verifikasi otomatis.
          </li>
          <li>Buka tab <strong>Filters and Blocked Addresses</strong></li>
          <li>Klik <strong>Create a new filter</strong></li>
          <li>
            Di kolom <strong>From</strong>, masukkan:
            <div class="ei-filter-text">
              <code>${escapeHtml(GMAIL_FILTER)}</code>
              <button type="button" class="ei-copy-mini" data-action="copy-filter" title="Copy filter">Copy</button>
            </div>
          </li>
          <li>Klik <strong>Create filter</strong></li>
          <li>Centang: <strong>Forward it to</strong> → pilih alamat Monefyi</li>
          <li>Centang: <strong>Also apply filter to matching conversations</strong> (opsional)</li>
          <li>Klik <strong>Create filter</strong> — selesai</li>
        </ol>
        <div class="ei-tip">
          Tip: kamu bisa menambah email bank lain ke filter kapan saja
          (edit filter, tambahkan <code>OR email@bank.co.id</code>).
        </div>
      </div>
    `,
    outlook: `
      <div class="ei-instruction-block">
        <h4>Setup Outlook Auto-Forward</h4>
        <ol class="ei-instruction-list">
          <li>Buka
            <a href="https://outlook.live.com/mail/options/mail/rules" target="_blank" rel="noopener" class="ei-link">Outlook Settings → Mail → Rules</a>
          </li>
          <li>Klik <strong>Add new rule</strong></li>
          <li>Name: <strong>Monefyi Auto Import</strong></li>
          <li>Condition: <strong>From contains</strong> → masukkan kata kunci bank (contoh: bca, mandiri, gopay, ovo, dana)</li>
          <li>
            Action: <strong>Forward to</strong> →
            <code class="ei-code">${safeAddr}</code>
            <button type="button" class="ei-copy-mini" data-action="copy-inline">Copy</button>
          </li>
          <li>Klik <strong>Save</strong></li>
        </ol>
      </div>
    `,
    yahoo: `
      <div class="ei-instruction-block">
        <h4>Setup Yahoo Mail Auto-Forward</h4>
        <ol class="ei-instruction-list">
          <li>Buka Yahoo Mail → Settings → More Settings</li>
          <li>Klik <strong>Filters</strong> di sidebar kiri</li>
          <li>Klik <strong>Add new filters</strong></li>
          <li>Set <strong>From</strong> contains alamat email bank</li>
          <li>
            Action: <strong>Forward</strong> →
            <code class="ei-code">${safeAddr}</code>
            <button type="button" class="ei-copy-mini" data-action="copy-inline">Copy</button>
          </li>
          <li>Save</li>
        </ol>
      </div>
    `,
    other: `
      <div class="ei-instruction-block">
        <h4>Setup untuk Email Provider Lain</h4>
        <p>Prinsipnya sama:</p>
        <ol class="ei-instruction-list">
          <li>Buka <strong>Settings / Rules / Filters</strong> di email kamu</li>
          <li>Buat rule: <strong>Forward email dari bank</strong></li>
          <li>
            Forward ke:
            <code class="ei-code">${safeAddr}</code>
            <button type="button" class="ei-copy-mini" data-action="copy-inline">Copy</button>
          </li>
          <li>Selesai</li>
        </ol>
        <p class="ei-hint">Jika butuh bantuan, tanya Monevisor di halaman Advisor.</p>
      </div>
    `,
  };

  container.innerHTML = instructions[provider] || instructions.other;

  container.querySelectorAll('[data-action="copy-inline"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(address);
        btn.textContent = 'OK';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      } catch { /* ignore */ }
    });
  });

  container.querySelectorAll('[data-action="copy-filter"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(GMAIL_FILTER);
        btn.textContent = 'OK';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      } catch {
        prompt('Copy ini:', GMAIL_FILTER);
      }
    });
  });
}

function renderConfigActive(config) {
  return `
    <div class="ei-config-card">
      <div class="ei-config-status ${config.is_active ? 'active' : 'inactive'}">
        ${config.is_active ? Icon('check', { size: 14 }) : Icon('x', { size: 14 })}
        <span>${config.is_active ? 'Aktif' : 'Nonaktif'}</span>
      </div>
      <div class="ei-address-box">
        <div class="ei-address-label">Alamat Import Kamu:</div>
        <div class="ei-address-value" id="ei-address">${escapeHtml(config.import_address)}</div>
        <button type="button" class="ei-copy-btn" data-action="copy" title="Copy">
          ${Icon('copy', { size: 14 })} <span>Copy</span>
        </button>
      </div>
      <div class="ei-config-toggles">
        <label class="ei-toggle-row">
          <span>Import Aktif</span>
          <input type="checkbox" data-action="toggle-active" ${config.is_active ? 'checked' : ''}>
        </label>
        <label class="ei-toggle-row">
          <span>Auto-konfirmasi (tanpa review)</span>
          <input type="checkbox" data-action="toggle-auto" ${config.auto_confirm ? 'checked' : ''}>
        </label>
      </div>
      <button type="button" class="ei-guide-btn" data-action="open-wizard">
        ${Icon('helpCircle', { size: 14 })} Panduan setup ulang
      </button>
    </div>
  `;
}

function renderSetupInstructions() {
  return `
    <div class="ei-setup-cta">
      <div class="ei-setup-icon">${Icon('mail', { size: 32 })}</div>
      <div class="ei-setup-text">
        <strong>Belum diaktifkan</strong>
        <p>Aktifkan untuk mendapat alamat email unik yang bisa menerima notifikasi bank.</p>
      </div>
      <button type="button" class="ei-btn-primary" data-action="activate">
        ${Icon('check', { size: 14 })} Aktifkan Sekarang
      </button>
    </div>
  `;
}

function renderPendingImport(imp) {
  const typeColor = imp.parsed_type === 'income' ? '#34d399' : '#f87171';
  const typePrefix = imp.parsed_type === 'income' ? '+' : '-';

  return `
    <div class="ei-pending-card" data-import-id="${imp.id}">
      <div class="ei-pending-header">
        <div class="ei-pending-bank">${escapeHtml(imp.bank_id || 'Unknown')}</div>
        <div class="ei-pending-time">${formatRelativeTime(imp.created_at)}</div>
      </div>
      <div class="ei-pending-main">
        <div class="ei-pending-amount" style="color: ${typeColor}">
          ${typePrefix}Rp ${fmt(imp.parsed_amount)}
        </div>
        <div class="ei-pending-merchant">${escapeHtml(imp.parsed_merchant || 'Transaksi')}</div>
        <div class="ei-pending-meta">
          ${escapeHtml(imp.parsed_date || '')} · ${escapeHtml(imp.parsed_account || '')} · ${escapeHtml(imp.parsed_category || '')}
        </div>
      </div>
      <div class="ei-edit-form hidden" data-edit-form="${imp.id}">
        <div class="ei-edit-grid">
          <label>Jumlah<input type="number" data-field="amount" value="${Number(imp.parsed_amount) || 0}"></label>
          <label>Tipe
            <select data-field="type">
              <option value="expense" ${imp.parsed_type === 'expense' ? 'selected' : ''}>Expense</option>
              <option value="income" ${imp.parsed_type === 'income' ? 'selected' : ''}>Income</option>
              <option value="transfer" ${imp.parsed_type === 'transfer' ? 'selected' : ''}>Transfer</option>
            </select>
          </label>
          <label>Merchant<input type="text" data-field="merchant" value="${escapeAttr(imp.parsed_merchant || '')}"></label>
          <label>Kategori<input type="text" data-field="category" value="${escapeAttr(imp.parsed_category || '')}"></label>
          <label>Akun<input type="text" data-field="account" value="${escapeAttr(imp.parsed_account || '')}"></label>
          <label>Tanggal<input type="date" data-field="date" value="${escapeAttr(imp.parsed_date || '')}"></label>
        </div>
        <div class="ei-pending-actions">
          <button type="button" class="ei-btn-confirm" data-action="save-edit" data-id="${imp.id}">
            ${Icon('check', { size: 14 })} Simpan
          </button>
          <button type="button" class="ei-btn-edit" data-action="cancel-edit" data-id="${imp.id}">Batal</button>
        </div>
      </div>
      <div class="ei-pending-actions" data-actions="${imp.id}">
        <button type="button" class="ei-btn-confirm" data-action="confirm" data-id="${imp.id}">
          ${Icon('check', { size: 14 })} Konfirmasi
        </button>
        <button type="button" class="ei-btn-edit" data-action="edit" data-id="${imp.id}">
          ${Icon('edit', { size: 14 })} Edit
        </button>
        <button type="button" class="ei-btn-reject" data-action="reject" data-id="${imp.id}">
          ${Icon('x', { size: 14 })}
        </button>
      </div>
    </div>
  `;
}

function cleanupModalRealtime() {
  if (typeof _modalUnsub === 'function') {
    try { _modalUnsub(); } catch { /* ignore */ }
  }
  _modalUnsub = null;
}

/**
 * Refresh pending list only (push stays in app.js).
 * @param {HTMLElement} modal
 */
function startModalPendingRefresh(modal) {
  cleanupModalRealtime();
  try {
    _modalUnsub = subscribeToImports(async () => {
      if (!document.body.contains(modal)) {
        cleanupModalRealtime();
        return;
      }
      await refreshPendingList(modal);
    });
  } catch (e) {
    console.warn('[email-import] modal realtime failed:', e);
  }
}

/**
 * @param {HTMLElement} modal
 */
async function refreshPendingList(modal) {
  const list = modal.querySelector('#ei-pending-list');
  const section = modal.querySelector('#ei-pending-section');
  const countEl = modal.querySelector('#ei-pending-count');
  if (!list) return;

  const pending = await getPendingImports();
  list.innerHTML = pending.map((p) => renderPendingImport(p)).join('');
  if (countEl) countEl.textContent = String(pending.length);
  if (section) {
    if (pending.length) section.removeAttribute('hidden');
    else section.setAttribute('hidden', '');
  }
  wirePendingActions(modal);
}

/**
 * @param {HTMLElement} modal
 */
function wirePendingActions(modal) {
  modal.querySelectorAll('[data-action="confirm"]').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      try {
        await confirmImport(id);
        showToast('Transaksi disimpan');
        btn.closest('.ei-pending-card')?.remove();
        await refreshPendingList(modal);
      } catch (e) {
        showToast(`Gagal: ${e.message}`);
      }
    };
  });

  modal.querySelectorAll('[data-action="reject"]').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      await rejectImport(id);
      showToast('Import ditolak');
      btn.closest('.ei-pending-card')?.remove();
      await refreshPendingList(modal);
    };
  });

  modal.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const card = btn.closest('.ei-pending-card');
      card?.querySelector(`[data-edit-form="${id}"]`)?.classList.remove('hidden');
      card?.querySelector(`[data-actions="${id}"]`)?.classList.add('hidden');
    };
  });

  modal.querySelectorAll('[data-action="cancel-edit"]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const card = btn.closest('.ei-pending-card');
      card?.querySelector(`[data-edit-form="${id}"]`)?.classList.add('hidden');
      card?.querySelector(`[data-actions="${id}"]`)?.classList.remove('hidden');
    };
  });

  modal.querySelectorAll('[data-action="save-edit"]').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      const form = modal.querySelector(`[data-edit-form="${id}"]`);
      if (!form) return;
      /** @type {Record<string, string|number>} */
      const edits = {};
      form.querySelectorAll('[data-field]').forEach((el) => {
        const key = el.getAttribute('data-field');
        if (!key) return;
        const val = /** @type {HTMLInputElement|HTMLSelectElement} */ (el).value;
        edits[key] = key === 'amount' ? Number(val) : val;
      });
      try {
        await confirmImport(id, edits);
        showToast('Import dikonfirmasi & disimpan');
        btn.closest('.ei-pending-card')?.remove();
        await refreshPendingList(modal);
      } catch (e) {
        showToast(`Gagal: ${e.message}`);
      }
    };
  });
}

/**
 * @param {HTMLElement} modal
 */
function wireHandlers(modal) {
  const close = () => {
    cleanupModalRealtime();
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 200);
  };

  modal.querySelectorAll('[data-action="close"]').forEach((b) => {
    b.onclick = close;
  });
  modal.onclick = (e) => {
    if (e.target === modal) close();
  };

  modal.querySelector('[data-action="activate"]')?.addEventListener('click', async () => {
    try {
      const address = await setupEmailImport();
      showToast('Email import diaktifkan');
      close();
      showSetupWizard(address);
    } catch (e) {
      showToast(`Gagal: ${e.message}`);
    }
  });

  modal.querySelector('[data-action="open-wizard"]')?.addEventListener('click', () => {
    const address = modal.querySelector('#ei-address')?.textContent?.trim();
    if (!address) return;
    close();
    showSetupWizard(address);
  });

  modal.querySelector('[data-action="copy"]')?.addEventListener('click', async () => {
    const address = modal.querySelector('#ei-address')?.textContent?.trim();
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      const input = document.createElement('input');
      input.value = address;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    showToast('Alamat email di-copy');
  });

  modal.querySelector('[data-action="toggle-active"]')?.addEventListener('change', async (e) => {
    const checked = /** @type {HTMLInputElement} */ (e.target).checked;
    await toggleImport(checked);
    showToast(checked ? 'Import aktif' : 'Import nonaktif');
  });

  modal.querySelector('[data-action="toggle-auto"]')?.addEventListener('change', async (e) => {
    const checked = /** @type {HTMLInputElement} */ (e.target).checked;
    await toggleAutoConfirm(checked);
    showToast(checked ? 'Auto-konfirmasi aktif' : 'Auto-konfirmasi nonaktif');
  });

  wirePendingActions(modal);
}

function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

function showToast(msg) {
  try {
    window.MonefyiUI?.showToast?.(msg, 'info');
    if (typeof window.showToast === 'function') window.showToast(msg, 'info');
    else {
      const t = document.createElement('div');
      t.className = 'action-toast';
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2500);
    }
  } catch { /* ignore */ }
}

function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(n || 0)));
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s || '');
  return d.innerHTML;
}

function escapeAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

if (typeof window !== 'undefined') {
  window.monefyiEmailImportUI = { showEmailImportSetup, showSetupWizard };
}
