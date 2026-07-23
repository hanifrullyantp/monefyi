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

/** @returns {string} */
function getScannerCardHTML() {
  return `
    <div class="scanner-card">
      <div class="scanner-header">
        <span class="scanner-title">📷 Scan Struk</span>
        <button class="scanner-close-btn sheet-close-btn" type="button" aria-label="Tutup"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
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

      <p class="scanner-photo-tips">
        💡 Tips foto bagus: pencahayaan terang · struk diluruskan · fokus tajam
      </p>

      <p class="scanner-privacy-notice">
        🔒 Gambar tidak diunggah · hanya teks yang diekstrak
      </p>
    </div>
  `;
}

/**
 * Wires upload/drag-drop handlers on a scanner overlay element.
 * @param {HTMLElement} overlay
 * @param {{ onScanComplete?: (file: File) => Promise<void>, onCancel?: () => void }} callbacks
 */
function wireScannerCard(overlay, { onScanComplete, onCancel } = {}) {
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
    if (progressFill) progressFill.style.width = `${Math.round(pct * 100)}%`;
    if (label && progressLabel) progressLabel.textContent = label;
  }

  /** @param {File} file */
  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File terlalu besar (maks 10 MB)');
      return;
    }

    if (thumb) thumb.src = URL.createObjectURL(file);
    if (thumbWrap) thumbWrap.hidden = false;
    dropZone?.querySelector('.scanner-upload-content')?.setAttribute('hidden', '');

    if (progressBox) progressBox.hidden = false;
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
      if (progressBox) progressBox.hidden = true;
      if (thumb?.src?.startsWith('blob:')) URL.revokeObjectURL(thumb.src);
    }
  }

  uploadBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file);
  });

  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('is-dragging');
  });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('is-dragging'));
  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('is-dragging');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });

  closeBtn?.addEventListener('click', () => { if (onCancel) onCancel(); });
}

/**
 * Restores upload zone after preview (re-scan flow).
 * @param {HTMLElement} overlay
 * @param {{ onScanComplete?: (file: File) => Promise<void>, onCancel?: () => void }} callbacks
 */
export function restoreScannerUpload(overlay, callbacks = {}) {
  ensureCSS();
  overlay.innerHTML = getScannerCardHTML();
  wireScannerCard(overlay, callbacks);
}

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

  overlay.innerHTML = getScannerCardHTML();
  wireScannerCard(overlay, { onScanComplete, onCancel });

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
 * @param {object|null|undefined} quality
 * @param {string} fieldName
 * @returns {object|null}
 */
function getFieldQualityFlag(quality, fieldName) {
  if (!quality) return null;
  const all = [...(quality.issues || []), ...(quality.warnings || [])];
  return all.find((item) => item.field === fieldName) ?? null;
}

/**
 * @param {object|null|undefined} quality
 * @returns {string}
 */
function renderQualityWarningBanner(quality) {
  if (!quality?.shouldWarn) return '';

  const bannerClass = quality.level === 'poor'
    ? 'receipt-warning-banner receipt-warning-poor'
    : 'receipt-warning-banner receipt-warning-medium';
  const icon = quality.level === 'poor' ? '🚫' : '⚠️';

  const itemsList = [...(quality.issues || []), ...(quality.warnings || [])]
    .slice(0, 3)
    .map((item) => `<li>${h(item.message)}</li>`)
    .join('');

  const continueBtn = quality.level !== 'poor'
    ? '<button type="button" class="receipt-btn receipt-btn-ghost" data-action="continue">⚠️ Lanjut Saja</button>'
    : '';

  return `
    <div class="${bannerClass}" data-quality-banner>
      <div class="receipt-warning-header">
        <span class="receipt-warning-icon">${icon}</span>
        <div class="receipt-warning-content">
          <h4>${h(quality.summary)}</h4>
          <ul class="receipt-warning-list">${itemsList}</ul>
        </div>
      </div>
      <div class="receipt-warning-actions">
        <button type="button" class="receipt-btn receipt-btn-warning" data-action="rescan">📷 Foto Lagi</button>
        <button type="button" class="receipt-btn receipt-btn-outline" data-action="manual">✏️ Input Manual</button>
        ${continueBtn}
      </div>
    </div>
  `;
}

/**
 * @param {string} name
 * @param {string} label
 * @param {string} value
 * @param {string} inputHtml
 * @param {object|null|undefined} quality
 * @param {string} [extraClass]
 * @returns {string}
 */
function renderPreviewField(name, label, value, inputHtml, quality, extraClass = '') {
  const flag = getFieldQualityFlag(quality, name);
  const warnClass = flag ? ' receipt-field--warning' : '';

  return `
    <div class="receipt-field${extraClass}${warnClass}">
      <label class="receipt-field-label">
        ${h(label)}
        ${flag ? `<span class="receipt-field-warning-icon" title="${h(flag.message)}">⚠️</span>` : ''}
      </label>
      ${inputHtml}
      ${flag ? `<small class="receipt-field-warning-text">${h(flag.message)}</small>` : ''}
    </div>
  `;
}

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
 *   onEdit?: () => void,
 *   onRescan?: () => void,
 *   onManual?: () => void
 * }} callbacks
 * @returns {HTMLElement}
 */
