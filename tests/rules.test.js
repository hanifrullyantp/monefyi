import {
  GRAMMAR_RULES,
  CATEGORY_KEYWORDS,
  ACCOUNT_PATTERNS,
  applyGrammarRules,
  classifyCategory,
  resolveAccount,
  L2_applyRules,
} from '../js/parsers/rules.js';
import { normalizeInput } from '../js/parsers/normalize.js';
import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand: L0-normalize then apply grammar rules. */
function ruleMatch(raw) {
  return applyGrammarRules(normalizeInput(raw));
}

// ---------------------------------------------------------------------------
// Grammar — Expense patterns
// ---------------------------------------------------------------------------

Deno.test('L2: expense_verb_merchant_amount_account — beli kopi gopay', () => {
  const result = ruleMatch('beli kopi 25000 gopay');
  assert(result !== null);
  assertEquals(result.type, 'expense');
  assertEquals(result.amount, 25000);
  assertEquals(result.merchant, 'kopi');
  assertEquals(result.account, 'gopay');
  assertEquals(result.matchedRules, ['expense_verb_merchant_amount_account']);
  assertEquals(result.source, 'rule');
  assert(result.confidence >= 0.85);
});

Deno.test('L2: expense_verb_merchant_amount_account — bayar parkir cash', () => {
  const result = ruleMatch('bayar parkir 5000 cash');
  assert(result !== null);
  assertEquals(result.type, 'expense');
  assertEquals(result.amount, 5000);
  assertEquals(result.merchant, 'parkir');
  assertEquals(result.account, 'cash');
});

Deno.test('L2: expense_amount_first — amount before verb', () => {
  const result = ruleMatch('85000 beli makan siang');
  assert(result !== null);
  assertEquals(result.type, 'expense');
  assertEquals(result.amount, 85000);
  assert(result.merchant.includes('makan siang'), `got: ${result.merchant}`);
  assertEquals(result.matchedRules, ['expense_amount_first']);
});

Deno.test('L2: expense_amount_first — with via account', () => {
  const result = ruleMatch('150000 bayar internet pakai gopay');
  assert(result !== null);
  assertEquals(result.amount, 150000);
  assertEquals(result.account, 'gopay');
});

Deno.test('L2: expense_split_payment — detects split and flags it', () => {
  // Amounts pre-expanded by L0: pass already-expanded string
  const result = applyGrammarRules({ text: 'makan 85000 (50000 gopay + 35000 cash)', tokens: [] });
  assert(result !== null);
  assertEquals(result.type, 'expense');
  assertEquals(result.merchant, 'makan');
  assertEquals(result.amount, 85000);
  assert(result.flags.includes('split_payment'));
  assert(result.notes?.includes('Split:'));
  assertEquals(result.matchedRules, ['expense_split_payment']);
});

Deno.test('L2: expense_merchant_amount — bare merchant+amount fallback', () => {
  const result = ruleMatch('kopi 25000');
  assert(result !== null);
  assertEquals(result.type, 'expense');
  assertEquals(result.merchant, 'kopi');
  assertEquals(result.amount, 25000);
  assertEquals(result.matchedRules, ['expense_merchant_amount']);
  assertEquals(result.confidence, 0.75);
});

// ---------------------------------------------------------------------------
// Grammar — Income patterns
// ---------------------------------------------------------------------------

Deno.test('L2: income_salary — gaji with bank', () => {
  const result = ruleMatch('gaji 5000000 bca');
  assert(result !== null);
  assertEquals(result.type, 'income');
  assertEquals(result.category, 'Salary');
  assertEquals(result.amount, 5000000);
  assertEquals(result.account, 'bca');
  assertEquals(result.matchedRules, ['income_salary']);
  assert(result.confidence >= 0.90);
});

Deno.test('L2: income_salary — bonus keyword', () => {
  const result = ruleMatch('bonus 2000000 mandiri');
  assert(result !== null);
  assertEquals(result.type, 'income');
  assertEquals(result.category, 'Salary');
  assertEquals(result.amount, 2000000);
});

Deno.test('L2: income_receive — masuk to e-wallet', () => {
  const result = ruleMatch('masuk 500000 gopay');
  assert(result !== null);
  assertEquals(result.type, 'income');
  assertEquals(result.amount, 500000);
  assertEquals(result.matchedRules, ['income_receive']);
});

