/**
 * L1 Memory Cache — IndexedDB-backed signature store for fast repeat-input matching.
 *
 * Storage priority: IndexedDB → localStorage → in-memory Map.
 * The adapter is injectable via `_setStorageAdapter` for testing/SSR.
 *
 * @module services/memory
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of memory entries before LRU eviction kicks in. */
export const MAX_ENTRIES = 1000;

/** Minimum stored confidence to qualify as an exact match. */
export const EXACT_CONFIDENCE_THRESHOLD = 0.95;

/** Minimum Levenshtein similarity to qualify as a fuzzy match. */
export const FUZZY_SIMILARITY_THRESHOLD = 0.80;

/** Storage key prefix for all memory entries. */
export const MEMORY_KEY_PREFIX = 'memory:';

// ---------------------------------------------------------------------------
// Typedefs
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} StorageAdapter
 * @property {(key: string) => Promise<any>} get
 * @property {(key: string, value: any) => Promise<void>} set
 * @property {(key: string) => Promise<void>} del
 * @property {() => Promise<string[]>} keys
 */

/**
 * @typedef {Object} MemoryEntry
 * @property {string} signature - djb2 hash of the canonical pattern
 * @property {string} signatureRaw - Human-readable pattern with {AMOUNT}/{DATE} placeholders
 * @property {Object} output - Parsed transaction template
 * @property {number} confidence - Stored confidence score (0–1)
 * @property {number} hitCount - Number of times this entry was matched
 * @property {string} lastUsedAt - ISO 8601 timestamp of last access
 * @property {string} createdAt - ISO 8601 timestamp of creation
 */

/**
 * @typedef {Object} ParseResult
 * @property {string} source - 'memory' | 'rule' | 'ai' | 'manual'
 * @property {number} confidence
 * @property {string} [type]
 * @property {number} [amount]
 * @property {string} [category]
 * @property {string} [account]
 * @property {string} [merchant]
 * @property {string} [notes]
 * @property {string[]} flags
 * @property {string[]} matchedRules
 * @property {string} [signature]
 */

// ---------------------------------------------------------------------------
// Internal mutable state
// ---------------------------------------------------------------------------

/** @type {StorageAdapter|null} */
let _adapter = null;

/** Mutable max-entries cap — overridable in tests via `_setMaxEntries`. */
let _maxEntries = MAX_ENTRIES;

// ---------------------------------------------------------------------------
// Test / SSR hooks
// ---------------------------------------------------------------------------

/**
 * Override the storage backend. Use in tests or server-side environments.
 * Pass `null` to reset to the default auto-detected adapter.
 *
 * @param {StorageAdapter|null} adapter
 */
export function _setStorageAdapter(adapter) {
  _adapter = adapter;
}

/**
 * Override the maximum number of memory entries (for LRU eviction tests).
 *
 * @param {number} n
 */
export function _setMaxEntries(n) {
  _maxEntries = n;
}

// ---------------------------------------------------------------------------
// Storage adapters
// ---------------------------------------------------------------------------

const IDB_DB_NAME = 'monefyi-memory';
const IDB_DB_VERSION = 1;
const IDB_STORE_NAME = 'parse-memory';

/**
 * Open (or upgrade) the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = /** @type {IDBOpenDBRequest} */ (e.target).result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    req.onsuccess = (e) => resolve(/** @type {IDBOpenDBRequest} */ (e.target).result);
    req.onerror = (e) => reject(/** @type {IDBOpenDBRequest} */ (e.target).error);
  });
}

/**
 * Wrap a single IDB object-store request in a Promise.
 *
 * @param {IDBDatabase} db
 * @param {'readonly'|'readwrite'} mode
 * @param {(store: IDBObjectStore) => IDBRequest} fn
 * @returns {Promise<any>}
 */
function idbReq(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, mode);
    const store = tx.objectStore(IDB_STORE_NAME);
    const req = fn(store);
    req.onsuccess = (e) => resolve(/** @type {IDBRequest} */ (e.target).result);
    req.onerror = (e) => reject(/** @type {IDBRequest} */ (e.target).error);
  });
}

/**
 * Build an IDB-backed storage adapter.
 * @returns {Promise<StorageAdapter>}
 */
async function createIdbAdapter() {
  const db = await openIdb();
  return {
    get: (key) => idbReq(db, 'readonly', (s) => s.get(key)),
    set: (key, val) => idbReq(db, 'readwrite', (s) => s.put(val, key)),
    del: (key) => idbReq(db, 'readwrite', (s) => s.delete(key)),
    keys: () => idbReq(db, 'readonly', (s) => s.getAllKeys()),
  };
}

/**
 * Build a localStorage-backed storage adapter (browser fallback).
 * @returns {StorageAdapter}
 */
function createLocalStorageAdapter() {
  const PREFIX = 'monefyi:';
  return {
    get: async (key) => {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : undefined;
    },
    set: async (key, val) => {
      localStorage.setItem(PREFIX + key, JSON.stringify(val));
    },
    del: async (key) => {
      localStorage.removeItem(PREFIX + key);
    },
    keys: async () =>
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .map((k) => k.slice(PREFIX.length)),
  };
}

