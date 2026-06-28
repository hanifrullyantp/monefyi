/**
 * @file js/parsers/receipt-pipeline.js
 * @description 5-layer receipt OCR pipeline (mirrors Phase 1 architecture).
 *
 * L0 — preprocess image (resize, greyscale)
 * L1 — run Tesseract OCR, extract layout
 * L2 — try user's personal template  (confidence ≥ 0.95)
 * L3 — try community template         (confidence ≥ 0.85)
 * L4 — generic parse via Phase 1 rules
 * L5 — return for user review (low confidence)
 *
 * All processing is CLIENT-SIDE — zero API cost.
 * @module parsers/receipt-pipeline
 */

import { preprocessImage, extractTextFromImage, hashImage } from '../services/ocr-extractor.js';
import {
  generateLayoutSignature,
  findMatchingTemplate,
  applyTemplate,
  calculateMatchConfidence,
  CONFIDENCE_THRESHOLDS,
  getSupabase,
} from '../services/template-matcher.js';
import {
  createTemplateFromCorrection,
  updateTemplateFromEdit,
  voteTemplate,
  checkAndPromoteTemplate,
} from '../services/template-learner.js';

// Reuse Phase 1 parsers for generic (L4) fallback
import { normalizeInput } from './normalize.js';
import { L2_applyRules } from './rules.js';

/** @typedef {'user_memory'|'community'|'generic'|'review'|'error'|'manual'} ReceiptSource */

// ---------------------------------------------------------------------------
// Supabase client resolver (same pattern as metrics.js)
// ---------------------------------------------------------------------------

/** @type {import('@supabase/supabase-js').SupabaseClient|null} */
let _injectedSupa = null;

/** @param {import('@supabase/supabase-js').SupabaseClient|null} client */
export function _setSupabaseClient(client) { _injectedSupa = client; }

/**
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
function resolveSupa() {
  if (_injectedSupa && typeof _injectedSupa.from === 'function') return _injectedSupa;
  return getSupabase();
}

// ---------------------------------------------------------------------------
// Custom event helpers
// ---------------------------------------------------------------------------

/**
 * @param {'ocr:progress'|'ocr:complete'|'ocr:error'} type
 * @param {object} detail
 */
function emitOCREvent(type, detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(type, { detail, bubbles: false }));
}

/**
 * @returns {object}
 */
function getDefaultParsed() {
  return {
    type: 'expense',
    amount: 0,
    merchant: '',
    category: 'Lainnya',
    account: 'Cash',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    confidence: 0.30,
    source: 'manual',
  };
}

// ---------------------------------------------------------------------------
// Generic L4 parse using Phase 1 normalizer + rule engine
// ---------------------------------------------------------------------------

/**
 * Extracts transaction fields from raw OCR text using Phase 1 parsers.
 * Returns a best-effort result even without a template.
 *
 * @param {string} rawText
 * @returns {object}
 */
