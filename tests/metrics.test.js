/**
 * @file tests/metrics.test.js
 * @description Unit tests for js/services/metrics.js
 *
 * Run: npx deno test tests/metrics.test.js --allow-env
 */

import { assertEquals, assert, assertMatch } from 'https://deno.land/std@0.208.0/assert/mod.ts';

import {
  getSessionId,
  logParseEvent,
  getParseMetrics,
  _setSupabaseClient,
  _setSessionStorage,
  _internal,
} from '../js/services/metrics.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** @returns {Storage} */
function createMockSessionStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
    _store: store,
  };
}

/**
 * @param {{ insertError?: Error|null, selectData?: object[]|null, selectError?: object|null }} opts
 */
function createMockSupabase(opts = {}) {
  let lastInsert = null;

  return {
    client: {
      from: (table) => {
        assertEquals(table, 'parse_events');
        return {
          insert: async (row) => {
            lastInsert = row;
            if (opts.insertError) {
              return { error: { message: opts.insertError.message } };
            }
            return { error: null };
          },
          select: (_cols) => ({
            eq: (_col, _val) => ({
              gte: async (_col2, _val2) => {
                if (opts.selectError) {
                  return { data: null, error: opts.selectError };
                }
                return { data: opts.selectData ?? [], error: null };
              },
            }),
          }),
        };
      },
    },
    getLastInsert: () => lastInsert,
  };
}

function resetHooks() {
  _setSupabaseClient(null);
  _setSessionStorage(createMockSessionStorage());
}

// =========================
// getSessionId
// =========================

Deno.test('getSessionId - returns valid UUID format', () => {
  resetHooks();
  const id = getSessionId();
  assertMatch(id, UUID_RE);
});

Deno.test('getSessionId - deterministic on multiple calls', () => {
  resetHooks();
  const id1 = getSessionId();
  const id2 = getSessionId();
  assertEquals(id1, id2);
});

Deno.test('getSessionId - uses monefyi_session_id storage key', () => {
  resetHooks();
  const storage = createMockSessionStorage();
  _setSessionStorage(storage);
  getSessionId();
  assert(storage._store.has('monefyi_session_id'));
});

