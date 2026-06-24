/**
 * Grammar Rules for Indonesian Natural Language Parsing
 * 
 * Usage: Import in js/parsers/rules.js
 * Attach to Cursor: @GRAMMAR_RULES.ts when implementing L2
 */

export interface GrammarRule {
  id: string;
  pattern: RegExp;
  extract: (match: RegExpMatchArray) => Partial<ParseResult>;
  confidence: number;
  examples: string[];
  notes?: string;
}

/**
 * Complete Grammar Rules Catalog
 * 
 * Pattern Priority:
 * 1. Most specific patterns first (higher confidence)
 * 2. General patterns last (lower confidence)
 */
export const GRAMMAR_RULES: GrammarRule[] = [
  // ============================================================
  // EXPENSE PATTERNS
  // ============================================================
  
  {
    id: 'expense_verb_merchant_amount_account',
    pattern: /^(beli|bayar|buat|ke|di)\s+(.+?)\s+(\d+)\s*(?:pakai|pake|via|dengan|lewat)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'expense',
      merchant: match[2].trim(),
      amount: parseInt(match[3]),
      account: match[4]?.trim()
    }),
    confidence: 0.85,
    examples: [
      'beli kopi 25000 gopay',
      'bayar parkir 5000 cash',
      'ke indomaret 150000 bca',
      'di warung 35000 tunai'
    ],
    notes: 'Most common Indonesian expense pattern'
  },
  
  {
    id: 'expense_amount_first',
    pattern: /^(\d+)\s+(beli|bayar|buat|untuk|di|ke)\s+(.+?)(?:\s+(?:pakai|pake|via|dengan|lewat)\s+(\w+))?$/i,
    extract: (match) => ({
      type: 'expense',
      amount: parseInt(match[1]),
      merchant: match[3].trim(),
      account: match[4]?.trim()
    }),
    confidence: 0.82,
    examples: [
      '85000 beli makan siang',
      '50000 untuk bensin',
      '150000 bayar internet pakai gopay'
    ]
  },
  
  {
    id: 'expense_merchant_amount',
    pattern: /^(.+?)\s+(\d+)\s*(?:pakai|pake|via|dengan|lewat)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'expense',
      merchant: match[1].trim(),
      amount: parseInt(match[2]),
      account: match[3]?.trim()
    }),
    confidence: 0.75,
    examples: [
      'kopi 25000 gopay',
      'parkir 5000',
      'bensin 150000 tunai'
    ],
    notes: 'Simple pattern, lower confidence due to ambiguity'
  },
  
  {
    id: 'expense_split_payment',
    pattern: /^(.+?)\s+(\d+)\s+\((.+?)\)$/i,
    extract: (match) => ({
      type: 'expense',
      merchant: match[1].trim(),
      amount: parseInt(match[2]),
      notes: `Split: ${match[3]}`,
      _splitDetails: match[3] // Internal flag untuk L3 processing
    }),
    confidence: 0.80,
    examples: [
      'makan 85000 (50k gopay + 35k cash)',
      'belanja 200000 (100k debit + 100k gopay)'
    ],
    notes: 'Detected split payment, needs L3 validation'
  },
  
  // ============================================================
  // INCOME PATTERNS
  // ============================================================
  
  {
    id: 'income_salary',
    pattern: /^(gaji|salary|bonus|thr|insentif)\s+(\d+)\s*(?:dari|ke|masuk)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'income',
      category: 'Salary',
      amount: parseInt(match[2]),
      account: match[3]?.trim(),
      notes: match[1]
    }),
    confidence: 0.92,
    examples: [
      'gaji 5000000 bca',
      'bonus 2000000 masuk mandiri',
      'thr 3000000'
    ]
  },
  
  {
    id: 'income_receive',
    pattern: /^(terima|masuk|transfer masuk|dapat)\s+(\d+)\s*(?:dari|ke)?\s*(.+?)?\s*(?:ke|via)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'income',
      amount: parseInt(match[2]),
      merchant: match[3]?.trim() || 'Transfer',
      account: match[4]?.trim()
    }),
    confidence: 0.80,
    examples: [
      'terima 1000000 dari client',
      'masuk 500000 gopay',
      'transfer masuk 750000 bca'
    ]
  },
  
  {
    id: 'income_refund',
    pattern: /^(refund|pengembalian|kembali)\s+(\d+)\s*(?:dari)?\s*(.+?)?\s*(?:ke)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'income',
      category: 'Refund',
      amount: parseInt(match[2]),
      merchant: match[3]?.trim() || 'Refund',
      account: match[4]?.trim()
    }),
    confidence: 0.88,
    examples: [
      'refund 50000 dari shopee',
      'pengembalian 75000 gopay'
    ]
  },
  
  // ============================================================
  // TRANSFER PATTERNS
  // ============================================================
  
  {
    id: 'transfer_from_to',
    pattern: /^(transfer|kirim|pindah)\s+(\d+)\s+(?:dari\s+)?(\w+)\s+(?:ke|→)\s+(\w+)$/i,
    extract: (match) => ({
      type: 'transfer',
      amount: parseInt(match[2]),
      account: match[3].trim(), // Source account
      _targetAccount: match[4].trim(), // Destination (handle di UI)
      notes: `Transfer to ${match[4]}`
    }),
    confidence: 0.90,
    examples: [
      'transfer 1000000 gopay ke bca',
      'kirim 500000 dari mandiri ke gopay',
      'pindah 2000000 bca → gopay'
    ]
  },
  
  {
    id: 'transfer_topup',
    pattern: /^(topup|isi|isi ulang)\s+(\w+)\s+(\d+)\s*(?:dari|pakai)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'transfer',
      amount: parseInt(match[3]),
      account: match[4]?.trim() || 'Cash', // Source
      _targetAccount: match[2].trim(), // Destination
      notes: `Top up ${match[2]}`
    }),
    confidence: 0.85,
    examples: [
      'topup gopay 100000 dari bca',
      'isi ovo 200000',
      'isi ulang dana 150000 pakai mandiri'
    ]
  },
  
  // ============================================================
  // WHATSAPP BATCH PATTERNS (multi-line)
  // ============================================================
  
  {
    id: 'whatsapp_batch_line',
    pattern: /^(?:\d+[\.\)]?\s+)?(.+?)\s+(\d+)\s*(?:pakai|pake|via)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'expense', // Default, bisa override di L3
      merchant: match[1].trim().replace(/^[-•*]\s*/, ''), // Remove bullet
      amount: parseInt(match[2]),
      account: match[3]?.trim()
    }),
    confidence: 0.70,
    examples: [
      '1. Kopi 25000',
      '• Bensin 150000 gopay',
      '- Parkir 5000'
    ],
    notes: 'Designed for WhatsApp list format, use with batch parser'
  },
  
  // ============================================================
  // FALLBACK PATTERNS (last resort)
  // ============================================================
  
  {
    id: 'amount_only',
    pattern: /^(\d+)$/,
    extract: (match) => ({
      type: 'expense', // Assumption
      amount: parseInt(match[1])
    }),
    confidence: 0.50,
    examples: [
      '85000',
      '150000'
    ],
    notes: 'Very low confidence, needs L3/L4 enhancement'
  }
];

