/**
 * L2 Rule Engine — deterministic grammar-based parser for Indonesian financial text.
 *
 * Receives L0-normalised input (amounts expanded, typos corrected, lowercase) and
 * returns a structured ParseResult without any network calls or side effects.
 *
 * Rule priority: most specific patterns first; last resort patterns at the end.
 *
 * @module parsers/rules
 */

// ---------------------------------------------------------------------------
// Typedefs
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} GrammarRule
 * @property {string}   id         - Unique rule identifier
 * @property {RegExp}   pattern    - Regex tested against normalised input text
 * @property {(match: RegExpMatchArray) => Object} extract - Extractor function
 * @property {number}   confidence - Base confidence score for this rule (0–1)
 * @property {string[]} examples   - Example normalised inputs that trigger this rule
 * @property {string}   [notes]    - Optional implementation notes
 */

/**
 * @typedef {Object} ParseResult
 * @property {'rule'}   source       - Always 'rule' for L2 results
 * @property {string}   [type]       - 'expense' | 'income' | 'transfer'
 * @property {number}   [amount]     - Parsed amount (integer IDR)
 * @property {string}   [merchant]   - Merchant / counterparty name
 * @property {string}   [category]   - Category label
 * @property {string}   [account]    - Canonical account / wallet name
 * @property {string}   [notes]      - Free-text notes
 * @property {number}   confidence   - Confidence score (0–1)
 * @property {string[]} matchedRules - List of rule IDs that fired
 * @property {string[]} flags        - Processing flags (e.g. 'split_payment')
 */

// ---------------------------------------------------------------------------
// Grammar Rules
// ---------------------------------------------------------------------------

/**
 * Ordered list of grammar rules. More-specific patterns are placed first so the
 * first match wins and lower-confidence fallback rules don't fire prematurely.
 *
 * All patterns are tested against L0-normalised text (lowercase, amounts expanded).
 *
 * @type {GrammarRule[]}
 */
