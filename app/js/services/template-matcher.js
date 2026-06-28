/**
 * @file js/services/template-matcher.js
 * @description Receipt template matching — find & apply templates from DB.
 *
 * Priority: 1) user's personal template  (≥0.95)
 *           2) community template         (≥0.85)
 *           3) generic parse (Phase 1)    (≥0.70)
 *           4) return for manual review
 *
 * Community templates are fetched once per session and cached in-memory.
 * @module services/template-matcher
 */

/** Confidence thresholds for each template source */
export const CONFIDENCE_THRESHOLDS = {
  user_memory: 0.95,
  community: 0.85,
  generic: 0.70,
};

// ---------------------------------------------------------------------------
// Session cache (avoids repeated DB round-trips for community templates)
// ---------------------------------------------------------------------------
/** @type {Map<string, { template: object, source: string }>} */
const _templateCache = new Map();

/** Clears the in-memory session cache. Useful in tests. */
export function _clearTemplateCache() {
  _templateCache.clear();
}

// ---------------------------------------------------------------------------
// Layout signature
// ---------------------------------------------------------------------------

/**
 * FNV-1a 32-bit hash of a string.
 * @param {string} str
 * @returns {number}
 */
function fnv1a(str) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

/**
 * Normalises a header line for use in signatures (lowercase, strip non-alpha).
 * @param {string} s
 * @returns {string}
 */
function normaliseHeaderLine(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32);
}

/**
 * Generates a stable 16-character hex signature from layout features.
 * Same merchant receipt → same signature (within Tesseract variance).
 *
 * @param {{
 *   line_count?: number,
 *   header_lines?: string[],
 *   total_position?: string,
 *   date_format?: string|null,
 *   has_items_section?: boolean
 * }} layout
 * @returns {string} 16-character lowercase hex
 *
 * @example
 * const sig = generateLayoutSignature(layout);
 * // "a3f2b1c4d5e6f700"
 */
export function generateLayoutSignature(layout) {
  const {
    line_count = 0,
    header_lines = [],
    total_position = 'unknown',
    date_format = 'none',
    has_items_section = false,
  } = layout || {};

  // Bucket line count to absorb minor OCR variance
  const lineBucket = Math.round(line_count / 5) * 5;

  // Use first two header lines (most stable merchant identifiers)
  const h0 = normaliseHeaderLine(header_lines[0] || '');
  const h1 = normaliseHeaderLine(header_lines[1] || '');

  const descriptor = [
    lineBucket,
    h0,
    h1,
    total_position,
    date_format || 'none',
    has_items_section ? '1' : '0',
  ].join('|');

  const hash1 = fnv1a(descriptor);
  const hash2 = fnv1a(descriptor.split('').reverse().join(''));

  return (hash1.toString(16).padStart(8, '0') + hash2.toString(16).padStart(8, '0'));
}

// ---------------------------------------------------------------------------
// Template lookup
// ---------------------------------------------------------------------------

/**
 * Looks up a matching template from Supabase — user's first, community second.
 *
 * @param {string} signature - layout signature from generateLayoutSignature
 * @param {string|null} userId
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @returns {Promise<{ template: object, source: 'user_memory'|'community', confidence: number }|null>}
 */
