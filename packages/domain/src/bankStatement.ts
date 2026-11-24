/**
 * Parser mutasi bank Indonesia (BCA/Mandiri/BRI/BNI/Generic CSV), pencocokan 1-to-1 ke baris kas buku besar,
 * dan rekonsiliasi saldo kas vs saldo akhir bank secara deterministik.
 * Fungsi murni: tanpa DOM, jaringan, atau LLM. Uang selalu bilangan bulat rupiah.
 */

import { computeDeterministicSha256 } from './receiptExtraction';

export type BankStatementFormat = 'bca' | 'mandiri' | 'bri' | 'bni' | 'generic';
export type BankStatementFormatInput = 'auto' | BankStatementFormat;
export type BankDirection = 'in' | 'out';

export type BankStatementRow = {
  rowIndex: number;
  bankFormat: BankStatementFormat;
  entryDate: string;
  description: string;
  branch: string | null;
  direction: BankDirection;
  amountRupiah: number;
  runningBalance: number | null;
  rowHash: string;
  rawLine: string;
};

export type ParseBankStatementCsvOptions = {
  bankFormat?: BankStatementFormatInput;
  yearHint?: number;
};

export type SkippedBankRow = {
  rowNumber: number;
  reason: string;
  rawLine: string;
};

export type ParseBankStatementCsvResult = {
  bankFormat: BankStatementFormat;
  delimiter: ',' | ';' | '\t';
  rows: BankStatementRow[];
  skippedRows: SkippedBankRow[];
  warnings: string[];
  endingBalance: number | null;
};

export type LedgerCashLine = {
  id: string;
  journalId: string;
  entryDate: string;
  description: string | null;
  notes?: string | null;
  partyName?: string | null;
  debit: number;
  credit: number;
  accountId?: string;
};

export type MatchBankStatementOptions = {
  dateToleranceDays?: number;
};

export type BankLedgerMatch = {
  bankRow: BankStatementRow;
  ledgerLine: LedgerCashLine;
  direction: BankDirection;
  amountRupiah: number;
  dateDiffDays: number;
  similarityScore: number;
  status: 'matched';
};

export type AmbiguousMatchCandidate = {
  ledgerLine: LedgerCashLine;
  dateDiffDays: number;
  similarityScore: number;
};

export type AmbiguousBankMatch = {
  bankRow: BankStatementRow;
  candidates: AmbiguousMatchCandidate[];
  reason: 'tied_ledger_candidates' | 'tied_bank_rows';
  status: 'ambiguous';
};

export type UnmatchedBankRow = BankStatementRow & {
  status: 'unmatched';
};

export type MatchBankStatementResult = {
  matches: BankLedgerMatch[];
  ambiguousMatches: AmbiguousBankMatch[];
  unmatchedBankRows: UnmatchedBankRow[];
  unmatchedLedgerLines: LedgerCashLine[];
  stats: {
    totalBankRows: number;
    totalLedgerLines: number;
    matchedCount: number;
    ambiguousCount: number;
    unmatchedBankCount: number;
    unmatchedLedgerCount: number;
  };
};

export type ReconciliationItemType =
  | 'bank_fee'
  | 'bank_interest'
  | 'deposit_in_transit'
  | 'outstanding_withdrawal';

export type BankReconciliationItem = {
  type: ReconciliationItemType;
  amountRupiah: number;
  description?: string;
  entryDate?: string;
  sourceRef?: string;
};

export type ReconcileCashVsBankInput = {
  bookCashBalance: number;
  bankEndingBalance: number;
  items?: BankReconciliationItem[];
  periodMonth?: string;
  walletAccountId?: string;
  matchedCount?: number;
  ambiguousCount?: number;
  unmatchedBankCount?: number;
  unmatchedLedgerCount?: number;
};

export type ReconciliationBucket = {
  count: number;
  totalRupiah: number;
  items: BankReconciliationItem[];
};

export type ReconcileCashVsBankResult = {
  status: 'reconciled' | 'needs_review';
  bookCashBalance: number;
  bankEndingBalance: number;
  rawDifference: number;
  explainedDifference: number;
  unexplainedDifference: number;
  adjustedBookBalance: number;
  adjustedBankBalance: number;
  breakdown: {
    bank_fee: ReconciliationBucket;
    bank_interest: ReconciliationBucket;
    deposit_in_transit: ReconciliationBucket;
    outstanding_withdrawal: ReconciliationBucket;
  };
  provenance: {
    method: 'deterministic_bank_reconciliation_v1';
    periodMonth: string | null;
    walletAccountId: string | null;
    bookCashBalance: number;
    bankEndingBalance: number;
    rawDifference: number;
    explainedDifference: number;
    unexplainedDifference: number;
    itemCount: number;
    matchedCount: number | null;
    ambiguousCount: number | null;
    unmatchedBankCount: number | null;
    unmatchedLedgerCount: number | null;
  };
};

