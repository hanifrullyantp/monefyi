import { supabase } from '../../lib/supabase';
import {
  deriveReconciliationItems,
  matchBankStatementToLedger,
  parseBankStatementCsv,
  reconcileCashVsBank,
  type BankReconciliationItem,
  type BankStatementFormat,
  type BankStatementFormatInput,
  type BankStatementRow,
  type LedgerCashLine,
  type MatchBankStatementResult,
  type ParseBankStatementCsvResult,
  type ReconcileCashVsBankResult,
} from '@domain/bankStatement';

export interface BankStatementRowRecord {
  id: string;
  org_id: string;
  wallet_account_id: string;
  bank_format: BankStatementFormat;
  entry_date: string;
  description: string;
  direction: 'in' | 'out';
  amount_rupiah: number;
  running_balance: number | null;
  row_hash: string;
  match_status: 'unmatched' | 'matched' | 'ambiguous' | 'ignored';
  matched_journal_id: string | null;
  matched_score: number | null;
  raw_row_json: Record<string, unknown>;
  imported_by: string | null;
  created_at: string;
}

export interface BankReconciliationRecord {
  id: string;
  org_id: string;
  wallet_account_id: string;
  period_month: string;
  book_balance_rupiah: number;
  bank_balance_rupiah: number;
  explained_diff_rupiah: number;
  unexplained_diff_rupiah: number;
  status: 'reconciled' | 'needs_review';
  summary_json: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface ImportAndMatchBankStatementInput {
  orgId: string;
  walletAccountId: string;
  csvText: string;
  bankFormat?: BankStatementFormatInput;
  yearHint?: number;
  dateToleranceDays?: number;
  importedBy?: string | null;
  periodStart?: string;
  periodEnd?: string;
  ledgerCashLines?: LedgerCashLine[];
}

export interface ImportAndMatchBankStatementResult {
  parsed: ParseBankStatementCsvResult;
  duplicateHashes: string[];
  insertedRows: BankStatementRowRecord[];
  matchResult: MatchBankStatementResult;
}

export interface RunCashBankReconciliationInput {
  orgId: string;
  walletAccountId: string;
  periodMonth: string;
  bankEndingBalance: number;
  bookCashBalance?: number;
  items?: BankReconciliationItem[];
  autoDeriveItems?: boolean;
  createdBy?: string | null;
  persist?: boolean;
}

export interface RunCashBankReconciliationResult {
  reconciliation: ReconcileCashVsBankResult;
  record: BankReconciliationRecord | null;
}

function normalizePeriodMonth(periodMonth: string): string {
  const m = String(periodMonth ?? '').trim().match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!m) {
    throw new Error('periodMonth harus berformat YYYY-MM atau YYYY-MM-DD.');
  }
  const monthNum = Number(m[2]);
  if (monthNum < 1 || monthNum > 12) {
    throw new Error('Bulan pada periodMonth tidak valid.');
  }
  return `${m[1]}-${m[2]}-01`;
}

