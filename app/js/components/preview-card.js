/**
 * @file js/components/preview-card.js
 * @description Preview card component for parsed transaction results.
 * Shows parser source badge, confidence bar, editable fields, and action buttons.
 *
 * Dispatches bubbling custom events from the returned element:
 *   - `preview-card:save`  — detail: collected field values + original parsed metadata
 *   - `preview-card:edit`  — detail: collected field values
 *   - `preview-card:cancel` — detail: original parsed object
 */

/** @typedef {'memory'|'rule'|'ai'|'manual'} ParseSource */

/**
 * @typedef {Object} ParsedPreview
 * @property {ParseSource} [source] - Parser layer that produced this result
 * @property {number} [confidence] - Confidence score 0–1
 * @property {string} [date] - ISO date (YYYY-MM-DD)
 * @property {string} [type] - expense | income | transfer
 * @property {number|string} [amount]
 * @property {string} [category]
 * @property {string} [account]
 * @property {string} [merchant]
 * @property {string} [notes]
 * @property {string[]} [matchedRules] - Grammar rules matched (rule source)
 * @property {string[]} [flags] - e.g. ambiguous_amount, unknown_category
 * @property {string} [explanation] - Optional human-readable parse explanation
 */

/** @type {Record<string, { icon: string, color: string, text: string, tooltip: string }>} */
const BADGE_CONFIG = {
  memory: { icon: '🧠', color: 'purple', text: 'Learned', tooltip: 'From your patterns' },
  rule: { icon: '📏', color: 'blue', text: 'Rule', tooltip: 'Matched grammar rules' },
  ai: { icon: '✨', color: 'green', text: 'AI', tooltip: 'Analyzed by Gemini' },
  manual: { icon: '✍️', color: 'gray', text: 'Manual', tooltip: 'Needs your input' },
};

/** @type {readonly string[]} */
const FIELD_NAMES = ['date', 'type', 'amount', 'category', 'account', 'merchant', 'notes'];

/** @type {readonly string[]} */
const TYPE_OPTIONS = ['expense', 'income', 'transfer'];

/**
 * Escapes HTML special characters to prevent XSS in user-provided values.
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
 * Normalises confidence to a 0–1 float.
 * @param {number|undefined|null} confidence
 * @returns {number}
 */
function normalizeConfidence(confidence) {
  const n = Number(confidence);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 1);
}

/**
 * Returns the CSS class for confidence bar color coding.
 * @param {number} confidence - 0–1
 * @returns {'confidence-high'|'confidence-medium'|'confidence-low'}
 */
function getConfidenceClass(confidence) {
  if (confidence >= 0.90) return 'confidence-high';
  if (confidence >= 0.70) return 'confidence-medium';
  return 'confidence-low';
}

/**
 * Capitalises the first letter of a field name for display labels.
 * @param {string} name
 * @returns {string}
 */