/**
 * Build an in-memory Map adapter (final fallback / Deno tests).
 * @returns {StorageAdapter}
 */
export function createInMemoryAdapter() {
  const store = new Map();
  return {
    get: async (key) => store.get(key),
    set: async (key, val) => { store.set(key, val); },
    del: async (key) => { store.delete(key); },
    keys: async () => [...store.keys()],
  };
}

/**
 * Resolve the active storage adapter, initialising it on first call.
 *
 * Priority: injected adapter → IndexedDB → localStorage → in-memory Map.
 *
 * @returns {Promise<StorageAdapter>}
 */
async function getStorage() {
  if (_adapter) return _adapter;

  try {
    if (typeof indexedDB !== 'undefined') {
      _adapter = await createIdbAdapter();
      return _adapter;
    }
  } catch (err) {
    console.error('[memory] IndexedDB init failed, trying localStorage:', err);
  }

  try {
    if (typeof localStorage !== 'undefined') {
      _adapter = createLocalStorageAdapter();
      return _adapter;
    }
  } catch (err) {
    console.error('[memory] localStorage unavailable, using in-memory store:', err);
  }

  _adapter = createInMemoryAdapter();
  return _adapter;
}

// ---------------------------------------------------------------------------
// Signature & hashing
// ---------------------------------------------------------------------------

/**
 * Compute a djb2-style 32-bit hash of a string, returned as an 8-char hex string.
 * Works in browser, Node, and Deno without any Web Crypto API.
 *
 * @param {string} str
 * @returns {string}
 */
function djb2Hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
    h = h >>> 0; // keep as unsigned 32-bit
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Generate a canonical pattern from a `NormalizedInput`, replacing expanded
 * amounts and ISO dates with `{AMOUNT}` / `{DATE}` placeholders, then hash it.
 *
 * Two inputs that differ only in their amounts/dates will produce the same
 * signature, enabling exact memory retrieval for repeat transactions.
 *
 * @param {{ text: string }} input - Must have a `.text` property (L0 output)
 * @returns {string} 8-character hex signature
 *
 * @example
 * generateSignature({ text: 'makan 85000 gopay' })  // same as:
 * generateSignature({ text: 'makan 25000 gopay' })  // → same hash
 */
export function generateSignature(input) {
  let pattern = input.text;
  // Replace L0-expanded amounts (4+ consecutive digits)
  pattern = pattern.replace(/\b\d{4,}\b/g, '{AMOUNT}');
  // Replace ISO dates produced by L0 (YYYY-MM-DD)
  pattern = pattern.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '{DATE}');
  return djb2Hash(pattern.trim());
}

// ---------------------------------------------------------------------------
// Fuzzy matching
// ---------------------------------------------------------------------------

/**
 * Compute Levenshtein similarity between two strings, normalised to [0, 1].
 * A score of 1.0 means identical; 0.0 means completely different.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} similarity score in [0, 1]
 */
export function levenshteinSimilarity(a, b) {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const m = a.length;
  const n = b.length;

  // Use two-row rolling array to keep memory O(n) instead of O(m*n)
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  const distance = prev[n];
  return 1 - distance / Math.max(m, n);
}

// ---------------------------------------------------------------------------
// Template utilities
// ---------------------------------------------------------------------------

/**
 * Merge a stored output template with data from the current query.
 *
 * Stored templates use `amount: 0` as a placeholder. This function extracts
 * the first 4+-digit number from the normalised input text and injects it.
 *
 * @param {MemoryEntry} entry
 * @param {string} normalizedText
 * @returns {Object} merged output ready for the caller
 */
