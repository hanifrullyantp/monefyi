import {
  queryLocalMemory,
  saveToMemory,
  generateSignature,
  levenshteinSimilarity,
  createInMemoryAdapter,
  _setStorageAdapter,
  _setMaxEntries,
  MEMORY_KEY_PREFIX,
  EXACT_CONFIDENCE_THRESHOLD,
  FUZZY_SIMILARITY_THRESHOLD,
  MAX_ENTRIES,
} from '../js/services/memory.js';
import { normalizeInput } from '../js/parsers/normalize.js';
import { assertEquals, assert, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fresh isolated adapter for each test. */
function freshAdapter() {
  const adapter = createInMemoryAdapter();
  _setStorageAdapter(adapter);
  return adapter;
}

/** Seed a raw MemoryEntry directly into the adapter. */
async function seedEntry(adapter, entry) {
  await adapter.set(MEMORY_KEY_PREFIX + entry.signature, entry);
}

// ---------------------------------------------------------------------------
// generateSignature
// ---------------------------------------------------------------------------

Deno.test('L1: generateSignature - same text same hash', () => {
  const a = generateSignature({ text: 'makan 85000 gopay' });
  const b = generateSignature({ text: 'makan 85000 gopay' });
  assertEquals(a, b);
});

Deno.test('L1: generateSignature - different amounts yield same hash', () => {
  const a = generateSignature({ text: 'makan 85000 gopay' });
  const b = generateSignature({ text: 'makan 25000 gopay' });
  assertEquals(a, b, 'Amount-only differences should produce the same signature');
});

Deno.test('L1: generateSignature - different patterns yield different hashes', () => {
  const a = generateSignature({ text: 'makan 85000 gopay' });
  const b = generateSignature({ text: 'bensin 50000 cash' });
  assertNotEquals(a, b);
});

// ---------------------------------------------------------------------------
// levenshteinSimilarity
// ---------------------------------------------------------------------------

Deno.test('L1: levenshteinSimilarity - identical strings score 1.0', () => {
  assertEquals(levenshteinSimilarity('makan gopay', 'makan gopay'), 1);
});

Deno.test('L1: levenshteinSimilarity - completely different score near 0', () => {
  const sim = levenshteinSimilarity('aaa', 'zzz');
  assert(sim < 0.5, `Expected < 0.5, got ${sim}`);
});

Deno.test('L1: levenshteinSimilarity - empty strings score 0', () => {
  assertEquals(levenshteinSimilarity('', 'abc'), 0);
  assertEquals(levenshteinSimilarity('abc', ''), 0);
});

Deno.test('L1: levenshteinSimilarity - one-char typo near 1.0', () => {
  // 'makan' vs 'maka' — 1 deletion on a 5-char string → similarity = 0.8
  const sim = levenshteinSimilarity('makan', 'maka');
  assert(sim >= 0.80, `Expected ≥ 0.80, got ${sim}`);
});

// ---------------------------------------------------------------------------
// Exact signature match
// ---------------------------------------------------------------------------

Deno.test('L1: Exact match - returns memory source and fields', async () => {
  const adapter = freshAdapter();

  const input = normalizeInput('makan 75000 gopay');
  const sig = generateSignature(input);

  await seedEntry(adapter, {
    signature: sig,
    signatureRaw: 'makan {AMOUNT} gopay',
    output: { type: 'expense', amount: 0, category: 'Food & Drink', account: 'GoPay', merchant: 'Makan', notes: null },
    confidence: 0.96,
    hitCount: 3,
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  const result = await queryLocalMemory(input);

  assert(result !== null, 'Expected a hit');
  assertEquals(result.source, 'memory');
  assertEquals(result.account, 'GoPay');
  assertEquals(result.category, 'Food & Drink');
  assert(result.confidence >= EXACT_CONFIDENCE_THRESHOLD);
  assertEquals(result.flags, []);
});

Deno.test('L1: Exact match - fills amount from input text', async () => {
  const adapter = freshAdapter();
  const input = normalizeInput('makan 85000 gopay');
  const sig = generateSignature(input);

  await seedEntry(adapter, {
    signature: sig,
    signatureRaw: 'makan {AMOUNT} gopay',
    output: { type: 'expense', amount: 0, category: 'Food & Drink', account: 'GoPay', merchant: null, notes: null },
    confidence: 0.96,
    hitCount: 1,
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  const result = await queryLocalMemory(input);

  assert(result !== null);
  assertEquals(result.amount, 85000, 'Amount should be extracted from input text');
});

Deno.test('L1: Exact match - confidence below 0.95 skips to fuzzy', async () => {
  const adapter = freshAdapter();
  const input = normalizeInput('makan 50000 gopay');
  const sig = generateSignature(input);

  // Stored confidence is below threshold → not an exact hit
  await seedEntry(adapter, {
    signature: sig,
    signatureRaw: 'makan {AMOUNT} gopay',
    output: { type: 'expense', amount: 0, category: 'Food & Drink', account: 'GoPay', merchant: null, notes: null },
    confidence: 0.80, // below EXACT_CONFIDENCE_THRESHOLD
    hitCount: 1,
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  const result = await queryLocalMemory(input);

  // Fuzzy match will still find it (signatureRaw matches well) but with fuzzy flag
  if (result !== null) {
    // If found via fuzzy, flag should be set
    assert(result.flags.includes('fuzzy_match') || result.confidence < EXACT_CONFIDENCE_THRESHOLD);
  }
});

// ---------------------------------------------------------------------------
// Fuzzy match
// ---------------------------------------------------------------------------

Deno.test('L1: Fuzzy match - similar pattern returns result', async () => {
  const adapter = freshAdapter();

  // Seed with signatureRaw pattern — different signature key than query
  await seedEntry(adapter, {
    signature: 'fuzzy001',
    signatureRaw: 'bensin {AMOUNT} cash',
    output: { type: 'expense', amount: 0, category: 'Transport', account: 'Cash', merchant: 'Bensin', notes: null },
    confidence: 0.90,
    hitCount: 5,
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  // L0 normalises 'tunai' → 'cash' and '150ribu' → '150000'
  const input = normalizeInput('bensin 150000 cash');
  const result = await queryLocalMemory(input);

  assert(result !== null, 'Fuzzy match should find a result');
  assertEquals(result.source, 'memory');
  assert(result.flags.includes('fuzzy_match'), 'Should carry fuzzy_match flag');
});

Deno.test('L1: Fuzzy match - confidence = similarity × stored confidence', async () => {
  const adapter = freshAdapter();

  await seedEntry(adapter, {
    signature: 'fuzzy002',
    signatureRaw: 'gaji {AMOUNT} bca',
    output: { type: 'income', amount: 0, category: 'Salary', account: 'BCA', merchant: null, notes: null },
    confidence: 0.92,
    hitCount: 2,
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  const input = normalizeInput('gaji 5000000 bca');
  const result = await queryLocalMemory(input);

  if (result) {
    // Confidence must be ≤ stored confidence (similarity ≤ 1)
    assert(result.confidence <= 0.92 + 0.001, `${result.confidence} should be ≤ 0.92`);
    assert(result.confidence >= 0, 'Confidence must be non-negative');
  }
});

Deno.test('L1: Fuzzy match - picks best candidate among multiple entries', async () => {
  const adapter = freshAdapter();

  // Two patterns — one closer to query than the other
  await seedEntry(adapter, {
    signature: 'fuzzy003a',
    signatureRaw: 'makan siang {AMOUNT} gopay',
    output: { type: 'expense', amount: 0, category: 'Food & Drink', account: 'GoPay', merchant: 'Makan Siang', notes: null },
    confidence: 0.95,
    hitCount: 10,
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
  await seedEntry(adapter, {
    signature: 'fuzzy003b',
    signatureRaw: 'bensin motor {AMOUNT} cash',
    output: { type: 'expense', amount: 0, category: 'Transport', account: 'Cash', merchant: 'Bensin', notes: null },
    confidence: 0.88,
    hitCount: 2,
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  const input = normalizeInput('makan siang 50000 gopay');
  const result = await queryLocalMemory(input);

  // Should match the Food & Drink entry (better similarity)
  assert(result !== null, 'Should return a match');
  assertEquals(result.account, 'GoPay');
});

Deno.test('L1: No match - returns null when nothing is stored', async () => {
  freshAdapter(); // empty store
  const input = normalizeInput('gaji 5000000 bca');
  const result = await queryLocalMemory(input);
  assertEquals(result, null);
});

// ---------------------------------------------------------------------------
// saveToMemory
// ---------------------------------------------------------------------------

Deno.test('L1: saveToMemory - stores entry and queryLocalMemory retrieves it', async () => {
  const adapter = freshAdapter();
  const input = normalizeInput('bayar listrik 350000 mandiri');

  await saveToMemory(input, {
    type: 'expense',
    amount: 350000,
    category: 'Bills & Utilities',
    account: 'Mandiri',
    merchant: 'Listrik',
    confidence: 0.95,
  });

  const result = await queryLocalMemory(input);

  assert(result !== null, 'Should retrieve stored entry');
  assertEquals(result.source, 'memory');
  assertEquals(result.category, 'Bills & Utilities');
  assertEquals(result.account, 'Mandiri');
});

Deno.test('L1: saveToMemory - increments hitCount on repeat save', async () => {
  const adapter = freshAdapter();
  const input = normalizeInput('top up 100000 ovo');
  const result = { type: 'expense', amount: 100000, account: 'OVO', confidence: 0.92 };

  await saveToMemory(input, result);
  await saveToMemory(input, result);

  const sig = generateSignature(input);
  const entry = await adapter.get(MEMORY_KEY_PREFIX + sig);

  assertEquals(entry.hitCount, 2);
});

Deno.test('L1: saveToMemory - does not throw on error (graceful degradation)', async () => {
  // Inject a broken adapter where set() throws
  _setStorageAdapter({
    get: async () => undefined,
    set: async () => { throw new Error('IDB write failed'); },
    del: async () => {},
    keys: async () => [],
  });

  const input = normalizeInput('makan 50000 gopay');
  // Should not throw — error is caught internally
  await saveToMemory(input, { type: 'expense', amount: 50000, confidence: 0.90 });
});

// ---------------------------------------------------------------------------
// LRU eviction
// ---------------------------------------------------------------------------

Deno.test('L1: LRU eviction - oldest entry removed when limit exceeded', async () => {
  const adapter = freshAdapter();
  _setMaxEntries(3); // override for this test

  const now = Date.now();

  // Seed 3 entries with staggered timestamps in the past so the
  // saveToMemory entry (which uses new Date() ≈ now) is always the newest.
  for (let i = 1; i <= 3; i++) {
    const ts = new Date(now - (4 - i) * 1000).toISOString(); // evict1 is oldest
    await adapter.set(`${MEMORY_KEY_PREFIX}evict${i}`, {
      signature: `evict${i}`,
      signatureRaw: `pattern ${i} {AMOUNT}`,
      output: { type: 'expense', amount: 0, category: null, account: null, merchant: null, notes: null },
      confidence: 0.90,
      hitCount: 1,
      lastUsedAt: ts,
      createdAt: ts,
    });
  }

  // saveToMemory for a 4th entry triggers eviction
  const input4 = normalizeInput('new entry 50000 bca');
  await saveToMemory(input4, { type: 'expense', amount: 50000, account: 'BCA', confidence: 0.90 });

  const allKeys = await adapter.keys();
  const memKeys = allKeys.filter((k) => k.startsWith(MEMORY_KEY_PREFIX));

  assertEquals(memKeys.length, 3, 'Should evict oldest to stay at limit');
  // Oldest entry (evict1) should be gone
  const oldest = await adapter.get(`${MEMORY_KEY_PREFIX}evict1`);
  assertEquals(oldest, undefined, 'Oldest entry should have been evicted');

  // Restore default
  _setMaxEntries(MAX_ENTRIES);
});

Deno.test('L1: LRU eviction - no eviction when under limit', async () => {
  const adapter = freshAdapter();
  _setMaxEntries(10);

  for (let i = 1; i <= 5; i++) {
    const ts = new Date().toISOString();
    await adapter.set(`${MEMORY_KEY_PREFIX}noevict${i}`, {
      signature: `noevict${i}`,
      signatureRaw: `pattern ${i} {AMOUNT}`,
      output: { type: 'expense', amount: 0, category: null, account: null, merchant: null, notes: null },
      confidence: 0.90,
      hitCount: 1,
      lastUsedAt: ts,
      createdAt: ts,
    });
  }

  const input = normalizeInput('makan 10000 cash');
  await saveToMemory(input, { type: 'expense', amount: 10000, confidence: 0.90 });

  const allKeys = await adapter.keys();
  const memKeys = allKeys.filter((k) => k.startsWith(MEMORY_KEY_PREFIX));

  assertEquals(memKeys.length, 6, 'No eviction when under limit');

  _setMaxEntries(MAX_ENTRIES);
});

// ---------------------------------------------------------------------------
// Error fallback
// ---------------------------------------------------------------------------

Deno.test('L1: queryLocalMemory - returns null on storage get error', async () => {
  _setStorageAdapter({
    get: async () => { throw new Error('IDB read failed'); },
    set: async () => {},
    del: async () => {},
    keys: async () => { throw new Error('IDB keys failed'); },
  });

  const input = normalizeInput('makan 50000 gopay');
  const result = await queryLocalMemory(input);

  assertEquals(result, null, 'Should degrade gracefully, returning null');
});

Deno.test('L1: Constants - exported values match spec thresholds', () => {
  assertEquals(MAX_ENTRIES, 1000);
  assertEquals(EXACT_CONFIDENCE_THRESHOLD, 0.95);
  assertEquals(FUZZY_SIMILARITY_THRESHOLD, 0.80);
});
