/**
 * Bundled bank email templates (fallback when DB templates unavailable).
 */

export interface ParsedTx {
  type: "expense" | "income" | "transfer";
  amount: number;
  merchant?: string;
  date?: string;
  account?: string;
  category?: string;
  bankId?: string;
  templateId?: string;
  confidence: number;
  method: string;
}

export interface BankTemplate {
  id: string;
  bank: string;
  account_type: string;
  from_patterns: RegExp[];
  subject_patterns: RegExp[];
  parsers: Array<{
    pattern: RegExp;
    type: "expense" | "income" | "transfer";
    merchant?: string;
    category?: string;
    merchant_patterns?: RegExp[];
    category_from_body?: boolean;
  }>;
}

export function parseIDRAmount(str: string): number {
  if (!str) return 0;
  const raw = String(str).trim();
  // Indonesian: 500.000,00 or 500.000
  if (/,\d{2}$/.test(raw.replace(/\s/g, ""))) {
    const cleaned = raw.replace(/[RpIDR\s]/gi, "").replace(/\./g, "").replace(",", ".");
    return Math.round(parseFloat(cleaned)) || 0;
  }
  const digits = raw.replace(/[^\d]/g, "");
  return parseInt(digits, 10) || 0;
}

export function extractMerchant(body: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match?.[1]) return match[1].trim().slice(0, 100);
  }
  return "";
}

export function extractDate(body: string): string {
  const iso = body.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = body.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split("T")[0];
}

export function detectCategory(merchant: string, body: string): string {
  const text = `${merchant} ${body}`.toLowerCase();
  const rules: Record<string, RegExp> = {
    "Food & Drink": /makan|food|resto|cafe|kopi|starbucks|mcd|kfc|grabfood|gofood/,
    Transport: /grab|gojek|taxi|bensin|spbu|parkir|tol|transport/,
    Shopping: /shopee|tokopedia|lazada|blibli|belanja|beli|indomaret|alfamart/,
    "Bills & Utilities": /listrik|pln|air|pdam|internet|wifi|pulsa|telkom/,
    Health: /apotek|dokter|rumah sakit|obat|klinik/,
    Entertainment: /netflix|spotify|nonton|cinema|game/,
    Transfer: /transfer|kirim|top.?up|isi saldo/,
  };
  for (const [category, regex] of Object.entries(rules)) {
    if (regex.test(text)) return category;
  }
  return "Other";
}

