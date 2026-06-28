import {
  normalizeInput,
  TYPO_MAP,
  AMOUNT_PATTERNS,
  DATE_KEYWORDS,
} from '../app/js/parsers/normalize.js';
import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

// --- Amount parsing ---

Deno.test('L0: Amount parsing - juta (jt)', () => {
  const result = normalizeInput('gaji 5jt masuk bca');
  assertEquals(result.text.includes('5000000'), true);
  assertEquals(result.tokens.includes('5000000'), true);
});

Deno.test('L0: Amount parsing - juta (juta)', () => {
  const result = normalizeInput('thr 2 juta mandiri');
  assertEquals(result.text.includes('2000000'), true);
});

Deno.test('L0: Amount parsing - ribu (rb)', () => {
  const result = normalizeInput('makan 85rb gopay');
  assertEquals(result.text.includes('85000'), true);
});

Deno.test('L0: Amount parsing - ribu (ribu)', () => {
  const result = normalizeInput('bensin 150ribu tunai');
  assertEquals(result.text.includes('150000'), true);
});

Deno.test('L0: Amount parsing - k suffix', () => {
  const result = normalizeInput('50k buat parkir');
  assertEquals(result.text.includes('50000'), true);
});

Deno.test('L0: Amount parsing - decimal jt', () => {
  const result = normalizeInput('transfer 1.5jt ke rekening');
  assertEquals(result.text.includes('1500000'), true);
});

Deno.test('L0: Amount parsing - thousand separator dot', () => {
  const result = normalizeInput('bayar 85.000 cash');
  assertEquals(result.text.includes('85000'), true);
});

Deno.test('L0: Amount parsing - m suffix (juta)', () => {
  const result = normalizeInput('gaji 10m bca');
  assertEquals(result.text.includes('10000000'), true);
});

// --- Typo correction ---

Deno.test('L0: Typo correction - bcaa → bca', () => {
  const result = normalizeInput('transfer 100k dari bcaa');
  assertEquals(result.text.includes('bca'), true);
  assertEquals(result.text.includes('bcaa'), false);
});

Deno.test('L0: Typo correction - gopay variants', () => {
  const inputs = ['gope 50k', 'gpay 50k', 'go-pay 50k', 'go pay 50k'];
  for (const input of inputs) {
    const result = normalizeInput(input);
    assertEquals(result.text.includes('gopay'), true, `failed for: ${input}`);
    assertEquals(result.text.includes('50000'), true, `amount failed for: ${input}`);
  }
});

Deno.test('L0: Typo correction - mandiri variants', () => {
  const result = normalizeInput('bayar 350000 mandri');
  assertEquals(result.text.includes('mandiri'), true);
});

Deno.test('L0: Typo correction - ovo and dana typos', () => {
  assertEquals(normalizeInput('top up 100k ovoo').text.includes('ovo'), true);
  assertEquals(normalizeInput('beli 25k danaaa').text.includes('dana'), true);
});

Deno.test('L0: Typo correction - tunai → cash', () => {
  const result = normalizeInput('parkir 10k tunai');
  assertEquals(result.text.includes('cash'), true);
  assertEquals(result.text.includes('tunai'), false);
});

Deno.test('L0: Typo correction - b c a spaced', () => {
  const result = normalizeInput('transfer 200k b c a');
  assertEquals(result.text.includes('bca'), true);
});

Deno.test('L0: Typo correction - shopeepay aliases', () => {
  assertEquals(normalizeInput('beli 30k spay').text.includes('shopeepay'), true);
  assertEquals(normalizeInput('bayar 30k shope pay').text.includes('shopeepay'), true);
});

// --- Date keywords & numeric dates ---

Deno.test('L0: Date keyword - kemarin preserved', () => {
  const result = normalizeInput('kemarin makan 50k gopay');
  assertEquals(result.text.includes('kemarin'), true);
});

Deno.test('L0: Date keyword - hari ini preserved', () => {
  const result = normalizeInput('hari ini beli kopi 25k');
  assertEquals(result.text.includes('hari ini'), true);
});

Deno.test('L0: Date keyword - besok and lusa preserved', () => {
  assertEquals(normalizeInput('besok bayar listrik 200k').text.includes('besok'), true);
  assertEquals(normalizeInput('lusa transfer 100k').text.includes('lusa'), true);
});

Deno.test('L0: Date keyword - English aliases normalized', () => {
  assertEquals(normalizeInput('today makan 50k').text.includes('hari ini'), true);
  assertEquals(normalizeInput('yesterday bensin 100k').text.includes('kemarin'), true);
  assertEquals(normalizeInput('tomorrow gaji masuk').text.includes('besok'), true);
});

Deno.test('L0: Date parsing - slash format to ISO', () => {
  const result = normalizeInput('transaksi 12/6/2025 50k gopay');
  assertEquals(result.text.includes('2025-06-12'), true);
});

// --- WhatsApp metadata ---

Deno.test('L0: WhatsApp metadata removal - bracket header', () => {
  const input = '[John Doe] 14:23\nmakan 50k gopay';
  const result = normalizeInput(input, { channel: 'whatsapp' });
  assertEquals(result.text.startsWith('makan'), true);
  assertEquals(result.metadata.channel, 'whatsapp');
});