export const GRAMMAR_RULES = [
  // =========================================================================
  // EXPENSE PATTERNS
  // =========================================================================

  {
    id: 'expense_verb_merchant_amount_account',
    pattern: /^(beli|bayar|buat|ke|di)\s+(.+?)\s+(\d+)\s*(?:pakai|pake|via|dengan|lewat)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'expense',
      merchant: match[2].trim(),
      amount: parseInt(match[3], 10),
      account: match[4]?.trim() || undefined,
    }),
    confidence: 0.85,
    examples: [
      'beli kopi 25000 gopay',
      'bayar parkir 5000 cash',
      'ke indomaret 150000 bca',
      'di warung 35000 tunai',
    ],
    notes: 'Most common Indonesian expense pattern',
  },

  {
    id: 'expense_amount_first',
    pattern: /^(\d+)\s+(beli|bayar|buat|untuk|di|ke)\s+(.+?)(?:\s+(?:pakai|pake|via|dengan|lewat)\s+(\w+))?$/i,
    extract: (match) => ({
      type: 'expense',
      amount: parseInt(match[1], 10),
      merchant: match[3].trim(),
      account: match[4]?.trim() || undefined,
    }),
    confidence: 0.82,
    examples: [
      '85000 beli makan siang',
      '50000 untuk bensin',
      '150000 bayar internet pakai gopay',
    ],
  },

  {
    id: 'expense_split_payment',
    pattern: /^(.+?)\s+(\d+)\s+\((.+?)\)$/i,
    extract: (match) => ({
      type: 'expense',
      merchant: match[1].trim(),
      amount: parseInt(match[2], 10),
      notes: `Split: ${match[3]}`,
      _splitDetails: match[3],
    }),
    confidence: 0.80,
    examples: [
      'makan 85000 (50000 gopay + 35000 cash)',
      'belanja 200000 (100000 debit + 100000 gopay)',
    ],
    notes: 'Split payment; _splitDetails forwarded to L3 for breakdown',
  },

  // =========================================================================
  // INCOME PATTERNS
  // =========================================================================

  {
    id: 'income_salary',
    pattern: /^(gaji|salary|bonus|thr|insentif)\s+(\d+)\s*(?:dari|ke|masuk)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'income',
      category: 'Salary',
      amount: parseInt(match[2], 10),
      account: match[3]?.trim() || undefined,
      notes: match[1].toLowerCase(),
    }),
    confidence: 0.92,
    examples: ['gaji 5000000 bca', 'bonus 2000000 masuk mandiri', 'thr 3000000'],
  },

  {
    id: 'income_receive',
    pattern: /^(terima|masuk|transfer masuk|dapat)\s+(\d+)\s*(?:dari|ke)?\s*(.+?)?\s*(?:ke|via)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'income',
      amount: parseInt(match[2], 10),
      merchant: match[3]?.trim() || 'Transfer',
      account: match[4]?.trim() || undefined,
    }),
    confidence: 0.80,
    examples: [
      'terima 1000000 dari client',
      'masuk 500000 gopay',
      'transfer masuk 750000 bca',
    ],
  },

  {
    id: 'income_refund',
    pattern: /^(refund|pengembalian|kembali)\s+(\d+)\s*(?:dari)?\s*(.+?)?\s*(?:ke)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'income',
      category: 'Refund',
      amount: parseInt(match[2], 10),
      merchant: match[3]?.trim() || 'Refund',
      account: match[4]?.trim() || undefined,
    }),
    confidence: 0.88,
    examples: ['refund 50000 dari shopee', 'pengembalian 75000 gopay'],
  },

  // =========================================================================
  // TRANSFER PATTERNS
  // =========================================================================

  {
    id: 'transfer_from_to',
    pattern: /^(transfer|kirim|pindah)\s+(\d+)\s+(?:dari\s+)?(\w+)\s+(?:ke|→)\s+(\w+)$/i,
    extract: (match) => ({
      type: 'transfer',
      amount: parseInt(match[2], 10),
      account: match[3].trim(),
      _targetAccount: match[4].trim(),
      notes: `Transfer to ${match[4]}`,
    }),
    confidence: 0.90,
    examples: [
      'transfer 1000000 gopay ke bca',
      'kirim 500000 dari mandiri ke gopay',
    ],
  },

  {
    id: 'transfer_topup',
    pattern: /^(topup|top up|isi|isi ulang)\s+(\w+)\s+(\d+)\s*(?:dari|pakai)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'transfer',
      amount: parseInt(match[3], 10),
      account: match[4]?.trim() || 'Cash',
      _targetAccount: match[2].trim(),
      notes: `Top up ${match[2]}`,
    }),
    confidence: 0.85,
    examples: [
      'topup gopay 100000 dari bca',
      'isi ovo 200000',
      'isi ulang dana 150000 pakai mandiri',
    ],
  },

  // expense_merchant_amount is deliberately placed AFTER all income/transfer
  // rules because its broad pattern matches almost any "noun amount" phrase.
  // The negative lookahead (?!\d+[\.\)]\s) excludes numbered-list prefixes
  // (e.g. "1. kopi") so whatsapp_batch_line can handle them instead.
  {
    id: 'expense_merchant_amount',
    pattern: /^(?!\d+[\.\)]\s)(.+?)\s+(\d+)\s*(?:pakai|pake|via|dengan|lewat)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'expense',
      merchant: match[1].trim(),
      amount: parseInt(match[2], 10),
      account: match[3]?.trim() || undefined,
    }),
    confidence: 0.75,
    examples: ['kopi 25000 gopay', 'parkir 5000', 'bensin 150000 cash'],
    notes: 'Broad fallback; lower confidence due to ambiguity',
  },

  // =========================================================================
  // WHATSAPP / BATCH PATTERNS
  // =========================================================================

  {
    id: 'whatsapp_batch_line',
    pattern: /^(?:\d+[\.\)]\s+)?(.+?)\s+(\d+)\s*(?:pakai|pake|via)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'expense',
      // Strip leading "1. " / "1) " / "- " / "• " / "* " prefixes that may end
      // up in match[1] when the optional non-capturing group doesn't fire.
      merchant: match[1].trim().replace(/^(\d+[\.\)]\s+|[-•*]\s+)/, '').trim(),
      amount: parseInt(match[2], 10),
      account: match[3]?.trim() || undefined,
    }),
    confidence: 0.70,
    examples: ['1. kopi 25000', '• bensin 150000 gopay', '- parkir 5000'],
    notes: 'WhatsApp numbered/bulleted list item; use with batch parser',
  },

  // =========================================================================
  // FALLBACK
  // =========================================================================

  {
    id: 'amount_only',
    pattern: /^(\d+)$/,
    extract: (match) => ({
      type: 'expense',
      amount: parseInt(match[1], 10),
    }),
    confidence: 0.50,
    examples: ['85000', '150000'],
    notes: 'Very low confidence; needs L3/L4 to infer type and category',
  },
];

