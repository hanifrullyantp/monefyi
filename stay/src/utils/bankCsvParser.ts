/**
 * Parse bank statement CSV (BCA, Mandiri, generic formats).
 */
export interface BankCsvRow {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  reference?: string;
}

export interface BankCsvParseResult {
  rows: BankCsvRow[];
  bankHint?: string;
  errors: string[];
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d.-]/g, '');
  return Math.abs(parseFloat(cleaned) || 0);
}

function normalizeDate(raw: string): string {
  const trimmed = raw.trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return trimmed;
}

function detectDelimiter(line: string): string {
  if (line.includes(';')) return ';';
  if (line.split('\t').length > 2) return '\t';
  return ',';
}

/** Detect bank from header row */
function detectBank(headers: string[]): string | undefined {
  const h = headers.join(' ').toLowerCase();
  if (h.includes('bca')) return 'BCA';
  if (h.includes('mandiri')) return 'Mandiri';
  if (h.includes('bni')) return 'BNI';
  if (h.includes('bri')) return 'BRI';
  return undefined;
}

/**
 * Parse CSV text into normalized bank rows.
 * Supports BCA/Mandiri/generic column layouts.
 */
export function parseBankCsv(text: string): BankCsvParseResult {
  const errors: string[] = [];
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { rows: [], errors: ['File CSV terlalu pendek atau kosong.'] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));
  const bankHint = detectBank(headers);

  const dateIdx = headers.findIndex((h) => /tanggal|date|tgl|posting/i.test(h));
  const descIdx = headers.findIndex((h) => /keterangan|description|remark|uraian|detail/i.test(h));
  const debitIdx = headers.findIndex((h) => /debit|mutasi debet|pengeluaran|out/i.test(h));
  const creditIdx = headers.findIndex((h) => /kredit|mutasi kredit|pemasukan|in/i.test(h));
  const amountIdx = headers.findIndex((h) => /jumlah|amount|nominal|nilai/i.test(h));

  const rows: BankCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) continue;

    const dateRaw = dateIdx >= 0 ? cols[dateIdx] : cols[0];
    const description = descIdx >= 0 ? cols[descIdx] : cols[1] ?? 'Transaksi';

    let debit = debitIdx >= 0 ? parseAmount(cols[debitIdx]) : 0;
    let credit = creditIdx >= 0 ? parseAmount(cols[creditIdx]) : 0;

    if (debitIdx < 0 && creditIdx < 0 && amountIdx >= 0) {
      const amt = parseAmount(cols[amountIdx]);
      if (amt < 0 || cols[amountIdx]?.includes('-')) debit = Math.abs(amt);
      else credit = amt;
    }

    if (debit > 0) {
      rows.push({ date: normalizeDate(dateRaw), description, amount: debit, type: 'debit' });
    }
    if (credit > 0) {
      rows.push({ date: normalizeDate(dateRaw), description, amount: credit, type: 'credit' });
    }
  }

  if (rows.length === 0) {
    errors.push('Tidak ada transaksi valid ditemukan. Periksa format kolom CSV.');
  }

  return { rows, bankHint, errors };
}

/** Match bank CSV rows against journal entries by amount and date proximity */
export function matchBankTransactions(
  csvRows: BankCsvRow[],
  journalItems: { id: string; date: string; description: string; amount: number }[],
  toleranceDays = 2
): {
  matched: { csvIndex: number; journalId: string }[];
  unmatched: number[];
} {
  const matched: { csvIndex: number; journalId: string }[] = [];
  const usedJournals = new Set<string>();

  const unmatched: number[] = [];

  for (let i = 0; i < csvRows.length; i++) {
    const row = csvRows[i];
    const signedAmount = row.type === 'credit' ? row.amount : -row.amount;

    const match = journalItems.find((j) => {
      if (usedJournals.has(j.id)) return false;
      if (Math.abs(Math.abs(j.amount) - row.amount) > 0.01) return false;
      const dayDiff = Math.abs(new Date(j.date).getTime() - new Date(row.date).getTime()) / 86400000;
      return dayDiff <= toleranceDays;
    });

    if (match) {
      matched.push({ csvIndex: i, journalId: match.id });
      usedJournals.add(match.id);
    } else {
      unmatched.push(i);
    }
  }

  return { matched, unmatched };
}