const MONTH_MAP: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agt: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, dec: 12, december: 12,
};

const TEXT_STOPWORDS = new Set([
  'ke', 'dari', 'di', 'dan', 'untuk', 'via', 'oleh', 'atas', 'tgl', 'no', 'rp', 'idr',
]);

const BANK_FEE_RE = /\b(biaya\s*adm(?:in(?:istrasi)?)?|adm\s*bank|admin\s*fee|biaya\s*bulanan|biaya\s*layanan|biaya\s*transfer|biaya\s*trf|biaya\s*materai|pajak\s*bunga|pph\s*bunga)\b/i;
const BANK_INTEREST_RE = /\b(bunga\s*(?:bank|simpanan|tabungan|giro)?|jasa\s*giro|interest|bagi\s*hasil)\b/i;

function splitDelimitedLine(line: string, delimiter: ',' | ';' | '\t'): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

function detectDelimiter(lines: string[]): ',' | ';' | '\t' {
  const candidates: Array<',' | ';' | '\t'> = ['\t', ';', ','];
  const sample = lines.slice(0, 15);
  let bestDelimiter: ',' | ';' | '\t' = ',';
  let bestScore = -1;

  for (const delim of candidates) {
    let score = 0;
    for (const line of sample) {
      const cols = splitDelimitedLine(line, delim);
      if (cols.length >= 3) {
        score += cols.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }
  return bestDelimiter;
}

function normalizeHeaderName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type ColumnMapping = {
  headerIndex: number;
  dateCol: number;
  descCol: number;
  branchCol: number;
  amountCol: number;
  typeCol: number;
  debitCol: number;
  creditCol: number;
  balanceCol: number;
  detectedFormat: BankStatementFormat;
};

function findHeaderAndColumns(
  lines: string[],
  delimiter: ',' | ';' | '\t',
  requestedFormat: BankStatementFormatInput,
): ColumnMapping | null {
  const preambleText = lines.slice(0, 15).join(' ').toLowerCase();

  for (let idx = 0; idx < Math.min(lines.length, 30); idx += 1) {
    const cols = splitDelimitedLine(lines[idx], delimiter).map(normalizeHeaderName);
    if (cols.length < 3) continue;

    const dateCol = cols.findIndex((c) =>
      c === 'tanggal'
      || c === 'tgl'
      || c === 'date'
      || c === 'entry date'
      || c === 'posting date'
      || c === 'txn date'
      || c === 'tanggal transaksi'
      || c === 'tgl transaksi'
      || c === 'tgl valuta',
    );
    if (dateCol === -1) continue;

    const descCol = cols.findIndex((c) =>
      c === 'keterangan'
      || c === 'deskripsi'
      || c === 'uraian'
      || c === 'description'
      || c === 'memo'
      || c === 'remark'
      || c === 'berita'
      || c === 'uraian transaksi',
    );
    const branchCol = cols.findIndex((c) => c === 'cabang' || c === 'branch' || c === 'kd cabang');
    const debitCol = cols.findIndex((c) =>
      c === 'debit' || c === 'debet' || c === 'mutasi debit' || c === 'mutasi debet' || c === 'keluar' || c === 'db',
    );
    const creditCol = cols.findIndex((c) =>
      c === 'kredit' || c === 'credit' || c === 'mutasi kredit' || c === 'masuk' || c === 'cr',
    );
    const amountCol = cols.findIndex((c) =>
      c === 'jumlah' || c === 'amount' || c === 'nominal' || c === 'mutasi' || c === 'nilai',
    );
    const typeCol = cols.findIndex((c) =>
      c === 'tipe' || c === 'type' || c === 'jenis' || c === 'dk' || c === 'd/k' || c === 'cr/db' || c === 'direction' || c === 'arah',
    );
    const balanceCol = cols.findIndex((c) =>
      c === 'saldo' || c === 'balance' || c === 'running balance' || c === 'saldo akhir',
    );

    const hasAmountStructure =
      (debitCol !== -1 && creditCol !== -1) || amountCol !== -1;
    if (!hasAmountStructure && descCol === -1) continue;

    let detectedFormat: BankStatementFormat = 'generic';
    if (requestedFormat !== 'auto') {
      detectedFormat = requestedFormat;
    } else if (
      preambleText.includes('bank central asia')
      || /\bbca\b/.test(preambleText)
      || (branchCol !== -1 && amountCol !== -1 && cols[descCol] === 'keterangan')
    ) {
      detectedFormat = 'bca';
    } else if (/\bbri\b|bank rakyat indonesia/.test(preambleText)) {
      detectedFormat = 'bri';
    } else if (/\bbni\b|bank negara indonesia/.test(preambleText)) {
      detectedFormat = 'bni';
    } else if (/\bmandiri\b/.test(preambleText) || (debitCol !== -1 && creditCol !== -1 && descCol !== -1)) {
      detectedFormat = 'mandiri';
    }

    return {
      headerIndex: idx,
      dateCol,
      descCol,
      branchCol,
      amountCol,
      typeCol,
      debitCol,
      creditCol,
      balanceCol,
      detectedFormat,
    };
  }

  return null;
}

function formatYmd(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year
    || probe.getUTCMonth() + 1 !== month
    || probe.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseBankDate(raw: string, yearHint?: number): { ok: true; date: string } | { ok: false; reason: string } {
  const cleaned = raw.trim().replace(/^'+/, '').replace(/\s+/g, ' ');
  if (!cleaned) return { ok: false, reason: 'tanggal_kosong' };
  if (/^(pend|pending)$/i.test(cleaned)) return { ok: false, reason: 'pending_date' };

  const datePart = cleaned.split(/\s+/)[0];

  // YYYY-MM-DD (or YYYY/MM/DD)
  const iso = datePart.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (iso) {
    const formatted = formatYmd(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    return formatted ? { ok: true, date: formatted } : { ok: false, reason: 'tanggal_tidak_valid' };
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy4 = datePart.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy4) {
    const formatted = formatYmd(Number(dmy4[3]), Number(dmy4[2]), Number(dmy4[1]));
    return formatted ? { ok: true, date: formatted } : { ok: false, reason: 'tanggal_tidak_valid' };
  }

  // DD/MM/YY or DD-MM-YY
  const dmy2 = datePart.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/);
  if (dmy2) {
    const yy = Number(dmy2[3]);
    const fullYear = yy <= 79 ? 2000 + yy : 1900 + yy;
    const formatted = formatYmd(fullYear, Number(dmy2[2]), Number(dmy2[1]));
    return formatted ? { ok: true, date: formatted } : { ok: false, reason: 'tanggal_tidak_valid' };
  }

  // DD/MM or DD-MM (typical BCA e-statement export)
  const dm = datePart.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (dm) {
    const effectiveYear = yearHint ?? new Date().getUTCFullYear();
    const formatted = formatYmd(effectiveYear, Number(dm[2]), Number(dm[1]));
    return formatted ? { ok: true, date: formatted } : { ok: false, reason: 'tanggal_tidak_valid' };
  }

  // DD MMM YYYY or DD MMMM YYYY
  const named = cleaned.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?/);
  if (named) {
    const month = MONTH_MAP[named[2]];
    if (!month) return { ok: false, reason: 'bulan_tidak_dikenal' };
    const effectiveYear = named[3] ? Number(named[3]) : (yearHint ?? new Date().getUTCFullYear());
    const formatted = formatYmd(effectiveYear, month, Number(named[1]));
    return formatted ? { ok: true, date: formatted } : { ok: false, reason: 'tanggal_tidak_valid' };
  }

  return { ok: false, reason: 'format_tanggal_tidak_dikenal' };
}

type ParsedNumericAmount = {
  ok: boolean;
  amount: number; // signed integer rupiah
  explicitTag: BankDirection | null;
};

function parseBankNumericToken(raw: string): ParsedNumericAmount {
  let s = String(raw ?? '').trim();
  if (!s || s === '-' || s === '--') {
    return { ok: true, amount: 0, explicitTag: null };
  }

  let explicitTag: BankDirection | null = null;
  let negative = false;

  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }

  const tagMatch = s.match(/(?:^|\s)(CR|DB|CREDIT|DEBIT|KREDIT|DEBET|K|D|IN|OUT|MASUK|KELUAR)\s*$/i);
  if (tagMatch) {
    const tag = tagMatch[1].toUpperCase();
    if (tag === 'CR' || tag === 'CREDIT' || tag === 'KREDIT' || tag === 'K' || tag === 'IN' || tag === 'MASUK') {
      explicitTag = 'in';
    } else {
      explicitTag = 'out';
    }
    s = s.slice(0, tagMatch.index).trim();
  }

  s = s.replace(/\b(?:rp\.?|idr)\b/gi, '').replace(/\s+/g, '').trim();
  if (!s) return { ok: false, amount: 0, explicitTag };

  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }

  if (!/^\d[\d.,]*$/.test(s)) {
    return { ok: false, amount: 0, explicitTag };
  }

  let normalized = s;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      // ID format: 1.500.000,00
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,500,000.00
      normalized = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    if (/^\d{1,3}(,\d{3})+$/.test(s)) {
      normalized = s.replace(/,/g, '');
    } else if (/^\d+,\d{1,2}$/.test(s)) {
      normalized = s.replace(',', '.');
    } else {
      normalized = s.replace(/,/g, '');
    }
  } else if (hasDot) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      normalized = s.replace(/\./g, '');
    } else if (/^\d+\.\d{1,2}$/.test(s)) {
      normalized = s;
    } else {
      normalized = s.replace(/\./g, '');
    }
  }

  const num = Number(normalized);
  if (!Number.isFinite(num)) {
    return { ok: false, amount: 0, explicitTag };
  }

  const rounded = Math.round(num);
  return {
    ok: true,
    amount: negative ? -rounded : rounded,
    explicitTag,
  };
}