// ---------------------------------------------------------------------------
// Category Keywords
// ---------------------------------------------------------------------------

/**
 * Keyword lists for category classification.
 * Keys are canonical category labels; values are arrays of lowercase keywords.
 * Multi-word keywords (e.g. 'food court') are supported via `String#includes`.
 *
 * @type {Record<string, string[]>}
 */
// Category ordering matters: more-specific categories (Health, Education) are
// placed before broader verbs like 'beli' (Shopping) so medical context wins.
export const CATEGORY_KEYWORDS = {
  'Food & Drink': [
    'makan', 'minum', 'sarapan', 'siang', 'malam', 'snack', 'jajan',
    'nasi', 'ayam', 'soto', 'bakso', 'mie', 'sate', 'gado-gado',
    'rendang', 'sushi', 'pizza', 'burger', 'sandwich', 'roti',
    'kopi', 'teh', 'jus', 'smoothie', 'boba', 'milk tea',
    'warung', 'warteg', 'resto', 'restoran', 'cafe', 'kedai',
    'kantin', 'food court',
    'starbucks', 'mcd', 'mcdonalds', 'kfc', 'burger king', 'subway',
    'pizza hut', 'dominos', 'padang', 'hokben', 'yoshinoya',
    'janji jiwa', 'kulo', 'fore',
  ],

  'Transport': [
    'bensin', 'pertamax', 'solar', 'pertalite', 'spbu', 'shell',
    'grab', 'gojek', 'gocar', 'grabcar', 'grabbike', 'gofood',
    'maxim', 'uber',
    'taxi', 'taksi', 'bus', 'busway', 'transjakarta', 'mrt', 'lrt',
    'commuter line', 'krl', 'kereta', 'angkot', 'ojek',
    'parkir', 'tol', 'toll', 'e-toll',
    'service motor', 'cuci motor', 'cuci mobil', 'ganti oli',
    'tambal ban', 'bengkel',
  ],

  // Health before Shopping so 'obat' beats 'beli' when both appear in text.
  'Health': [
    'dokter', 'doctor', 'rumah sakit', 'hospital', 'klinik', 'puskesmas',
    'apotek', 'pharmacy', 'kimia farma', 'guardian', 'century',
    'obat', 'medicine', 'vitamin', 'supplement',
    'medical', 'checkup', 'check up', 'laboratorium',
    'vaksin', 'vaccine', 'imunisasi',
  ],

  // Education before Shopping so 'kursus' / 'buku' beat generic 'beli'.
  'Education': [
    'kursus', 'course', 'training', 'pelatihan',
    'buku', 'book', 'gramedia',
    'sekolah', 'kuliah', 'kampus', 'universitas',
    'spp', 'uang kuliah', 'tuition',
    'udemy', 'coursera', 'skillshare', 'ruangguru',
  ],

  'Bills & Utilities': [
    'listrik', 'pln', 'token listrik',
    'air', 'pdam',
    'internet', 'wifi', 'indihome', 'telkom', 'firstmedia', 'biznet',
    'pulsa', 'paket data', 'voucher',
    'tagihan', 'bayar tagihan', 'cicilan',
    'kartu kredit', 'credit card',
    'asuransi', 'bpjs', 'insurance',
  ],

  'Entertainment': [
    'netflix', 'spotify', 'youtube', 'viu', 'hbo', 'apple music', 'joox',
    'game', 'steam', 'playstation', 'xbox', 'nintendo',
    'mobile legends', 'pubg', 'free fire', 'genshin',
    'nonton', 'cinema', 'xxi', 'cgv', 'cinepolis',
    'bioskop', 'film', 'movie',
    'konser', 'concert', 'festival', 'event', 'tiket', 'ticket',
  ],

  'Shopping': [
    'beli', 'belanja', 'shopping', 'shop',
    'indomaret', 'alfamart', 'alfamidi', 'superindo', 'giant',
    'carrefour', 'hypermart', 'lottemart',
    'tokopedia', 'toped', 'shopee', 'lazada', 'bukalapak', 'blibli',
    'zalora', 'bhinneka',
    'pakaian', 'baju', 'celana', 'sepatu', 'sandal', 'tas',
    'elektronik', 'laptop', 'charger', 'kabel',
    'kosmetik', 'makeup', 'skincare', 'parfum',
  ],

  'Personal Care': [
    'salon', 'barbershop', 'pangkas', 'cukur',
    'spa', 'massage', 'pijat',
    'laundry', 'cuci baju', 'setrika',
  ],

  'Gift & Donation': [
    'hadiah', 'gift', 'kado',
    'donasi', 'donation', 'sedekah', 'zakat', 'infaq',
    'sumbangan', 'charity',
  ],

  'Salary': [
    'gaji', 'salary', 'penghasilan',
    'bonus', 'thr', 'insentif', 'komisi', 'fee',
  ],

  'Investment': [
    'saham', 'stock', 'reksadana', 'mutual fund',
    'crypto', 'bitcoin', 'ethereum',
    'deposito', 'obligasi', 'bonds',
    'emas', 'gold',
  ],
};