export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export const BUNDLED_TEMPLATES: BankTemplate[] = [
  {
    id: "bca_debit",
    bank: "BCA",
    account_type: "BCA",
    from_patterns: [/noreply@klikbca\.com/i, /.*@bca\.co\.id/i, /bca/i],
    subject_patterns: [/notifikasi/i, /transaksi/i, /alert/i],
    parsers: [
      {
        pattern: /(?:transaksi|trx)\s*(?:DEBIT|DB)\s*(?:sebesar\s*)?Rp\.?\s*([\d.,]+)/i,
        type: "expense",
        merchant_patterns: [
          /(?:ke|di|pada|merchant)\s*[:\-]?\s*(.+?)(?:\.|$|\n)/i,
          /(?:transfer\s*ke)\s*(.+?)(?:\.|$|\n)/i,
        ],
      },
      {
        pattern: /(?:transaksi|trx)\s*(?:KREDIT|CR)\s*(?:sebesar\s*)?Rp\.?\s*([\d.,]+)/i,
        type: "income",
        merchant_patterns: [/(?:dari|from)\s*[:\-]?\s*(.+?)(?:\.|$|\n)/i],
      },
    ],
  },
  {
    id: "mandiri_notif",
    bank: "Mandiri",
    account_type: "Mandiri",
    from_patterns: [/mandiri/i, /@bankmandiri\.co\.id/i],
    subject_patterns: [/notifikasi/i, /transaksi/i],
    parsers: [
      {
        pattern: /(?:DB|Debit)\s*(?:sebesar\s*)?(?:IDR|Rp\.?)\s*([\d.,]+)/i,
        type: "expense",
        merchant_patterns: [/(?:di|pada|merchant)\s*(.+?)(?:\.|$|\n)/i],
      },
      {
        pattern: /(?:CR|Credit|Kredit)\s*(?:sebesar\s*)?(?:IDR|Rp\.?)\s*([\d.,]+)/i,
        type: "income",
        merchant_patterns: [/(?:dari|from)\s*(.+?)(?:\.|$|\n)/i],
      },
    ],
  },
  {
    id: "bni_notif",
    bank: "BNI",
    account_type: "BNI",
    from_patterns: [/bni/i, /@bni\.co\.id/i],
    subject_patterns: [/notifikasi/i, /transaksi/i, /alert/i],
    parsers: [
      {
        pattern: /(?:DB|Debit|Tarikan)\s*(?:Rp\.?|IDR)\s*([\d.,]+)/i,
        type: "expense",
        merchant_patterns: [/(?:di|pada|ke)\s*(.+?)(?:\.|$|\n)/i],
      },
    ],
  },
  {
    id: "bri_notif",
    bank: "BRI",
    account_type: "BRI",
    from_patterns: [/bri/i, /@bri\.co\.id/i],
    subject_patterns: [/notifikasi/i, /transaksi/i],
    parsers: [
      {
        pattern: /(?:DEBET|DB)\s*(?:Rp\.?|IDR)\s*([\d.,]+)/i,
        type: "expense",
        merchant_patterns: [/(?:di|pada|ke)\s*(.+?)(?:\.|$|\n)/i],
      },
    ],
  },
  {
    id: "gopay_notif",
    bank: "GoPay",
    account_type: "GoPay",
    from_patterns: [/gopay/i, /gojek/i, /@go-jek\.com/i],
    subject_patterns: [/payment/i, /transaksi/i, /receipt/i, /pembayaran/i],
    parsers: [
      {
        pattern: /(?:Rp\.?|IDR)\s*([\d.,]+)\s*(?:telah|berhasil|pembayaran)/i,
        type: "expense",
        merchant_patterns: [
          /(?:merchant|toko|di)\s*[:\-]?\s*(.+?)(?:\.|$|\n)/i,
          /(?:pembayaran\s*(?:ke|di|untuk))\s*(.+?)(?:\.|$|\n)/i,
        ],
      },
      {
        pattern: /(?:top\s*up|isi\s*saldo)\s*(?:Rp\.?|IDR)\s*([\d.,]+)/i,
        type: "income",
        merchant: "Top Up GoPay",
        category: "Transfer",
      },
    ],
  },
  {
    id: "ovo_notif",
    bank: "OVO",
    account_type: "OVO",
    from_patterns: [/ovo/i, /@ovo\.id/i],
    subject_patterns: [/transaksi/i, /payment/i, /receipt/i],
    parsers: [
      {
        pattern: /(?:Rp\.?|IDR)\s*([\d.,]+)/i,
        type: "expense",
        merchant_patterns: [/(?:di|merchant|ke)\s*(.+?)(?:\.|$|\n)/i],
      },
    ],
  },
  {
    id: "dana_notif",
    bank: "DANA",
    account_type: "DANA",
    from_patterns: [/dana/i, /@dana\.id/i],
    subject_patterns: [/transaksi/i, /payment/i, /berhasil/i],
    parsers: [
      {
        pattern: /(?:Rp\.?|IDR)\s*([\d.,]+)/i,
        type: "expense",
        merchant_patterns: [/(?:di|merchant|ke|untuk)\s*(.+?)(?:\.|$|\n)/i],
      },
    ],
  },
  {
    id: "shopee_receipt",
    bank: "Shopee",
    account_type: "ShopeePay",
    from_patterns: [/shopee/i, /@shopee\.co\.id/i],
    subject_patterns: [/order/i, /pesanan/i, /pembayaran/i],
    parsers: [
      {
        pattern: /(?:total|pembayaran)\s*(?:Rp\.?|IDR)\s*([\d.,]+)/i,
        type: "expense",
        merchant: "Shopee",
        category: "Shopping",
      },
    ],
  },
  {
    id: "tokopedia_receipt",
    bank: "Tokopedia",
    account_type: "Tokopedia",
    from_patterns: [/tokopedia/i, /@tokopedia\.com/i],
    subject_patterns: [/pesanan/i, /order/i, /pembayaran/i, /invoice/i],
    parsers: [
      {
        pattern: /(?:total|pembayaran|tagihan)\s*(?:Rp\.?|IDR)\s*([\d.,]+)/i,
        type: "expense",
        merchant: "Tokopedia",
        category: "Shopping",
      },
    ],
  },
  {
    id: "grab_receipt",
    bank: "Grab",
    account_type: "GrabPay",
    from_patterns: [/grab/i, /@grab\.com/i],
    subject_patterns: [/receipt/i, /trip/i, /order/i, /invoice/i],
    parsers: [
      {
        pattern: /(?:total|fare|amount)\s*(?:Rp\.?|IDR)\s*([\d.,]+)/i,
        type: "expense",
        merchant: "Grab",
        category_from_body: true,
      },
    ],
  },
  {
    id: "generic_bank",
    bank: "Unknown",
    account_type: "Unknown",
    from_patterns: [/.*/],
    subject_patterns: [/transaksi|transaction|payment|pembayaran|debit|credit|transfer/i],
    parsers: [
      {
        pattern: /(?:Rp\.?|IDR)\s*([\d.,]+)/i,
        type: "expense",
        merchant_patterns: [/(?:di|ke|dari|merchant)\s*(.+?)(?:\.|$|\n)/i],
      },
    ],
  },
];