function parseDirectionHint(raw: string): BankDirection | null {
  const token = raw.trim().toUpperCase();
  if (!token) return null;
  if (
    token === 'CR'
    || token === 'CREDIT'
    || token === 'KREDIT'
    || token === 'K'
    || token === 'IN'
    || token === 'MASUK'
    || token === '+'
  ) {
    return 'in';
  }
  if (
    token === 'DB'
    || token === 'DEBIT'
    || token === 'DEBET'
    || token === 'D'
    || token === 'OUT'
    || token === 'KELUAR'
    || token === '-'
  ) {
    return 'out';
  }
  return null;
}

function isSummaryOrFooterRow(firstCell: string, secondCell: string): boolean {
  const text = `${firstCell} ${secondCell}`.toLowerCase();
  return /^(saldo awal|saldo akhir|mutasi debet|mutasi debit|mutasi kredit|total mutasi|catatan)/.test(
    firstCell.trim().toLowerCase(),
  ) || /saldo akhir\s*:/.test(text);
}

/**
 * Mengurai teks CSV/TSV mutasi bank Indonesia (BCA/Mandiri/BRI/BNI/Generic) secara deterministik.
 * Menghasilkan nominal bilangan bulat rupiah (`> 0`), tanggal `YYYY-MM-DD`, arah `'in' | 'out'`,
 * saldo berjalan opsional, serta `rowHash` SHA-256 deterministik untuk deduplikasi impor ulang.
 */
