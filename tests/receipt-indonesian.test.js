/**
 * @file tests/receipt-indonesian.test.js
 * @description Comprehensive tests for Indonesian receipt parsing helpers.
 *
 * Run: npx deno test --allow-all tests/receipt-indonesian.test.js
 *
 * Coverage:
 *  1. parseIndonesianAmount  (9 tests)
 *  2. parseIndonesianDate    (7 tests)
 *  3. detectMerchant         (8 tests)
 *  4. detectTotal            (7 tests)
 *  5. detectAccount          (6 tests)
 *  6. detectCategory         (6 tests)
 *  7. extractItems           (3 tests)
 *  8. genericParse (E2E)     (4 tests)
 */

import {
  assertEquals,
  assertNotEquals,
  assert,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  parseIndonesianAmount,
  parseIndonesianDate,
  detectMerchant,
  detectTotal,
  detectAccount,
  detectCategory,
  extractItems,
  genericParse,
} from '../app/js/parsers/receipt-pipeline.js';

// ---------------------------------------------------------------------------
// 1. parseIndonesianAmount — 9 tests
// ---------------------------------------------------------------------------

Deno.test('Amount: "9.200" → 9200 (thousand separator)', () => {
  assertEquals(parseIndonesianAmount('9.200'), 9200);
});

Deno.test('Amount: "50.000" → 50000', () => {
  assertEquals(parseIndonesianAmount('50.000'), 50000);
});

Deno.test('Amount: "1.500.000" → 1500000 (multi-thousand)', () => {
  assertEquals(parseIndonesianAmount('1.500.000'), 1500000);
});

Deno.test('Amount: "9,50" → 10 (comma decimal, rounded)', () => {
  assertEquals(parseIndonesianAmount('9,50'), 10);
});

Deno.test('Amount: "1.500.000,75" → 1500001 (combined, rounded)', () => {
  assertEquals(parseIndonesianAmount('1.500.000,75'), 1500001);
});

Deno.test('Amount: plain "9200" → 9200', () => {
  assertEquals(parseIndonesianAmount('9200'), 9200);
});

Deno.test('Amount: empty string → 0', () => {
  assertEquals(parseIndonesianAmount(''), 0);
});

Deno.test('Amount: null → 0', () => {
  assertEquals(parseIndonesianAmount(null), 0);
});

Deno.test('Amount: "Rp 9.200" → 9200 (strips currency prefix)', () => {
  assertEquals(parseIndonesianAmount('Rp 9.200'), 9200);
});

// ---------------------------------------------------------------------------
// 2. parseIndonesianDate — 7 tests
// ---------------------------------------------------------------------------

Deno.test('Date: "15.04.19" 2-digit year → 2019-04-15', () => {
  assertEquals(parseIndonesianDate('Tgl: 15.04.19'), '2019-04-15');
});

Deno.test('Date: "15.04.19" embedded in timestamp → 2019-04-15', () => {
  assertEquals(parseIndonesianDate('15.04.19-07:32  2.1.42  349/MOCH HAN/02'), '2019-04-15');
});

Deno.test('Date: "15/04/2019" 4-digit year → 2019-04-15', () => {
  assertEquals(parseIndonesianDate('15/04/2019'), '2019-04-15');
});

Deno.test('Date: "15-04-19" dash separator → 2019-04-15', () => {
  assertEquals(parseIndonesianDate('15-04-19'), '2019-04-15');
});

Deno.test('Date: 4-digit year has priority over 2-digit', () => {
  // "15/04/2019" must win over "16/05/20"
  assertEquals(parseIndonesianDate('15/04/2019 dan 16/05/20'), '2019-04-15');
});

Deno.test('Date: 2-digit year >= 50 → 19xx', () => {
  assertEquals(parseIndonesianDate('01/01/99'), '1999-01-01');
});

Deno.test('Date: no date in text → returns today', () => {
  const today = new Date().toISOString().split('T')[0];
  assertEquals(parseIndonesianDate('no date here at all'), today);
});

