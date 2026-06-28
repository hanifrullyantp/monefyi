/**
 * @file tests/ocr-pipeline.test.js
 * @description Unit tests for OCR self-learning pipeline (Phase OCR-1).
 *
 * Run with: npx deno test --allow-all tests/ocr-pipeline.test.js
 *
 * Coverage:
 *  1. Layout signature         (5 tests)
 *  2. Template matcher         (8 tests)
 *  3. Template learner         (7 tests)
 *  4. Pipeline integration     (5 tests)
 */

import {
  assertEquals,
  assertNotEquals,
  assert,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

// ---------------------------------------------------------------------------
// Utility: lightweight mock Supabase builder
// ---------------------------------------------------------------------------

/**
 * Builds a chainable mock Supabase client.
 * @param {{ data?: unknown, error?: unknown, rpcData?: unknown }} config
 */
function mockSupa(config = {}) {
  const { data = null, error = null } = config;
  // Non-terminal chain methods (return another proxy)
  const chainMethods = ['select', 'eq', 'order', 'limit', 'insert', 'update', 'upsert'];
  const handler = {
    get(_, prop) {
      if (prop === 'then') return undefined; // not a Promise
      if (prop === 'rpc') {
        return () => Promise.resolve({ data: config.rpcData ?? null, error: config.rpcError ?? null });
      }
      if (prop === 'from') {
        return () => new Proxy({}, handler);
      }
      // Terminal read methods
      if (prop === 'maybeSingle' || prop === 'single') {
        return () => Promise.resolve({ data, error });
      }
      if (chainMethods.includes(String(prop))) {
        return (..._args) => new Proxy({}, handler);
      }
      return () => Promise.resolve({ data, error });
    },
  };
  return new Proxy({}, handler);
}

// ---------------------------------------------------------------------------
// 1. LAYOUT SIGNATURE — 5 tests
// ---------------------------------------------------------------------------

import {
  generateLayoutSignature,
  applyTemplate,
  calculateMatchConfidence,
  _clearTemplateCache,
  findMatchingTemplate,
  CONFIDENCE_THRESHOLDS,
} from '../app/js/services/template-matcher.js';

Deno.test('Layout signature - same layout produces same signature', () => {
  const layout = {
    line_count: 22,
    header_lines: ['INDOMARET', 'Jl. Sudirman No.12'],
    total_position: 'bottom',
    date_format: 'DD/MM/YYYY',
    has_items_section: true,
  };
  const sig1 = generateLayoutSignature(layout);
  const sig2 = generateLayoutSignature({ ...layout });
  assertEquals(sig1, sig2, 'Same layout must produce same 16-char signature');
  assertEquals(sig1.length, 16, 'Signature must be exactly 16 chars');
});

Deno.test('Layout signature - different merchant header produces different signature', () => {
  const base = {
    line_count: 22,
    header_lines: ['INDOMARET', 'Jl. Sudirman'],
    total_position: 'bottom',
    date_format: 'DD/MM/YYYY',
    has_items_section: true,
  };
  const other = { ...base, header_lines: ['ALFAMART', 'Jl. Gatot Subroto'] };
  assertNotEquals(
    generateLayoutSignature(base),
    generateLayoutSignature(other),
    'Different merchants must produce different signatures',
  );
});

Deno.test('Layout signature - only items flag differs → different signature', () => {
  const withItems    = { line_count: 20, header_lines: ['GRAB'], total_position: 'bottom', date_format: 'DD/MM/YYYY', has_items_section: true };
  const withoutItems = { ...withItems, has_items_section: false };
  assertNotEquals(generateLayoutSignature(withItems), generateLayoutSignature(withoutItems));
});

Deno.test('Layout signature - empty layout returns 16-char hex string', () => {
  const sig = generateLayoutSignature({});
  assertEquals(typeof sig, 'string');
  assertEquals(sig.length, 16);
  assert(/^[0-9a-f]{16}$/.test(sig), 'Signature must be lowercase hex');
});

Deno.test('Layout signature - minor line count variance (bucket tolerance)', () => {
  // line_count 20 and 22 both bucket to 20 → same signature (other fields equal)
  const a = generateLayoutSignature({ line_count: 20, header_lines: ['SHOPEE'], total_position: 'bottom', date_format: null, has_items_section: false });
  const b = generateLayoutSignature({ line_count: 22, header_lines: ['SHOPEE'], total_position: 'bottom', date_format: null, has_items_section: false });
  assertEquals(a, b, 'line_count within same 5-bucket should produce same signature');
});

// ---------------------------------------------------------------------------
// 2. TEMPLATE MATCHER — 8 tests
// ---------------------------------------------------------------------------

Deno.test('Template matcher - user template found returns user_memory source', async () => {
  _clearTemplateCache();
  const fakeTemplate = {
    id: 'tmpl-001',
    template_signature: 'abc123',
    field_rules: { merchant: { type: 'line', line_index: 0 } },
    accuracy_score: 0.97,
  };
  const supa = mockSupa({ data: fakeTemplate });
  const result = await findMatchingTemplate('abc123', 'user-001', supa);
  assertExists(result, 'Should find a template');
  assertEquals(result.source, 'user_memory');
  assertEquals(result.template.id, 'tmpl-001');
});

Deno.test('Template matcher - no user template falls back to community', async () => {
  _clearTemplateCache();
  const communityTpl = { id: 'comm-001', template_signature: 'xyz789', community_score: 0.90, field_rules: {} };

  let callIndex = 0;
  const supaRich = {
    from: () => ({
      select: () => ({
        eq: (..._a) => ({
          eq: (..._b) => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => {
                  callIndex++;
                  // 1st call (user query) → null, 2nd call (community) → communityTpl
                  return Promise.resolve({ data: callIndex === 1 ? null : communityTpl, error: null });
                },
              }),
            }),
          }),
        }),
      }),
    }),
  };

  const result = await findMatchingTemplate('xyz789', 'user-001', supaRich);
  assertExists(result, 'Should find community template');
  assertEquals(result.source, 'community');
});

