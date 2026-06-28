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

/** @typedef {'user_memory'|'community'|'generic'|'review'|'error'} ReceiptSource */

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
  if (_injectedSupa) return _injectedSupa;
  if (typeof window !== 'undefined') return window.STATE?.db?.supa ?? null;
  return null;
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

    // Extract total from common Indonesian receipt patterns
    const totalRe = /(?:total|jumlah|grand total|bayar|charge)[^\d]*(\d[\d,.]*)/i;
    const totalMatch = rawText.match(totalRe);
    const total = totalMatch
      ? parseInt(totalMatch[1].replace(/[.,](?=\d{3})/g, ''), 10)
      : ruleResult?.amount ?? null;

    // Extract date
    const dateRe = /(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/;
    const dateMatch = rawText.match(dateRe);
    const date = dateMatch ? dateMatch[1] : null;

    // Merchant: first non-empty line
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
 * @property {object} parsed - Extracted transaction fields
 * @property {ReceiptSource} source - Which pipeline layer produced the result
 * @property {object|null} template - Matched template (if any)
 * @property {string|null} templateId - Matched template ID
 * @property {number} confidence - Overall confidence 0–1
 * @property {string} rawText - Full OCR text
 * @property {object} layout - Layout features
 * @property {string} imageHash - SHA-256 of original image
 * @property {{ ocr_ms: number, parse_ms: number }} latency
 */

/**
 * Runs the full 5-layer receipt parse pipeline on an image file.
 *
 * @param {File|Blob} imageFile
 * @param {string|null} [userId]
 * @param {{
 *   useAI?: boolean,
 *   language?: string,
 *   logger?: (m: object) => void
 * }} [options]
 * @returns {Promise<ReceiptParseResult>}
 *
 * @example
 * const result = await parseReceipt(file, userId, { logger: (m) => setOCRProgress(m.progress) });
 * console.log(result.source, result.confidence, result.parsed.total);
 */
export async function parseReceipt(imageFile, userId = null, options = {}) {
  const { language = 'ind+eng', logger = null } = options;

  const t0 = Date.now();
  emitOCREvent('ocr:progress', { stage: 'preprocessing', progress: 0.05 });

  let ocrResult;
  let imageHash = '';

  // --- L0: preprocess ---
  const processed = await preprocessImage(imageFile).catch(() => imageFile);

  emitOCREvent('ocr:progress', { stage: 'ocr', progress: 0.15 });

  // --- L1: OCR ---
  try {
    [ocrResult, imageHash] = await Promise.all([
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
  } catch (err) {
    console.error('[receipt-pipeline] OCR failed:', err);
    emitOCREvent('ocr:error', { error: err.message });
    return {
      parsed: { merchant: null, total: null, date: null, category: 'Lainnya' },
      source: 'error', template: null, templateId: null, confidence: 0,
      rawText: '', layout: {}, imageHash, latency: { ocr_ms: Date.now() - t0, parse_ms: 0 },
    };
  }

  const ocrMs = Date.now() - t0;
  const t1 = Date.now();

  const { text: rawText, layout } = ocrResult;

  // Empty OCR result (Tesseract failed gracefully) → surface as error
  if (!rawText?.trim()) {
    emitOCREvent('ocr:error', { error: 'No text extracted from image' });
    return {
      parsed: { merchant: null, total: null, date: null, category: 'Lainnya' },
      source: 'error', template: null, templateId: null, confidence: 0,
      rawText: '', layout: layout ?? {}, imageHash, latency: { ocr_ms: ocrMs, parse_ms: 0 },
    };
  }

  emitOCREvent('ocr:progress', { stage: 'matching', progress: 0.72 });
  const signature = generateLayoutSignature(layout);
  const supa = resolveSupa();

  // --- L2: user template ---
  const userMatch = userId && supa
    ? await findMatchingTemplate(signature, userId, supa).catch(() => null)
    : null;

  if (userMatch && userMatch.source === 'user_memory') {
    const extracted = applyTemplate(rawText, userMatch.template);
    // Blend stored accuracy (historical) with live match score — take the higher
    const liveConf = calculateMatchConfidence(userMatch.template, extracted);
    const storedAcc = Number(userMatch.template.accuracy_score || 0);
    const confidence = Math.max(liveConf, storedAcc);

    if (confidence >= CONFIDENCE_THRESHOLDS.user_memory) {
      emitOCREvent('ocr:complete', { source: 'user_memory', confidence });
      return {
        parsed: { ...extracted, type: 'expense', currency: 'IDR', amount: extracted.total },
        source: 'user_memory',
        template: userMatch.template,
        templateId: userMatch.template.id,
        confidence,
        rawText,
        layout,
        imageHash,
        latency: { ocr_ms: ocrMs, parse_ms: Date.now() - t1 },
      };
    }
  }

  emitOCREvent('ocr:progress', { stage: 'community', progress: 0.82 });

  // --- L3: community template ---
  const communityMatch = supa
    ? await findMatchingTemplate(signature, null, supa).catch(() => null)
    : null;

  if (communityMatch && communityMatch.source === 'community') {
    const extracted = applyTemplate(rawText, communityMatch.template);
    const liveConf = calculateMatchConfidence(communityMatch.template, extracted);
    const storedScore = Number(communityMatch.template.community_score || 0);
    const confidence = Math.max(liveConf, storedScore);

    if (confidence >= CONFIDENCE_THRESHOLDS.community) {
      emitOCREvent('ocr:complete', { source: 'community', confidence });
      return {
        parsed: { ...extracted, type: 'expense', currency: 'IDR', amount: extracted.total },
        source: 'community',
        template: communityMatch.template,
        templateId: communityMatch.template.id,
        confidence,
        rawText,
        layout,
        imageHash,
        latency: { ocr_ms: ocrMs, parse_ms: Date.now() - t1 },
      };
    }
  }

  emitOCREvent('ocr:progress', { stage: 'generic', progress: 0.90 });

  // --- L4: generic parse via Phase 1 rules ---
  const generic = await genericParse(rawText);
  const genericConf = generic.confidence ?? 0.60;

  emitOCREvent('ocr:complete', { source: 'generic', confidence: genericConf });

  // --- L5: return for user review (always, since user must confirm) ---
  return {
    parsed: {
      ...generic,
      type: 'expense',
      currency: 'IDR',
      amount: generic.total ?? generic.amount ?? 0,
    },
    source: genericConf >= CONFIDENCE_THRESHOLDS.generic ? 'generic' : 'review',
    template: null,
    templateId: null,
    confidence: genericConf,
    rawText,
    layout,
    imageHash,
    latency: { ocr_ms: ocrMs, parse_ms: Date.now() - t1 },
  };
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
 *
 * @example
 * const { saved, templateAction } = await confirmReceiptParse(result, editedTx, userId);
 * if (templateAction === 'created') showToast('✨ Template baru terbentuk!');
 */
export async function confirmReceiptParse(scanResult, finalData, userId, supabaseClient) {
  const supa = supabaseClient ?? resolveSupa();

  if (!supa || !userId) {
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

  // Detect which fields the user edited
  const editedFields = Object.keys(finalData).filter(
    (k) => finalData[k] != null && String(finalData[k]) !== String((parsed ?? {})[k] ?? ''),
  );

  /** @type {'created'|'updated'|'voted'|'none'} */
  let templateAction = 'none';

  try {
    if (templateId && (source === 'user_memory' || source === 'community')) {
      // Existing template
      if (editedFields.length === 0) {
        // Perfect match — vote confirm + increment success
        await voteTemplate(templateId, userId, 'confirm', [], supa);
        await supa.rpc('increment_template_success', { p_template_id: templateId });
        templateAction = 'voted';

        // Check auto-promotion to community
        const promoted = await checkAndPromoteTemplate(templateId, supa);
        if (promoted) templateAction = 'created'; // reuse 'created' toast signal
      } else {
        // User edited — refine template
        await updateTemplateFromEdit(templateId, { rawText }, finalData, supa);
        await voteTemplate(templateId, userId, 'edit', editedFields, supa);
        templateAction = 'updated';
      }
    } else {
      // No template used — create one if user edited anything (they confirmed from generic)
      const { templateId: newId, success } = await createTemplateFromCorrection(
        userId,
        { rawText, imageHash, layout },
        finalData,
        supa,
      );
      if (success && newId) {
        templateAction = 'created';
        // Check auto-promotion if the new template is suspiciously good
        await checkAndPromoteTemplate(newId, supa);
      }
    }

    // Log scan (non-blocking)
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