export function renderReceiptPreview(scanResult, callbacks = {}) {
  ensureCSS();

  const { parsed = {}, source = 'generic', confidence = 0.6, error = null, quality = null } = scanResult;
  const { onSave, onCancel, onEdit, onRescan, onManual } = callbacks;

  const badge = SOURCE_BADGES[source] ?? SOURCE_BADGES.generic;
  const displayScore = quality?.score ?? Math.max(0, Math.min(1, confidence));
  const confPct = Math.round(displayScore * 100);
  const confClass = quality?.level === 'good' ? 'high'
    : quality?.level === 'medium' ? 'medium'
    : quality?.level === 'poor' ? 'low'
    : (displayScore >= 0.90 ? 'high' : displayScore >= 0.70 ? 'medium' : 'low');

  const today = new Date().toISOString().split('T')[0];
  const date = parsed.date ? normaliseDate(parsed.date) : today;
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  const typeSelect = `
    <select name="type" class="receipt-field-input">
      <option value="expense" ${parsed.type !== 'income' && parsed.type !== 'transfer' ? 'selected' : ''}>Pengeluaran</option>
      <option value="income" ${parsed.type === 'income' ? 'selected' : ''}>Pemasukan</option>
      <option value="transfer" ${parsed.type === 'transfer' ? 'selected' : ''}>Transfer</option>
    </select>`;

  const card = document.createElement('div');
  card.className = 'receipt-preview-card';

  card.innerHTML = `
    ${error ? `<div class="receipt-error-banner" role="alert">${h(error)}</div>` : ''}
    ${renderQualityWarningBanner(quality)}
    <div class="receipt-preview-header">
      <span class="receipt-source-badge receipt-source-badge--${h(badge.cls)}"
            title="Sumber: ${h(source)}">
        ${badge.icon} ${h(badge.text)}
      </span>
      <div class="receipt-confidence receipt-confidence--${h(confClass)}" title="Skor kualitas OCR">
        <div class="receipt-conf-bar-track">
          <div class="receipt-conf-bar-fill" style="width:${confPct}%"></div>
        </div>
        <span class="receipt-conf-label">${confPct}%</span>
      </div>
      <button type="button" class="receipt-close-btn sheet-close-btn" aria-label="Tutup"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
    </div>

    <div class="receipt-fields">
      ${renderPreviewField('date', 'Tanggal', date,
        `<input type="date" name="date" class="receipt-field-input" value="${h(date)}" />`, quality)}
      ${renderPreviewField('type', 'Tipe', parsed.type ?? 'expense', typeSelect, quality)}
      ${renderPreviewField('amount', 'Total', String(parsed.amount ?? parsed.total ?? 0),
        `<input type="number" name="amount" class="receipt-field-input"
                value="${h(parsed.amount ?? parsed.total ?? 0)}" min="0" required />`,
        quality, ' receipt-field--amount')}
      ${renderPreviewField('merchant', 'Merchant', parsed.merchant ?? '',
        `<input type="text" name="merchant" class="receipt-field-input"
                value="${h(parsed.merchant ?? '')}" />`, quality)}
      ${renderPreviewField('category', 'Kategori', parsed.category ?? '',
        `<input type="text" name="category" class="receipt-field-input"
                value="${h(parsed.category ?? '')}" list="rs-categories" />`, quality)}
      ${renderPreviewField('account', 'Akun', parsed.account ?? '',
        `<input type="text" name="account" class="receipt-field-input"
                value="${h(parsed.account ?? '')}" list="rs-accounts" />`, quality)}
      ${renderPreviewField('notes', 'Notes', parsed.notes ?? '',
        `<textarea name="notes" class="receipt-field-input" rows="2">${h(parsed.notes ?? '')}</textarea>`, quality)}
      <datalist id="rs-categories">
        <option value="Food & Drink"><option value="Transport">
        <option value="Shopping"><option value="Bills & Utilities">
        <option value="Health"><option value="Entertainment">
        <option value="Salary"><option value="Lainnya">
      </datalist>
      <datalist id="rs-accounts">
        <option value="GoPay"><option value="OVO"><option value="DANA">
        <option value="QRIS"><option value="BCA"><option value="Mandiri"><option value="Cash">
      </datalist>
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

    ${scanResult.rawText ? `
    <details class="receipt-raw-text">
      <summary>📄 Lihat teks OCR mentah</summary>
      <pre>${h(scanResult.rawText)}</pre>
    </details>` : ''}

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

  card.querySelector('[data-action="rescan"]')?.addEventListener('click', () => {
    if (onRescan) onRescan();
  });

  card.querySelector('[data-action="manual"]')?.addEventListener('click', () => {
    if (onManual) onManual();
  });

  card.querySelector('[data-action="continue"]')?.addEventListener('click', () => {
    card.querySelector('[data-quality-banner]')?.remove();
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
    <button type="button" class="receipt-item-remove" aria-label="Hapus item"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
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