/**
 * Category Keywords for Classification
 * 
 * Usage: classifyCategory() in js/parsers/rules.js
 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Drink': [
    // General
    'makan', 'minum', 'sarapan', 'siang', 'malam', 'snack', 'jajan',
    
    // Food types
    'nasi', 'ayam', 'soto', 'bakso', 'mie', 'sate', 'gado-gado', 
    'rendang', 'sushi', 'pizza', 'burger', 'sandwich', 'roti',
    
    // Drinks
    'kopi', 'teh', 'jus', 'smoothie', 'boba', 'milk tea',
    
    // Places
    'warung', 'warteg', 'resto', 'restoran', 'cafe', 'kedai', 
    'kantin', 'food court',
    
    // Brands
    'starbucks', 'mcd', 'mcdonalds', 'kfc', 'burger king', 'subway',
    'pizza hut', 'dominos', 'padang', 'hokben', 'yoshinoya',
    'janji jiwa', 'kulo', 'fore'
  ],
  
  'Transport': [
    // Fuel
    'bensin', 'pertamax', 'solar', 'pertalite', 'spbu', 'shell',
    
    // Ride-hailing
    'grab', 'gojek', 'gocar', 'grabcar', 'grabbike', 'gofood',
    'maxim', 'uber',
    
    // Public transport
    'taxi', 'taksi', 'bus', 'busway', 'transjakarta', 'mrt', 'lrt',
    'commuter line', 'krl', 'kereta', 'angkot', 'ojek',
    
    // Parking & toll
    'parkir', 'tol', 'toll', 'e-toll',
    
    // Maintenance
    'service motor', 'cuci motor', 'cuci mobil', 'ganti oli',
    'tambal ban', 'bengkel'
  ],
  
  'Shopping': [
    // General
    'beli', 'belanja', 'shopping', 'shop',
    
    // Stores
    'indomaret', 'alfamart', 'alfamidi', 'superindo', 'giant',
    'carrefour', 'hypermart', 'lottemart',
    
    // E-commerce
    'tokopedia', 'toped', 'shopee', 'lazada', 'bukalapak', 'blibli',
    'zalora', 'jd.id', 'bhinneka',
    
    // Categories
    'pakaian', 'baju', 'celana', 'sepatu', 'sandal', 'tas',
    'elektronik', 'hp', 'laptop', 'charger', 'kabel',
    'kosmetik', 'makeup', 'skincare', 'parfum'
  ],
  
  'Bills & Utilities': [
    'listrik', 'pln', 'token listrik',
    'air', 'pdam',
    'internet', 'wifi', 'indihome', 'telkom', 'firstmedia', 'biznet',
    'pulsa', 'paket data', 'voucher',
    'tagihan', 'bayar tagihan', 'cicilan',
    'kartu kredit', 'cc', 'credit card',
    'asuransi', 'bpjs', 'insurance'
  ],
  
  'Health': [
    'dokter', 'doctor', 'dr',
    'rumah sakit', 'rs', 'hospital', 'klinik', 'puskesmas',
    'apotek', 'pharmacy', 'kimia farma', 'guardian', 'century',
    'obat', 'medicine', 'vitamin', 'supplement',
    'medical', 'checkup', 'check up', 'lab', 'laboratorium',
    'vaksin', 'vaccine', 'imunisasi'
  ],
  
  'Entertainment': [
    // Streaming
    'netflix', 'spotify', 'youtube', 'disney+', 'viu', 'hbo',
    'apple music', 'joox',
    
    // Gaming
    'game', 'steam', 'playstation', 'xbox', 'nintendo',
    'mobile legends', 'pubg', 'free fire', 'genshin',
    
    // Cinema
    'nonton', 'cinema', 'xxi', 'cgv', 'cinepolis',
    'bioskop', 'film', 'movie',
    
    // Events
    'konser', 'concert', 'festival', 'event', 'tiket',
    'ticket', 'loket', 'tix id'
  ],
  
  'Education': [
    'kursus', 'course', 'training', 'pelatihan',
    'buku', 'book', 'gramedia',
    'sekolah', 'kuliah', 'kampus', 'universitas',
    'spp', 'uang kuliah', 'tuition',
    'udemy', 'coursera', 'skillshare', 'ruangguru'
  ],
  
  'Personal Care': [
    'salon', 'barbershop', 'pangkas', 'cukur',
    'spa', 'massage', 'pijat',
    'laundry', 'cuci baju', 'setrika'
  ],
  
  'Gift & Donation': [
    'hadiah', 'gift', 'kado',
    'donasi', 'donation', 'sedekah', 'zakat', 'infaq',
    'sumbangan', 'charity'
  ],
  
  'Salary': [
    'gaji', 'salary', 'penghasilan', 'income',
    'bonus', 'thr', 'insentif', 'komisi', 'fee'
  ],
  
  'Investment': [
    'saham', 'stock', 'reksadana', 'mutual fund',
    'crypto', 'bitcoin', 'ethereum',
    'deposito', 'obligasi', 'bonds',
    'emas', 'gold'
  ]
};

/**
 * Account Resolution Patterns
 * 
 * Usage: resolveAccount() in js/parsers/rules.js
 */