// ---------------------------------------------------------------------------
// Account Patterns
// ---------------------------------------------------------------------------

/**
 * Ordered list of account resolution patterns.
 * The first matching pattern wins; more-specific patterns come first.
 *
 * @type {Array<{ regex: RegExp, account: string }>}
 */
export const ACCOUNT_PATTERNS = [
  // E-wallets
  { regex: /\b(gopay|gope|go-pay|gp)\b/i,           account: 'GoPay' },
  { regex: /\b(ovo|ovoo)\b/i,                        account: 'OVO' },
  { regex: /\b(dana|danaaa)\b/i,                     account: 'DANA' },
  { regex: /\b(shopeepay|shopee pay|spay)\b/i,        account: 'ShopeePay' },
  { regex: /\b(linkaja|link aja)\b/i,                 account: 'LinkAja' },

  // Banks
  { regex: /\b(bca|bcaa|b c a)\b/i,                  account: 'BCA' },
  { regex: /\b(mandiri|mandri|mandrii)\b/i,           account: 'Mandiri' },
  { regex: /\b(bni|b n i)\b/i,                       account: 'BNI' },
  { regex: /\b(bri|b r i)\b/i,                       account: 'BRI' },
  { regex: /\b(cimb|cimb niaga)\b/i,                 account: 'CIMB Niaga' },
  { regex: /\b(permata|permata bank)\b/i,             account: 'Permata' },
  { regex: /\b(btn)\b/i,                              account: 'BTN' },
  { regex: /\b(danamon)\b/i,                          account: 'Danamon' },
  { regex: /\b(ocbc|ocbc nisp)\b/i,                  account: 'OCBC NISP' },
  { regex: /\b(jenius|btpn)\b/i,                     account: 'Jenius' },
  { regex: /\b(jago|bank jago)\b/i,                  account: 'Bank Jago' },
  { regex: /\b(seabank|sea bank)\b/i,                account: 'SeaBank' },
  { regex: /\b(blu|bca digital)\b/i,                 account: 'Blu' },

  // Cash & cards
  { regex: /\b(tunai|cash|kas|uang tunai)\b/i,       account: 'Cash' },
  { regex: /\b(debit|kartu debit|atm)\b/i,           account: 'Debit Card' },
  { regex: /\b(kredit|kartu kredit|credit card|cc)\b/i, account: 'Credit Card' },

  // QRIS
  { regex: /\b(qris)\b/i,                            account: 'QRIS' },
];

// ---------------------------------------------------------------------------
// Public Functions
// ---------------------------------------------------------------------------

/**
 * Apply grammar rules to a normalised input, returning the first match.
 *
 * Pure function — no mutations, no I/O.
 *
 * @param {{ text: string, tokens: string[] }} input - L0 normalised input
 * @returns {ParseResult|null} First matching result, or null if no rule fires
 *
 * @example
 * applyGrammarRules({ text: 'beli kopi 25000 gopay', tokens: [...] })
 * // => { type: 'expense', merchant: 'kopi', amount: 25000, account: 'gopay',
 * //      confidence: 0.85, source: 'rule', matchedRules: ['expense_verb_merchant_amount_account'], flags: [] }
 */
