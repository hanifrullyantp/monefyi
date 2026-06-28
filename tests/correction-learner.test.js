/**
 * @file tests/correction-learner.test.js
 * @description Tests for Phase 2 Mini correction-to-pattern learning loop.
 *
 * Run: npx deno test --allow-all tests/correction-learner.test.js
 */

import {
  assertEquals,
  assert,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  diffCorrections,
  extractPatterns,
  saveLearntPatterns,
  loadLearntPatterns,
  applyLearntPatterns,
  getLearningStats,
  _setStorage,
} from '../app/js/services/correction-learner.js';

// ---------------------------------------------------------------------------
// Test fixture: in-memory storage (no browser localStorage needed in Deno)
// ---------------------------------------------------------------------------

/**
 * Returns a fresh in-memory Map-based storage that mimics localStorage API.
 * @returns {Map<string,string> & { getItem(k:string):string|null, setItem(k:string,v:string):void, removeItem(k:string):void }}
 */
function freshStore() {
  const m = new Map();
  m.getItem = (k) => m.get(k) ?? null;
  m.setItem = (k, v) => m.set(k, v);
  m.removeItem = (k) => m.delete(k);
  return m;
}

// Reset storage before every test group (Deno runs sequentially here)
function setup() { _setStorage(freshStore()); }

// ===========================================================================
// 1. diffCorrections
// ===========================================================================

Deno.test('Learner: diffCorrections - detects amount change', () => {
  setup();
  const diffs = diffCorrections({ amount: 0, category: 'Food' }, { amount: 10000, category: 'Food' });
  assertEquals(diffs.length, 1);
  assertEquals(diffs[0].field, 'amount');
  assertEquals(diffs[0].newValue, 10000);
  assertEquals(diffs[0].oldValue, 0);
});

Deno.test('Learner: diffCorrections - ignores unchanged fields', () => {
  setup();
  const diffs = diffCorrections({ amount: 10000, category: 'Food' }, { amount: 10000, category: 'Food' });
  assertEquals(diffs.length, 0);
});

Deno.test('Learner: diffCorrections - detects category change', () => {
  setup();
  const diffs = diffCorrections({ category: 'Lainnya' }, { category: 'Transport' });
  assertEquals(diffs.length, 1);
  assertEquals(diffs[0].field, 'category');
  assertEquals(diffs[0].newValue, 'Transport');
});

Deno.test('Learner: diffCorrections - detects account change', () => {
  setup();
  const diffs = diffCorrections({ account: '' }, { account: 'GoPay' });
  assertEquals(diffs.length, 1);
  assertEquals(diffs[0].field, 'account');
});

Deno.test('Learner: diffCorrections - treats numeric zero same as zero (no false diff)', () => {
  setup();
  const diffs = diffCorrections({ amount: 0 }, { amount: 0 });
  assertEquals(diffs.length, 0);
});

Deno.test('Learner: diffCorrections - multiple fields changed', () => {
  setup();
  const diffs = diffCorrections(
    { amount: 0, category: 'Lainnya', account: '' },
    { amount: 5000, category: 'Food & Drink', account: 'GoPay' },
  );
  assertEquals(diffs.length, 3);
});

// ===========================================================================
// 2. extractPatterns
// ===========================================================================

Deno.test('Learner: extractPatterns - extracts amount_shorthand from "10rb"', () => {
  setup();
  const patterns = extractPatterns('makan 10rb gopay', [
    { field: 'amount', oldValue: 0, newValue: 10000 },
  ]);
  assert(patterns.length > 0, 'should extract at least one pattern');
  assertEquals(patterns[0].type, 'amount_shorthand');
  assert(patterns[0].pattern?.includes('10rb'), `pattern should include "10rb", got: ${patterns[0].pattern}`);
  assertEquals(patterns[0].expectedValue, 10000);
  assertEquals(patterns[0].confidence, 0.95);
});

Deno.test('Learner: extractPatterns - extracts amount_shorthand from "5k"', () => {
  setup();
  const patterns = extractPatterns('kopi 5k', [
    { field: 'amount', oldValue: 0, newValue: 5000 },
  ]);
  const shorthand = patterns.find((p) => p.type === 'amount_shorthand');
  assertExists(shorthand, 'should find amount_shorthand pattern');
  assertEquals(shorthand.expectedValue, 5000);
});

Deno.test('Learner: extractPatterns - extracts amount_shorthand from "1.5jt"', () => {
  setup();
  const patterns = extractPatterns('gaji 1.5jt bca', [
    { field: 'amount', oldValue: 0, newValue: 1500000 },
  ]);
  const shorthand = patterns.find((p) => p.type === 'amount_shorthand');
  assertExists(shorthand, 'should find 1.5jt pattern');
  assertEquals(shorthand.expectedValue, 1500000);
});

Deno.test('Learner: extractPatterns - extracts category_keyword', () => {
  setup();
  const patterns = extractPatterns('makan malam sushi', [
    { field: 'category', oldValue: 'Lainnya', newValue: 'Food & Drink' },
  ]);
  const catPat = patterns.find((p) => p.type === 'category_keyword');
  assertExists(catPat, 'should extract category pattern');
  assertEquals(catPat.category, 'Food & Drink');
  assert(Array.isArray(catPat.keywords));
});

Deno.test('Learner: extractPatterns - returns empty array for empty corrections', () => {
  setup();
  const patterns = extractPatterns('some input', []);
  assertEquals(patterns.length, 0);
});

