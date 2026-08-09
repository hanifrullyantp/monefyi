/**
 * Email import enhancements — duplicate detection, auto-categorization (Fase 7.1).
 * @module services/email-import-enhancer
 */

/** @type {object[]} */
export const SUPPORTED_IMPORT_SOURCES = [
  { id: 'BCA', method: 'email', label: 'BCA' },
  { id: 'Mandiri', method: 'email', label: 'Mandiri' },
  { id: 'BNI', method: 'email', label: 'BNI' },
  { id: 'BRI', method: 'email', label: 'BRI' },
  { id: 'GoPay', method: 'email', label: 'GoPay' },
  { id: 'OVO', method: 'email', label: 'OVO' },
  { id: 'DANA', method: 'email', label: 'DANA' },
  { id: 'ShopeePay', method: 'email', label: 'ShopeePay' },
  { id: 'Tokopedia', method: 'email', label: 'Tokopedia' },
  { id: 'GrabPay', method: 'email', label: 'GrabPay' },
  { id: 'LinkAja', method: 'email', label: 'LinkAja' },
  { id: 'Kredivo', method: 'email', label: 'Kredivo' },
  { id: 'Akulaku', method: 'email', label: 'Akulaku' },
];

/**
 * Gmail filter string covering supported senders.
 */
export const EXTENDED_GMAIL_FILTER =
  'noreply@klikbca.co.id OR notification@bankmandiri.co.id OR noreply@bni.co.id OR noreply@bri.co.id '
  + 'OR no-reply@gopay.co.id OR noreply@ovo.id OR no-reply@dana.id OR noreply@linkaja.id '
  + 'OR noreply@kredivo.com OR notification@akulaku.com OR shopee OR tokopedia OR grab';

/**
 * @param {object} importRow
 * @param {object[]} [transactions]
 * @returns {object|null}
 */
export function findDuplicateTransaction(importRow, transactions = typeof window !== 'undefined' ? window.STATE?.transactions : []) {
  const amount = Math.abs(Number(importRow.parsed_amount || 0));
  const date = String(importRow.parsed_date || '').slice(0, 10);
  const account = String(importRow.parsed_account || '').toLowerCase();
  const merchant = String(importRow.parsed_merchant || '').toLowerCase();
  const type = importRow.parsed_type || 'expense';

  if (!amount || !date) return null;

  return (transactions || []).find((t) => {
    if (String(t.type || '') !== type) return false;
    if (Math.abs(Number(t.amount || 0) - amount) > 0.01) return false;
    if (String(t.date || '').slice(0, 10) !== date) return false;
    const tAcc = String(t.account || '').toLowerCase();
    if (account && tAcc && account !== tAcc) return false;
    if (merchant && t.merchant) {
      const tm = String(t.merchant).toLowerCase();
      if (tm.includes(merchant.slice(0, 8)) || merchant.includes(tm.slice(0, 8))) return true;
    }
    return !merchant || !t.merchant;
  }) || null;
}

/**
 * @param {object} importRow
 * @returns {Promise<object>}
 */
export async function enrichImportPreview(importRow) {
  const duplicate = findDuplicateTransaction(importRow);
  let category = importRow.parsed_category;
  let categorySuggestion = null;

  const needsCat = !category || category === 'Other' || category === 'Lainnya';
  if (needsCat) {
    try {
      const { suggestCategory, formatConfidenceBadge } = await import('./auto-categorizer.js');
      const suggestion = await suggestCategory({
        merchant: importRow.parsed_merchant,
        notes: importRow.parsed_notes,
        amount: importRow.parsed_amount,
      });
      if (suggestion.category) {
        categorySuggestion = {
          category: suggestion.category,
          confidence: suggestion.confidence,
          badge: formatConfidenceBadge(suggestion.confidence),
          source: suggestion.source,
        };
        if (suggestion.confidence >= 0.65) category = suggestion.category;
      }
    } catch { /* ignore */ }
  }

  return {
    ...importRow,
    parsed_category: category,
    _duplicate: duplicate ? { id: duplicate.id, merchant: duplicate.merchant, date: duplicate.date } : null,
    _categorySuggestion: categorySuggestion,
    _confidenceLabel: importRow.parse_confidence >= 0.85 ? 'Tinggi'
      : importRow.parse_confidence >= 0.65 ? 'Sedang' : 'Rendah',
  };
}

/**
 * @param {object[]} imports
 * @returns {Promise<object[]>}
 */
export async function enrichImportBatch(imports) {
  return Promise.all((imports || []).map((row) => enrichImportPreview(row)));
}

if (typeof window !== 'undefined') {
  window.monefyiEmailEnhancer = {
    SUPPORTED_IMPORT_SOURCES,
    EXTENDED_GMAIL_FILTER,
    findDuplicateTransaction,
    enrichImportPreview,
    enrichImportBatch,
  };
}
