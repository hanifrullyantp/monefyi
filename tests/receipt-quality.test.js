/**
 * @file tests/receipt-quality.test.js
 * @description Tests for OCR quality assessment (assessQuality).
 *
 * Run: npx deno test --allow-all tests/receipt-quality.test.js
 */

import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  assessQuality,
  normalizeOcrConfidence,
  DEFAULT_QUALITY_THRESHOLDS,
} from '../app/js/parsers/receipt-pipeline.js';

// === Good quality ===

Deno.test('Quality: good OCR + complete fields → score >= 0.75, no warn', () => {
  const result = {
    parsed: {
      amount: 9200,
      merchant: 'Indomaret',
      date: '2019-04-15',
      type: 'expense',
      category: 'Shopping',
      account: 'Cash',
    },
    rawText: 'INDOMARET\nTOTAL: 9.200\nTUNAI: 50.000\n'.repeat(3),
    ocrConfidence: 0.92,
  };

  const quality = assessQuality(result);
  assert(quality.score >= 0.75, `expected score >= 0.75, got ${quality.score}`);
  assertEquals(quality.level, 'good');
  assertEquals(quality.shouldWarn, false);
  assertEquals(quality.summary.includes('✅'), true);
});

// === Poor quality ===

Deno.test('Quality: low OCR confidence → poor level', () => {
  const result = {
    parsed: { amount: 0, merchant: '', date: '2024-01-15' },
    rawText: 'noisy text here with some content that is long enough',
    ocrConfidence: 0.35,
  };

  const quality = assessQuality(result);
  assert(quality.score < 0.50, `expected score < 0.50, got ${quality.score}`);
  assertEquals(quality.level, 'poor');
  assertEquals(quality.shouldWarn, true);
  assertEquals(quality.issues.some((i) => i.code === 'low_ocr_confidence'), true);
});

Deno.test('Quality: no amount → issue flagged', () => {
  const result = {
    parsed: { amount: 0, merchant: 'Test', date: '2024-01-15' },
    rawText: 'some receipt text that is long enough for checks here',
    ocrConfidence: 0.80,
  };

  const quality = assessQuality(result);
  assertEquals(quality.issues.some((i) => i.code === 'no_amount'), true);
  assert(quality.score < 0.75);
});

Deno.test('Quality: merchant with weird chars → warning', () => {
  const result = {
    parsed: { amount: 5000, merchant: '~~$$@@', date: '2024-01-15' },
    rawText: 'TOTAL: 5000 and enough text for length check to pass easily',
    ocrConfidence: 0.75,
  };

  const quality = assessQuality(result);
  assertEquals(quality.warnings.some((w) => w.code === 'merchant_has_noise'), true);
});

Deno.test('Quality: very large amount → warning', () => {
  const result = {
    parsed: { amount: 99000000, merchant: 'Test', date: '2024-01-15' },
    rawText: 'TOTAL: 99000000 with enough surrounding text for length',
    ocrConfidence: 0.80,
  };

  const quality = assessQuality(result);
  assertEquals(quality.warnings.some((w) => w.code === 'amount_very_large'), true);
});

Deno.test('Quality: amount too small → warning with field', () => {
  const result = {
    parsed: { amount: 50, merchant: 'Test', date: '2024-01-15' },
    rawText: 'TOTAL: 50 with enough text padding for minimum length check',
    ocrConfidence: 0.80,
  };

  const quality = assessQuality(result);
  const w = quality.warnings.find((item) => item.code === 'amount_too_small');
  assertEquals(w?.field, 'amount');
});

Deno.test('Quality: noisy text → warning', () => {
  const result = {
    parsed: { amount: 5000, merchant: 'Test', date: '2024-01-15' },
    rawText: '~~~$$$@@@!!!###%%%^^^&&&*** noisy characters everywhere!!!',
    ocrConfidence: 0.80,
  };

  const quality = assessQuality(result);
  assertEquals(quality.warnings.some((w) => w.code === 'text_too_noisy'), true);
});

Deno.test('Quality: short text → warning', () => {
  const result = {
    parsed: { amount: 5000, merchant: 'Test', date: '2024-01-15' },
    rawText: 'short',
    ocrConfidence: 0.80,
  };

  const quality = assessQuality(result);
  assertEquals(quality.warnings.some((w) => w.code === 'text_too_short'), true);
});

Deno.test('Quality: summary string is non-empty', () => {
  const result = {
    parsed: { amount: 5000, merchant: 'Indomaret', date: '2024-01-15' },
    rawText: 'TOTAL: 5.000 with enough text for quality assessment checks',
    ocrConfidence: 0.90,
  };

  const quality = assessQuality(result);
  assertEquals(typeof quality.summary, 'string');
  assert(quality.summary.length > 0);
});

// === normalizeOcrConfidence ===

Deno.test('normalizeOcrConfidence: Tesseract 0-100 scale', () => {
  assertEquals(normalizeOcrConfidence(85), 0.85);
  assertEquals(normalizeOcrConfidence(92), 0.92);
});

Deno.test('normalizeOcrConfidence: already 0-1 scale', () => {
  assertEquals(normalizeOcrConfidence(0.75), 0.75);
});

// === Configurable thresholds ===

Deno.test('Quality: custom warnBelow threshold', () => {
  const result = {
    parsed: { amount: 5000, merchant: 'Test', date: '2024-01-15' },
    rawText: 'TOTAL 5000 with padding text for minimum length requirements',
    ocrConfidence: 0.65,
  };

  const strict = assessQuality(result, { thresholds: { warnBelow: 0.95 } });
  assertEquals(strict.shouldWarn, true);

  const lenient = assessQuality(result, { thresholds: { warnBelow: 0.50 } });
  assertEquals(lenient.shouldWarn, false);
});

Deno.test('DEFAULT_QUALITY_THRESHOLDS has expected keys', () => {
  assertEquals(typeof DEFAULT_QUALITY_THRESHOLDS.good, 'number');
  assertEquals(typeof DEFAULT_QUALITY_THRESHOLDS.warnBelow, 'number');
});