Deno.test('Template matcher - no match returns null', async () => {
  _clearTemplateCache();
  const supa = mockSupa({ data: null });
  const result = await findMatchingTemplate('nosig', 'user-001', supa);
  assertEquals(result, null, 'No match should return null');
});

Deno.test('Template matcher - apply template with line rule', () => {
  const tpl = { field_rules: { merchant: { type: 'line', line_index: 0 } } };
  const raw = 'INDOMARET\nJl. Sudirman\n25/01/2025\nTOTAL 45000';
  const out = applyTemplate(raw, tpl);
  assertEquals(out.merchant, 'INDOMARET');
});

Deno.test('Template matcher - apply template with regex rule extracts total', () => {
  const tpl = {
    field_rules: {
      total: { type: 'regex', pattern: 'TOTAL\\s+([\\d,]+)', flags: 'i' },
    },
  };
  const raw = 'Indomaret\nINFO\nTOTAL 45,000\nTERIMAKASIH';
  const out = applyTemplate(raw, tpl);
  assertEquals(out.total, 45000);
});

Deno.test('Template matcher - apply template with fixed rule', () => {
  const tpl = { field_rules: { category: { type: 'fixed', value: 'Shopping' } } };
  const out = applyTemplate('any text', tpl);
  assertEquals(out.category, 'Shopping');
});

Deno.test('Template matcher - apply template with iterative rule extracts items', () => {
  const tpl = {
    field_rules: {
      items: {
        type: 'iterative',
        start_pattern: '---',
        item_pattern: '(.+?)\\s+([\\d,]+)',
        end_pattern: '===',
      },
    },
  };
  const raw = 'SHOPEE\n---\nKopi Susu 25,000\nRoti Bakar 15,000\n===\nTOTAL 40000';
  const out = applyTemplate(raw, tpl);
  assert(Array.isArray(out.items), 'items should be array');
  assertEquals(out.items.length, 2);
  assertEquals(out.items[0].name, 'Kopi Susu');
  assertEquals(out.items[0].amount, 25000);
});

