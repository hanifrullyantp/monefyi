/**
 * @file js/services/correction-learner.js
 * @description Phase 2 Mini — local correction-to-pattern learning loop.
 *
 * When a user edits a parsed field (amount, category, account…) and saves,
 * we diff the original parse vs the edited values, extract reusable patterns,
 * and persist them to localStorage.  On the next parse, these learnt patterns
 * are applied BEFORE L0 normalization (pre-processor step).
 *
 * Storage: localStorage (offline-first, <100 KB for 100 corrections)
 * Phase 2 full: promote to Supabase with community sharing (future)
 *
 * @module services/correction-learner
 */

const STORAGE_KEY = 'monefyi_correction_patterns';
const MAX_STORED_PATTERNS = 500;

// ---------------------------------------------------------------------------
// Injectable storage for tests (no browser localStorage in Deno)
// ---------------------------------------------------------------------------
/** @type {Storage|Map<string,string>|null} */
let _storage = null;

/**
 * Overrides the storage backend — for unit tests.
 * @param {Storage|Map<string,string>|null} store
 */
export function _setStorage(store) { _storage = store; }

/**
 * Returns the active storage (injected > localStorage > in-memory fallback).
 * @returns {{ getItem(k: string): string|null, setItem(k: string, v: string): void, removeItem(k: string): void }}
 */
function resolveStorage() {
  if (_storage) return _storage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return new Map();
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

/**
 * @typedef {{ field: string, oldValue: unknown, newValue: unknown }} Correction
 */

/**
 * Compares original parsed result to user-edited values and returns changed fields.
 *
 * @param {Record<string,unknown>} original - Parsed result from pipeline
 * @param {Record<string,unknown>} edited   - User's submitted form values
 * @returns {Correction[]}
 *
 * @example
 * diffCorrections({ amount: 0, category: 'Food' }, { amount: 10000, category: 'Food' })
 * // => [{ field: 'amount', oldValue: 0, newValue: 10000 }]
 */
export function diffCorrections(original, edited) {
  const FIELDS = ['type', 'amount', 'category', 'account', 'merchant', 'date', 'notes'];
  const diffs = [];

  for (const field of FIELDS) {
    const oldVal = original?.[field] ?? null;
    const newVal = edited?.[field] ?? null;

    if (oldVal === newVal) continue;
    if (oldVal == null && newVal == null) continue;

    // Treat numeric zero same as null (no meaningful change from empty to 0)
    if (field === 'amount' && Number(oldVal) === Number(newVal)) continue;

    diffs.push({ field, oldValue: oldVal, newValue: newVal });
  }

  return diffs;
}

// ---------------------------------------------------------------------------
// Pattern extraction
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   type: 'amount_shorthand'|'category_keyword'|'account_alias',
 *   pattern?: string,
 *   interpretation?: { num: number, suffix: string, multiplier: number },
 *   expectedValue?: number,
 *   keywords?: string[],
 *   category?: string,
 *   alias?: string,
 *   canonical?: string,
 *   confidence: number,
 *   hitCount?: number,
 *   lastSeen?: string
 * }} LearnedPattern
 */

const RIBU_SUFFIXES = ['rb', 'ribu', 'k'];
const JUTA_SUFFIXES = ['jt', 'juta', 'm'];

/**
 * Extracts learnable patterns from a set of corrections against the raw input.
 *
 * @param {string} rawInput - Original user input text
 * @param {Correction[]} corrections
 * @returns {LearnedPattern[]}
 *
 * @example
 * extractPatterns('makan 10rb gopay', [{ field: 'amount', oldValue: 0, newValue: 10000 }])
 * // => [{ type: 'amount_shorthand', pattern: '10rb', expectedValue: 10000, confidence: 0.95 }]
 */