export function parseBankStatementCsv(
  csvText: string,
  opts: ParseBankStatementCsvOptions = {},
): ParseBankStatementCsvResult {
  const requestedFormat: BankStatementFormatInput = opts.bankFormat ?? 'auto';
  const rawContent = String(csvText ?? '').replace(/^\uFEFF/, '');
  const rawLines = rawContent
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (rawLines.length === 0) {
    return {
      bankFormat: requestedFormat === 'auto' ? 'generic' : requestedFormat,
      delimiter: ',',
      rows: [],
      skippedRows: [],
      warnings: ['empty_csv'],
      endingBalance: null,
    };
  }

  const delimiter = detectDelimiter(rawLines);
  const mapping = findHeaderAndColumns(rawLines, delimiter, requestedFormat);

  if (!mapping) {
    return {
      bankFormat: requestedFormat === 'auto' ? 'generic' : requestedFormat,
      delimiter,
      rows: [],
      skippedRows: rawLines.map((rawLine, idx) => ({
        rowNumber: idx + 1,
        reason: 'header_tidak_dikenali',
        rawLine,
      })),
      warnings: ['header_not_found'],
      endingBalance: null,
    };
  }

  const resolvedFormat = mapping.detectedFormat;
  const rows: BankStatementRow[] = [];
  const skippedRows: SkippedBankRow[] = [];
  const warnings: string[] = [];
  const occurrenceCounter = new Map<string, number>();

  for (let i = mapping.headerIndex + 1; i < rawLines.length; i += 1) {
    const rawLine = rawLines[i];
    const rowNumber = i + 1;
    const cols = splitDelimitedLine(rawLine, delimiter);

    const rawDate = cols[mapping.dateCol] ?? '';
    const rawDesc = mapping.descCol !== -1 ? (cols[mapping.descCol] ?? '') : '';

    if (isSummaryOrFooterRow(rawDate, rawDesc)) {
      skippedRows.push({ rowNumber, reason: 'summary_or_footer_row', rawLine });
      continue;
    }

    const parsedDate = parseBankDate(rawDate, opts.yearHint);
    if (!parsedDate.ok) {
      skippedRows.push({ rowNumber, reason: parsedDate.reason, rawLine });
      continue;
    }

    const branch = mapping.branchCol !== -1 && cols[mapping.branchCol]
      ? cols[mapping.branchCol].trim() || null
      : null;

    let direction: BankDirection | null = null;
    let amountRupiah = 0;

    if (mapping.debitCol !== -1 && mapping.creditCol !== -1) {
      const debitParsed = parseBankNumericToken(cols[mapping.debitCol] ?? '');
      const creditParsed = parseBankNumericToken(cols[mapping.creditCol] ?? '');

      if (!debitParsed.ok || !creditParsed.ok) {
        skippedRows.push({ rowNumber, reason: 'nominal_tidak_valid', rawLine });
        continue;
      }

      const debitAmt = Math.abs(debitParsed.amount);
      const creditAmt = Math.abs(creditParsed.amount);

      if (debitAmt > 0 && creditAmt > 0) {
        skippedRows.push({ rowNumber, reason: 'ambiguous_debit_credit', rawLine });
        continue;
      }
      if (debitAmt === 0 && creditAmt === 0) {
        skippedRows.push({ rowNumber, reason: 'zero_amount', rawLine });
        continue;
      }

      if (creditAmt > 0) {
        direction = 'in';
        amountRupiah = creditAmt;
      } else {
        direction = 'out';
        amountRupiah = debitAmt;
      }
    } else if (mapping.amountCol !== -1) {
      const rawAmt = cols[mapping.amountCol] ?? '';
      const parsedAmt = parseBankNumericToken(rawAmt);
      if (!parsedAmt.ok) {
        skippedRows.push({ rowNumber, reason: 'nominal_tidak_valid', rawLine });
        continue;
      }

      let resolvedDir: BankDirection | null = parsedAmt.explicitTag;
      if (!resolvedDir && mapping.typeCol !== -1) {
        resolvedDir = parseDirectionHint(cols[mapping.typeCol] ?? '');
      }
      if (!resolvedDir && mapping.amountCol + 1 < cols.length) {
        resolvedDir = parseDirectionHint(cols[mapping.amountCol + 1] ?? '');
      }
      if (!resolvedDir) {
        if (parsedAmt.amount < 0) {
          resolvedDir = 'out';
        } else if (parsedAmt.amount > 0) {
          resolvedDir = 'in';
        }
      }

      const absAmt = Math.abs(parsedAmt.amount);
      if (absAmt <= 0 || !resolvedDir) {
        skippedRows.push({ rowNumber, reason: absAmt <= 0 ? 'zero_amount' : 'arah_tidak_jelas', rawLine });
        continue;
      }

      direction = resolvedDir;
      amountRupiah = absAmt;
    } else {
      skippedRows.push({ rowNumber, reason: 'kolom_nominal_tidak_ada', rawLine });
      continue;
    }

    let runningBalance: number | null = null;
    if (mapping.balanceCol !== -1 && (cols[mapping.balanceCol] ?? '').trim() !== '') {
      const balParsed = parseBankNumericToken(cols[mapping.balanceCol]);
      if (balParsed.ok) {
        runningBalance = balParsed.explicitTag === 'out'
          ? -Math.abs(balParsed.amount)
          : balParsed.amount;
      }
    }

    const description = rawDesc.replace(/\s+/g, ' ').trim();
    const normalizedDesc = description.toLowerCase();
    const dedupKey = [
      resolvedFormat,
      parsedDate.date,
      direction,
      String(amountRupiah),
      normalizedDesc,
      runningBalance != null ? String(runningBalance) : '',
    ].join('|');

    const occurrenceIndex = occurrenceCounter.get(dedupKey) ?? 0;
    occurrenceCounter.set(dedupKey, occurrenceIndex + 1);

    const rowHash = computeDeterministicSha256(`${dedupKey}|${occurrenceIndex}`);

    rows.push({
      rowIndex: rows.length,
      bankFormat: resolvedFormat,
      entryDate: parsedDate.date,
      description,
      branch,
      direction,
      amountRupiah,
      runningBalance,
      rowHash,
      rawLine,
    });
  }

  if (rows.length === 0) {
    warnings.push('no_valid_rows');
  }

  let endingBalance: number | null = null;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i].runningBalance != null) {
      endingBalance = rows[i].runningBalance;
      break;
    }
  }

  return {
    bankFormat: resolvedFormat,
    delimiter,
    rows,
    skippedRows,
    warnings,
    endingBalance,
  };
}