Deno.test('Template matcher - calculateMatchConfidence returns 1.0 when all fields extracted', () => {
  const extracted = { merchant: 'Indomaret', total: 45000, date: '2025-01-25', items: [] };
  const conf = calculateMatchConfidence({}, extracted);
  assertEquals(conf, 1.0);
});

// ---------------------------------------------------------------------------
// 3. TEMPLATE LEARNER — 7 tests
// ---------------------------------------------------------------------------

import {
  inferFieldRules,
  createTemplateFromCorrection,
  updateTemplateFromEdit,
  voteTemplate,
  checkAndPromoteTemplate,
} from '../app/js/services/template-learner.js';

Deno.test('Template learner - inferFieldRules infers line rule for merchant', () => {
  const raw = 'INDOMARET\nJl. Sudirman\n25/01/2025\nTOTAL 45000';
  const rules = inferFieldRules(raw, { merchant: 'INDOMARET' });
  assertExists(rules.merchant, 'Should infer merchant rule');
  assertEquals(rules.merchant.type, 'line');
  assertEquals(rules.merchant.line_index, 0);
});

Deno.test('Template learner - inferFieldRules infers regex rule for total', () => {
  const raw = 'Warung ABC\nNASI GORENG 25000\nTOTAL BAYAR 25000\nTERIMA KASIH';
  const rules = inferFieldRules(raw, { total: 25000 });
  assertExists(rules.total, 'Should infer total rule');
  assertEquals(rules.total.type, 'regex');
  assert(rules.total.pattern.length > 0, 'Pattern must not be empty');
});

Deno.test('Template learner - inferFieldRules infers regex for date', () => {
  const raw = 'ALFAMART\n15/01/2025 10:32\nROTI 12000\nTOTAL 12000';
  const rules = inferFieldRules(raw, { date: '15/01/2025' });
  assertExists(rules.date, 'Should infer date rule');
  assertEquals(rules.date.type, 'regex');
});

Deno.test('Template learner - inferFieldRules stores fixed rule for category', () => {
  const raw = 'any receipt text';
  const rules = inferFieldRules(raw, { category: 'Food & Drink' });
  assertExists(rules.category);
  assertEquals(rules.category.type, 'fixed');
  assertEquals(rules.category.value, 'Food & Drink');
});

Deno.test('Template learner - createTemplateFromCorrection returns success', async () => {
  const createdId = 'new-tmpl-001';
  const supa = {
    from: () => ({
      upsert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: createdId }, error: null }),
        }),
      }),
    }),
  };

  const scan = { rawText: 'INDOMARET\nTOTAL 45000', imageHash: 'abc', layout: { line_count: 10, header_lines: ['INDOMARET'] } };
  const final = { merchant: 'Indomaret', total: 45000, date: '2025-01-15', category: 'Shopping' };
  const result = await createTemplateFromCorrection('user-001', scan, final, supa);

  assertEquals(result.success, true);
  assertEquals(result.templateId, createdId);
});

Deno.test('Template learner - voteTemplate calls upsert and recalc_community_score', async () => {
  let upsertCalled = false;
  let rpcCalled = false;

  const supa = {
    from: () => ({
      upsert: (..._a) => {
        upsertCalled = true;
        return Promise.resolve({ error: null });
      },
    }),
    rpc: (name) => {
      if (name === 'recalc_community_score') rpcCalled = true;
      return Promise.resolve({ data: null, error: null });
    },
  };

  const result = await voteTemplate('tmpl-001', 'user-001', 'confirm', [], supa);
  assertEquals(result.success, true);
  assert(upsertCalled, 'upsert must be called');
  // rpc is called async (fire-and-forget) — wait a tick
  await new Promise((r) => setTimeout(r, 10));
  assert(rpcCalled, 'recalc_community_score RPC must be called');
});

Deno.test('Template learner - checkAndPromoteTemplate returns false when RPC returns false', async () => {
  const supa = mockSupa({ rpcData: false });
  const promoted = await checkAndPromoteTemplate('tmpl-001', supa);
  assertEquals(promoted, false);
});

// ---------------------------------------------------------------------------
// 4. PIPELINE INTEGRATION — 5 tests
// ---------------------------------------------------------------------------

