/**
 * @file js/components/quick-preview.js
 * @description Confirmation preview card for Quick Text parse results before save.
 */

const BADGES = {
  memory: { icon: '🧠', text: 'Memory', color: 'purple' },
  rule: { icon: '📏', text: 'Rule', color: 'blue' },
  ai: { icon: '✨', text: 'AI', color: 'green' },
  pending: { icon: '⏳', text: 'Pending', color: 'amber' },
  manual: { icon: '✍️', text: 'Manual', color: 'gray' },
};

/**
 * @typedef {Object} QuickPreviewModel
 * @property {string} [source]
 * @property {number} [confidence]
 * @property {string} [date]
 * @property {string} [type]
 * @property {number|string} [amount]
 * @property {string} [category]
 * @property {string} [account]
 * @property {string} [merchant]
 * @property {string} [notes]
 * @property {string[]} [matchedRules]
 * @property {string[]} [flags]
 */

/**
 * @typedef {Object} QuickPreviewCallbacks
 * @property {(edited: Object, original: QuickPreviewModel) => void} [onSave]
 * @property {(edited: Object, original: QuickPreviewModel) => void} [onEdit]
 * @property {() => void} [onCancel]
 */

/**
 * Escapes HTML for safe attribute / text insertion.
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Loads quick-preview stylesheet once.
 */
function ensureQuickPreviewStyles() {
  if (document.getElementById('quick-preview-css')) return;
  const link = document.createElement('link');
  link.id = 'quick-preview-css';
  link.rel = 'stylesheet';
  try {
    link.href = new URL('css/quick-preview.css', document.baseURI).href;
  } catch {
    link.href = '/app/css/quick-preview.css';
  }
  document.head.appendChild(link);
}

/**
 * Maps a transaction object from parseQuickText() to preview model.
 * @param {Object} tx
 * @returns {QuickPreviewModel}
 */
export function txToPreviewModel(tx) {
  const provider = tx?.meta?.provider ?? tx?.source ?? 'manual';
  const sourceMap = {
    memory: 'memory',
    rule: 'rule',
    fuzzy: 'rule',
    supabase_edge: 'ai',
    server_ai: 'ai',
    local_ai: 'ai',
    ai: 'ai',
    pending: 'pending',
    queue: 'pending',
    heuristic: 'manual',
    manual: 'manual',
  };

  return {
    source: sourceMap[provider] ?? 'manual',
    confidence: Number(tx?.meta?.confidence ?? tx?.confidence ?? 0.75),
    date: tx?.date || new Date().toISOString().slice(0, 10),
    type: tx?.type || 'expense',
    amount: tx?.amount ?? 0,
    category: tx?.category || '',
    account: tx?.account || tx?.payment_method || '',
    merchant: tx?.merchant || '',
    notes: tx?.notes || '',
    matchedRules: tx?.meta?.matchedRules ?? tx?.matchedRules ?? [],
    flags: tx?.meta?.pipelineFlags ?? tx?.flags ?? [],
    budgetEvaluation: tx?._budget_evaluation ?? tx?.budgetEvaluation ?? null,
  };
}

/**
 * Reads edited field values from the preview card form.
 * @param {HTMLElement} container
 * @returns {Object}
 */
export function getFormData(container) {
  /** @param {string} name */
  const val = (name) => {
    const el = container.querySelector(`[name="${name}"]`);
    return el ? /** @type {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} */ (el).value : '';
  };

  return {
    date: val('date'),
    type: val('type'),
    amount: Number(val('amount')) || 0,
    category: val('category'),
    account: val('account'),
    merchant: val('merchant'),
    notes: val('notes'),
  };
}

/**
 * Renders confirmation preview card with editable fields.
 * @param {QuickPreviewModel} parsed
 * @param {QuickPreviewCallbacks} [callbacks]
 * @returns {HTMLElement}
 */