Deno.test('Learner: extractPatterns - returns empty array for empty rawInput', () => {
  setup();
  const patterns = extractPatterns('', [{ field: 'amount', oldValue: 0, newValue: 5000 }]);
  assertEquals(patterns.length, 0);
});

// ===========================================================================
// 3. saveLearntPatterns + loadLearntPatterns
// ===========================================================================

Deno.test('Learner: saveLearntPatterns - persists and loadLearntPatterns retrieves', async () => {
  setup();
  const p = {
    type: 'amount_shorthand', pattern: '5rb',
    interpretation: { num: 5, suffix: 'rb', multiplier: 1000 },
    expectedValue: 5000, confidence: 0.95,
  };
  await saveLearntPatterns([p]);
  const loaded = await loadLearntPatterns();
  assertEquals(loaded.length, 1);
  assertEquals(loaded[0].pattern, '5rb');
  assertEquals(loaded[0].expectedValue, 5000);
});

Deno.test('Learner: duplicate pattern increments hitCount', async () => {
  setup();
  const pattern = {
    type: 'amount_shorthand', pattern: '10rb',
    interpretation: { num: 10, suffix: 'rb', multiplier: 1000 },
    expectedValue: 10000, confidence: 0.85,
  };
  await saveLearntPatterns([pattern]);
  await saveLearntPatterns([pattern]);

  const all = await loadLearntPatterns();
  const found = all.find((p) => p.pattern === '10rb');
  assertExists(found, 'pattern must be persisted');
  assertEquals(found.hitCount, 2, 'hitCount must be 2 after two saves');
});

Deno.test('Learner: confidence increases with repeated saves (capped at 1.0)', async () => {
  setup();
  const pattern = {
    type: 'amount_shorthand', pattern: '3rb',
    interpretation: { num: 3, suffix: 'rb', multiplier: 1000 },
    expectedValue: 3000, confidence: 0.95,
  };
  await saveLearntPatterns([pattern]);
  await saveLearntPatterns([pattern]);

  const all = await loadLearntPatterns();
  const found = all.find((p) => p.pattern === '3rb');
  assertExists(found);
  assert(found.confidence <= 1.0, 'confidence must not exceed 1.0');
  assert(found.confidence > 0.95, 'confidence must increase after repeat');
});

Deno.test('Learner: loadLearntPatterns returns empty array when storage is empty', async () => {
  setup();
  const patterns = await loadLearntPatterns();
  assertEquals(patterns.length, 0);
});

// ===========================================================================
// 4. applyLearntPatterns
// ===========================================================================

Deno.test('Learner: applyLearntPatterns applies saved shorthand pattern', async () => {
  setup();
  await saveLearntPatterns([{
    type: 'amount_shorthand',
    pattern: '5rb',
    interpretation: { num: 5, suffix: 'rb', multiplier: 1000 },
    expectedValue: 5000,
    confidence: 0.95,
  }]);

  const result = await applyLearntPatterns('kopi 5rb');
  assertEquals(result.includes('5000'), true, 'should substitute 5rb with 5000');
  assertEquals(result.includes('5rb'), false, 'original 5rb should be gone');
});

Deno.test('Learner: applyLearntPatterns is case-insensitive', async () => {
  setup();
  await saveLearntPatterns([{
    type: 'amount_shorthand',
    pattern: '5rb',
    interpretation: { num: 5, suffix: 'rb', multiplier: 1000 },
    expectedValue: 5000,
    confidence: 0.95,
  }]);

  const result = await applyLearntPatterns('kopi 5RB');
  assertEquals(result.includes('5000'), true, 'uppercase 5RB should be substituted');
});

Deno.test('Learner: applyLearntPatterns skips patterns with confidence < 0.80', async () => {
  setup();
  await saveLearntPatterns([{
    type: 'amount_shorthand',
    pattern: '7rb',
    interpretation: { num: 7, suffix: 'rb', multiplier: 1000 },
    expectedValue: 7000,
    confidence: 0.50, // too low
  }]);

  const result = await applyLearntPatterns('makan 7rb');
  // Pattern should NOT be applied (confidence too low)
  assertEquals(result, 'makan 7rb', 'low-confidence pattern must not be applied');
});

Deno.test('Learner: applyLearntPatterns returns original text on empty store', async () => {
  setup();
  const result = await applyLearntPatterns('makan 10rb gopay');
  assertEquals(result, 'makan 10rb gopay');
});

// ===========================================================================
// 5. getLearningStats
// ===========================================================================

Deno.test('Learner: getLearningStats - returns correct shape', async () => {
  setup();
  await saveLearntPatterns([
    { type: 'amount_shorthand', pattern: '5rb', interpretation: { num: 5, suffix: 'rb', multiplier: 1000 }, expectedValue: 5000, confidence: 0.95 },
    { type: 'category_keyword', keywords: ['makan', 'siang'], category: 'Food & Drink', confidence: 0.80 },
  ]);
  const stats = await getLearningStats();
  assertEquals(stats.total, 2);
  assertEquals(stats.byType.amount_shorthand, 1);
  assertEquals(stats.byType.category_keyword, 1);
  assert(stats.avgConfidence > 0, 'avgConfidence must be > 0');
  assert(Array.isArray(stats.topPatterns), 'topPatterns must be array');
});

Deno.test('Learner: getLearningStats - returns zero total on empty store', async () => {
  setup();
  const stats = await getLearningStats();
  assertEquals(stats.total, 0);
  assertEquals(stats.avgConfidence, 0);
});