import { _setTesseractLoader, extractLayoutFeatures } from '../app/js/services/ocr-extractor.js';
import { _setSupabaseClient, parseReceipt, confirmReceiptParse } from '../app/js/parsers/receipt-pipeline.js';

/** Minimal fake image Blob */
const fakeImageBlob = new Blob(['fake-png'], { type: 'image/png' });

/**
 * Injects a mock Tesseract worker that returns deterministic OCR text.
 * @param {string} text
 * @param {number} confidence
 */
function injectFakeTesseract(text = 'INDOMARET\nTOTAL 45.000\n25/01/2025', confidence = 90) {
  _setTesseractLoader(async () => ({
    recognize: async () => ({
      data: {
        text,
        confidence,
        words: text.split('\n').map((t, i) => ({
          text: t,
          confidence,
          bbox: { x0: 10, y0: i * 20, x1: 200, y1: (i + 1) * 20 },
        })),
      },
    }),
    terminate: async () => {},
  }));
}

Deno.test('Pipeline integration - L4 generic parse returns result with source', async () => {
  injectFakeTesseract('INDOMARET\nTOTAL 45000');
  _setSupabaseClient(mockSupa({ data: null }));

  const result = await parseReceipt(fakeImageBlob, null, {});

  assertExists(result, 'parseReceipt must return a result');
  assertExists(result.rawText, 'Must have rawText');
  assert(['generic', 'review'].includes(result.source), `source should be generic/review, got ${result.source}`);
  assertEquals(typeof result.confidence, 'number');
});

Deno.test('Pipeline integration - L2 user template hit → returns user_memory immediately', async () => {
  injectFakeTesseract('INDOMARET\nTOTAL 45000');

  _clearTemplateCache();

  const fakeTemplate = {
    id: 'tmpl-L2',
    template_signature: 'doesntmatter',
    accuracy_score: 0.97,
    field_rules: {
      merchant: { type: 'line', line_index: 0 },
      total:    { type: 'regex', pattern: 'TOTAL\\s+([\\d.]+)', flags: 'i' },
    },
    merchant_name: 'Indomaret',
    merchant_category: 'Shopping',
  };

  // Simulate: user query → returns template (L2 hit)
  const supaWithUser = {
    from: () => ({
      select: () => ({
        eq: (..._a) => ({
          eq: (..._b) => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: fakeTemplate, error: null }),
              }),
            }),
          }),
        }),
      }),
    }),
  };
  _setSupabaseClient(supaWithUser);

  const result = await parseReceipt(fakeImageBlob, 'user-001', {});
  assertEquals(result.source, 'user_memory');
  assert(result.confidence >= CONFIDENCE_THRESHOLDS.user_memory,
    `confidence ${result.confidence} must be >= ${CONFIDENCE_THRESHOLDS.user_memory}`);
});

Deno.test('Pipeline integration - L3 community template used when user has none', async () => {
  injectFakeTesseract('ALFAMART\nTotal Bayar 30000\n20/01/2025');
  _clearTemplateCache();

  const communityTpl = {
    id: 'comm-L3',
    template_signature: 'sigABC',
    community_score: 0.92,
    field_rules: {
      merchant: { type: 'line', line_index: 0 },
      total:    { type: 'regex', pattern: 'Total Bayar\\s+([\\d.]+)', flags: 'i' },
      date:     { type: 'regex', pattern: '\\d{2}/\\d{2}/\\d{4}' },
    },
    merchant_name: 'Alfamart',
    merchant_category: 'Shopping',
  };

  let callCount = 0;
  const supa = {
    from: () => ({
      select: () => ({
        eq: (..._a) => ({
          eq: (..._b) => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => {
                  callCount++;
                  // 1st call = user template (null), 2nd = community template
                  return Promise.resolve({
                    data: callCount >= 2 ? communityTpl : null,
                    error: null,
                  });
                },
              }),
            }),
          }),
        }),
      }),
    }),
  };
  _setSupabaseClient(supa);

  const result = await parseReceipt(fakeImageBlob, 'user-002', {});
  assertEquals(result.source, 'community');
  assert(result.confidence >= CONFIDENCE_THRESHOLDS.community,
    `confidence ${result.confidence} must be >= ${CONFIDENCE_THRESHOLDS.community}`);
});

