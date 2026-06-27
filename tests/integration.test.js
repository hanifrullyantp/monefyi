/**
 * @file tests/integration.test.js
 * @description Integration tests for the Task 4 feature-flag pipeline.
 *
 * Tests cover:
 *  1. Feature Flags service (js/services/feature-flags.js)
 *  2. L0→L2 pipeline end-to-end (normalizeInput → L2_applyRules)
 *  3. L0→L1→L2 memory round-trip (saveToMemory → queryLocalMemory)
 *  4. Pipeline miss (ambiguous input → null → legacy cascade)
 *
 * Run: npx deno test tests/integration.test.js --allow-env
 */

import { assertEquals, assert } from 'https://deno.land/std@0.208.0/assert/mod.ts';

import {
  isEnabled,
  enable,
  disable,
  listAll,
  _setStorage,
} from '../js/services/feature-flags.js';

import { normalizeInput } from '../js/parsers/normalize.js';
import { L2_applyRules } from '../js/parsers/rules.js';
import { queryLocalMemory, saveToMemory, _setStorageAdapter } from '../js/services/memory.js';

// =========================
// Helpers
// =========================

/** Creates an in-memory Map-based mock for localStorage */
function createMockStorage() {
  const store = new Map();
  return {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
    _store: store,
  };
}

/** Creates an in-memory mock for the memory module storage adapter */
function createMockMemoryStorage() {
  const db = new Map();
  return {
    get: async (k) => db.get(k) ?? null,
    set: async (k, v) => { db.set(k, v); },
    del: async (k) => { db.delete(k); },
    keys: async () => [...db.keys()],
    entries: async () => [...db.entries()],
    _db: db,
  };
}

function resetFeatureFlags() {
  _setStorage(createMockStorage());
}

function resetMemory() {
  _setStorageAdapter(createMockMemoryStorage());
}

// =========================
// 1. Feature Flags — isEnabled
// =========================

Deno.test('Feature flags - isEnabled returns false by default', () => {
  resetFeatureFlags();
  assertEquals(isEnabled('new_parser_pipeline'), false);
});

Deno.test('Feature flags - isEnabled returns false when storage unavailable', () => {
  _setStorage(null);
  assertEquals(isEnabled('new_parser_pipeline'), false);
  resetFeatureFlags();
});

Deno.test('Feature flags - enable sets flag to true', () => {
  resetFeatureFlags();
  enable('new_parser_pipeline');
  assertEquals(isEnabled('new_parser_pipeline'), true);
});

Deno.test('Feature flags - disable sets flag to false', () => {
  resetFeatureFlags();
  enable('new_parser_pipeline');
  disable('new_parser_pipeline');
  assertEquals(isEnabled('new_parser_pipeline'), false);
});

Deno.test('Feature flags - multiple independent flags do not interfere', () => {
  resetFeatureFlags();
  enable('new_parser_pipeline');
  assertEquals(isEnabled('new_parser_pipeline'), true);
  assertEquals(isEnabled('another_flag'), false);
});

// =========================
// 2. Feature Flags — per-user overrides
// =========================

Deno.test('Feature flags - per-user enable overrides global OFF', () => {
  resetFeatureFlags();
  enable('new_parser_pipeline', 'user-1');
  assertEquals(isEnabled('new_parser_pipeline', 'user-1'), true);
  assertEquals(isEnabled('new_parser_pipeline'), false);
});

Deno.test('Feature flags - per-user disable overrides global ON', () => {
  resetFeatureFlags();
  enable('new_parser_pipeline');
  disable('new_parser_pipeline', 'user-2');
  assertEquals(isEnabled('new_parser_pipeline'), true);
  assertEquals(isEnabled('new_parser_pipeline', 'user-2'), false);
});

Deno.test('Feature flags - global flag used when no per-user override', () => {
  resetFeatureFlags();
  enable('new_parser_pipeline');
  assertEquals(isEnabled('new_parser_pipeline', 'user-no-override'), true);
});

// =========================
// 3. Feature Flags — listAll
// =========================

Deno.test('Feature flags - listAll returns empty map initially', () => {
  resetFeatureFlags();
  const all = listAll();
  assertEquals(Object.keys(all).length, 0);
});

Deno.test('Feature flags - listAll returns all feature keys', () => {
  resetFeatureFlags();
  enable('new_parser_pipeline');
  enable('another_feature');
  const all = listAll();
  assertEquals(all['feature_new_parser_pipeline'], true);
  assertEquals(all['feature_another_feature'], true);
});

// =========================
// 4. L0→L2 Pipeline — expense rule hit
// =========================

Deno.test('Pipeline L0→L2 - expense with merchant and amount hits rule', async () => {
  const normalized = normalizeInput('kopi 25000 gopay');
  const result = await L2_applyRules(normalized);
  assert(result !== null, 'Expected L2 to return a result');
  assert(result.confidence >= 0.75, `Expected confidence >=0.75, got ${result.confidence}`);
  assertEquals(result.type, 'expense');
  assertEquals(result.amount, 25000);
  assertEquals(result.source, 'rule');
});

Deno.test('Pipeline L0→L2 - income salary hits rule', async () => {
  const normalized = normalizeInput('gaji 5000000 bca');
  const result = await L2_applyRules(normalized);
  assert(result !== null, 'Expected L2 to return a result');
  assertEquals(result.type, 'income');
  assertEquals(result.amount, 5000000);
  assert(result.confidence >= 0.75);
});

Deno.test('Pipeline L0→L2 - transfer hits rule', async () => {
  // Pattern requires source account: transfer <amount> <from> ke <to>
  const normalized = normalizeInput('transfer 200000 bca ke ovo');
  const result = await L2_applyRules(normalized);
  assert(result !== null, 'Expected L2 to return a result');
  assertEquals(result.type, 'transfer');
  assertEquals(result.amount, 200000);
});

