import { parseNumberFromText } from './adapters';

export interface ParsedCommand {
  intent: string;
  params: Record<string, unknown>;
  confidence: number;
  raw: string;
}

function getParsingRules() {
  return [
    {
      intent: 'record_cost',
      patterns: [
        /(?:beli|bayar|byr|bl|catat\s+beli|catat)\s+(.+?)\s+(\d+[\d.,]*)\s*(?:sak|kg|m3|m³|kubik|btg|batang|buah|unit|ls|lot|pcs|lembar|lbr|roll|meter|mtr)\s*(?:@|harga|hrg|x|×)?\s*(?:rp\.?\s*)?(\d[\d.,]*)\s*(?:ribu|rb|k)?/i,
        /(?:beli|bayar|byr|bl|catat\s+beli|catat)\s+(.+?)\s+(?:rp\.?\s*)?(\d[\d.,]*)\s*(?:ribu|rb|k|juta|jt)?/i,
        /(?:beli|bayar|byr|catat)\s+(.+?)\s+(\d[\d.,]*)\s*(?:sak|kg|m3|kubik|btg|buah|unit|ls|pcs)\s+(?:rp\.?\s*)?(\d[\d.,]*)/i,
      ],
      confidence: 0.85,
      extract: (match: RegExpMatchArray, input: string) => {
        const item = match[1]?.trim();
        let qty: number | null = null;
        let unitPrice: number | null = null;
        let total = 0;

        if (match[3]) {
          qty = parseNumberFromText(match[2]);
          unitPrice = parseNumberFromText(match[3]);
          if (/ribu|rb|k/i.test(input)) unitPrice *= 1000;
          total = qty * unitPrice;
        } else {
          total = parseNumberFromText(match[2]);
          if (/juta|jt/i.test(input)) total *= 1_000_000;
          else if (/ribu|rb|k/i.test(input)) total *= 1000;
        }

        const projectMatch = input.match(/(?:project|proyek|prj)\s+(.+?)(?:\s*$)/i);
        const projectName = projectMatch ? projectMatch[1].trim() : null;

        return { item, qty, unitPrice, total, projectName };
      },
    },
    {
      intent: 'record_income',
      patterns: [
        /(?:terima|terim|dp|termin|pelunasan|catat\s+(?:uang\s+)?masuk|pemasukan)\s+(?:rp\.?\s*)?(\d[\d.,]*)\s*(?:ribu|rb|k|juta|jt)?(?:\s+(?:dp|termin|pelunasan|retensi))?\s*(?:project|proyek|prj)?\s*(.*)?/i,
        /(?:terima|catat)\s+(dp|termin|pelunasan|retensi)\s+(?:rp\.?\s*)?(\d[\d.,]*)\s*(?:ribu|rb|k|juta|jt)?\s*(?:project|proyek|prj)?\s*(.*)?/i,
      ],
      confidence: 0.82,
      extract: (match: RegExpMatchArray, input: string) => {
        let category = 'other';
        let amountStr = match[1];
        let projectName = match[2]?.trim() || null;
        if (['dp', 'termin', 'pelunasan', 'retensi'].includes(String(match[1]).toLowerCase())) {
          category = String(match[1]).toLowerCase();
          amountStr = match[2];
          projectName = match[3]?.trim() || null;
        } else {
          const catMatch = input.match(/\b(dp|termin|pelunasan|retensi)\b/i);
          if (catMatch) category = catMatch[1].toLowerCase();
        }
        let total = parseNumberFromText(amountStr);
        if (/juta|jt/i.test(input)) total *= 1_000_000;
        else if (/ribu|rb|k/i.test(input)) total *= 1000;
        return { total, amount: total, category, projectName, item: `Penerimaan ${category}`, description: `Penerimaan ${category}` };
      },
    },
    {
      intent: 'update_progress',
      patterns: [
        /(?:progress|proses|hari\s+ini)\s+(.+?)\s+(?:selesai\s+)?(\d+)\s*(?:%|persen|prosen)/i,
        /(.+?)\s+(?:sudah|sdh|udah|udh)\s+(\d+)\s*(?:%|persen|prosen)/i,
        /(?:update|upd)\s+(?:progress|proses)\s+(.+?)\s+(\d+)\s*(?:%|persen)?/i,
      ],
      confidence: 0.85,
      extract: (match: RegExpMatchArray) => ({
        workItem: match[1]?.trim(),
        progress: parseInt(match[2]) || 0,
      }),
    },
    {
      intent: 'check_budget',
      patterns: [
        /(?:cek|check|berapa|lihat)\s+(?:budget|anggaran|biaya|sisa|rap)\s*(?:project|proyek|prj)?\s*(.*)?/i,
        /(?:sisa\s+(?:budget|anggaran))\s*(.*)?/i,
      ],
      confidence: 0.9,
      extract: (match: RegExpMatchArray) => ({ projectName: match[1]?.trim() || null }),
    },
    {
      intent: 'check_progress',
      patterns: [
        /(?:cek|check|berapa|lihat)\s+(?:progress|proses)\s*(?:project|proyek|prj)?\s*(.*)?/i,
        /(?:progress)\s+(?:project|proyek|prj)\s+(.*)/i,
      ],
      confidence: 0.9,
      extract: (match: RegExpMatchArray) => ({ projectName: match[1]?.trim() || null }),
    },
    {
      intent: 'open_project',
      patterns: [/(?:buka|open|tampilkan|lihat)\s+(?:project|proyek|prj)\s+(.*)/i],
      confidence: 0.9,
      extract: (match: RegExpMatchArray) => ({ projectName: match[1]?.trim() }),
    },
    {
      intent: 'add_worker_log',
      patterns: [
        /(?:hari\s+ini|log)\s+(?:hadir|kerja|pekerja)\s+(\d+)\s*(?:orang|org)/i,
        /(?:pekerja|tukang|kuli)\s+(?:hadir|datang)\s+(\d+)\s*(?:orang|org)?/i,
      ],
      confidence: 0.8,
      extract: (match: RegExpMatchArray) => ({ workers: parseInt(match[1]) || 0 }),
    },
    {
      intent: 'open_report',
      patterns: [/(?:buka|lihat|tampilkan|show)\s+(?:laporan|report)/i],
      confidence: 0.9,
      extract: () => ({}),
    },
    {
      intent: 'ask_recommendation',
      patterns: [/(?:rekomendasi|saran|analisa|analisis)\s*(?:project|proyek|prj|untuk)?\s*(.*)?/i],
      confidence: 0.85,
      extract: (match: RegExpMatchArray) => ({ projectName: match[1]?.trim() || null }),
    },
  ];
}

export function parseCommand(input: string): ParsedCommand {
  const lower = input.toLowerCase().trim();
  const rules = getParsingRules();

  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      const match = lower.match(pattern) || input.match(pattern);
      if (match) {
        return {
          intent: rule.intent,
          params: rule.extract(match, input),
          confidence: rule.confidence,
          raw: input,
        };
      }
    }
  }

  return { intent: 'unknown', params: {}, confidence: 0, raw: input };
}

export async function aiParseCommand(
  input: string,
  context: {
    projects: Array<{ name: string; id: string; status?: string }>;
    work_items: Array<{ name: string; id: string; progress?: number }>;
    current_project: string | null;
  },
): Promise<ParsedCommand | null> {
  try {
    const { config } = await import('./config');
    const { supabase } = await import('./supabase');
    const { data } = await supabase.functions.invoke(config.fnParseCommand, {
      body: { input, context },
    });

    if (data?.intent) {
      return {
        intent: data.intent,
        params: data.params || {},
        confidence: data.confidence || 0.7,
        raw: input,
      };
    }
  } catch (e) {
    console.warn('AI parser fallback failed:', e);
  }
  return null;
}