/**
 * Convert DB jsonb template row into BankTemplate.
 */
export function compileDbTemplate(row: {
  id: string;
  bank: string;
  config: Record<string, unknown>;
}): BankTemplate | null {
  try {
    const cfg = row.config || {};
    const fromPatterns = Array.isArray(cfg.from_patterns)
      ? (cfg.from_patterns as string[]).map((p) => new RegExp(p, "i"))
      : [];
    const subjectPatterns = Array.isArray(cfg.subject_patterns)
      ? (cfg.subject_patterns as string[]).map((p) => new RegExp(p, "i"))
      : [];
    const parsersRaw = Array.isArray(cfg.parsers) ? cfg.parsers as Array<Record<string, unknown>> : [];
    const parsers = parsersRaw.map((p) => ({
      pattern: new RegExp(String(p.pattern || ""), "i"),
      type: (p.type as "expense" | "income" | "transfer") || "expense",
      merchant: p.merchant ? String(p.merchant) : undefined,
      category: p.category ? String(p.category) : undefined,
      merchant_patterns: Array.isArray(p.merchant_patterns)
        ? (p.merchant_patterns as string[]).map((m) => new RegExp(m, "i"))
        : undefined,
      category_from_body: !!p.category_from_body,
    }));
    return {
      id: row.id,
      bank: row.bank,
      account_type: String(cfg.account_type || row.bank),
      from_patterns: fromPatterns.length ? fromPatterns : [/.*/],
      subject_patterns: subjectPatterns.length ? subjectPatterns : [/.*/],
      parsers,
    };
  } catch {
    return null;
  }
}

/**
 * Parse one or more transactions from email (batch up to maxResults).
 */
export function parseEmail(
  from: string,
  subject: string,
  body: string,
  templates: BankTemplate[],
  maxResults = 5,
): ParsedTx[] {
  const results: ParsedTx[] = [];
  const usedRanges: Array<[number, number]> = [];

  const ordered = [
    ...templates.filter((t) => t.id !== "generic_bank"),
    ...templates.filter((t) => t.id === "generic_bank"),
  ];

  for (const template of ordered) {
    if (results.length >= maxResults) break;

    const fromMatch = template.from_patterns.some((p) => p.test(from));
    const subjectMatch = template.subject_patterns.some((p) => p.test(subject));
    if (template.id !== "generic_bank" && (!fromMatch || !subjectMatch)) continue;
    if (template.id === "generic_bank" && !subjectMatch) continue;

    for (const parser of template.parsers) {
      if (results.length >= maxResults) break;
      const re = new RegExp(parser.pattern.source, parser.pattern.flags.includes("g") ? parser.pattern.flags : `${parser.pattern.flags}g`);
      let match: RegExpExecArray | null;
      while ((match = re.exec(body)) !== null && results.length < maxResults) {
        const start = match.index;
        const end = start + match[0].length;
        if (usedRanges.some(([a, b]) => start < b && end > a)) continue;

        const amount = parseIDRAmount(match[1] || "");
        if (!(amount > 0)) continue;

        let type = parser.type;
        if (template.id === "generic_bank") {
          type = /(?:kredit|credit|masuk|terima|income)/i.test(body) ? "income" : "expense";
        }

        let merchant = parser.merchant || "";
        if (!merchant && parser.merchant_patterns?.length) {
          merchant = extractMerchant(body, parser.merchant_patterns);
        }

        let category = parser.category;
        if (parser.category_from_body) {
          category = /grab\s*food/i.test(body) ? "Food & Drink" : "Transport";
        }
        if (!category) category = detectCategory(merchant, body);

        usedRanges.push([start, end]);
        results.push({
          type,
          amount,
          merchant: merchant || undefined,
          date: extractDate(body),
          account: template.account_type,
          category,
          bankId: template.bank.toLowerCase(),
          templateId: template.id,
          confidence: template.id === "generic_bank" ? 0.6 : 0.85,
          method: "template",
        });
      }
    }

    if (results.length && template.id !== "generic_bank") break;
  }

  return results;
}