function fillTemplate(entry, normalizedText) {
  const amountMatch = normalizedText.match(/\b(\d{4,})\b/);
  const amount = amountMatch ? parseInt(amountMatch[1], 10) : (entry.output.amount || 0);
  return { ...entry.output, amount };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Increment the hit count and refresh `lastUsedAt` for a stored entry.
 *
 * @param {string} signature - Raw hash (without key prefix)
 * @param {StorageAdapter} storage
 * @returns {Promise<void>}
 */
async function updateHitCount(signature, storage) {
  const key = MEMORY_KEY_PREFIX + signature;
  const entry = await storage.get(key);
  if (!entry) return;
  await storage.set(key, {
    ...entry,
    hitCount: (entry.hitCount || 0) + 1,
    lastUsedAt: new Date().toISOString(),
  });
}

/**
 * Evict the oldest entries (by `lastUsedAt`) when the store exceeds `_maxEntries`.
 *
 * @param {StorageAdapter} storage
 * @returns {Promise<void>}
 */
async function evictIfNeeded(storage) {
  const allKeys = await storage.keys();
  const memKeys = allKeys.filter((k) => k.startsWith(MEMORY_KEY_PREFIX));

  if (memKeys.length <= _maxEntries) return;

  const entries = await Promise.all(
    memKeys.map(async (k) => ({ key: k, entry: await storage.get(k) }))
  );

  entries.sort((a, b) => {
    const ta = a.entry?.lastUsedAt ? new Date(a.entry.lastUsedAt).getTime() : 0;
    const tb = b.entry?.lastUsedAt ? new Date(b.entry.lastUsedAt).getTime() : 0;
    return ta - tb; // ascending: oldest first
  });

  const toRemove = entries.slice(0, memKeys.length - _maxEntries);
  await Promise.all(toRemove.map(({ key }) => storage.del(key)));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Query the local memory cache for a match to the given normalised input.
 *
 * Lookup order:
 * 1. **Exact** — signature hash hit with confidence ≥ 0.95
 * 2. **Fuzzy** — best Levenshtein match against stored `signatureRaw` patterns (≥ 0.80)
 * 3. **Miss** — returns `null`; caller should proceed to L2+
 *
 * On any storage error, degrades gracefully by returning `null`.
 *
 * @param {{ text: string, tokens: string[] }} input - L0 normalised input
 * @returns {Promise<ParseResult|null>}
 *
 * @example
 * const normalized = normalizeInput('makan 75000 gopay');
 * const hit = await queryLocalMemory(normalized);
 * if (hit) console.log(hit.source, hit.confidence);
 */
export async function queryLocalMemory(input) {
  try {
    const storage = await getStorage();
    const signature = generateSignature(input);
    const key = MEMORY_KEY_PREFIX + signature;

    // --- Exact match ---
    const exact = await storage.get(key);
    if (exact && exact.confidence >= EXACT_CONFIDENCE_THRESHOLD) {
      await updateHitCount(signature, storage);
      return {
        ...fillTemplate(exact, input.text),
        confidence: exact.confidence,
        source: 'memory',
        signature,
        flags: [],
        matchedRules: [],
      };
    }

    // --- Fuzzy match ---
    // Compare the input's canonical *pattern* (amounts/dates replaced) against
    // stored signatureRaw patterns so that e.g. 'makan 85000 gopay' and
    // 'makan {AMOUNT} gopay' score ≈ 1.0 rather than < 0.80.
    const inputPattern = input.text
      .replace(/\b\d{4,}\b/g, '{AMOUNT}')
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '{DATE}')
      .trim();

    const allKeys = await storage.keys();
    const memKeys = allKeys.filter((k) => k.startsWith(MEMORY_KEY_PREFIX));

    let bestEntry = null;
    let bestSim = 0;

    for (const k of memKeys) {
      const entry = await storage.get(k);
      if (!entry?.signatureRaw) continue;

      const sim = levenshteinSimilarity(inputPattern, entry.signatureRaw);
      if (sim >= FUZZY_SIMILARITY_THRESHOLD && sim > bestSim) {
        bestSim = sim;
        bestEntry = entry;
      }
    }

    if (bestEntry) {
      await updateHitCount(bestEntry.signature, storage);
      return {
        ...fillTemplate(bestEntry, input.text),
        confidence: parseFloat((bestSim * bestEntry.confidence).toFixed(4)),
        source: 'memory',
        signature: bestEntry.signature,
        flags: ['fuzzy_match'],
        matchedRules: [],
      };
    }

    return null;
  } catch (err) {
    console.error('[memory] queryLocalMemory failed:', err);
    return null;
  }
}

/**
 * Persist a confirmed parse result into the memory cache.
 *
 * Call this after the user saves a transaction (regardless of which layer
 * produced the result) so the memory improves over time.
 *
 * Triggers LRU eviction if the store exceeds `MAX_ENTRIES`.
 *
 * @param {{ text: string, tokens: string[] }} input - L0 normalised input
 * @param {Object} result - Confirmed parsed transaction fields
 * @param {string} result.type
 * @param {number} result.amount
 * @param {string} [result.category]
 * @param {string} [result.account]
 * @param {string} [result.merchant]
 * @param {string} [result.notes]
 * @param {number} [result.confidence]
 * @returns {Promise<void>}
 */
export async function saveToMemory(input, result) {
  try {
    const storage = await getStorage();
    const signature = generateSignature(input);
    const key = MEMORY_KEY_PREFIX + signature;
    const now = new Date().toISOString();

    let signatureRaw = input.text;
    signatureRaw = signatureRaw.replace(/\b\d{4,}\b/g, '{AMOUNT}');
    signatureRaw = signatureRaw.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '{DATE}');

    const existing = await storage.get(key);

    /** @type {MemoryEntry} */
    const entry = {
      signature,
      signatureRaw: signatureRaw.trim(),
      output: {
        type: result.type ?? null,
        amount: 0, // placeholder; filled dynamically by fillTemplate()
        category: result.category ?? null,
        account: result.account ?? null,
        merchant: result.merchant ?? null,
        notes: result.notes ?? null,
      },
      confidence: Math.min(result.confidence ?? 0.90, 1),
      hitCount: (existing?.hitCount ?? 0) + 1,
      lastUsedAt: now,
      createdAt: existing?.createdAt ?? now,
    };

    await storage.set(key, entry);
    await evictIfNeeded(storage);
  } catch (err) {
    console.error('[memory] saveToMemory failed:', err);
  }
}
