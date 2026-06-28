/**
 * @file js/services/template-learner.js
 * @description Self-learning: create/update templates from user corrections.
 *
 * Privacy-first — only anonymised text & layout data are stored, never images.
 * @module services/template-learner
 */

import { generateLayoutSignature } from './template-matcher.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escapes a string for use in a RegExp literal.
 * @param {string} s
 * @returns {string}
 */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalises an IDR amount string for pattern matching.
 * e.g. "25.000" → "25000", "25,000" → "25000"
 * @param {number|string} amount
 * @returns {string}
 */
function normaliseAmount(amount) {
  return String(amount || 0)
    .replace(/[.,](?=\d{3})/g, '')
    .replace(',', '.')
    .split('.')[0];
}

/**
 * Removes IDR thousands separators for plain matching.
 * @param {string} line
 * @returns {string}
 */
function stripAmountFormatting(line) {
  return line.replace(/(\d)\.(\d{3})/g, '$1$2').replace(/(\d),(\d{3})/g, '$1$2');
}

// ---------------------------------------------------------------------------
// Reverse-engineer field rules
// ---------------------------------------------------------------------------

/**
 * Given raw OCR text and a confirmed final transaction, infers extraction rules.
 *
 * For each field we:
 *  1. Find the line containing the value
 *  2. Build a regex that isolates the value within that line
 *  3. Fall back to a `line` rule using the line index
 *
 * @param {string} rawText - OCR text
 * @param {{ merchant?: string, total?: number, date?: string, category?: string, account?: string }} finalData
 * @returns {Record<string, object>} field_rules map
 *
 * @example
 * const rules = inferFieldRules(ocrText, { merchant: 'Indomaret', total: 25000, date: '2025-01-15' });
 * // { merchant: { type: 'line', line_index: 0 }, total: { type: 'regex', pattern: 'TOTAL\\s+([\\d,.]+)' }, ... }
 */
export function inferFieldRules(rawText, finalData) {
  const lines = (rawText || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const rules = {};

  if (!lines.length || !finalData) return rules;

  // --- merchant ---
  if (finalData.merchant) {
    const merchantNorm = finalData.merchant.toLowerCase().replace(/\s+/g, ' ').trim();
    const idx = lines.findIndex(
      (l) => l.toLowerCase().includes(merchantNorm),
    );
    if (idx >= 0) {
      rules.merchant = { type: 'line', line_index: idx };
    } else {
      rules.merchant = { type: 'line', line_index: 0 };
    }
  }

  // --- total / amount ---
  if (finalData.total != null || finalData.amount != null) {
    const amount = finalData.total ?? finalData.amount;
    const amountStr = normaliseAmount(amount);

    const totalLineIdx = lines.findIndex((l) => {
      const stripped = stripAmountFormatting(l);
      return stripped.includes(amountStr) &&
        /\b(total|jumlah|grand|bayar|charge|amount)\b/i.test(l);
    });

    if (totalLineIdx >= 0) {
      const totalLine = lines[totalLineIdx];
      const labelMatch = totalLine.match(/^([A-Za-z\s]+)/);
      const label = labelMatch ? escapeRegex(labelMatch[1].trim()) : 'TOTAL';
      rules.total = {
        type: 'regex',
        pattern: `${label}\\s*[:\\-]?\\s*([\\d.,]+)`,
      };
    } else {
      // Fallback: find any line with the amount
      const plainIdx = lines.findIndex((l) =>
        stripAmountFormatting(l).includes(amountStr),
      );
      if (plainIdx >= 0) {
        rules.total = {
          type: 'regex',
          pattern: `([\\d.,]+)`,
          flags: 'i',
        };
      }
    }
  }

  // --- date ---
  if (finalData.date) {
    const dateRe = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})\b/;
    const dateLineIdx = lines.findIndex((l) => dateRe.test(l));
    if (dateLineIdx >= 0) {
      rules.date = {
        type: 'regex',
        pattern: dateRe.source,
      };
    }
  }

  // --- account / payment method ---
  if (finalData.account) {
    const accNorm = finalData.account.toLowerCase().trim();
    const accLineIdx = lines.findIndex((l) =>
      l.toLowerCase().includes(accNorm),
    );
    if (accLineIdx >= 0) {
      rules.account = { type: 'fixed', value: finalData.account };
    }
  }

  // --- category (always fixed — doesn't appear in receipt text) ---
  if (finalData.category) {
    rules.category = { type: 'fixed', value: finalData.category };
  }

  return rules;
}

// ---------------------------------------------------------------------------
// Create template from user correction
// ---------------------------------------------------------------------------

/**
 * Creates a new personal template from a user's confirmed transaction.
 *
 * @param {string} userId
 * @param {{
 *   rawText: string,
 *   imageHash: string,
 *   layout: object
 * }} scanData
 * @param {{
 *   merchant?: string,
 *   total?: number,
 *   amount?: number,
 *   date?: string,
 *   category?: string,
 *   account?: string
 * }} finalData
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @returns {Promise<{ templateId: string|null, success: boolean }>}
 */