Deno.test('L2: income_refund — refund from marketplace', () => {
  const result = applyGrammarRules({ text: 'refund 50000 dari shopee', tokens: [] });
  assert(result !== null);
  assertEquals(result.type, 'income');
  assertEquals(result.category, 'Refund');
  assertEquals(result.amount, 50000);
  assertEquals(result.matchedRules, ['income_refund']);
});

// ---------------------------------------------------------------------------
// Grammar — Transfer patterns
// ---------------------------------------------------------------------------

Deno.test('L2: transfer_from_to — gopay ke bca', () => {
  const result = ruleMatch('transfer 1000000 gopay ke bca');
  assert(result !== null);
  assertEquals(result.type, 'transfer');
  assertEquals(result.amount, 1000000);
  assertEquals(result.account, 'gopay');
  assertEquals(result._targetAccount, 'bca');
  assertEquals(result.matchedRules, ['transfer_from_to']);
  assert(result.confidence >= 0.90);
});

Deno.test('L2: transfer_topup — topup gopay dari bca', () => {
  const result = ruleMatch('topup gopay 100000 dari bca');
  assert(result !== null);
  assertEquals(result.type, 'transfer');
  assertEquals(result.amount, 100000);
  assertEquals(result._targetAccount, 'gopay');
  assertEquals(result.account, 'bca');
  assertEquals(result.matchedRules, ['transfer_topup']);
});

// ---------------------------------------------------------------------------
// Grammar — WhatsApp batch & fallback
// ---------------------------------------------------------------------------

Deno.test('L2: whatsapp_batch_line — numbered list item', () => {
  const result = applyGrammarRules({ text: '1. kopi 25000', tokens: [] });
  assert(result !== null);
  assertEquals(result.merchant, 'kopi');
  assertEquals(result.amount, 25000);
  assertEquals(result.matchedRules, ['whatsapp_batch_line']);
  assertEquals(result.confidence, 0.70);
});

Deno.test('L2: amount_only — bare number returns low-confidence expense', () => {
  const result = applyGrammarRules({ text: '85000', tokens: [] });
  assert(result !== null);
  assertEquals(result.type, 'expense');
  assertEquals(result.amount, 85000);
  assertEquals(result.matchedRules, ['amount_only']);
  assertEquals(result.confidence, 0.50);
});

Deno.test('L2: no grammar match — returns null', () => {
  const result = applyGrammarRules({ text: 'lorem ipsum dolor sit', tokens: [] });
  assertEquals(result, null);
});

Deno.test('L2: empty input — returns null', () => {
  assertEquals(applyGrammarRules({ text: '', tokens: [] }), null);
  assertEquals(applyGrammarRules(null), null);
});

// ---------------------------------------------------------------------------
// Category classification
// ---------------------------------------------------------------------------

Deno.test('L2: classifyCategory — Food & Drink', () => {
  assertEquals(classifyCategory('makan siang di warung'), 'Food & Drink');
  assertEquals(classifyCategory('ngopi starbucks'), 'Food & Drink');
});

Deno.test('L2: classifyCategory — Transport', () => {
  assertEquals(classifyCategory('bensin motor'), 'Transport');
  assertEquals(classifyCategory('naik grab ke kantor'), 'Transport');
});

Deno.test('L2: classifyCategory — Shopping', () => {
  assertEquals(classifyCategory('belanja di indomaret'), 'Shopping');
  assertEquals(classifyCategory('beli baju di shopee'), 'Shopping');
});

Deno.test('L2: classifyCategory — Bills & Utilities', () => {
  assertEquals(classifyCategory('bayar listrik pln'), 'Bills & Utilities');
  assertEquals(classifyCategory('tagihan internet indihome'), 'Bills & Utilities');
});

Deno.test('L2: classifyCategory — Health', () => {
  assertEquals(classifyCategory('beli obat di apotek'), 'Health');
  assertEquals(classifyCategory('konsultasi dokter'), 'Health');
});

Deno.test('L2: classifyCategory — Entertainment', () => {
  assertEquals(classifyCategory('nonton di bioskop xxi'), 'Entertainment');
  assertEquals(classifyCategory('bayar netflix'), 'Entertainment');
});

