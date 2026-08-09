/**
 * Rule-based auto-categorization from learnt merchant patterns.
 * @module services/auto-categorizer
 */

import { loadLearntPatterns } from './correction-learner.js';

const MERCHANT_HINTS = [
  { keys: ['kopi', 'coffee', 'starbucks', 'fore', 'janji jiwa', 'kenangan'], category: 'Makan', confidence: 0.75 },
  { keys: ['gojek', 'grab', 'maxim', 'ojek', 'tol', 'bensin', 'pertamina'], category: 'Transport', confidence: 0.78 },
  { keys: ['indomaret', 'alfamart', 'hypermart', 'superindo'], category: 'Belanja', confidence: 0.72 },
  { keys: ['pln', 'listrik', 'pdam', 'air'], category: 'Listrik', confidence: 0.85 },
  { keys: ['kost', 'kontrakan', 'sewa'], category: 'Kontrakan', confidence: 0.88 },
];

/**
 * @param {object} input
 * @param {string} [input.merchant]
 * @param {string} [input.notes]
 * @param {string} [input.category]
 * @param {number} [input.amount]
 * @returns {Promise<{ category: string|null, confidence: number, source: string, label: string }>}
 */
export async function suggestCategory(input = {}) {
  const text = `${input.merchant || ''} ${input.notes || ''}`.toLowerCase().trim();
  if (!text) {
    return { category: null, confidence: 0, source: 'none', label: 'Tidak cukup data' };
  }

  const patterns = await loadLearntPatterns();
  let best = null;

  for (const p of patterns) {
    if (p.type !== 'category_keyword' || !p.interpretation?.category) continue;
    const kws = p.keywords || [];
    if (!kws.some((k) => text.includes(String(k).toLowerCase()))) continue;
    const conf = Math.min(0.98, Number(p.confidence || 0.8) + (p.hitCount || 0) * 0.01);
    if (!best || conf > best.confidence) {
      best = {
        category: p.interpretation.category,
        confidence: conf,
        source: 'learned',
        label: conf >= 0.85 ? 'Yakin' : conf >= 0.65 ? 'Cukup yakin' : 'Perlu cek',
      };
    }
  }

  if (best && best.confidence >= 0.65) return best;

  for (const hint of MERCHANT_HINTS) {
    if (!hint.keys.some((k) => text.includes(k))) continue;
    if (!best || hint.confidence > best.confidence) {
      best = {
        category: hint.category,
        confidence: hint.confidence,
        source: 'rules',
        label: hint.confidence >= 0.85 ? 'Yakin' : 'Cukup yakin',
      };
    }
  }

  return best || { category: null, confidence: 0, source: 'none', label: 'Belum ada saran' };
}

/**
 * @param {number} confidence
 * @returns {string}
 */
export function formatConfidenceBadge(confidence) {
  if (confidence >= 0.85) return 'Tinggi';
  if (confidence >= 0.65) return 'Sedang';
  if (confidence > 0) return 'Rendah';
  return '';
}

if (typeof window !== 'undefined') {
  window.monefyiAutoCategorizer = { suggestCategory, formatConfidenceBadge };
}