function toUtcEpochDays(ymd: string): number | null {
  const m = String(ymd ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const formatted = formatYmd(y, mo, d);
  if (!formatted) return null;
  return Math.floor(Date.UTC(y, mo - 1, d) / 86_400_000);
}

function tokenizeForSimilarity(text: string): string[] {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !TEXT_STOPWORDS.has(t));
}

/**
 * Skor kemiripan teks deterministik (0..1) berbasis irisan token (Dice + containment ringan).
 */
export function computeDescriptionSimilarity(bankDescription: string, ledgerText: string): number {
  const bankTokens = tokenizeForSimilarity(bankDescription);
  const ledgerTokens = tokenizeForSimilarity(ledgerText);
  if (bankTokens.length === 0 || ledgerTokens.length === 0) return 0;

  const bankSet = new Set(bankTokens);
  const ledgerSet = new Set(ledgerTokens);

  let overlap = 0;
  for (const tok of bankSet) {
    if (ledgerSet.has(tok)) overlap += 1;
  }

  if (overlap === 0) return 0;
  const dice = (2 * overlap) / (bankSet.size + ledgerSet.size);
  return Math.round(Math.min(1, dice) * 10000) / 10000;
}

type NormalizedLedgerCandidate = {
  index: number;
  line: LedgerCashLine;
  direction: BankDirection;
  amountRupiah: number;
  epochDay: number;
  combinedText: string;
};

