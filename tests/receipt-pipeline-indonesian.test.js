/**
 * @file tests/receipt-pipeline-indonesian.test.js
 * @description Tests for Indonesian receipt parsing helpers (L4 generic parse).
 *
 * Run: npx deno test --allow-all tests/receipt-pipeline-indonesian.test.js
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  parseIndonesianAmount,
  parseIndonesianDate,
  detectMerchant,
  detectTotal,
  detectAccount,
  detectCategory,
  genericParse,
} from '../app/js/parsers/receipt-pipeline.js';

const INDOMARET_RECEIPT = `
PT INDOMARCO PRISMATAMA
INDOMARET
JL ANGGI 18-BLANCA
BARAT, JAKARTA UTARA
NPWP 01.30...

BARATA JAYA B2 SURABAYA 088690151057
JL BARATA JAYA XIX NO B2 SURABAYA, SURABAY A, 60284

15.04.19-07:32  2.1.42  349/MOCH HAN/02

ULTRA KOMI HIJAU 250    1   4.700   4.700
S/ROTI KRIM KEJU 720    1   4.500   4.500

HARGA JUAL    :  9.200

TOTAL         :  9.200
TUNAI         : 50.000
KEMBALI       : 40.800
`;

// === Amount ===

Deno.test('Indonesian amount - "9.200" → 9200', () => {
  assertEquals(parseIndonesianAmount('9.200'), 9200);
});

Deno.test('Indonesian amount - "1.500.000" → 1500000', () => {
  assertEquals(parseIndonesianAmount('1.500.000'), 1500000);
});

Deno.test('Indonesian amount - "50.000" → 50000', () => {
  assertEquals(parseIndonesianAmount('50.000'), 50000);
});

Deno.test('Indonesian amount - "9.50" → 10 (decimal)', () => {
  assertEquals(parseIndonesianAmount('9.50'), 10);
});

Deno.test('Indonesian amount - "1.500.000,75" → 1500001 (combined)', () => {
  assertEquals(parseIndonesianAmount('1.500.000,75'), 1500001);
});

Deno.test('Indonesian amount - plain "9200" → 9200', () => {
  assertEquals(parseIndonesianAmount('9200'), 9200);
});

// === Date ===

Deno.test('Date - "15.04.19" → 2019-04-15', () => {
  assertEquals(parseIndonesianDate('Tanggal: 15.04.19-07:32'), '2019-04-15');
});

Deno.test('Date - "15/04/2019" → 2019-04-15', () => {
  assertEquals(parseIndonesianDate('Date 15/04/2019'), '2019-04-15');
});

Deno.test('Date - invalid → today', () => {
  const today = new Date().toISOString().split('T')[0];
  assertEquals(parseIndonesianDate('no date here'), today);
});

// === Merchant ===

Deno.test('Merchant - detects Indomaret', () => {
  const text = 'PT INDOMARCO\nINDOMARET\nJL ANGGREK 18';
  assertEquals(detectMerchant(text), 'Indomaret');
});

Deno.test('Merchant - detects Alfamart', () => {
  assertEquals(detectMerchant('ALFAMART CABANG'), 'Alfamart');
});

Deno.test('Merchant - detects KFC', () => {
  assertEquals(detectMerchant('KFC KEMANG'), 'KFC');
});

// === Total ===

Deno.test('Total - extracts from "TOTAL: 9.200"', () => {
  const text = `
    HARGA JUAL : 9.200
    TOTAL : 9.200
    TUNAI : 50.000
    KEMBALI : 40.800
  `;
  assertEquals(detectTotal(text), 9200);
});

Deno.test('Total - prefers TOTAL over HARGA JUAL', () => {
  const text = `
    HARGA JUAL : 8.000
    TOTAL : 9.200
  `;
  assertEquals(detectTotal(text), 9200);
});

Deno.test('Total - ignores TUNAI', () => {
  const text = `
    TOTAL : 9.200
    TUNAI : 50.000
  `;
  assertEquals(detectTotal(text), 9200);
});

// === Account ===

Deno.test('Account - detects TUNAI as Cash', () => {
  assertEquals(detectAccount('TUNAI: 50.000'), 'Cash');
});

Deno.test('Account - detects QRIS', () => {
  assertEquals(detectAccount('Pembayaran via QRIS'), 'QRIS');
});

// === Category ===

Deno.test('Category - Indomaret → Shopping', () => {
  assertEquals(detectCategory('INDOMARET BARATA JAYA', 'Indomaret'), 'Shopping');
});

Deno.test('Category - SPBU → Transport', () => {
  assertEquals(detectCategory('SPBU PERTAMINA 31.123', 'Pertamina'), 'Transport');
});

// === E2E genericParse ===

Deno.test('E2E - Full Indomaret receipt genericParse', async () => {
  const result = await genericParse(INDOMARET_RECEIPT);

  assertEquals(result.amount, 9200);
  assertEquals(result.total, 9200);
  assertEquals(result.merchant, 'Indomaret');
  assertEquals(result.date, '2019-04-15');
  assertEquals(result.category, 'Shopping');
  assertEquals(result.account, 'Cash');
  assertEquals(result.items.length, 2);
  assertEquals(result.confidence >= 0.75, true);
  assertEquals(result.notes.includes('2 items'), true);
  assertEquals(result.notes.includes('Ultra Komi Hijau 250'), true);
});
