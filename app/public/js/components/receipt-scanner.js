/**
 * @file js/components/receipt-scanner.js
 * @description Receipt scanner & preview UI — Vanilla JS, no framework.
 *
 * Exports:
 *  - renderReceiptScanner(callbacks)  — drag-drop / camera upload zone
 *  - renderReceiptPreview(result, callbacks) — editable confirmation card
 *
 * Lazy-loads its own CSS to avoid blocking the initial bundle.
 * @module components/receipt-scanner
 */

// Lazy-load stylesheet once
let _cssLoaded = false;
function ensureCSS() {
  if (_cssLoaded || typeof document === 'undefined') return;
  _cssLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  try {
    link.href = new URL('css/receipt-scanner.css', document.baseURI).href;
  } catch {
    link.href = '/app/css/receipt-scanner.css';
  }
  document.head.appendChild(link);
}

/**
 * Escapes HTML to prevent XSS in interpolated values.
 * @param {unknown} v
 * @returns {string}
 */
function h(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @returns {boolean} */
function isMobile() {
  return typeof navigator !== 'undefined' &&
    /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

function showScanToast(message) {
  if (typeof document === 'undefined') return;
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    padding: 12px 20px; background: rgba(245, 158, 11, 0.95); color: white;
    border-radius: 12px; font-size: 13px; font-weight: 600; z-index: 10001;
    max-width: 90vw;
  `;
  toast.textContent = '⚠️ ' + message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

/**
 * Swaps scanner card content for the preview while keeping the modal overlay.
 * @param {HTMLElement} scanner
 * @param {HTMLElement} preview
 */
export function mountReceiptPreview(scanner, preview) {
  const card = scanner.querySelector('.scanner-card');
  if (card) {
    card.replaceWith(preview);
  } else {
    scanner.innerHTML = '';
    scanner.appendChild(preview);
  }
}

export { showScanToast };

/**
 * Renders a drag-drop / file-upload scanner zone.
 *
 * @param {{
 *   onScanComplete: (file: File) => Promise<void>,
 *   onCancel: () => void
 * }} callbacks
 * @returns {HTMLElement}
 *
 * @example
 * const scanner = renderReceiptScanner({
 *   onScanComplete: async (file) => { ... },
 *   onCancel: () => scanner.remove(),
 * });
 * document.body.appendChild(scanner);
 */
export function renderReceiptScanner({ onScanComplete, onCancel } = {}) {
  ensureCSS();

  const overlay = document.createElement('div');
  overlay.className = 'receipt-scanner-modal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Scan Struk');

  overlay.innerHTML = `
    <div class="scanner-card">
      <div class="scanner-header">
        <span class="scanner-title">📷 Scan Struk</span>
        <button class="scanner-close-btn" type="button" aria-label="Tutup">✕</button>
      </div>

      <div class="scanner-upload-zone" id="scanDropZone">
        <input type="file" id="scanFileInput"
               accept="image/*"
               ${isMobile() ? 'capture="environment"' : ''}
               class="scanner-file-input"
               aria-label="Pilih foto struk">
        <div class="scanner-upload-content">
          <div class="scanner-upload-icon">🧾</div>
          <p class="scanner-upload-label">
            ${isMobile() ? 'Foto Struk' : 'Seret ke sini atau klik untuk memilih'}
          </p>
          <p class="scanner-upload-hint">JPG, PNG, HEIC · maks 10 MB</p>
          <button class="scanner-upload-btn" type="button">
            ${isMobile() ? '📷 Buka Kamera' : '📁 Pilih File'}
          </button>
        </div>
        <div class="scanner-thumb-wrap" hidden>
          <img class="scanner-thumb" alt="Preview struk" />
        </div>
      </div>

      <div class="scanner-progress" hidden>
        <div class="scanner-progress-bar">
          <div class="scanner-progress-fill"></div>
        </div>
        <p class="scanner-progress-label">Memproses…</p>
      </div>

      <p class="scanner-privacy-notice">
        🔒 Gambar tidak diunggah · hanya teks yang diekstrak
      </p>
    </div>
  `;

  const fileInput = overlay.querySelector('#scanFileInput');
  const uploadBtn = overlay.querySelector('.scanner-upload-btn');
  const dropZone = overlay.querySelector('#scanDropZone');
  const thumb = overlay.querySelector('.scanner-thumb');
  const thumbWrap = overlay.querySelector('.scanner-thumb-wrap');
  const progressBox = overlay.querySelector('.scanner-progress');
  const progressFill = overlay.querySelector('.scanner-progress-fill');
  const progressLabel = overlay.querySelector('.scanner-progress-label');
  const closeBtn = overlay.querySelector('.scanner-close-btn');

  /** @param {number} pct 0–1 */
  function setProgress(pct, label = '') {
    progressFill.style.width = `${Math.round(pct * 100)}%`;
    if (label) progressLabel.textContent = label;
  }

  /** @param {File} file */
  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File terlalu besar (maks 10 MB)');
      return;
    }

    thumb.src = URL.createObjectURL(file);
    thumbWrap.hidden = false;
    dropZone.querySelector('.scanner-upload-content').hidden = true;

    progressBox.hidden = false;
    setProgress(0.05, 'Memproses gambar…');

    const progressHandler = (/** @type {CustomEvent} */ e) => {
      const { stage, progress } = e.detail ?? {};
      const stageLabelMap = {
        preprocessing: 'Memproses gambar…',
        ocr: 'Membaca teks…',
        matching: 'Mencocokkan template…',
        community: 'Mencari template komunitas…',
        generic: 'Parsing dengan aturan…',
      };
      setProgress(progress ?? 0, stageLabelMap[stage] ?? 'Memproses…');
    };
    window.addEventListener('ocr:progress', progressHandler);

    const timeoutId = setTimeout(() => {
      console.warn('[receipt-scanner] OCR timeout 90s');
      showScanToast('OCR timeout. Silakan input manual atau coba foto lain.');
    }, 90000);

    try {
      setProgress(0.1, 'Memulai OCR…');
      if (onScanComplete) await onScanComplete(file);
    } catch (err) {
      console.error('[receipt-scanner] scan failed (recovered):', err);
      showScanToast(`Error: ${err.message}. Silakan input manual.`);
    } finally {
      clearTimeout(timeoutId);
      window.removeEventListener('ocr:progress', progressHandler);
      progressBox.hidden = true;
      if (thumb.src?.startsWith('blob:')) URL.revokeObjectURL(thumb.src);
    }
  }

  // Trigger file picker
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file);
  });

  // Drag-and-drop (desktop)
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('is-dragging');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragging'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('is-dragging');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });

  // Close
  closeBtn.addEventListener('click', () => { if (onCancel) onCancel(); });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { if (onCancel) onCancel(); }
  });

  return overlay;
}

// ---------------------------------------------------------------------------
// Receipt Preview (editable confirmation card)
// ---------------------------------------------------------------------------

const SOURCE_BADGES = {
  user_memory: { icon: '🧠', text: 'Personal',  cls: 'personal' },
  community:   { icon: '🌐', text: 'Komunitas', cls: 'community' },
  generic:     { icon: '📐', text: 'Generic',   cls: 'generic' },
  review:      { icon: '✏️', text: 'Manual',    cls: 'generic' },
  manual:      { icon: '✏️', text: 'Manual',    cls: 'generic' },
  error:       { icon: '⚠️', text: 'Error',     cls: 'generic' },
};

/**
 * Extracts current form values from the preview card.
 * @param {HTMLElement} container
 * @returns {object}
 */
function getPreviewFormData(container) {
  const get = (name) => container.querySelector(`[name="${name}"]`)?.value?.trim() ?? '';
  const items = [];
  container.querySelectorAll('.receipt-item-row').forEach((row) => {
    const name = row.querySelector('[name="item_name"]')?.value?.trim() ?? '';
    const amt = parseFloat(row.querySelector('[name="item_amount"]')?.value ?? '0') || 0;
    if (name) items.push({ name, amount: amt });
  });

  return {
    date: get('date'),
    type: get('type') || 'expense',
    amount: parseFloat(get('amount')) || 0,
    category: get('category'),
    account: get('account'),
    merchant: get('merchant'),
    notes: get('notes'),
    items,
    currency: 'IDR',
  };
}

/**
 * Renders an editable receipt preview card for user confirmation.
 *
 * Shows source badge, confidence bar, editable fields, items list,
 * and action buttons. Fires toast notifications on template learning events.
 *
 * @param {{
 *   parsed: object,
 *   source: string,
 *   template: object|null,
 *   confidence: number,
 *   rawText?: string
 * }} scanResult
 * @param {{
 *   onSave: (finalData: object) => Promise<void>,
 *   onCancel: () => void,
 *   onEdit?: () => void
 * }} callbacks
 * @returns {HTMLElement}
 */
export function renderReceiptPreview(scanResult, callbacks = {}) {
  ensureCSS();

  const { parsed = {}, source = 'generic', confidence = 0.6, error = null } = scanResult;
  const { onSave, onCancel, onEdit } = callbacks;

  const badge = SOURCE_BADGES[source] ?? SOURCE_BADGES.generic;
  const conf = Math.max(0, Math.min(1, confidence));
  const confPct = Math.round(conf * 100);
  const confClass = conf >= 0.90 ? 'high' : conf >= 0.70 ? 'medium' : 'low';

  const today = new Date().toISOString().split('T')[0];
  const date = parsed.date
    ? normaliseDate(parsed.date)
    : today;

  const items = Array.isArray(parsed.items) ? parsed.items : [];

  const card = document.createElement('div');
  card.className = 'receipt-preview-card';

  card.innerHTML = `
    ${error ? `<div class="receipt-error-banner" role="alert">${h(error)}</div>` : ''}
    <div class="receipt-preview-header">
      <span class="receipt-source-badge receipt-source-badge--${h(badge.cls)}"
            title="Sumber: ${h(source)}">
        ${badge.icon} ${h(badge.text)}
      </span>
      <div class="receipt-confidence receipt-confidence--${h(confClass)}">
        <div class="receipt-conf-bar-track">
          <div class="receipt-conf-bar-fill" style="width:${confPct}%"></div>
        </div>
        <span class="receipt-conf-label">${confPct}%</span>
      </div>
      <button type="button" class="receipt-close-btn" aria-label="Tutup">✕</button>
    </div>

    <div class="receipt-fields">
      <div class="receipt-field">
        <label class="receipt-field-label">Tanggal</label>
        <input type="date" name="date" class="receipt-field-input" value="${h(date)}" />
      </div>
      <div class="receipt-field">
        <label class="receipt-field-label">Tipe</label>
        <select name="type" class="receipt-field-input">
          <option value="expense" ${parsed.type !== 'income' && parsed.type !== 'transfer' ? 'selected' : ''}>Pengeluaran</option>
          <option value="income" ${parsed.type === 'income' ? 'selected' : ''}>Pemasukan</option>
          <option value="transfer" ${parsed.type === 'transfer' ? 'selected' : ''}>Transfer</option>
        </select>
      </div>
      <div class="receipt-field receipt-field--amount">
        <label class="receipt-field-label">Total</label>
        <input type="number" name="amount" class="receipt-field-input"
               value="${h(parsed.amount ?? parsed.total ?? 0)}" min="0" required />
      </div>
      <div class="receipt-field">
        <label class="receipt-field-label">Merchant</label>
        <input type="text" name="merchant" class="receipt-field-input"
               value="${h(parsed.merchant ?? '')}" />
      </div>
      <div class="receipt-field">
        <label class="receipt-field-label">Kategori</label>
        <input type="text" name="category" class="receipt-field-input"
               value="${h(parsed.category ?? '')}" list="rs-categories" />
        <datalist id="rs-categories">
          <option value="Food & Drink"><option value="Transport">
          <option value="Shopping"><option value="Bills & Utilities">
          <option value="Health"><option value="Entertainment">
          <option value="Salary"><option value="Lainnya">
        </datalist>
      </div>
      <div class="receipt-field">
        <label class="receipt-field-label">Akun</label>
        <input type="text" name="account" class="receipt-field-input"
               value="${h(parsed.account ?? '')}" list="rs-accounts" />
        <datalist id="rs-accounts">
          <option value="GoPay"><option value="OVO"><option value="DANA">
          <option value="BCA"><option value="Mandiri"><option value="Cash">
        </datalist>
      </div>
      <div class="receipt-field">
        <label class="receipt-field-label">Notes</label>
        <textarea name="notes" class="receipt-field-input" rows="2">${h(parsed.notes ?? '')}</textarea>
      </div>
    </div>

    ${items.length ? `
    <div class="receipt-items-section">
      <div class="receipt-items-header">
        <span>Item (${items.length})</span>
        <button type="button" class="receipt-add-item-btn" aria-label="Tambah item">＋</button>
      </div>
      <ul class="receipt-items-list">
        ${items.map((item, i) => renderItemRow(item, i)).join('')}
      </ul>
    </div>` : ''}

    <p class="receipt-privacy-notice">🔒 Gambar tidak disimpan · hanya teks yang diekstrak</p>

    <div class="receipt-actions">
      <button type="button" class="receipt-btn receipt-btn--cancel">Batal</button>
      ${onEdit ? '<button type="button" class="receipt-btn receipt-btn--edit">Edit Detail</button>' : ''}
      <button type="button" class="receipt-btn receipt-btn--save">✓ Simpan</button>
    </div>
  `;

  // Add item row
  const itemsList = card.querySelector('.receipt-items-list');
  card.querySelector('.receipt-add-item-btn')?.addEventListener('click', () => {
    const li = document.createElement('li');
    li.className = 'receipt-item-row';
    li.innerHTML = renderItemRow({ name: '', amount: 0 }, (itemsList?.children.length ?? 0));
    li.querySelector('.receipt-item-remove')?.addEventListener('click', () => li.remove());
    itemsList?.appendChild(li);
  });

  itemsList?.querySelectorAll('.receipt-item-remove').forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('.receipt-item-row')?.remove());
  });

  // Actions
  card.querySelector('.receipt-btn--save')?.addEventListener('click', async () => {
    const finalData = getPreviewFormData(card);
    if (!finalData.amount || finalData.amount <= 0) {
      const amtInput = card.querySelector('[name="amount"]');
      amtInput?.focus();
      amtInput?.reportValidity?.();
      return;
    }
    const saveBtn = card.querySelector('.receipt-btn--save');
    if (saveBtn) saveBtn.disabled = true;
    try {
      if (onSave) await onSave(finalData);
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  card.querySelector('.receipt-btn--cancel')?.addEventListener('click', () => {
    if (onCancel) onCancel();
  });

  card.querySelector('.receipt-btn--edit')?.addEventListener('click', () => {
    if (onEdit) onEdit(getPreviewFormData(card));
  });

  card.querySelector('.receipt-close-btn')?.addEventListener('click', () => {
    if (onCancel) onCancel();
  });

  return card;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Renders one item row HTML string.
 * @param {{ name: string, amount: number }} item
 * @param {number} idx
 * @returns {string}
 */
function renderItemRow(item, idx) {
  return `<li class="receipt-item-row" data-index="${idx}">
    <input type="text" name="item_name" class="receipt-item-name"
           value="${h(item.name)}" placeholder="Nama item" aria-label="Nama item" />
    <input type="number" name="item_amount" class="receipt-item-amount"
           value="${h(item.amount)}" min="0" placeholder="0" aria-label="Harga item" />
    <button type="button" class="receipt-item-remove" aria-label="Hapus item">✕</button>
  </li>`;
}

/**
 * Converts common date formats to ISO 8601 (YYYY-MM-DD).
 * Falls back to today if parsing fails.
 * @param {string} raw
 * @returns {string}
 */
function normaliseDate(raw) {
  if (!raw) return new Date().toISOString().split('T')[0];

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try native Date parse as last resort
  const parsed = new Date(raw);
  if (!isNaN(parsed)) return parsed.toISOString().split('T')[0];

  return new Date().toISOString().split('T')[0];
}