function formatLabel(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Returns whether a field should show a low-confidence warning.
 * @param {string} name - Field name
 * @param {string[]} flags
 * @returns {boolean}
 */
function fieldHasWarning(name, flags) {
  return flags.includes(`ambiguous_${name}`) || flags.includes(`unknown_${name}`);
}

/**
 * Builds tooltip text for the source badge.
 * @param {ParsedPreview} parsed
 * @param {{ icon: string, color: string, text: string, tooltip: string }} badge
 * @returns {string}
 */
function buildBadgeTooltip(parsed, badge) {
  if (parsed.source === 'rule' && parsed.matchedRules?.length) {
    return `Matched: ${parsed.matchedRules.join(', ')}`;
  }
  return badge.tooltip;
}

/**
 * Creates the parser source badge element.
 * @param {ParsedPreview} parsed
 * @returns {HTMLSpanElement}
 */
function createBadge(parsed) {
  const badge = BADGE_CONFIG[parsed.source ?? ''] ?? BADGE_CONFIG.manual;
  const el = document.createElement('span');
  el.className = `preview-badge preview-badge--${badge.color}`;
  el.title = buildBadgeTooltip(parsed, badge);
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="preview-badge__icon" aria-hidden="true">${badge.icon}</span><span class="preview-badge__text">${escapeHtml(badge.text)}</span>`;
  return el;
}

/**
 * Creates the confidence indicator (bar + percentage).
 * @param {number} confidence - 0–1
 * @returns {HTMLDivElement}
 */
function createConfidenceIndicator(confidence) {
  const wrap = document.createElement('div');
  wrap.className = 'preview-confidence';
  wrap.setAttribute('aria-label', `Confidence ${Math.round(confidence * 100)} percent`);

  const barBg = document.createElement('div');
  barBg.className = 'preview-confidence__bar-bg';

  const barFill = document.createElement('div');
  barFill.className = `preview-confidence__bar-fill ${getConfidenceClass(confidence)}`;
  barFill.style.width = `${Math.round(confidence * 100)}%`;

  const text = document.createElement('span');
  text.className = 'preview-confidence__text';
  text.textContent = `${Math.round(confidence * 100)}%`;

  barBg.appendChild(barFill);
  wrap.appendChild(barBg);
  wrap.appendChild(text);
  return wrap;
}

/**
 * Creates a single editable field row with optional warning icon.
 * @param {string} name - Field name
 * @param {string|number|undefined|null} value
 * @param {string[]} flags
 * @returns {HTMLDivElement}
 */
function createField(name, value, flags) {
  const hasWarning = fieldHasWarning(name, flags);
  const field = document.createElement('div');
  field.className = `preview-field${hasWarning ? ' preview-field--warning' : ''}`;
  field.dataset.field = name;

  const label = document.createElement('label');
  label.className = 'preview-field__label';
  label.htmlFor = `preview-${name}`;
  label.textContent = formatLabel(name);

  const controlWrap = document.createElement('div');
  controlWrap.className = 'preview-field__control';

  /** @type {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} */
  let control;

  if (name === 'type') {
    control = document.createElement('select');
    control.id = `preview-${name}`;
    control.name = name;
    control.className = 'preview-field__input preview-field__select';
    for (const opt of TYPE_OPTIONS) {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = formatLabel(opt);
      if (String(value ?? '').toLowerCase() === opt) option.selected = true;
      control.appendChild(option);
    }
  } else if (name === 'notes') {
    control = document.createElement('textarea');
    control.id = `preview-${name}`;
    control.name = name;
    control.className = 'preview-field__input preview-field__textarea';
    control.rows = 2;
    control.value = String(value ?? '');
  } else {
    control = document.createElement('input');
    control.id = `preview-${name}`;
    control.name = name;
    control.className = `preview-field__input${hasWarning ? ' preview-field__input--warning' : ''}`;
    if (name === 'amount') {
      control.type = 'number';
      control.min = '0';
      control.step = 'any';
      control.inputMode = 'decimal';
    } else if (name === 'date') {
      control.type = 'date';
    } else {
      control.type = 'text';
    }
    control.value = String(value ?? '');
  }

  if (hasWarning) control.classList.add('preview-field__input--warning');
  controlWrap.appendChild(control);

  if (hasWarning) {
    const warn = document.createElement('span');
    warn.className = 'preview-field__warning-icon';
    warn.title = 'Please verify this field';
    warn.setAttribute('aria-label', 'Low confidence — please verify');
    warn.textContent = '⚠️';
    controlWrap.appendChild(warn);
  }

  field.appendChild(label);
  field.appendChild(controlWrap);
  return field;
}

/**
 * Reads current values from all editable fields inside a preview card.
 * @param {HTMLElement} container
 * @returns {Record<string, string|number>}
 */
function collectFieldValues(container) {
  /** @type {Record<string, string|number>} */
  const values = {};
  for (const name of FIELD_NAMES) {
    const el = container.querySelector(`[name="${name}"]`);
    if (!el) continue;
    if (name === 'amount') {
      values.amount = Number(/** @type {HTMLInputElement} */ (el).value) || 0;
    } else {
      values[name] = /** @type {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} */ (el).value;
    }
  }
  return values;
}

/**
 * Creates action buttons (Save, Edit, Cancel) and wires custom events.
 * @param {HTMLElement} container
 * @param {ParsedPreview} parsed
 * @returns {HTMLDivElement}
 */
function createActions(container, parsed) {
  const actions = document.createElement('div');
  actions.className = 'preview-actions';

  const btnSave = document.createElement('button');
  btnSave.type = 'button';
  btnSave.className = 'preview-btn preview-btn--primary tap';
  btnSave.innerHTML = '<span aria-hidden="true">💾</span> Save';

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.className = 'preview-btn preview-btn--secondary tap';
  btnEdit.innerHTML = '<span aria-hidden="true">✏️</span> Edit';

  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.className = 'preview-btn preview-btn--text tap';
  btnCancel.textContent = 'Cancel';

  btnSave.addEventListener('click', () => {
    const values = collectFieldValues(container);
    container.dispatchEvent(new CustomEvent('preview-card:save', {
      bubbles: true,
      detail: { ...parsed, ...values },
    }));
  });

  btnEdit.addEventListener('click', () => {
    const values = collectFieldValues(container);
    container.dispatchEvent(new CustomEvent('preview-card:edit', {
      bubbles: true,
      detail: { ...parsed, ...values },
    }));
  });

  btnCancel.addEventListener('click', () => {
    container.dispatchEvent(new CustomEvent('preview-card:cancel', {
      bubbles: true,
      detail: { ...parsed },
    }));
  });

  actions.appendChild(btnSave);
  actions.appendChild(btnEdit);
  actions.appendChild(btnCancel);
  return actions;
}

/**
 * Renders a preview card with parser metadata, confidence indicator,
 * editable transaction fields, and Save / Edit / Cancel actions.
 *
 * @param {ParsedPreview} parsed - Parsed transaction data from L0–L5 pipeline
 * @returns {HTMLElement} Root `.preview-card` DOM node (append to document)
 *
 * @example
 * const card = renderPreviewCard({
 *   source: 'rule',
 *   confidence: 0.85,
 *   type: 'expense',
 *   amount: 25000,
 *   merchant: 'kopi',
 *   category: 'Food & Drink',
 *   account: 'GoPay',
 *   matchedRules: ['expense_merchant_amount'],
 *   flags: [],
 * });
 * card.addEventListener('preview-card:save', (e) => saveTransaction(e.detail));
 * document.getElementById('quickAiPreview').appendChild(card);
 */
export function renderPreviewCard(parsed) {
  const data = /** @type {ParsedPreview} */ ({ ...parsed });
  const flags = Array.isArray(data.flags) ? data.flags : [];
  const confidence = normalizeConfidence(data.confidence);

  const container = document.createElement('div');
  container.className = 'preview-card';
  container.dataset.source = data.source ?? 'manual';

  // Header: badge + confidence
  const header = document.createElement('div');
  header.className = 'preview-header';
  header.appendChild(createBadge(data));
  header.appendChild(createConfidenceIndicator(confidence));
  container.appendChild(header);

  // Matched rules tooltip row (visible for rule source)
  if (data.source === 'rule' && data.matchedRules?.length) {
    const rulesEl = document.createElement('div');
    rulesEl.className = 'preview-matched-rules';
    rulesEl.title = data.matchedRules.join(', ');
    rulesEl.innerHTML = `<span class="preview-matched-rules__label">Rules:</span> ${escapeHtml(data.matchedRules.join(', '))}`;
    container.appendChild(rulesEl);
  }

  // Optional explanation box
  if (data.explanation) {
    const explanation = document.createElement('div');
    explanation.className = 'preview-explanation';
    explanation.innerHTML = `<span class="preview-explanation__icon" aria-hidden="true">💡</span><span>${escapeHtml(data.explanation)}</span>`;
    container.appendChild(explanation);
  }

  // Editable fields
  const fieldsWrap = document.createElement('div');
  fieldsWrap.className = 'preview-fields';
  for (const name of FIELD_NAMES) {
    fieldsWrap.appendChild(createField(name, data[/** @type {keyof ParsedPreview} */ (name)], flags));
  }
  container.appendChild(fieldsWrap);

  // Actions
  container.appendChild(createActions(container, data));

  return container;
}
