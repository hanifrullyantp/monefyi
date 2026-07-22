/**
 * Email Import Setup & Management modal.
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
} from '../services/email-import-client.js';

/**
 * Open email import setup modal.
 */
export async function showEmailImportSetup() {
  document.querySelector('.email-import-overlay')?.remove();

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

        ${pending.length > 0 ? `
          <section class="ei-section">
            <h3 class="ei-section-title">
              ${Icon('clock', { size: 14 })} Menunggu Konfirmasi (${pending.length})
            </h3>
            <div class="ei-pending-list" id="ei-pending-list">
              ${pending.map((p) => renderPendingImport(p)).join('')}
            </div>
          </section>
        ` : ''}

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

/**
 * @param {HTMLElement} modal
 */
function wireHandlers(modal) {
  const close = () => {
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
      await setupEmailImport();
      showToast('Email import diaktifkan');
      close();
      showEmailImportSetup();
    } catch (e) {
      showToast(`Gagal: ${e.message}`);
    }
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

  modal.querySelectorAll('[data-action="confirm"]').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      try {
        await confirmImport(id);
        showToast('Transaksi disimpan');
        btn.closest('.ei-pending-card')?.remove();
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
      } catch (e) {
        showToast(`Gagal: ${e.message}`);
      }
    };
  });
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
  window.monefyiEmailImportUI = { showEmailImportSetup };
}