/**
 * Mencocokkan baris mutasi bank dengan baris kas buku besar secara 1-to-1 deterministik:
 * - Arah sama (`in`/`out`), nominal integer rupiah eksak sama, selisih tanggal <= `dateToleranceDays` (default 3).
 * - Skor kemiripan teks keterangan/pihak menjadi tie-breaker.
 * - Kandidat ambigu dengan skor sama TIDAK pernah auto-match dan masuk ke `ambiguousMatches`.
 */
export function matchBankStatementToLedger(
  bankRows: BankStatementRow[],
  ledgerCashLines: LedgerCashLine[],
  opts: MatchBankStatementOptions = {},
): MatchBankStatementResult {
  const dateToleranceDays = Math.max(0, Math.floor(opts.dateToleranceDays ?? 3));

  const validLedger: NormalizedLedgerCandidate[] = [];
  for (let i = 0; i < ledgerCashLines.length; i += 1) {
    const line = ledgerCashLines[i];
    const debit = Math.round(Number(line.debit) || 0);
    const credit = Math.round(Number(line.credit) || 0);
    if ((debit > 0 && credit > 0) || (debit <= 0 && credit <= 0)) continue;

    const epochDay = toUtcEpochDays(line.entryDate);
    if (epochDay == null) continue;

    const direction: BankDirection = debit > 0 ? 'in' : 'out';
    const amountRupiah = debit > 0 ? debit : credit;
    const combinedText = [line.description, line.notes, line.partyName]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(' ');

    validLedger.push({
      index: i,
      line,
      direction,
      amountRupiah,
      epochDay,
      combinedText,
    });
  }

  const remainingBank = new Set<number>(bankRows.map((_, idx) => idx));
  const remainingLedger = new Set<number>(validLedger.map((_, idx) => idx));
  const matches: BankLedgerMatch[] = [];

  type CandidateEdge = {
    ledgerIdx: number;
    dateDiffDays: number;
    similarityScore: number;
  };

  function getCandidatesForBank(bankIdx: number): CandidateEdge[] {
    const bRow = bankRows[bankIdx];
    const bEpoch = toUtcEpochDays(bRow.entryDate);
    if (bEpoch == null || bRow.amountRupiah <= 0) return [];

    const out: CandidateEdge[] = [];
    for (const lIdx of remainingLedger) {
      const lCand = validLedger[lIdx];
      if (lCand.direction !== bRow.direction) continue;
      if (lCand.amountRupiah !== bRow.amountRupiah) continue;
      const dateDiffDays = Math.abs(bEpoch - lCand.epochDay);
      if (dateDiffDays > dateToleranceDays) continue;
      const similarityScore = computeDescriptionSimilarity(bRow.description, lCand.combinedText);
      out.push({ ledgerIdx: lIdx, dateDiffDays, similarityScore });
    }
    return out;
  }

  let progress = true;
  while (progress) {
    progress = false;

    const bankBest = new Map<number, { maxScore: number; top: CandidateEdge[]; all: CandidateEdge[] }>();
    for (const bIdx of remainingBank) {
      const all = getCandidatesForBank(bIdx);
      if (all.length === 0) continue;
      let maxScore = -1;
      for (const c of all) {
        if (c.similarityScore > maxScore) maxScore = c.similarityScore;
      }
      const top = all.filter((c) => c.similarityScore === maxScore);
      bankBest.set(bIdx, { maxScore, top, all });
    }

    // Kumpulkan bank row yang memiliki kandidat teratas tunggal
    const proposalsByLedger = new Map<number, Array<{ bankIdx: number; edge: CandidateEdge }>>();
    for (const [bIdx, info] of bankBest.entries()) {
      if (info.top.length !== 1) continue;
      const edge = info.top[0];
      const list = proposalsByLedger.get(edge.ledgerIdx) ?? [];
      list.push({ bankIdx: bIdx, edge });
      proposalsByLedger.set(edge.ledgerIdx, list);
    }

    const roundMatches: Array<{ bankIdx: number; ledgerIdx: number; edge: CandidateEdge }> = [];
    for (const [lIdx, proposers] of proposalsByLedger.entries()) {
      let bestScore = -1;
      for (const p of proposers) {
        if (p.edge.similarityScore > bestScore) bestScore = p.edge.similarityScore;
      }
      const topProposers = proposers.filter((p) => p.edge.similarityScore === bestScore);
      if (topProposers.length !== 1) {
        // Lebih dari 1 baris mutasi bank bersaing dengan skor sama -> ambigu
        continue;
      }

      const winner = topProposers[0];

      // Pastikan tidak ada bank row lain (meski punya beberapa top kandidat) yang juga mengincar lIdx pada skor >= bestScore
      let contested = false;
      for (const [otherBankIdx, otherInfo] of bankBest.entries()) {
        if (otherBankIdx === winner.bankIdx) continue;
        const otherTargetsL = otherInfo.top.some(
          (c) => c.ledgerIdx === lIdx && c.similarityScore >= bestScore,
        );
        if (otherTargetsL) {
          contested = true;
          break;
        }
      }
      if (contested) continue;

      roundMatches.push({
        bankIdx: winner.bankIdx,
        ledgerIdx: lIdx,
        edge: winner.edge,
      });
    }

    if (roundMatches.length > 0) {
      progress = true;
      for (const m of roundMatches) {
        if (!remainingBank.has(m.bankIdx) || !remainingLedger.has(m.ledgerIdx)) continue;
        remainingBank.delete(m.bankIdx);
        remainingLedger.delete(m.ledgerIdx);
        matches.push({
          bankRow: bankRows[m.bankIdx],
          ledgerLine: validLedger[m.ledgerIdx].line,
          direction: bankRows[m.bankIdx].direction,
          amountRupiah: bankRows[m.bankIdx].amountRupiah,
          dateDiffDays: m.edge.dateDiffDays,
          similarityScore: m.edge.similarityScore,
          status: 'matched',
        });
      }
    }
  }

  const ambiguousMatches: AmbiguousBankMatch[] = [];
  const unmatchedBankRows: UnmatchedBankRow[] = [];

  for (const bIdx of Array.from(remainingBank).sort((a, b) => a - b)) {
    const remainingCandidates = getCandidatesForBank(bIdx);
    if (remainingCandidates.length === 0) {
      unmatchedBankRows.push({
        ...bankRows[bIdx],
        status: 'unmatched',
      });
      continue;
    }

    let maxScore = -1;
    for (const c of remainingCandidates) {
      if (c.similarityScore > maxScore) maxScore = c.similarityScore;
    }
    const top = remainingCandidates
      .filter((c) => c.similarityScore === maxScore)
      .sort((a, b) => a.dateDiffDays - b.dateDiffDays || a.ledgerIdx - b.ledgerIdx);

    ambiguousMatches.push({
      bankRow: bankRows[bIdx],
      candidates: top.map((c) => ({
        ledgerLine: validLedger[c.ledgerIdx].line,
        dateDiffDays: c.dateDiffDays,
        similarityScore: c.similarityScore,
      })),
      reason: top.length > 1 ? 'tied_ledger_candidates' : 'tied_bank_rows',
      status: 'ambiguous',
    });
  }

  const unmatchedLedgerLines = Array.from(remainingLedger)
    .sort((a, b) => a - b)
    .map((lIdx) => validLedger[lIdx].line);

  return {
    matches,
    ambiguousMatches,
    unmatchedBankRows,
    unmatchedLedgerLines,
    stats: {
      totalBankRows: bankRows.length,
      totalLedgerLines: validLedger.length,
      matchedCount: matches.length,
      ambiguousCount: ambiguousMatches.length,
      unmatchedBankCount: unmatchedBankRows.length,
      unmatchedLedgerCount: unmatchedLedgerLines.length,
    },
  };
}