async function genericParse(rawText) {
  try {
    const normalized = normalizeInput(rawText);
    const ruleResult = L2_applyRules(normalized);

    const totalRe = /(?:total|jumlah|grand total|bayar|charge)[^\d]*(\d[\d,.]*)/i;
    const totalMatch = rawText.match(totalRe);
    const total = totalMatch
      ? parseInt(totalMatch[1].replace(/[.,](?=\d{3})/g, ''), 10)
      : ruleResult?.amount ?? null;

    const dateRe = /(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/;
    const dateMatch = rawText.match(dateRe);
    const date = dateMatch ? dateMatch[1] : null;

    const firstLine = rawText.split('\n').map((l) => l.trim()).find((l) => l.length > 2) ?? null;

    return {
      merchant: ruleResult?.merchant ?? firstLine,
      total,
      amount: total,
      date,
      items: [],
      account: ruleResult?.account ?? null,
      category: ruleResult?.category ?? 'Lainnya',
      confidence: ruleResult?.confidence ?? 0.60,
      source: 'generic',
    };
  } catch (err) {
    console.error('[receipt-pipeline] genericParse failed:', err);
    return {
      merchant: null, total: null, amount: null, date: null,
      items: [], account: null, category: 'Lainnya',
      confidence: 0.50, source: 'generic',
    };
  }
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ReceiptParseResult
 * @property {boolean} success
 * @property {object} parsed - Extracted transaction fields
 * @property {ReceiptSource} source - Which pipeline layer produced the result
 * @property {object|null} template - Matched template (if any)
 * @property {string|null} templateId - Matched template ID
 * @property {number} confidence - Overall confidence 0–1
 * @property {string} rawText - Full OCR text
 * @property {object} layout - Layout features
 * @property {string} imageHash - SHA-256 of original image
 * @property {{ ocr_ms: number, parse_ms: number, total_ms?: number }} latency
 * @property {string[]} [warnings]
 * @property {string|null} [error]
 */

/**
 * Runs the full 5-layer receipt parse pipeline on an image file.
 * Never throws — always returns a valid result object for the UI.
 *
 * @param {File|Blob} imageFile
 * @param {string|null} [userId]
 * @param {{
 *   useAI?: boolean,
 *   language?: string,
 *   logger?: (m: object) => void
 * }} [options]
 * @returns {Promise<ReceiptParseResult>}
 */
export async function parseReceipt(imageFile, userId = null, options = {}) {
  const { language = 'ind+eng', logger = null } = options;
  const startTime = Date.now();
  const debug = typeof localStorage !== 'undefined'
    && localStorage.getItem('monefyi_debug') === 'true';
  const log = (...args) => debug && console.log('[receipt-pipeline]', ...args);

  /** @type {ReceiptParseResult} */
  const result = {
    success: false,
    source: 'manual',
    template: null,
    templateId: null,
    parsed: getDefaultParsed(),
    rawText: '',
    layout: { signature: 'unknown', merchant_keywords: [] },
    confidence: 0,
    imageHash: '',
    latency: { ocr_ms: 0, parse_ms: 0, total_ms: 0 },
    warnings: [],
    error: null,
  };

  log('Pipeline start');

  try {
    emitOCREvent('ocr:progress', { stage: 'preprocessing', progress: 0.05 });

    // --- L0: preprocess (non-critical) ---
    let processed = imageFile;
    try {
      processed = await preprocessImage(imageFile);
    } catch (e) {
      log('Preprocess failed (non-critical):', e.message);
      result.warnings.push('preprocess_failed');
    }

    emitOCREvent('ocr:progress', { stage: 'ocr', progress: 0.15 });

    // --- L1: OCR (critical) ---
    let ocrResult;
    const ocrStart = Date.now();
    try {
      log('Starting OCR...');
      [ocrResult, result.imageHash] = await Promise.all([
        extractTextFromImage(processed, {
          language,
          logger: logger ?? ((m) => {
            if (m.status === 'recognizing text') {
              emitOCREvent('ocr:progress', { stage: 'ocr', progress: 0.15 + m.progress * 0.55 });
            }
          }),
        }),
        hashImage(imageFile).catch(() => ''),
      ]);
      result.latency.ocr_ms = Date.now() - ocrStart;
      log('OCR done:', result.latency.ocr_ms + 'ms');

      if (!ocrResult) {
        throw new Error('OCR returned no result');
      }

      if (!ocrResult.text || !ocrResult.text.trim()) {
        throw new Error('OCR extracted empty text. Image too blurry?');
      }

      result.rawText = ocrResult.text;
      log('OCR text length:', ocrResult.text.length);
    } catch (e) {
      log('OCR failed:', e.message);
      result.error = `OCR gagal: ${e.message}`;
      result.success = true;
      result.source = 'manual';
      result.latency.ocr_ms = Date.now() - ocrStart;
      result.latency.total_ms = Date.now() - startTime;
      emitOCREvent('ocr:error', { error: e.message });
      return result;
    }

    const rawText = result.rawText;
    const layout = ocrResult.layout ?? {};
    result.layout = layout;

    // --- Layout signature (non-critical) ---
    let signature = 'unknown';
    try {
      signature = generateLayoutSignature(layout);
      result.layout = { ...layout, signature };
      log('Layout signature:', signature);
    } catch (e) {
      log('Layout failed:', e.message);
      result.warnings.push('layout_failed');
    }

    emitOCREvent('ocr:progress', { stage: 'matching', progress: 0.72 });
    const supa = resolveSupa();
    const parseStart = Date.now();
    let matched = false;

    // --- L2: user template (non-critical) ---
    if (userId && supa) {
      try {
        const userMatch = await findMatchingTemplate(signature, userId, supa);
        if (userMatch && userMatch.source === 'user_memory') {
          try {
            const extracted = applyTemplate(rawText, userMatch.template);
            const liveConf = calculateMatchConfidence(userMatch.template, extracted);
            const storedAcc = Number(userMatch.template.accuracy_score || 0);
            const confidence = Math.max(liveConf, storedAcc, userMatch.confidence ?? 0);

            if (confidence >= CONFIDENCE_THRESHOLDS.user_memory) {
              result.parsed = {
                ...extracted,
                type: 'expense',
                currency: 'IDR',
                amount: extracted.total ?? extracted.amount ?? 0,
              };
              result.source = 'user_memory';
              result.template = userMatch.template;
              result.templateId = userMatch.template.id;
              result.confidence = confidence;
              matched = true;
              log('Template matched: user_memory');
              emitOCREvent('ocr:complete', { source: 'user_memory', confidence });
            }
          } catch (e) {
            log('Template apply failed:', e.message);
            result.warnings.push('template_apply_failed');
          }
        }
      } catch (e) {
        log('Template query failed:', e.message);
        result.warnings.push('template_query_failed');
      }
    } else {
      log('Skipping user template (no userId or supabase)');
    }

    // --- L3: community template (non-critical) ---
    if (!matched && supa) {
      emitOCREvent('ocr:progress', { stage: 'community', progress: 0.82 });
      try {
        const communityMatch = await findMatchingTemplate(signature, null, supa);
        if (communityMatch && communityMatch.source === 'community') {
          try {
            const extracted = applyTemplate(rawText, communityMatch.template);
            const liveConf = calculateMatchConfidence(communityMatch.template, extracted);
            const storedScore = Number(communityMatch.template.community_score || 0);
            const confidence = Math.max(liveConf, storedScore, communityMatch.confidence ?? 0);

            if (confidence >= CONFIDENCE_THRESHOLDS.community) {
              result.parsed = {
                ...extracted,
                type: 'expense',
                currency: 'IDR',
                amount: extracted.total ?? extracted.amount ?? 0,
              };
              result.source = 'community';
              result.template = communityMatch.template;
              result.templateId = communityMatch.template.id;
              result.confidence = confidence;
              matched = true;
              log('Template matched: community');
              emitOCREvent('ocr:complete', { source: 'community', confidence });
            }
          } catch (e) {
            log('Community template apply failed:', e.message);
            result.warnings.push('template_apply_failed');
          }
        }
      } catch (e) {
        log('Community query failed:', e.message);
        result.warnings.push('template_query_failed');
      }
    }

    emitOCREvent('ocr:progress', { stage: 'generic', progress: 0.90 });

    // --- L4: generic parse fallback ---
    if (!matched) {
      try {
        log('Running generic parse...');
        const generic = await genericParse(rawText);
        const genericConf = generic.confidence ?? 0.60;
        result.parsed = {
          ...generic,
          type: 'expense',
          currency: 'IDR',
          amount: generic.total ?? generic.amount ?? 0,
        };
        result.source = genericConf >= CONFIDENCE_THRESHOLDS.generic ? 'generic' : 'review';
        result.confidence = genericConf;
        log('Generic parse done');
        emitOCREvent('ocr:complete', { source: result.source, confidence: genericConf });
      } catch (e) {
        log('Generic parse failed:', e.message);
        result.parsed = getDefaultParsed();
        result.source = 'review';
        result.warnings.push('generic_parse_failed');
      }
    }

    result.latency.parse_ms = Date.now() - parseStart;
    result.latency.total_ms = Date.now() - startTime;
    result.success = true;

    log('Pipeline complete:', {
      source: result.source,
      confidence: result.confidence,
      latency: result.latency,
      warnings: result.warnings,
    });

    return result;
  } catch (e) {
    console.error('[receipt-pipeline] Unexpected error (recovered):', e);
    result.error = e.message || 'Unknown pipeline error';
    result.success = true;
    result.source = 'manual';
    result.parsed = getDefaultParsed();
    result.warnings.push('critical_error');
    result.latency.total_ms = Date.now() - startTime;
    emitOCREvent('ocr:error', { error: result.error });
    return result;
  }
}

// ---------------------------------------------------------------------------
// Confirm + learn
// ---------------------------------------------------------------------------

/**
 * Persists the scan to DB and triggers template learning.
 *
 * Call this AFTER the user has confirmed/edited the parsed data.
 *
 * @param {ReceiptParseResult} scanResult - Pipeline output
 * @param {object} finalData - User-confirmed transaction fields
 * @param {string|null} userId
 * @param {import('@supabase/supabase-js').SupabaseClient} [supabaseClient]
 * @returns {Promise<{ saved: boolean, templateAction: 'created'|'updated'|'voted'|'none' }>}
 */
export async function confirmReceiptParse(scanResult, finalData, userId, supabaseClient) {
  const supa = (supabaseClient && typeof supabaseClient.from === 'function')
    ? supabaseClient
    : resolveSupa();

  if (!supa || !userId) {
    console.warn('[receipt-pipeline] confirmReceiptParse skipped — no supabase or userId');
    return { saved: false, templateAction: 'none' };
  }

  const {
    rawText = '',
    layout = {},
    imageHash = '',
    templateId = null,
    source,
    parsed,
  } = scanResult;

  const editedFields = Object.keys(finalData).filter(
    (k) => finalData[k] != null && String(finalData[k]) !== String((parsed ?? {})[k] ?? ''),
  );

  /** @type {'created'|'updated'|'voted'|'none'} */
  let templateAction = 'none';

  try {
    if (templateId && (source === 'user_memory' || source === 'community')) {
      if (editedFields.length === 0) {
        await voteTemplate(templateId, userId, 'confirm', [], supa);
        await supa.rpc('increment_template_success', { p_template_id: templateId }).catch((e) => {
          console.warn('[receipt-pipeline] increment_template_success failed:', e.message);
        });
        templateAction = 'voted';

        const promoted = await checkAndPromoteTemplate(templateId, supa);
        if (promoted) templateAction = 'created';
      } else {
        await updateTemplateFromEdit(templateId, { rawText }, finalData, supa);
        await voteTemplate(templateId, userId, 'edit', editedFields, supa);
        templateAction = 'updated';
      }
    } else {
      const { templateId: newId, success } = await createTemplateFromCorrection(
        userId,
        { rawText, imageHash, layout },
        finalData,
        supa,
      );
      if (success && newId) {
        templateAction = 'created';
        await checkAndPromoteTemplate(newId, supa);
      }
    }

    supa.from('receipt_scans').insert({
      user_id: userId,
      image_hash: imageHash,
      raw_text: rawText,
      ocr_confidence: scanResult.confidence ?? null,
      template_id: templateId,
      template_match_type: source === 'user_memory' ? 'user_memory'
        : source === 'community' ? 'community'
        : source === 'generic' ? 'generic'
        : 'manual',
      parsed_json: parsed ?? {},
      final_json: finalData,
      edited_fields: editedFields.length ? editedFields : null,
      ocr_latency_ms: scanResult.latency?.ocr_ms ?? null,
      parse_latency_ms: scanResult.latency?.parse_ms ?? null,
    }).then(({ error }) => {
      if (error) console.error('[receipt-pipeline] scan log failed:', error.message);
    });

    return { saved: true, templateAction };
  } catch (err) {
    console.error('[receipt-pipeline] confirmReceiptParse error:', err);
    return { saved: false, templateAction: 'none' };
  }
}