export async function createTemplateFromCorrection(userId, scanData, finalData, supabaseClient) {
  if (!userId || !supabaseClient || !scanData?.rawText) {
    return { templateId: null, success: false };
  }

  try {
    const field_rules = inferFieldRules(scanData.rawText, finalData);
    const template_signature = generateLayoutSignature(scanData.layout ?? {});
    const merchant_name = finalData.merchant ?? null;
    const merchant_category = finalData.category ?? null;

    const { data, error } = await supabaseClient
      .from('receipt_templates')
      .upsert({
        user_id: userId,
        template_signature,
        merchant_name,
        merchant_category,
        layout_features: scanData.layout ?? {},
        field_rules,
        use_count: 1,
        success_count: 0,
        edit_count: 1,
        accuracy_score: 0.70,
        version: 1,
        last_used_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,template_signature',
        ignoreDuplicates: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[template-learner] createTemplateFromCorrection failed:', error.message);
      return { templateId: null, success: false };
    }

    return { templateId: data.id, success: true };
  } catch (err) {
    console.error('[template-learner] createTemplateFromCorrection error:', err);
    return { templateId: null, success: false };
  }
}

// ---------------------------------------------------------------------------
// Update existing template
// ---------------------------------------------------------------------------

/**
 * Refines an existing template based on what the user edited.
 * Merges new rules for the fields that were changed.
 *
 * @param {string} templateId
 * @param {{ rawText: string }} scanData
 * @param {object} editedData
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @returns {Promise<{ success: boolean }>}
 */
export async function updateTemplateFromEdit(templateId, scanData, editedData, supabaseClient) {
  if (!templateId || !supabaseClient) return { success: false };

  try {
    const newRules = inferFieldRules(scanData?.rawText ?? '', editedData);

    // Fetch existing field_rules and merge
    const { data: existing, error: fetchErr } = await supabaseClient
      .from('receipt_templates')
      .select('field_rules')
      .eq('id', templateId)
      .single();

    if (fetchErr || !existing) {
      console.error('[template-learner] updateTemplateFromEdit fetch failed:', fetchErr?.message);
      return { success: false };
    }

    const mergedRules = { ...(existing.field_rules ?? {}), ...newRules };

    const { error: updateErr } = await supabaseClient
      .from('receipt_templates')
      .update({ field_rules: mergedRules, updated_at: new Date().toISOString() })
      .eq('id', templateId);

    if (updateErr) {
      console.error('[template-learner] updateTemplateFromEdit failed:', updateErr.message);
      return { success: false };
    }

    // Increment edit counter via RPC
    await supabaseClient.rpc('increment_template_edit', { p_template_id: templateId });

    return { success: true };
  } catch (err) {
    console.error('[template-learner] updateTemplateFromEdit error:', err);
    return { success: false };
  }
}

// ---------------------------------------------------------------------------
// Vote on a template
// ---------------------------------------------------------------------------

/**
 * Records a community vote on a template and triggers score recalculation.
 *
 * @param {string} templateId
 * @param {string} userId
 * @param {'confirm'|'edit'|'reject'} voteType
 * @param {string[]} [editedFields]
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @returns {Promise<{ success: boolean }>}
 */
export async function voteTemplate(templateId, userId, voteType, editedFields = [], supabaseClient) {
  if (!templateId || !userId || !supabaseClient) return { success: false };

  try {
    const { error: voteErr } = await supabaseClient
      .from('receipt_template_votes')
      .upsert({
        template_id: templateId,
        user_id: userId,
        vote_type: voteType,
        edited_fields: editedFields.length ? editedFields : null,
      }, { onConflict: 'template_id,user_id' });

    if (voteErr) {
      console.error('[template-learner] voteTemplate failed:', voteErr.message);
      return { success: false };
    }

    // Recalculate community score asynchronously
    supabaseClient
      .rpc('recalc_community_score', { p_template_id: templateId })
      .catch((e) => console.error('[template-learner] recalc_community_score failed:', e));

    return { success: true };
  } catch (err) {
    console.error('[template-learner] voteTemplate error:', err);
    return { success: false };
  }
}

// ---------------------------------------------------------------------------
// Auto-promote check
// ---------------------------------------------------------------------------

/**
 * Calls the DB function to check/promote a personal template to community.
 * Returns true if promotion happened.
 *
 * @param {string} templateId
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @returns {Promise<boolean>}
 */
export async function checkAndPromoteTemplate(templateId, supabaseClient) {
  if (!templateId || !supabaseClient) return false;

  try {
    const { data, error } = await supabaseClient
      .rpc('promote_template_to_community', { p_template_id: templateId });

    if (error) {
      console.error('[template-learner] checkAndPromoteTemplate failed:', error.message);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('[template-learner] checkAndPromoteTemplate error:', err);
    return false;
  }
}