export const ACCOUNT_PATTERNS: Array<{
  regex: RegExp;
  account: string;
  aliases?: string[];
}> = [
  // E-wallets
  { 
    regex: /\b(gopay|gope|go-pay|gp)\b/i, 
    account: 'GoPay',
    aliases: ['gopay', 'gope', 'go-pay', 'gp']
  },
  { 
    regex: /\b(ovo|ovoo)\b/i, 
    account: 'OVO' 
  },
  { 
    regex: /\b(dana|danaaa)\b/i, 
    account: 'DANA' 
  },
  { 
    regex: /\b(shopeepay|shopee pay|spay)\b/i, 
    account: 'ShopeePay' 
  },
  { 
    regex: /\b(linkaja|link aja)\b/i, 
    account: 'LinkAja' 
  },
  
  // Banks
  { 
    regex: /\b(bca|bcaa|b c a)\b/i, 
    account: 'BCA',
    aliases: ['bca', 'bcaa']
  },
  { 
    regex: /\b(mandiri|mandri|mandrii)\b/i, 
    account: 'Mandiri' 
  },
  { 
    regex: /\b(bni|b n i)\b/i, 
    account: 'BNI' 
  },
  { 
    regex: /\b(bri|b r i)\b/i, 
    account: 'BRI' 
  },
  { 
    regex: /\b(cimb|cimb niaga)\b/i, 
    account: 'CIMB Niaga' 
  },
  { 
    regex: /\b(permata|permata bank)\b/i, 
    account: 'Permata' 
  },
  { 
    regex: /\b(btn)\b/i, 
    account: 'BTN' 
  },
  { 
    regex: /\b(danamon)\b/i, 
    account: 'Danamon' 
  },
  { 
    regex: /\b(ocbc|ocbc nisp)\b/i, 
    account: 'OCBC NISP' 
  },
  { 
    regex: /\b(jenius|btpn)\b/i, 
    account: 'Jenius' 
  },
  { 
    regex: /\b(jago|bank jago)\b/i, 
    account: 'Bank Jago' 
  },
  { 
    regex: /\b(seabank|sea bank)\b/i, 
    account: 'SeaBank' 
  },
  { 
    regex: /\b(blu|bca digital)\b/i, 
    account: 'Blu (BCA Digital)' 
  },
  
  // Cash
  { 
    regex: /\b(tunai|cash|kas|uang tunai)\b/i, 
    account: 'Cash' 
  },
  
  // Cards
  { 
    regex: /\b(debit|kartu debit|atm)\b/i, 
    account: 'Debit Card' 
  },
  { 
    regex: /\b(kredit|kartu kredit|credit card|cc)\b/i, 
    account: 'Credit Card' 
  }
];

