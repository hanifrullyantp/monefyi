/**
 * Rule-based auto-categorization from learnt merchant patterns + merchant map.
 * Growth Phase Sprint 3 — expanded Indonesia dictionary.
 * @module services/auto-categorizer
 */

import { loadLearntPatterns } from './correction-learner.js';

const LS_MERCHANT_MAP = 'monefyi_merchant_category_map';

const MERCHANT_HINTS = [
  { keys: ['kopi', 'coffee', 'starbucks', 'fore', 'janji jiwa', 'kenangan', 'tuku', 'excelso'], category: 'Makan', confidence: 0.78 },
  { keys: ['gojek', 'grab', 'maxim', 'ojek', 'tol', 'bensin', 'pertamina', 'shell', 'bp'], category: 'Transport', confidence: 0.82 },
  { keys: ['gofood', 'shopeefood', 'grabfood', 'food'], category: 'Makan', confidence: 0.8 },
  { keys: ['indomaret', 'alfamart', 'hypermart', 'superindo', 'lotte', 'aeon'], category: 'Belanja', confidence: 0.76 },
  { keys: ['pln', 'listrik', 'pdam', 'air'], category: 'Listrik', confidence: 0.88 },
  { keys: ['kost', 'kontrakan', 'sewa'], category: 'Kontrakan', confidence: 0.9 },
  { keys: ['netflix', 'spotify', 'youtube premium', 'disney', 'viu'], category: 'Hiburan', confidence: 0.85 },
  { keys: ['xxi', 'cgv', 'cinemaxx', 'bioskop'], category: 'Hiburan', confidence: 0.84 },
  { keys: ['shopee', 'tokopedia', 'lazada', 'blibli'], category: 'Belanja', confidence: 0.7 },
  { keys: ['erafone', 'ibox', 'digimap', 'samsung store', 'xiaomi store'], category: 'Elektronik', confidence: 0.88 },
  { keys: ['honda', 'toyota', 'dealer motor'], category: 'Kendaraan', confidence: 0.85 },
  { keys: ['apollo', 'guardian', 'klinik', 'rumah sakit', 'apotek'], category: 'Kesehatan', confidence: 0.8 },
  { keys: ['tuition', 'spp', 'sekolah', 'kursus', 'udemy'], category: 'Pendidikan', confidence: 0.82 },
];

/**
 * @returns {Record<string, { category: string, confirmations: number }>}
 */
export function loadMerchantCategoryMap() {
  try {
    return JSON.parse(localStorage.getItem(LS_MERCHANT_MAP) || '{}');
  } catch {
    return {};
  }
}

/**
 * @param {string} merchant
 * @param {string} category
 */
export function recordMerchantCategory(merchant, category) {
  const key = normalizeMerchantKey(merchant);
  if (!key || !category) return;
  const map = loadMerchantCategoryMap();
  const prev = map[key]?.confirmations || 0;
  map[key] = { category, confirmations: prev + 1 };
  localStorage.setItem(LS_MERCHANT_MAP, JSON.stringify(map));
}

/**
 * @param {string} s
 * @returns {string}
 */
function normalizeMerchantKey(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 48);
}

/**
 * @param {object} input
 * @returns {Promise<{ category: string|null, confidence: number, source: string, label: string }>}
 */
export async function suggestCategory(input = {}) {
  const text = `${input.merchant || ''} ${input.notes || ''}`.toLowerCase().trim();
  if (!text) {
    return { category: null, confidence: 0, source: 'none', label: 'Tidak cukup data' };
  }

  const merchantKey = normalizeMerchantKey(input.merchant || text);
  const map = loadMerchantCategoryMap();
  if (merchantKey && map[merchantKey]) {
    const conf = Math.min(0.98, 0.75 + map[merchantKey].confirmations * 0.03);
    return {
      category: map[merchantKey].category,
      confidence: conf,
      source: 'merchant_map',
      label: conf >= 0.85 ? 'Yakin' : 'Cukup yakin',
    };
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
  window.monefyiAutoCategorizer = {
    suggestCategory,
    formatConfidenceBadge,
    recordMerchantCategory,
    loadMerchantCategoryMap,
  };
}