Deno.test('L0: WhatsApp metadata removal - export format', () => {
  const input = '24/6/2025, 14:23 - John: makan 50k gopay';
  const result = normalizeInput(input, { channel: 'whatsapp' });
  assertEquals(result.text.includes('makan 50000 gopay'), true);
  assertEquals(result.text.includes('John:'), false);
});

// --- Edge cases & purity ---

Deno.test('L0: Edge case - empty string', () => {
  const result = normalizeInput('');
  assertEquals(result.text, '');
  assertEquals(result.tokens, []);
  assertEquals(result.original, '');
});

Deno.test('L0: Edge case - whitespace only', () => {
  const result = normalizeInput('   \n\t  ');
  assertEquals(result.text, '');
  assertEquals(result.tokens, []);
});

Deno.test('L0: Edge case - only numbers', () => {
  const result = normalizeInput('12345');
  assertEquals(result.text, '12345');
  assertEquals(result.tokens, ['12345']);
});

Deno.test('L0: Edge case - emoji preserved', () => {
  const result = normalizeInput('makan 🍔 50k gopay');
  assertEquals(result.text.includes('🍔'), true);
  assertEquals(result.text.includes('50000'), true);
});

Deno.test('L0: Pure function - original input unchanged', () => {
  const input = '  Gope 50K BCAA  ';
  normalizeInput(input);
  assertEquals(input, '  Gope 50K BCAA  ');
});

Deno.test('L0: Return shape - metadata timestamp is Date', () => {
  const result = normalizeInput('makan 50k');
  assert(result.metadata.timestamp instanceof Date);
  assertEquals(result.metadata.channel, 'text');
});

Deno.test('L0: Channel option - voice', () => {
  const result = normalizeInput('makan 50k', { channel: 'voice' });
  assertEquals(result.metadata.channel, 'voice');
});

// --- Constants exported ---

Deno.test('L0: Constants - TYPO_MAP has 20+ entries', () => {
  assert(Object.keys(TYPO_MAP).length >= 20);
});

Deno.test('L0: Constants - AMOUNT_PATTERNS defined', () => {
  assert(AMOUNT_PATTERNS.length >= 3);
});

Deno.test('L0: Constants - DATE_KEYWORDS includes kemarin/hari ini/besok/lusa', () => {
  assertEquals(DATE_KEYWORDS['kemarin'], -1);
  assertEquals(DATE_KEYWORDS['hari ini'], 0);
  assertEquals(DATE_KEYWORDS['besok'], 1);
  assertEquals(DATE_KEYWORDS['lusa'], 2);
});

// --- Amount edge-case regression tests ---

Deno.test('L0: Amount "10rb" compact (no space) converts to 10000', () => {
  const result = normalizeInput('makan 10rb');
  assertEquals(result.text.includes('10000'), true, 'compact "10rb" must become 10000');
});

Deno.test('L0: Amount "10 rb" with space converts to 10000', () => {
  const result = normalizeInput('makan 10 rb');
  assertEquals(result.text.includes('10000'), true, '"10 rb" with space must become 10000');
});

Deno.test('L0: Amount "10RB" uppercase converts to 10000', () => {
  const result = normalizeInput('beli 25RB kopi');
  assertEquals(result.text.includes('25000'), true, 'uppercase RB must become 25000');
});

Deno.test('L0: Amount "1.5jt" decimal converts to 1500000', () => {
  const result = normalizeInput('gaji 1.5jt');
  assertEquals(result.text.includes('1500000'), true, '"1.5jt" decimal must become 1500000');
});

Deno.test('L0: Amount NOT falsely triggered inside word "berbicara"', () => {
  const result = normalizeInput('saya berbicara dengan teman');
  assertEquals(result.text.includes('berbicara'), true, '"berbicara" must not be mangled');
  // "rb" inside "berbicara" must NOT trigger the ribu conversion
  assert(!result.text.match(/\d{3,}/), '"berbicara" must not produce a large number');
});

Deno.test('L0: Multiple amounts in one input all converted', () => {
  const result = normalizeInput('makan 10rb minum 5rb');
  assertEquals(result.text.includes('10000'), true);
  assertEquals(result.text.includes('5000'), true);
});

Deno.test('L0: Amount with merchant after: "makan malam 10rb gopay"', () => {
  const result = normalizeInput('makan malam 10rb gopay');
  assertEquals(result.text.includes('10000'), true, '"10rb" must become 10000');
  assertEquals(result.text.includes('gopay'), true, 'gopay must be preserved');
  assertEquals(result.text.includes('10rb'), false, 'original "10rb" must be gone');
});

// --- Performance ---

Deno.test('L0: Performance - 500 char input under 10ms', () => {
  const longInput = 'makan 50k gopay kemarin '.repeat(20).slice(0, 500);
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    normalizeInput(longInput);
  }
  const avgMs = (performance.now() - start) / 100;
  assert(avgMs < 10, `avg ${avgMs.toFixed(2)}ms exceeds 10ms budget`);
});