/**
 * Date Keywords (relative dates)
 */
export const DATE_KEYWORDS: Record<string, number> = {
  // Today
  'hari ini': 0,
  'today': 0,
  'skrg': 0,
  'sekarang': 0,
  
  // Yesterday
  'kemarin': -1,
  'yesterday': -1,
  'kmrn': -1,
  
  // Tomorrow
  'besok': 1,
  'tomorrow': 1,
  'lusa': 1,
  
  // Day before yesterday
  'kemarin dulu': -2,
  'kemarin lusa': -2,
  
  // Weeks
  'minggu lalu': -7,
  'last week': -7,
  'minggu depan': 7,
  'next week': 7
};

/**
 * Typo Corrections (common Indonesian misspellings)
 */
export const TYPO_MAP: Record<string, string> = {
  // E-wallets
  'gopay': 'gopay',
  'gope': 'gopay',
  'gopee': 'gopay',
  'gpay': 'gopay',
  'go-pay': 'gopay',
  
  'ovoo': 'ovo',
  'ovvo': 'ovo',
  
  'danaaa': 'dana',
  'danaa': 'dana',
  
  // Banks
  'bcaa': 'bca',
  'b c a': 'bca',
  
  'mandri': 'mandiri',
  'mandrii': 'mandiri',
  'mandir': 'mandiri',
  
  // General
  'pake': 'pakai',
  'brp': 'berapa',
  'brpa': 'berapa',
  'kmrn': 'kemarin',
  'td': 'tadi',
  'tdnya': 'tadinya',
  
  // Amounts
  'rb': 'ribu',
  'jt': 'juta',
  'jta': 'juta',
  'jtaan': 'juta',
  
  // Merchants (brands)
  'mcd': 'mcdonalds',
  'mcdo': 'mcdonalds',
  'starbs': 'starbucks',
  'starbak': 'starbucks',
  'toped': 'tokopedia',
  'tokped': 'tokopedia'
};