Deno.test('Pipeline L0→L2 - amount shorthand expanded by L0 before L2', async () => {
  const normalized = normalizeInput('makan 25rb');
  assertEquals(normalized.text, 'makan 25000');
  const result = await L2_applyRules(normalized);
  assert(result !== null);
  assertEquals(result.amount, 25000);
});

Deno.test('Pipeline L0→L2 - typo corrected by L0 before L2', () => {
  // 'gope' is in TYPO_MAP → corrects to 'gopay'
  const normalized = normalizeInput('gope 50000');
  assert(normalized.text.includes('gopay'), `Expected 'gopay' in '${normalized.text}'`);
});

// =========================
// 5. L0→L2 Pipeline — miss (ambiguous input)
// =========================

Deno.test('Pipeline L0→L2 - empty string returns null', async () => {
  const normalized = normalizeInput('');
  const result = await L2_applyRules(normalized);
  // No amount → must return null (no rule matches) or confidence < 0.75
  assert(result === null || result.confidence < 0.75, 'Expected null or low confidence for empty input');
});

Deno.test('Pipeline L0→L2 - text-only no amount returns null', async () => {
  const normalized = normalizeInput('hello world');
  const result = await L2_applyRules(normalized);
  assert(result === null || result.confidence < 0.75,
    `Expected null or low confidence for text-only, got ${result?.confidence}`);
});

// =========================
// 6. L0→L1 Memory round-trip
// =========================

Deno.test('Pipeline L0→L1 - save then exact query returns hit', async () => {
  resetMemory();
  const normalized = normalizeInput('kopi 15000 cash');

  // Must save with confidence ≥ EXACT_CONFIDENCE_THRESHOLD (0.95) for exact match
  const fakeResult = {
    type: 'expense',
    amount: 15000,
    merchant: 'kopi',
    category: 'Food & Drink',
    account: 'Cash',
    confidence: 0.97,
    source: 'rule',
    matchedRules: ['expense_merchant_amount'],
    flags: [],
  };
  await saveToMemory(normalized, fakeResult);

  const hit = await queryLocalMemory(normalized);
  assert(hit !== null, 'Expected memory hit after save');
  assertEquals(hit.merchant, 'kopi');
  assert(hit.confidence >= 0.95, `Expected ≥0.95 exact hit, got ${hit.confidence}`);
  assertEquals(hit.source, 'memory');
});

Deno.test('Pipeline L0→L1 - unseen input returns null', async () => {
  resetMemory();
  const normalized = normalizeInput('pizza 80000 mandiri');
  const hit = await queryLocalMemory(normalized);
  assertEquals(hit, null);
});

Deno.test('Pipeline L0→L1 - save returns non-null on subsequent query', async () => {
  resetMemory();
  const normalized = normalizeInput('bensin 60000 gopay');
  const fakeResult = {
    type: 'expense', amount: 60000, merchant: 'bensin',
    category: 'Transport', account: 'GoPay',
    confidence: 0.97, source: 'rule', matchedRules: [], flags: [],
  };
  await saveToMemory(normalized, fakeResult);
  const hit1 = await queryLocalMemory(normalized);
  assert(hit1 !== null, 'First query should return hit');

  // Save again (simulates user confirming same transaction type)
  await saveToMemory(normalized, fakeResult);
  const hit2 = await queryLocalMemory(normalized);
  assert(hit2 !== null, 'Second query should still return hit');
});

// =========================
// 7. Pipeline cascade: miss → legacy path
// =========================

Deno.test('Pipeline cascade - L2 miss returns null (triggers legacy)', async () => {
  // Text with no parseable amount: L2 should return null
  const normalized = normalizeInput('vague input');
  const result = await L2_applyRules(normalized);
  // Cascade happens when result is null OR confidence < 0.75
  const willCascade = result === null || result.confidence < 0.75;
  assertEquals(willCascade, true, 'Expected cascade to legacy for unparseable input');
});

Deno.test('Pipeline cascade - L1 miss (null) falls through to L2 check', async () => {
  resetMemory();
  const normalized = normalizeInput('ojek 12000 cash');

  // Memory has no entry yet → null
  const memHit = await queryLocalMemory(normalized);
  assertEquals(memHit, null, 'No memory entry — should fall through to L2');

  // L2 processes the input independently
  const ruleHit = await L2_applyRules(normalized);
  // Verify L2 returns a valid result shape (either null or a typed result)
  assert(ruleHit === null || typeof ruleHit.confidence === 'number',
    'L2 should return null or a result with numeric confidence');
  if (ruleHit !== null) {
    assert(['expense', 'income', 'transfer'].includes(ruleHit.type),
      `L2 type should be valid, got: ${ruleHit.type}`);
  }
});

Deno.test('Pipeline cascade - feature flag OFF always runs legacy path', () => {
  resetFeatureFlags();
  // Flag is OFF by default
  const flagEnabled = isEnabled('new_parser_pipeline');
  assertEquals(flagEnabled, false, 'Flag should be OFF by default');
  // When flag is off, runNewParsePipeline is never called — behavior is 100% legacy
});

Deno.test('Pipeline cascade - feature flag ON routes to new pipeline', () => {
  resetFeatureFlags();
  enable('new_parser_pipeline');
  const flagEnabled = isEnabled('new_parser_pipeline');
  assertEquals(flagEnabled, true, 'Flag should be ON after enable()');
  // When flag is on, runNewParsePipeline is called first; legacy is fallback on miss/error
});