function monthEndFromIso(periodMonthIso: string): string {
  const year = Number(periodMonthIso.slice(0, 4));
  const month = Number(periodMonthIso.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function shiftIsoDate(ymd: string, deltaDays: number): string {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  const shifted = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

function mapStatementRecord(row: Record<string, unknown>): BankStatementRowRecord {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    wallet_account_id: row.wallet_account_id as string,
    bank_format: row.bank_format as BankStatementFormat,
    entry_date: row.entry_date as string,
    description: row.description as string,
    direction: row.direction as 'in' | 'out',
    amount_rupiah: Number(row.amount_rupiah) || 0,
    running_balance: row.running_balance != null ? Number(row.running_balance) : null,
    row_hash: row.row_hash as string,
    match_status: (row.match_status as BankStatementRowRecord['match_status']) || 'unmatched',
    matched_journal_id: (row.matched_journal_id as string) || null,
    matched_score: row.matched_score != null ? Number(row.matched_score) : null,
    raw_row_json: (row.raw_row_json as Record<string, unknown>) || {},
    imported_by: (row.imported_by as string) || null,
    created_at: row.created_at as string,
  };
}

function mapReconciliationRecord(row: Record<string, unknown>): BankReconciliationRecord {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    wallet_account_id: row.wallet_account_id as string,
    period_month: row.period_month as string,
    book_balance_rupiah: Number(row.book_balance_rupiah) || 0,
    bank_balance_rupiah: Number(row.bank_balance_rupiah) || 0,
    explained_diff_rupiah: Number(row.explained_diff_rupiah) || 0,
    unexplained_diff_rupiah: Number(row.unexplained_diff_rupiah) || 0,
    status: row.status as 'reconciled' | 'needs_review',
    summary_json: (row.summary_json as Record<string, unknown>) || {},
    created_by: (row.created_by as string) || null,
    created_at: row.created_at as string,
  };
}

/**
 * Memuat baris kas buku besar pada akun dompet tertentu (membaca planner_journal_entries + planner_journal_lines).
 */
export async function loadWalletLedgerCashLines(
  orgId: string,
  walletAccountId: string,
  opts?: { startDate?: string; endDate?: string },
): Promise<LedgerCashLine[]> {
  let entriesQuery = supabase
    .from('planner_journal_entries')
    .select('id, entry_date, description')
    .eq('org_id', orgId);

  if (opts?.startDate) {
    entriesQuery = entriesQuery.gte('entry_date', opts.startDate);
  }
  if (opts?.endDate) {
    entriesQuery = entriesQuery.lte('entry_date', opts.endDate);
  }

  const { data: entries, error: entriesErr } = await entriesQuery;
  if (entriesErr) throw new Error(entriesErr.message);
  if (!entries || entries.length === 0) return [];

  const entryIds = entries.map((e) => e.id as string);
  const entryMap = new Map(
    entries.map((e) => [
      e.id as string,
      {
        entryDate: e.entry_date as string,
        description: (e.description as string) || null,
      },
    ]),
  );

  const { data: lines, error: linesErr } = await supabase
    .from('planner_journal_lines')
    .select('id, journal_id, account_id, debit, credit, notes')
    .eq('account_id', walletAccountId)
    .in('journal_id', entryIds);

  if (linesErr) throw new Error(linesErr.message);

  return (lines || [])
    .map((line) => {
      const journalId = line.journal_id as string;
      const meta = entryMap.get(journalId);
      if (!meta) return null;
      return {
        id: line.id as string,
        journalId,
        entryDate: meta.entryDate,
        description: meta.description,
        notes: (line.notes as string) || null,
        debit: Math.round(Number(line.debit) || 0),
        credit: Math.round(Number(line.credit) || 0),
        accountId: line.account_id as string,
      } satisfies LedgerCashLine;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

/**
 * Mengimpor CSV/TSV mutasi bank, mendeteksi duplikat via `row_hash`, mencocokkan 1-to-1 ke baris kas
 * buku besar secara deterministik, dan menyimpan baris mutasi ke `planner_bank_statement_rows`.
 * Kandidat ambigu tidak pernah auto-match.
 */
export async function importAndMatchBankStatement(
  input: ImportAndMatchBankStatementInput,
): Promise<ImportAndMatchBankStatementResult> {
  if (!input.orgId || !input.walletAccountId) {
    throw new Error('orgId dan walletAccountId wajib diisi.');
  }
  if (!String(input.csvText ?? '').trim()) {
    throw new Error('csvText tidak boleh kosong.');
  }

  const parsed = parseBankStatementCsv(input.csvText, {
    bankFormat: input.bankFormat,
    yearHint: input.yearHint,
  });

  // Deduplikasi terhadap baris yang sudah pernah diimpor di dompet ini
  const { data: existingRows, error: existingErr } = await supabase
    .from('planner_bank_statement_rows')
    .select('row_hash, matched_journal_id')
    .eq('org_id', input.orgId)
    .eq('wallet_account_id', input.walletAccountId);

  if (existingErr) throw new Error(existingErr.message);

  const existingHashes = new Set<string>();
  const alreadyMatchedJournalIds = new Set<string>();
  for (const row of existingRows || []) {
    if (row.row_hash) existingHashes.add(row.row_hash as string);
    if (row.matched_journal_id) alreadyMatchedJournalIds.add(row.matched_journal_id as string);
  }

  const seenInBatch = new Set<string>();
  const duplicateHashes: string[] = [];
  const newRows: BankStatementRow[] = [];

  for (const row of parsed.rows) {
    if (existingHashes.has(row.rowHash) || seenInBatch.has(row.rowHash)) {
      duplicateHashes.push(row.rowHash);
      continue;
    }
    seenInBatch.add(row.rowHash);
    newRows.push(row);
  }

  const tolerance = Math.max(0, Math.floor(input.dateToleranceDays ?? 3));
  let startDate = input.periodStart;
  let endDate = input.periodEnd;
  if ((!startDate || !endDate) && newRows.length > 0) {
    const sortedDates = newRows.map((r) => r.entryDate).sort();
    startDate = startDate ?? shiftIsoDate(sortedDates[0], -tolerance);
    endDate = endDate ?? shiftIsoDate(sortedDates[sortedDates.length - 1], tolerance);
  }

  const rawLedgerLines = input.ledgerCashLines
    ?? (newRows.length > 0
      ? await loadWalletLedgerCashLines(input.orgId, input.walletAccountId, {
          startDate,
          endDate,
        })
      : []);

  const availableLedgerLines = rawLedgerLines.filter(
    (line) => !alreadyMatchedJournalIds.has(line.journalId),
  );

  const matchResult = matchBankStatementToLedger(newRows, availableLedgerLines, {
    dateToleranceDays: tolerance,
  });

  if (newRows.length === 0) {
    return {
      parsed,
      duplicateHashes,
      insertedRows: [],
      matchResult,
    };
  }

  const matchedByHash = new Map(
    matchResult.matches.map((m) => [m.bankRow.rowHash, m]),
  );
  const ambiguousHashes = new Set(
    matchResult.ambiguousMatches.map((a) => a.bankRow.rowHash),
  );

  const insertPayload = newRows.map((row) => {
    const matched = matchedByHash.get(row.rowHash);
    const isAmbiguous = ambiguousHashes.has(row.rowHash);
    const matchStatus: BankStatementRowRecord['match_status'] = matched
      ? 'matched'
      : isAmbiguous
        ? 'ambiguous'
        : 'unmatched';

    return {
      org_id: input.orgId,
      wallet_account_id: input.walletAccountId,
      bank_format: row.bankFormat,
      entry_date: row.entryDate,
      description: row.description,
      direction: row.direction,
      amount_rupiah: row.amountRupiah,
      running_balance: row.runningBalance,
      row_hash: row.rowHash,
      match_status: matchStatus,
      matched_journal_id: matched ? matched.ledgerLine.journalId : null,
      matched_score: matched ? matched.similarityScore : null,
      raw_row_json: {
        rawLine: row.rawLine,
        branch: row.branch,
        rowIndex: row.rowIndex,
      },
      imported_by: input.importedBy ?? null,
    };
  });

  const { data: inserted, error: insertErr } = await supabase
    .from('planner_bank_statement_rows')
    .insert(insertPayload)
    .select('*');

  if (insertErr) throw new Error(insertErr.message);

  return {
    parsed,
    duplicateHashes,
    insertedRows: (inserted || []).map((r) => mapStatementRecord(r as Record<string, unknown>)),
    matchResult,
  };
}

/**
 * Meninjau dan menetapkan pasangan jurnal untuk baris mutasi berstatus `ambiguous` atau `unmatched`.
 */
export async function resolveBankStatementMatch(input: {
  orgId: string;
  statementRowId: string;
  matchStatus: 'matched' | 'ignored';
  matchedJournalId?: string | null;
}): Promise<BankStatementRowRecord> {
  if (!input.orgId || !input.statementRowId) {
    throw new Error('orgId dan statementRowId wajib diisi.');
  }
  if (input.matchStatus === 'matched' && !input.matchedJournalId) {
    throw new Error('matchedJournalId wajib diisi saat status matched.');
  }

  const { data, error } = await supabase
    .from('planner_bank_statement_rows')
    .update({
      match_status: input.matchStatus,
      matched_journal_id: input.matchStatus === 'matched' ? input.matchedJournalId : null,
    })
    .eq('org_id', input.orgId)
    .eq('id', input.statementRowId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapStatementRecord(data as Record<string, unknown>);
}

/**
 * Menghitung dan menyimpan rekonsiliasi saldo kas buku besar vs saldo akhir rekening koran bank.
 * Angka saldo buku besar dihitung deterministik dari buku besar (`debit - credit`), tidak pernah oleh LLM.
 */
export async function runCashBankReconciliation(
  input: RunCashBankReconciliationInput,
): Promise<RunCashBankReconciliationResult> {
  if (!input.orgId || !input.walletAccountId) {
    throw new Error('orgId dan walletAccountId wajib diisi.');
  }
  if (!Number.isFinite(input.bankEndingBalance)) {
    throw new Error('bankEndingBalance wajib berupa angka valid.');
  }

  const periodMonthIso = normalizePeriodMonth(input.periodMonth);
  const periodEnd = monthEndFromIso(periodMonthIso);

  let bookCashBalance = input.bookCashBalance;
  if (bookCashBalance == null) {
    const ledgerUpToPeriod = await loadWalletLedgerCashLines(input.orgId, input.walletAccountId, {
      endDate: periodEnd,
    });
    if (ledgerUpToPeriod.length > 0) {
      bookCashBalance = ledgerUpToPeriod.reduce(
        (sum, line) => sum + (line.debit - line.credit),
        0,
      );
    } else {
      const { data: acc, error: accErr } = await supabase
        .from('planner_finance_accounts')
        .select('current_balance')
        .eq('org_id', input.orgId)
        .eq('id', input.walletAccountId)
        .maybeSingle();
      if (accErr) throw new Error(accErr.message);
      bookCashBalance = Math.round(Number(acc?.current_balance) || 0);
    }
  }

  let items = input.items;
  let matchedCount: number | undefined;
  let ambiguousCount: number | undefined;
  let unmatchedBankCount: number | undefined;
  let unmatchedLedgerCount: number | undefined;

  if (!items && input.autoDeriveItems !== false) {
    const [{ data: statementRows, error: stmtErr }, periodLedgerLines] = await Promise.all([
      supabase
        .from('planner_bank_statement_rows')
        .select('*')
        .eq('org_id', input.orgId)
        .eq('wallet_account_id', input.walletAccountId)
        .gte('entry_date', periodMonthIso)
        .lte('entry_date', periodEnd),
      loadWalletLedgerCashLines(input.orgId, input.walletAccountId, {
        startDate: periodMonthIso,
        endDate: periodEnd,
      }),
    ]);

    if (stmtErr) throw new Error(stmtErr.message);

    const mappedStmt = (statementRows || []).map((r) =>
      mapStatementRecord(r as Record<string, unknown>),
    );
    const matchedJournalIds = new Set(
      mappedStmt
        .filter((r) => r.match_status === 'matched' && r.matched_journal_id)
        .map((r) => r.matched_journal_id as string),
    );
    matchedCount = matchedJournalIds.size;
    ambiguousCount = mappedStmt.filter((r) => r.match_status === 'ambiguous').length;

    const openBankRows: BankStatementRow[] = mappedStmt
      .filter((r) => r.match_status === 'unmatched' || r.match_status === 'ambiguous')
      .map((r, idx) => ({
        rowIndex: idx,
        bankFormat: r.bank_format,
        entryDate: r.entry_date,
        description: r.description,
        branch: null,
        direction: r.direction,
        amountRupiah: r.amount_rupiah,
        runningBalance: r.running_balance,
        rowHash: r.row_hash,
        rawLine: '',
      }));

    const unmatchedLedger = periodLedgerLines.filter(
      (line) => !matchedJournalIds.has(line.journalId),
    );
    unmatchedBankCount = mappedStmt.filter((r) => r.match_status === 'unmatched').length;
    unmatchedLedgerCount = unmatchedLedger.length;

    items = deriveReconciliationItems(openBankRows, unmatchedLedger);
  }

  const reconciliation = reconcileCashVsBank({
    bookCashBalance,
    bankEndingBalance: Math.round(input.bankEndingBalance),
    items: items ?? [],
    periodMonth: periodMonthIso,
    walletAccountId: input.walletAccountId,
    matchedCount,
    ambiguousCount,
    unmatchedBankCount,
    unmatchedLedgerCount,
  });

  if (input.persist === false) {
    return { reconciliation, record: null };
  }

  const { data: saved, error: saveErr } = await supabase
    .from('planner_bank_reconciliations')
    .insert({
      org_id: input.orgId,
      wallet_account_id: input.walletAccountId,
      period_month: periodMonthIso,
      book_balance_rupiah: reconciliation.bookCashBalance,
      bank_balance_rupiah: reconciliation.bankEndingBalance,
      explained_diff_rupiah: reconciliation.explainedDifference,
      unexplained_diff_rupiah: reconciliation.unexplainedDifference,
      status: reconciliation.status,
      summary_json: reconciliation as unknown as Record<string, unknown>,
      created_by: input.createdBy ?? null,
    })
    .select('*')
    .single();

  if (saveErr) throw new Error(saveErr.message);

  return {
    reconciliation,
    record: mapReconciliationRecord(saved as Record<string, unknown>),
  };
}