export async function findMatchingTemplate(signature, userId, supabaseClient) {
  if (!supabaseClient || !signature) return null;

  const cacheKey = `${userId ?? 'anon'}:${signature}`;
  if (_templateCache.has(cacheKey)) {
    return _templateCache.get(cacheKey) ?? null;
  }

  try {
    // 1. User's personal template
    if (userId) {
      const { data: userTpl, error: userErr } = await supabaseClient
        .from('receipt_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('template_signature', signature)
        .order('accuracy_score', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!userErr && userTpl) {
        const result = { template: userTpl, source: 'user_memory', confidence: Number(userTpl.accuracy_score || 0.95) };
        _templateCache.set(cacheKey, result);
        return result;
      }
    }

    // 2. Community template
    const { data: communityTpl, error: commErr } = await supabaseClient
      .from('receipt_templates')
      .select('*')
      .eq('is_community', true)
      .eq('template_signature', signature)
      .order('community_score', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!commErr && communityTpl) {
      const result = { template: communityTpl, source: 'community', confidence: Number(communityTpl.community_score || 0.85) };
      _templateCache.set(cacheKey, result);
      return result;
    }

    _templateCache.set(cacheKey, null);
    return null;
  } catch (err) {
    console.error('[template-matcher] findMatchingTemplate failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Template application
// ---------------------------------------------------------------------------

/**
 * @typedef {'fixed'|'regex'|'line'|'iterative'} FieldRuleType
 */

/**
 * Applies stored field_rules to raw OCR text to extract transaction fields.
 *
 * Rule types:
 *  - `line`       — capture text of line at a fixed index
 *  - `regex`      — first capture group of a regex
 *  - `fixed`      — always return a constant value
 *  - `iterative`  — extract repeated rows (for items)
 *
 * @param {string} rawText - OCR output
 * @param {{ field_rules: Record<string, object>, merchant_name?: string, merchant_category?: string }} template
 * @returns {{
 *   merchant: string|null,
 *   total: number|null,
 *   date: string|null,
 *   items: Array<{name: string, amount: number}>,
 *   account: string|null,
 *   category: string|null,
 *   confidence: number
 * }}
 */
export function applyTemplate(rawText, template) {
  const { field_rules = {}, merchant_name = null, merchant_category = null } = template || {};
  const lines = (rawText || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const empty = {
    merchant: merchant_name ?? null,
    total: null,
    date: null,
    items: [],
    account: null,
    category: merchant_category ?? null,
    confidence: 0,
  };

  if (!lines.length) return empty;

  let extractedCount = 0;
  const result = { ...empty };

  for (const [field, rule] of Object.entries(field_rules)) {
    if (!rule || typeof rule !== 'object') continue;

    try {
      switch (rule.type) {
        case 'line': {
          const idx = Number(rule.line_index ?? 0);
          const text = lines[idx] ?? null;
          if (text) {
            setField(result, field, text);
            extractedCount++;
          }
          break;
        }

        case 'regex': {
          const re = new RegExp(rule.pattern, rule.flags ?? 'im');
          for (const line of lines) {
            const m = line.match(re);
            if (m) {
              const raw = m[1] ?? m[0];
              setField(result, field, raw.trim());
              extractedCount++;
              break;
            }
          }
          break;
        }

        case 'fixed': {
          setField(result, field, rule.value);
          extractedCount++;
          break;
        }

        case 'iterative': {
          const startRe = rule.start_pattern ? new RegExp(rule.start_pattern, 'i') : null;
          const itemRe = new RegExp(rule.item_pattern, 'im');
          let capturing = !startRe;

          /** @type {Array<{name: string, amount: number}>} */
          const items = [];
          for (const line of lines) {
            if (startRe && startRe.test(line)) { capturing = true; continue; }
            if (rule.end_pattern && new RegExp(rule.end_pattern, 'i').test(line)) break;
            if (!capturing) continue;
            const m = line.match(itemRe);
            if (m) {
              items.push({
                name: (m[1] ?? '').trim(),
                amount: parseFloat((m[2] ?? '0').replace(/[.,](?=\d{3})/g, '').replace(',', '.')),
              });
            }
          }
          if (items.length) {
            result.items = items;
            extractedCount++;
          }
          break;
        }

        default:
          break;
      }
    } catch (ruleErr) {
      console.error(`[template-matcher] rule error for field "${field}":`, ruleErr);
    }
  }

  const totalRules = Object.keys(field_rules).length || 1;
  result.confidence = Math.min(1, extractedCount / totalRules);

  return result;
}

/**
 * Sets a parsed field on the result object with type coercion.
 * @param {object} result
 * @param {string} field
 * @param {string} rawValue
 */
function setField(result, field, rawValue) {
  if (rawValue == null) return;
  const v = String(rawValue).trim();

  if (field === 'total' || field === 'amount') {
    const num = parseFloat(v.replace(/[.,](?=\d{3})/g, '').replace(',', '.'));
    if (!isNaN(num)) result.total = Math.round(num);
  } else if (field === 'date') {
    result.date = v;
  } else if (field === 'merchant') {
    result.merchant = v;
  } else if (field === 'account' || field === 'payment_method') {
    result.account = v;
  } else if (field === 'category') {
    result.category = v;
  }
}

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

/**
 * Calculates how well a template's extracted fields satisfy minimum requirements.
 *
 * @param {object} _template - Template row (reserved for future weighted scoring)
 * @param {{ merchant: any, total: any, date: any }} extracted
 * @returns {number} 0–1
 */
export function calculateMatchConfidence(_template, extracted) {
  if (!extracted) return 0;

  const checks = [
    extracted.merchant != null,
    extracted.total != null && extracted.total > 0,
    extracted.date != null,
  ];

  const passed = checks.filter(Boolean).length;
  const base = passed / checks.length;

  // Bonus if items list was extracted
  const itemsBonus = extracted.items?.length > 0 ? 0.05 : 0;

  return Math.min(1, base + itemsBonus);
}