export function extractPatterns(rawInput, corrections) {
  const patterns = /** @type {LearnedPattern[]} */ ([]);
  if (!rawInput || !corrections?.length) return patterns;

  const inputLower = rawInput.toLowerCase().replace(/\s+/g, ' ').trim();

  for (const { field, newValue } of corrections) {
    // ── amount shorthand ────────────────────────────────────────────────────
    if (field === 'amount' && typeof newValue === 'number' && newValue > 0) {
      const shorthandRe = /(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta|m)\b/gi;
      let m;
      while ((m = shorthandRe.exec(inputLower)) !== null) {
        const [full, numStr, suffix] = m;
        const num = parseFloat(numStr.replace(',', '.'));
        const mult = RIBU_SUFFIXES.includes(suffix) ? 1_000
          : JUTA_SUFFIXES.includes(suffix) ? 1_000_000
          : 1;
        const expectedValue = Math.round(num * mult);

        if (Math.abs(newValue - expectedValue) < 1) {
          patterns.push({
            type: 'amount_shorthand',
            pattern: full.replace(/\s+/g, ' ').trim(),
            interpretation: { num, suffix, multiplier: mult },
            expectedValue,
            confidence: 0.95,
          });
        }
      }
    }

    // ── category keyword ─────────────────────────────────────────────────────
    if (field === 'category' && typeof newValue === 'string' && newValue.trim()) {
      const words = inputLower.split(/\s+/).filter((w) => w.length > 3 && !/^\d+$/.test(w));
      if (words.length) {
        patterns.push({
          type: 'category_keyword',
          keywords: words.slice(0, 4), // max 4 representative keywords
          category: newValue.trim(),
          confidence: 0.80,
        });
      }
    }

    // ── account alias ────────────────────────────────────────────────────────
    if (field === 'account' && typeof newValue === 'string' && newValue.trim()) {
      const KNOWN_ACCOUNTS = ['gopay', 'ovo', 'dana', 'bca', 'mandiri', 'bri', 'bni',
        'cash', 'tunai', 'shopeepay', 'linkaja', 'jago', 'seabank', 'qris'];
      for (const acc of KNOWN_ACCOUNTS) {
        if (inputLower.includes(acc) && acc !== newValue.toLowerCase()) {
          patterns.push({
            type: 'account_alias',
            alias: acc,
            canonical: newValue.trim(),
            confidence: 0.90,
          });
        }
      }
    }
  }

  return patterns;
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

/**
 * Loads all persisted patterns from localStorage.
 * @returns {Promise<LearnedPattern[]>}
 */
export async function loadLearntPatterns() {
  try {
    const raw = resolveStorage().getItem(STORAGE_KEY);
    if (!raw) return [];
    return /** @type {LearnedPattern[]} */ (JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * Derives a deduplication key for a pattern.
 * @param {LearnedPattern} p
 * @returns {string}
 */
function getPatternKey(p) {
  if (p.type === 'amount_shorthand') return `amount:${p.pattern?.toLowerCase()}`;
  if (p.type === 'category_keyword') return `category:${[...(p.keywords ?? [])].sort().join(',')}`;
  if (p.type === 'account_alias') return `account:${p.alias?.toLowerCase()}`;
  return `unknown:${JSON.stringify(p)}`;
}

/**
 * Merges new patterns with existing ones (deduplicates, increments hitCount).
 * @param {LearnedPattern[]} existing
 * @param {LearnedPattern[]} incoming
 * @returns {LearnedPattern[]}
 */
function mergePatterns(existing, incoming) {
  const map = new Map();

  for (const p of existing) {
    map.set(getPatternKey(p), { ...p, hitCount: p.hitCount ?? 1 });
  }

  for (const p of incoming) {
    const key = getPatternKey(p);
    const prev = map.get(key);
    if (prev) {
      map.set(key, {
        ...prev,
        hitCount: prev.hitCount + 1,
        confidence: Math.min(1.0, prev.confidence + 0.02),
        lastSeen: new Date().toISOString(),
      });
    } else {
      map.set(key, { ...p, hitCount: 1, lastSeen: new Date().toISOString() });
    }
  }

  // Keep most-hit patterns, cap at MAX_STORED_PATTERNS
  const all = Array.from(map.values());
  all.sort((a, b) => (b.hitCount ?? 0) - (a.hitCount ?? 0));
  return all.slice(0, MAX_STORED_PATTERNS);
}

/**
 * Persists learnt patterns to localStorage.
 *
 * @param {LearnedPattern[]} patterns
 * @returns {Promise<LearnedPattern[]>} merged patterns
 */
export async function saveLearntPatterns(patterns) {
  if (!patterns?.length) return [];

  try {
    const existing = await loadLearntPatterns();
    const merged = mergePatterns(existing, patterns);
    resolveStorage().setItem(STORAGE_KEY, JSON.stringify(merged));
    console.log(`[correction-learner] saved ${patterns.length} pattern(s), total: ${merged.length}`);
    return merged;
  } catch (err) {
    console.error('[correction-learner] saveLearntPatterns failed:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Pre-processor
// ---------------------------------------------------------------------------

/**
 * Applies learnt patterns to raw text BEFORE L0 normalization.
 * Only applies patterns with confidence ≥ 0.80.
 *
 * @param {string} text
 * @returns {Promise<string>} transformed text (or original on error)
 *
 * @example
 * await saveLearntPatterns([{ type: 'amount_shorthand', pattern: '5perak', interpretation: { num: 5, suffix: 'perak', multiplier: 1000 }, expectedValue: 5000, confidence: 0.95 }]);
 * await applyLearntPatterns('kopi 5perak');
 * // => 'kopi 5000'
 */
export async function applyLearntPatterns(text) {
  try {
    const patterns = await loadLearntPatterns();
    let result = text;

    for (const p of patterns) {
      if ((p.confidence ?? 0) < 0.80) continue;

      if (p.type === 'amount_shorthand' && p.pattern && p.expectedValue != null) {
        // Case-insensitive exact-pattern substitution (whole word)
        const escaped = p.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`\\b${escaped}\\b`, 'gi');
        result = result.replace(re, String(p.expectedValue));
      }
    }

    return result;
  } catch (err) {
    console.error('[correction-learner] applyLearntPatterns failed:', err);
    return text; // safe fallback — never break the parse
  }
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

/**
 * Returns diagnostic stats for the learning store.
 * @returns {Promise<{ total: number, byType: Record<string,number>, avgConfidence: number, topPatterns: LearnedPattern[] }>}
 */
export async function getLearningStats() {
  const patterns = await loadLearntPatterns();
  const byType = /** @type {Record<string,number>} */ ({});
  let confSum = 0;

  for (const p of patterns) {
    byType[p.type] = (byType[p.type] ?? 0) + 1;
    confSum += p.confidence ?? 0;
  }

  const topPatterns = [...patterns]
    .sort((a, b) => (b.hitCount ?? 0) - (a.hitCount ?? 0))
    .slice(0, 5);

  return {
    total: patterns.length,
    byType,
    avgConfidence: patterns.length ? confSum / patterns.length : 0,
    topPatterns,
  };
}

// ---------------------------------------------------------------------------
// Debug console helper (browser only)
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.monefyiLearner = {
    getStats: getLearningStats,
    getPatterns: loadLearntPatterns,
    clear: () => resolveStorage().removeItem(STORAGE_KEY),
  };
}