Deno.test('getSessionId - reuses stored value across calls', () => {
  resetHooks();
  const storage = createMockSessionStorage();
  storage.setItem('monefyi_session_id', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  _setSessionStorage(storage);
  assertEquals(getSessionId(), 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
});

// =========================
// logParseEvent — validation & mapping
// =========================

Deno.test('logParseEvent - maps event to parse_events row shape', async () => {
  resetHooks();
  const mock = createMockSupabase();
  _setSupabaseClient(mock.client);

  await logParseEvent({
    userId: 'user-123',
    input: 'kopi 25000 gopay',
    result: {
      source: 'rule',
      confidence: 0.85,
      type: 'expense',
      amount: 25000,
      flags: ['test_flag'],
      _aiTokens: 0,
    },
    latency: 42.7,
    pipeline: 'new',
  });

  const row = mock.getLastInsert();
  assert(row !== null);
  assertEquals(row.user_id, 'user-123');
  assertEquals(row.raw_input, 'kopi 25000 gopay');
  assertEquals(row.input_channel, 'text');
  assertEquals(row.parser_layer, 'rule');
  assertEquals(row.confidence, 0.85);
  assertEquals(row.latency_ms, 43);
  assertEquals(row.ai_tokens, 0);
  assertEquals(row.flags, ['test_flag']);
  assert(typeof row.session_id === 'string');
  assertEquals(row.parsed_json._pipeline, 'new');
});

Deno.test('logParseEvent - maps meta.provider supabase_edge to ai layer', async () => {
  resetHooks();
  const mock = createMockSupabase();
  _setSupabaseClient(mock.client);

  await logParseEvent({
    userId: 'user-123',
    input: 'makan 50rb',
    result: {
      meta: { provider: 'supabase_edge', confidence: 0.88 },
      type: 'expense',
      amount: 50000,
    },
    latency: 120,
    pipeline: 'legacy',
  });

  const row = mock.getLastInsert();
  assertEquals(row.parser_layer, 'ai');
  assertEquals(row.confidence, 0.88);
});

Deno.test('logParseEvent - invalid event does not throw', async () => {
  resetHooks();
  const mock = createMockSupabase();
  _setSupabaseClient(mock.client);

  await logParseEvent({ userId: '', input: 'x', result: {}, latency: 1 });
  assertEquals(mock.getLastInsert(), null);
});

Deno.test('logParseEvent - graceful error when supabase insert fails', async () => {
  resetHooks();
  const mock = createMockSupabase({ insertError: new Error('insert failed') });
  _setSupabaseClient(mock.client);

  let threw = false;
  try {
    await logParseEvent({
      userId: 'user-123',
      input: 'test',
      result: { source: 'rule', confidence: 0.8 },
      latency: 10,
    });
  } catch {
    threw = true;
  }
  assertEquals(threw, false);
});

Deno.test('logParseEvent - graceful error when no supabase client', async () => {
  resetHooks();
  _setSupabaseClient(null);

  let threw = false;
  try {
    await logParseEvent({
      userId: 'user-123',
      input: 'test',
      result: { source: 'memory', confidence: 0.96 },
      latency: 5,
    });
  } catch {
    threw = true;
  }
  assertEquals(threw, false);
});

Deno.test('logParseEvent - isValidLogEvent rejects missing fields', () => {
  assertEquals(_internal.isValidLogEvent(null), false);
  assertEquals(_internal.isValidLogEvent({ userId: 'x', input: 'y' }), false);
  assertEquals(_internal.isValidLogEvent({
    userId: 'x',
    input: 'y',
    result: { source: 'rule' },
    latency: 1,
  }), true);
});

// =========================
// getParseMetrics
// =========================

Deno.test('getParseMetrics - returns expected shape', async () => {
  resetHooks();
  const mock = createMockSupabase({
    selectData: [
      { parser_layer: 'memory', latency_ms: 20, edited_fields: null },
      { parser_layer: 'rule', latency_ms: 40, edited_fields: ['amount'] },
      { parser_layer: 'ai', latency_ms: 200, edited_fields: null },
      { parser_layer: 'manual', latency_ms: 10, edited_fields: null },
    ],
  });
  _setSupabaseClient(mock.client);

  const stats = await getParseMetrics('user-123', 30);
  assert(stats !== null);
  assertEquals(stats.total, 4);
  assertEquals(stats.byLayer.memory, 1);
  assertEquals(stats.byLayer.rule, 1);
  assertEquals(stats.byLayer.ai, 1);
  assertEquals(stats.byLayer.manual, 1);
  assertEquals(stats.avgLatency, 68);
  assertEquals(stats.zeroEditRate, '75.0');
  assertEquals(stats.memoryHitRate, '25.0');
  assertEquals(stats.aiUsageRate, '25.0');
});

Deno.test('getParseMetrics - empty data returns zeroed stats', async () => {
  resetHooks();
  const mock = createMockSupabase({ selectData: [] });
  _setSupabaseClient(mock.client);

  const stats = await getParseMetrics('user-123');
  assert(stats !== null);
  assertEquals(stats.total, 0);
  assertEquals(stats.avgLatency, 0);
  assertEquals(stats.zeroEditRate, '0.0');
  assertEquals(stats.memoryHitRate, '0.0');
  assertEquals(stats.aiUsageRate, '0.0');
});

Deno.test('getParseMetrics - returns null on query error', async () => {
  resetHooks();
  const mock = createMockSupabase({
    selectError: { message: 'permission denied' },
  });
  _setSupabaseClient(mock.client);

  const stats = await getParseMetrics('user-123');
  assertEquals(stats, null);
});

Deno.test('getParseMetrics - returns null without userId', async () => {
  resetHooks();
  const stats = await getParseMetrics('');
  assertEquals(stats, null);
});