export function applyGrammarRules(input) {
  if (!input?.text) return null;

  for (const rule of GRAMMAR_RULES) {
    const match = input.text.match(rule.pattern);
    if (!match) continue;

    const extracted = rule.extract(match);
    return {
      ...extracted,
      confidence: rule.confidence,
      source: 'rule',
      matchedRules: [rule.id],
      flags: extracted._splitDetails ? ['split_payment'] : [],
    };
  }

  return null;
}

/**
 * Classify text into a category by keyword matching.
 *
 * Iterates `CATEGORY_KEYWORDS` in definition order; returns the first
 * category whose keyword list contains a substring of `text`.
 * Returns `'Other'` when no keyword matches.
 *
 * Pure function — no mutations, no I/O.
 *
 * @param {string} text - Merchant name or full normalised input text
 * @returns {string} Category label or `'Other'`
 *
 * @example
 * classifyCategory('makan siang di warung')  // => 'Food & Drink'
 * classifyCategory('bensin motor')           // => 'Transport'
 */
/**
 * Return true if `text` contains `kw` as a whole "word" (not embedded inside
 * a longer alphanumeric token). Handles multi-word keywords naturally.
 *
 * @param {string} text - Already lowercased text
 * @param {string} kw - Lowercase keyword to find
 * @returns {boolean}
 */
function containsWholeWord(text, kw) {
  const idx = text.indexOf(kw);
  if (idx === -1) return false;
  const before = idx === 0 || !/[a-z0-9]/.test(text[idx - 1]);
  const after = idx + kw.length >= text.length || !/[a-z0-9]/.test(text[idx + kw.length]);
  return before && after;
}

export function classifyCategory(text) {
  if (!text) return 'Other';
  const lower = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (containsWholeWord(lower, kw)) return category;
    }
  }

  return 'Other';
}

/**
 * Resolve a canonical account / wallet name from text using `ACCOUNT_PATTERNS`.
 *
 * Returns the first matching canonical account name, or `undefined` if none
 * of the patterns match.
 *
 * Pure function — no mutations, no I/O.
 *
 * @param {string} text - Normalised text to search for account keywords
 * @returns {string|undefined} Canonical account name (e.g. `'GoPay'`) or `undefined`
 *
 * @example
 * resolveAccount('bayar 50000 pakai gopay')  // => 'GoPay'
 * resolveAccount('transfer ke bca')          // => 'BCA'
 * resolveAccount('beli sesuatu')             // => undefined
 */
export function resolveAccount(text) {
  if (!text) return undefined;
  for (const { regex, account } of ACCOUNT_PATTERNS) {
    if (regex.test(text)) return account;
  }
  return undefined;
}

/**
 * Run the full L2 pipeline on a normalised input.
 *
 * Steps:
 * 1. Try all grammar rules (first match wins).
 * 2. Enrich missing `category` via `classifyCategory`.
 * 3. Enrich missing `account` via `resolveAccount` on the full input text.
 * 4. Return the enriched `ParseResult`, or `null` if no grammar rule fired.
 *
 * The calling layer (`parseQuickText`) decides whether the returned confidence
 * is high enough to stop the pipeline (threshold: ≥ 0.75).
 *
 * @param {{ text: string, tokens: string[] }} input - L0 normalised input
 * @returns {ParseResult|null}
 *
 * @example
 * const normalized = normalizeInput('beli kopi 25rb gopay');
 * const result = L2_applyRules(normalized);
 * // => { type:'expense', merchant:'kopi', amount:25000,
 * //      category:'Food & Drink', account:'GoPay', confidence:0.85,
 * //      source:'rule', matchedRules:['expense_verb_merchant_amount_account'], flags:[] }
 */
export function L2_applyRules(input) {
  const grammarResult = applyGrammarRules(input);
  if (!grammarResult) return null;

  if (!grammarResult.category) {
    grammarResult.category = classifyCategory(grammarResult.merchant || input.text);
  }

  if (!grammarResult.account) {
    grammarResult.account = resolveAccount(input.text);
  } else {
    // Canonicalise raw-extracted account text (e.g. 'gopay' → 'GoPay')
    const canonical = resolveAccount(grammarResult.account);
    if (canonical) grammarResult.account = canonical;
  }

  return grammarResult;
}