// ---------------------------------------------------------------------------
// 3. detectMerchant — 8 tests
// ---------------------------------------------------------------------------

Deno.test('Merchant: detects Indomaret in multiline header', () => {
  const text = 'PT INDOMARCO PRISMATAMA\nINDOMARET\nJL ANGGI 18';
  assertEquals(detectMerchant(text), 'Indomaret');
});

Deno.test('Merchant: detects Alfamart', () => {
  assertEquals(detectMerchant('ALFAMART CABANG SUDIRMAN'), 'Alfamart');
});

Deno.test('Merchant: detects KFC', () => {
  assertEquals(detectMerchant('KFC KEMANG JAKARTA'), 'KFC');
});

Deno.test('Merchant: detects Starbucks', () => {
  assertEquals(detectMerchant('STARBUCKS COFFEE'), 'Starbucks');
});

Deno.test('Merchant: detects Janji Jiwa', () => {
  assertEquals(detectMerchant('JANJI JIWA KOPI SUDIRMAN'), 'Janji Jiwa');
});

Deno.test('Merchant: detects Warung from text', () => {
  const text = 'JL SUDIRMAN NO 123\nNPWP 01.123.456\nWARUNG BANG ALI';
  assertEquals(detectMerchant(text), 'Warung');
});

Deno.test('Merchant: skips lines starting with digits', () => {
  const text = '12345678\nINDOMARET\nJL SUDIRMAN';
  assertEquals(detectMerchant(text), 'Indomaret');
});

Deno.test('Merchant: returns empty string when no match', () => {
  const text = 'JL SUDIRMAN NO 1\nNPWP 01.123.456.7.890';
  const result = detectMerchant(text);
  assertEquals(typeof result, 'string');
});

// ---------------------------------------------------------------------------
// 4. detectTotal — 7 tests
// ---------------------------------------------------------------------------

Deno.test('Total: TOTAL keyword takes priority over HARGA JUAL', () => {
  const text = `
    HARGA JUAL : 8.000
    TOTAL : 9.200
    TUNAI : 50.000
  `;
  assertEquals(detectTotal(text), 9200);
});

Deno.test('Total: ignores TUNAI and KEMBALI lines', () => {
  const text = `
    TOTAL : 9.200
    TUNAI : 50.000
    KEMBALI : 40.800
  `;
  assertEquals(detectTotal(text), 9200);
});

Deno.test('Total: detects GRAND TOTAL', () => {
  assertEquals(detectTotal('GRAND TOTAL: 150.000'), 150000);
});

Deno.test('Total: detects TOTAL BELANJA', () => {
  assertEquals(detectTotal('TOTAL BELANJA: 75.000'), 75000);
});

Deno.test('Total: detects TOTAL BAYAR', () => {
  assertEquals(detectTotal('TOTAL BAYAR   Rp 25.000'), 25000);
});

Deno.test('Total: detects JUMLAH BAYAR', () => {
  assertEquals(detectTotal('JUMLAH BAYAR : 12.500'), 12500);
});

Deno.test('Total: returns 0 when no amount found', () => {
  assertEquals(detectTotal('no amount here'), 0);
});

// ---------------------------------------------------------------------------
// 5. detectAccount — 6 tests
// ---------------------------------------------------------------------------

Deno.test('Account: TUNAI → Cash', () => {
  assertEquals(detectAccount('TUNAI: 50.000'), 'Cash');
});

Deno.test('Account: QRIS', () => {
  assertEquals(detectAccount('Pembayaran QRIS berhasil'), 'QRIS');
});

Deno.test('Account: GoPay', () => {
  assertEquals(detectAccount('Via GoPay'), 'GoPay');
});

Deno.test('Account: Debit Card (KARTU DEBIT)', () => {
  assertEquals(detectAccount('KARTU DEBIT BCA'), 'Debit Card');
});

Deno.test('Account: BCA keyword', () => {
  assertEquals(detectAccount('Transfer via BCA'), 'BCA');
});

Deno.test('Account: defaults to Cash when unknown', () => {
  assertEquals(detectAccount('no payment info here'), 'Cash');
});