Deno.test('Pipeline integration - OCR failure returns error source with empty text', async () => {
  _setTesseractLoader(async () => ({
    recognize: async () => { throw new Error('OCR timeout'); },
    terminate: async () => {},
  }));
  _setSupabaseClient(mockSupa({ data: null }));

  const result = await parseReceipt(fakeImageBlob, null, { language: 'eng' });

  assertEquals(result.source, 'error');
  assertEquals(result.rawText, '');
  assertEquals(result.confidence, 0);
});

Deno.test('Pipeline integration - confirmReceiptParse calls scan insert', async () => {
  let insertCalled = false;

  const supa = {
    from: (table) => ({
      insert: (data) => {
        if (table === 'receipt_scans') insertCalled = true;
        return Promise.resolve({ error: null });
      },
      upsert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'new-id' }, error: null }),
        }),
      }),
    }),
    rpc: () => Promise.resolve({ data: true, error: null }),
  };

  const scanResult = {
    parsed: { merchant: 'Test', total: 10000 },
    source: 'generic',
    template: null,
    templateId: null,
    confidence: 0.65,
    rawText: 'Test\nTOTAL 10000',
    layout: { line_count: 2, header_lines: ['Test'] },
    imageHash: 'abc123',
    latency: { ocr_ms: 3200, parse_ms: 50 },
  };

  const final = { merchant: 'Test', total: 10000, date: '2025-01-25', category: 'Shopping' };
  const { saved } = await confirmReceiptParse(scanResult, final, 'user-001', supa);

  assertEquals(saved, true, 'confirmReceiptParse must return saved: true');
  // Insert is called async (fire-and-forget) — give it a tick
  await new Promise((r) => setTimeout(r, 10));
  assert(insertCalled, 'receipt_scans insert must be called');
});

// ---------------------------------------------------------------------------
// Additional: extractLayoutFeatures (pure function, no mocks needed)
// ---------------------------------------------------------------------------

import { extractLayoutFeatures as elf } from '../app/js/services/ocr-extractor.js';

Deno.test('extractLayoutFeatures - returns zero counts for empty words', () => {
  const layout = elf([]);
  assertEquals(layout.line_count, 0);
  assertEquals(layout.has_items_section, false);
  assertEquals(layout.date_format, null);
});

Deno.test('extractLayoutFeatures - detects DD/MM/YYYY date format', () => {
  const words = [
    { text: 'INDOMARET', confidence: 95, bbox: { x0: 10, y0: 0, x1: 100, y1: 20 } },
    { text: '15/01/2025', confidence: 92, bbox: { x0: 10, y0: 22, x1: 100, y1: 42 } },
    { text: 'TOTAL', confidence: 90, bbox: { x0: 10, y0: 44, x1: 60, y1: 64 } },
    { text: '45000', confidence: 90, bbox: { x0: 70, y0: 44, x1: 120, y1: 64 } },
  ];
  const layout = elf(words, { height: 200 });
  assertEquals(layout.date_format, 'DD/MM/YYYY');
  assertEquals(layout.header_lines[0], 'INDOMARET');
});

Deno.test('extractLayoutFeatures - detects items section when many price lines', () => {
  const makePriceLine = (y, item, price) => [
    { text: item,  confidence: 90, bbox: { x0: 10, y0: y, x1: 100, y1: y + 18 } },
    { text: price, confidence: 90, bbox: { x0: 120, y0: y, x1: 200, y1: y + 18 } },
  ];
  const words = [
    ...makePriceLine(0,  'INDOMARET', ''),
    ...makePriceLine(20, 'Aqua 600ml', '5,000'),
    ...makePriceLine(40, 'Indomie Goreng', '3,500'),
    ...makePriceLine(60, 'Pocari Sweat', '8,000'),
    ...makePriceLine(80, 'Roti Tawar', '12,500'),
    ...makePriceLine(100, 'TOTAL', '29,000'),
  ];
  const layout = elf(words);
  assert(layout.has_items_section, 'Should detect items section');
});