Deno.test('L2: classifyCategory — Education', () => {
  assertEquals(classifyCategory('kursus online udemy'), 'Education');
  assertEquals(classifyCategory('beli buku di gramedia'), 'Education');
});

Deno.test('L2: classifyCategory — Other (no match)', () => {
  assertEquals(classifyCategory('transfer antar rekening'), 'Other');
  assertEquals(classifyCategory(''), 'Other');
});

// ---------------------------------------------------------------------------
// Account resolution
// ---------------------------------------------------------------------------

Deno.test('L2: resolveAccount — GoPay variants', () => {
  assertEquals(resolveAccount('bayar pakai gopay'), 'GoPay');
  assertEquals(resolveAccount('gope 50000'), 'GoPay');
  assertEquals(resolveAccount('via go-pay'), 'GoPay');
});

Deno.test('L2: resolveAccount — BCA', () => {
  assertEquals(resolveAccount('transfer ke bca'), 'BCA');
  assertEquals(resolveAccount('bcaa'), 'BCA');
});

Deno.test('L2: resolveAccount — Mandiri', () => {
  assertEquals(resolveAccount('masuk mandiri'), 'Mandiri');
});

Deno.test('L2: resolveAccount — OVO and DANA', () => {
  assertEquals(resolveAccount('top up ovo'), 'OVO');
  assertEquals(resolveAccount('bayar dana'), 'DANA');
});

Deno.test('L2: resolveAccount — BNI and BRI', () => {
  assertEquals(resolveAccount('transfer bni'), 'BNI');
  assertEquals(resolveAccount('via bri'), 'BRI');
});

Deno.test('L2: resolveAccount — Cash (L0 converts tunai→cash)', () => {
  // After L0, 'tunai' is already 'cash'
  assertEquals(resolveAccount('bayar cash'), 'Cash');
  assertEquals(resolveAccount('uang tunai'), 'Cash');
});

Deno.test('L2: resolveAccount — Credit Card', () => {
  assertEquals(resolveAccount('bayar pakai cc'), 'Credit Card');
  assertEquals(resolveAccount('kartu kredit'), 'Credit Card');
});

Deno.test('L2: resolveAccount — undefined when no match', () => {
  assertEquals(resolveAccount('transfer sesuatu'), undefined);
  assertEquals(resolveAccount(''), undefined);
});

// ---------------------------------------------------------------------------
// L2_applyRules — integration (grammar + enrichment)
// ---------------------------------------------------------------------------

Deno.test('L2: L2_applyRules — enriches category and canonicalises account', async () => {
  const input = normalizeInput('beli kopi 25000 gopay');
  const result = await L2_applyRules(input);

  assert(result !== null);
  assertEquals(result.type, 'expense');
  assertEquals(result.amount, 25000);
  assertEquals(result.category, 'Food & Drink');
  assertEquals(result.account, 'GoPay');       // canonicalised from 'gopay'
  assertEquals(result.source, 'rule');
  assert(result.confidence >= 0.75);
});

Deno.test('L2: L2_applyRules — income_salary keeps preset category', async () => {
  const input = normalizeInput('gaji 5000000 bca');
  const result = await L2_applyRules(input);

  assert(result !== null);
  assertEquals(result.type, 'income');
  assertEquals(result.category, 'Salary');     // not overwritten
  assertEquals(result.account, 'BCA');
});

Deno.test('L2: L2_applyRules — no grammar match returns null', async () => {
  const input = normalizeInput('abcxyz lorem ipsum');
  const result = await L2_applyRules(input);
  assertEquals(result, null);
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

Deno.test('L2: GRAMMAR_RULES — at least 10 rules defined', () => {
  assert(GRAMMAR_RULES.length >= 10, `got ${GRAMMAR_RULES.length}`);
});

Deno.test('L2: CATEGORY_KEYWORDS — has 50+ keywords total', () => {
  const total = Object.values(CATEGORY_KEYWORDS).reduce((s, a) => s + a.length, 0);
  assert(total >= 50, `got ${total}`);
});

Deno.test('L2: ACCOUNT_PATTERNS — 15+ patterns defined', () => {
  assert(ACCOUNT_PATTERNS.length >= 15, `got ${ACCOUNT_PATTERNS.length}`);
});