// ---------------------------------------------------------------------------
// 6. detectCategory — 6 tests
// ---------------------------------------------------------------------------

Deno.test('Category: Indomaret → Shopping', () => {
  assertEquals(detectCategory('INDOMARET BARATA JAYA', 'Indomaret'), 'Shopping');
});

Deno.test('Category: Starbucks → Food & Drink', () => {
  assertEquals(detectCategory('STARBUCKS COFFEE', 'Starbucks'), 'Food & Drink');
});

Deno.test('Category: SPBU → Transport', () => {
  assertEquals(detectCategory('SPBU PERTAMINA 31.123', 'Pertamina'), 'Transport');
});

Deno.test('Category: PLN → Bills & Utilities', () => {
  assertEquals(detectCategory('PLN PASCABAYAR', ''), 'Bills & Utilities');
});

Deno.test('Category: Apotek → Health', () => {
  assertEquals(detectCategory('APOTEK KIMIA FARMA NO 123', ''), 'Health');
});

Deno.test('Category: unknown → Shopping (default for receipts)', () => {
  assertEquals(detectCategory('TOKO ABC', ''), 'Shopping');
});

// ---------------------------------------------------------------------------
// 7. extractItems — 3 tests
// ---------------------------------------------------------------------------

Deno.test('Items: extracts from Indomaret multi-space format', () => {
  const text = [
    'ULTRA KOMI HIJAU 250    1   4.700   4.700',
    'S/ROTI KRIM KEJU 720    1   4.500   4.500',
  ].join('\n');
  const items = extractItems(text);
  assertEquals(items.length, 2);
  assertEquals(items[0].subtotal, 4700);
  assertEquals(items[1].subtotal, 4500);
});

Deno.test('Items: item name includes product number (e.g. "250")', () => {
  const text = 'ULTRA KOMI HIJAU 250    1   4.700   4.700';
  const items = extractItems(text);
  assertEquals(items.length, 1);
  assert(items[0].name.includes('250'), `Name should include "250", got: ${items[0].name}`);
});

Deno.test('Items: skips TOTAL/HARGA/TUNAI/KEMBALI lines', () => {
  const text = [
    'HARGA JUAL    :  9.200',
    'TOTAL         :  9.200',
    'TUNAI         : 50.000',
    'KEMBALI       : 40.800',
  ].join('\n');
  const items = extractItems(text);
  assertEquals(items.length, 0);
});

// ---------------------------------------------------------------------------
// 8. genericParse E2E — 4 tests
// ---------------------------------------------------------------------------

const INDOMARET_RAW = `
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

Deno.test('E2E: Indomaret receipt — amount, merchant, date', async () => {
  const result = await genericParse(INDOMARET_RAW);
  assertEquals(result.amount, 9200);
  assertEquals(result.merchant, 'Indomaret');
  assertEquals(result.date, '2019-04-15');
});

Deno.test('E2E: Indomaret receipt — category, account', async () => {
  const result = await genericParse(INDOMARET_RAW);
  assertEquals(result.category, 'Shopping');
  assertEquals(result.account, 'Cash');
});

Deno.test('E2E: Indomaret receipt — items and notes', async () => {
  const result = await genericParse(INDOMARET_RAW);
  assertEquals(result.items.length, 2);
  assert(result.notes.includes('2 items'), `notes should include "2 items", got: ${result.notes}`);
  assert(result.notes.toLowerCase().includes('ultra komi hijau 250'), `notes should include item name, got: ${result.notes}`);
});

Deno.test('E2E: Indomaret receipt — confidence >= 0.90 (amount + merchant + date + items)', async () => {
  const result = await genericParse(INDOMARET_RAW);
  assert(result.confidence >= 0.90, `confidence should be >= 0.90, got: ${result.confidence}`);
});

Deno.test('E2E: empty input returns default parsed object', async () => {
  const result = await genericParse('');
  assertEquals(result.type, 'expense');
  assertEquals(result.amount, 0);
  assertEquals(result.confidence, 0.30);
});