export function renderQuickPreview(parsed, callbacks = {}) {
  ensureQuickPreviewStyles();

  const { onSave, onEdit, onCancel } = callbacks;
  const badge = BADGES[parsed.source ?? ''] ?? BADGES.manual;
  const conf = Math.min(Math.max(Number(parsed.confidence ?? 0), 0), 1);
  const confClass = conf >= 0.90 ? 'high' : conf >= 0.70 ? 'medium' : 'low';
  const today = new Date().toISOString().split('T')[0];

  const container = document.createElement('div');
  container.className = 'quick-preview-card';
  container.dataset.source = parsed.source ?? 'manual';

  container.innerHTML = `
    <div class="qp-header">
      <span class="qp-badge qp-badge-${badge.color}" title="Parser: ${escapeHtml(parsed.source || 'manual')}">
        ${badge.icon} ${badge.text}
      </span>
      <div class="qp-confidence qp-confidence-${confClass}" title="Confidence ${Math.round(conf * 100)}%">
        <div class="qp-conf-track"><div class="qp-conf-bar" style="width:${Math.round(conf * 100)}%"></div></div>
        <span class="qp-conf-text">${Math.round(conf * 100)}%</span>
      </div>
    </div>
    ${parsed.matchedRules?.length ? `<div class="qp-rules" title="${escapeHtml(parsed.matchedRules.join(', '))}">Rules: ${escapeHtml(parsed.matchedRules.join(', '))}</div>` : ''}
    ${parsed.budgetEvaluation?.message ? `
      <div class="qp-budget-hint severity-${parsed.budgetEvaluation.severity || 'info'}">
        ${escapeHtml(parsed.budgetEvaluation.message)}
      </div>
    ` : ''}
    <div class="qp-fields">
      <div class="qp-field">
        <label for="qp-date">Tanggal</label>
        <input type="date" id="qp-date" name="date" value="${escapeHtml(parsed.date || today)}" />
      </div>
      <div class="qp-field">
        <label for="qp-type">Tipe</label>
        <select id="qp-type" name="type">
          <option value="expense"${parsed.type === 'expense' ? ' selected' : ''}>Pengeluaran</option>
          <option value="income"${parsed.type === 'income' ? ' selected' : ''}>Pemasukan</option>
          <option value="transfer"${parsed.type === 'transfer' ? ' selected' : ''}>Transfer</option>
        </select>
      </div>
      <div class="qp-field qp-field-amount">
        <label for="qp-amount">Jumlah</label>
        <input type="number" id="qp-amount" name="amount" value="${escapeHtml(parsed.amount ?? 0)}" min="0" step="any" required />
      </div>
      <div class="qp-field">
        <label for="qp-category">Kategori</label>
        <input type="text" id="qp-category" name="category" value="${escapeHtml(parsed.category || '')}" list="qp-categories" />
        <datalist id="qp-categories">
          <option value="Food &amp; Drink"><option value="Transport"><option value="Shopping">
          <option value="Bills &amp; Utilities"><option value="Health"><option value="Entertainment">
          <option value="Salary"><option value="Other">
        </datalist>
      </div>
      <div class="qp-field">
        <label for="qp-account">Akun</label>
        <input type="text" id="qp-account" name="account" value="${escapeHtml(parsed.account || '')}" list="qp-accounts" />
        <datalist id="qp-accounts">
          <option value="GoPay"><option value="OVO"><option value="DANA">
          <option value="BCA"><option value="Mandiri"><option value="Cash">
        </datalist>
      </div>
      <div class="qp-field">
        <label for="qp-merchant">Merchant / Catatan</label>
        <input type="text" id="qp-merchant" name="merchant" value="${escapeHtml(parsed.merchant || '')}" />
      </div>
      <div class="qp-field qp-field-notes">
        <label for="qp-notes">Notes</label>
        <textarea id="qp-notes" name="notes" rows="2">${escapeHtml(parsed.notes || '')}</textarea>
      </div>
    </div>
    <div class="qp-actions">
      <button type="button" class="qp-btn qp-btn-cancel tap">Batal</button>
      <button type="button" class="qp-btn qp-btn-edit tap">Edit Detail</button>
      <button type="button" class="qp-btn qp-btn-save tap">✓ Simpan</button>
    </div>
  `;

  container.querySelector('.qp-btn-save')?.addEventListener('click', async () => {
    const edited = getFormData(container);
    if (!edited.amount || edited.amount <= 0) {
      container.querySelector('.qp-field-amount')?.classList.add('qp-field--warn');
      return;
    }

    // ── Learning loop: capture user corrections (fire-and-forget) ──────────
    try {
      const { loadModule } = await import('../utils/module-loader.js');
      const { diffCorrections, extractPatterns, saveLearntPatterns }
        = await loadModule('js/services/correction-learner.js');

      const rawInput = parsed.rawInput ?? parsed.original ?? parsed.notes ?? '';
      const diffs = diffCorrections(parsed, edited);

      if (diffs.length > 0 && rawInput) {
        const patterns = extractPatterns(rawInput, diffs);
        if (patterns.length > 0) {
          await saveLearntPatterns(patterns);
          _showLearningToast(`💡 Sistem belajar ${patterns.length} pattern baru!`);
        }
      }
    } catch (learnErr) {
      // Learning MUST NOT block save
      console.error('[quick-preview] learning failed (non-fatal):', learnErr);
    }
    // ────────────────────────────────────────────────────────────────────────

    onSave?.(edited, parsed);
  });

  container.querySelector('.qp-btn-edit')?.addEventListener('click', () => {
    onEdit?.(getFormData(container), parsed);
  });

  container.querySelector('.qp-btn-cancel')?.addEventListener('click', () => {
    onCancel?.();
  });

  return container;
}

/**
 * Shows a brief learning confirmation toast.
 * Self-removes after 3 s. Silent no-op in non-browser environments.
 * @param {string} message
 */
function _showLearningToast(message) {
  if (typeof document === 'undefined') return;
  const toast = document.createElement('div');
  toast.className = 'qp-learning-toast';
  toast.textContent = message;
  toast.style.cssText = [
    'position:fixed', 'top:20px', 'left:50%', 'transform:translateX(-50%)',
    'background:linear-gradient(135deg,#10b981,#059669)', 'color:#fff',
    'padding:10px 22px', 'border-radius:24px', 'font-size:13px', 'font-weight:600',
    'z-index:10001', 'box-shadow:0 4px 12px rgba(0,0,0,.3)',
    'animation:qpToastIn .25s ease', 'pointer-events:none',
  ].join(';');
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