/**
 * Menurunkan item penjelas rekonsiliasi secara deterministik dari antrean baris bank & kas buku yang belum cocok.
 * Hanya mengklasifikasikan biaya admin bank / bunga jasa giro yang eksplisit; baris bank tidak dikenal tidak disamarkan.
 */
export function deriveReconciliationItems(
  unmatchedBankRows: BankStatementRow[],
  unmatchedLedgerLines: LedgerCashLine[],
): BankReconciliationItem[] {
  const items: BankReconciliationItem[] = [];

  for (const row of unmatchedBankRows) {
    if (row.direction === 'out' && BANK_FEE_RE.test(row.description)) {
      items.push({
        type: 'bank_fee',
        amountRupiah: Math.round(row.amountRupiah),
        description: row.description,
        entryDate: row.entryDate,
        sourceRef: row.rowHash,
      });
    } else if (row.direction === 'in' && BANK_INTEREST_RE.test(row.description)) {
      items.push({
        type: 'bank_interest',
        amountRupiah: Math.round(row.amountRupiah),
        description: row.description,
        entryDate: row.entryDate,
        sourceRef: row.rowHash,
      });
    }
  }

  for (const line of unmatchedLedgerLines) {
    const debit = Math.round(Number(line.debit) || 0);
    const credit = Math.round(Number(line.credit) || 0);
    if (debit > 0 && credit === 0) {
      items.push({
        type: 'deposit_in_transit',
        amountRupiah: debit,
        description: line.description || line.notes || 'Setoran dalam perjalanan',
        entryDate: line.entryDate,
        sourceRef: line.id,
      });
    } else if (credit > 0 && debit === 0) {
      items.push({
        type: 'outstanding_withdrawal',
        amountRupiah: credit,
        description: line.description || line.notes || 'Pengeluaran kas belum cair di bank',
        entryDate: line.entryDate,
        sourceRef: line.id,
      });
    }
  }

  return items;
}

/**
 * Menghitung rekonsiliasi saldo kas buku besar vs saldo akhir rekening koran bank.
 * Konvensi tanda selisih (`rawDifference = bankEndingBalance - bookCashBalance`):
 * - `bank_fee`: mengurangi bank terhadap buku (`-amount`)
 * - `bank_interest`: menambah bank terhadap buku (`+amount`)
 * - `deposit_in_transit`: sudah masuk buku, belum masuk bank (`-amount`)
 * - `outstanding_withdrawal`: sudah keluar buku, belum keluar bank (`+amount`)
 * Status `'reconciled'` HANYA bila `unexplainedDifference === 0`, selain itu `'needs_review'`.
 */
export function reconcileCashVsBank(input: ReconcileCashVsBankInput): ReconcileCashVsBankResult {
  if (!Number.isFinite(input.bookCashBalance) || !Number.isFinite(input.bankEndingBalance)) {
    throw new Error('bookCashBalance dan bankEndingBalance harus berupa angka valid.');
  }

  const bookCashBalance = Math.round(input.bookCashBalance);
  const bankEndingBalance = Math.round(input.bankEndingBalance);
  const rawDifference = bankEndingBalance - bookCashBalance;

  const breakdown: ReconcileCashVsBankResult['breakdown'] = {
    bank_fee: { count: 0, totalRupiah: 0, items: [] },
    bank_interest: { count: 0, totalRupiah: 0, items: [] },
    deposit_in_transit: { count: 0, totalRupiah: 0, items: [] },
    outstanding_withdrawal: { count: 0, totalRupiah: 0, items: [] },
  };

  const items = input.items ?? [];
  for (const rawItem of items) {
    const amountRupiah = Math.round(Number(rawItem.amountRupiah) || 0);
    if (amountRupiah <= 0) {
      throw new Error(`Nominal item rekonsiliasi (${rawItem.type}) harus lebih dari 0.`);
    }
    const bucket = breakdown[rawItem.type];
    const normalizedItem: BankReconciliationItem = {
      ...rawItem,
      amountRupiah,
    };
    bucket.count += 1;
    bucket.totalRupiah += amountRupiah;
    bucket.items.push(normalizedItem);
  }

  const explainedDifference =
    breakdown.bank_interest.totalRupiah
    - breakdown.bank_fee.totalRupiah
    - breakdown.deposit_in_transit.totalRupiah
    + breakdown.outstanding_withdrawal.totalRupiah;

  const unexplainedDifference = rawDifference - explainedDifference;
  const adjustedBookBalance = bookCashBalance + breakdown.bank_interest.totalRupiah - breakdown.bank_fee.totalRupiah;
  const adjustedBankBalance =
    bankEndingBalance + breakdown.deposit_in_transit.totalRupiah - breakdown.outstanding_withdrawal.totalRupiah;

  const status: 'reconciled' | 'needs_review' =
    unexplainedDifference === 0 ? 'reconciled' : 'needs_review';

  return {
    status,
    bookCashBalance,
    bankEndingBalance,
    rawDifference,
    explainedDifference,
    unexplainedDifference,
    adjustedBookBalance,
    adjustedBankBalance,
    breakdown,
    provenance: {
      method: 'deterministic_bank_reconciliation_v1',
      periodMonth: input.periodMonth ?? null,
      walletAccountId: input.walletAccountId ?? null,
      bookCashBalance,
      bankEndingBalance,
      rawDifference,
      explainedDifference,
      unexplainedDifference,
      itemCount: items.length,
      matchedCount: input.matchedCount ?? null,
      ambiguousCount: input.ambiguousCount ?? null,
      unmatchedBankCount: input.unmatchedBankCount ?? null,
      unmatchedLedgerCount: input.unmatchedLedgerCount ?? null,
    },
  };
}
