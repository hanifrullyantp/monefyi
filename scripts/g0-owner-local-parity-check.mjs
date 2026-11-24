#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const TOLERANCE = 0.01;
const EQUITY_TRANSFER_REFS = new Set(['project_close', 'period_close', 'dividend']);
const EXCLUDED_STATUSES = new Set(['dividend', 'cancelled']);

function toRupiah(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function isDeletedRow(row) {
  return row.deleted_at !== null && row.deleted_at !== undefined && String(row.deleted_at).trim() !== '';
}

function isExcludedOperationalRow(row) {
  if (!row || typeof row !== 'object') return true;
  if (isDeletedRow(row)) return true;
  const st = normalizeStatus(row.status);
  return EXCLUDED_STATUSES.has(st);
}

const AKTIVA_TYPES = new Set([
  'kas',
  'piutang',
  'piutang_retensi',
  'stok',
  'aset_tetap',
  'prabayar',
]);

const PENDAPATAN_TYPES = new Set(['pendapatan_proyek']);

const BEBAN_TYPES = new Set([
  'hpp_material',
  'hpp_labor',
  'hpp_equipment',
  'hpp_overhead',
  'hpp_other',
  'hpp_uncategorized',
  'beban_opex',
  'beban_penyusutan',
]);

function effectiveAccountCategory(account) {
  if (
    account.category === 'aktiva'
    || account.category === 'pasiva'
    || account.category === 'pendapatan'
    || account.category === 'beban'
  ) {
    return account.category;
  }
  const t = String(account.type || '');
  if (AKTIVA_TYPES.has(t)) return 'aktiva';
  if (PENDAPATAN_TYPES.has(t)) return 'pendapatan';
  if (BEBAN_TYPES.has(t)) return 'beban';
  return 'pasiva';
}

function isPlAccountType(type) {
  return (
    type === 'laba'
    || type === 'pendapatan_proyek'
    || type.startsWith('hpp_')
    || type === 'beban_opex'
    || type === 'beban_penyusutan'
  );
}

function pickTable(raw, shortKey, prefixedKey) {
  if (Array.isArray(raw?.[shortKey])) return raw[shortKey];
  if (Array.isArray(raw?.[prefixedKey])) return raw[prefixedKey];
  return [];
}

/**
 * Membangun dataset sintetis lokal untuk mode --demo-synthetic tanpa akses jaringan/DB.
 */
export function buildSyntheticOwnerExport() {
  const accounts = [
    { id: 'acc-kas', type: 'kas', category: 'aktiva', name: 'Kas Bisnis', project_id: null, current_balance: 375_000_000, is_active: true },
    { id: 'acc-piutang', type: 'piutang', category: 'aktiva', name: 'Piutang Usaha', project_id: null, current_balance: 40_000_000, is_active: true },
    { id: 'acc-hutang', type: 'hutang_dagang', category: 'pasiva', name: 'Hutang Dagang', project_id: null, current_balance: 25_000_000, is_active: true },
    { id: 'acc-dp', type: 'uang_muka_klien', category: 'pasiva', name: 'Uang Muka Klien', project_id: null, current_balance: 60_000_000, is_active: true },
    { id: 'acc-modal', type: 'modal_disetor', category: 'pasiva', name: 'Modal Disetor', project_id: null, current_balance: 250_000_000, is_active: true },
    { id: 'acc-dividen', type: 'dividen', category: 'pasiva', name: 'Dividen', project_id: null, current_balance: -15_000_000, is_active: true },
    { id: 'acc-rev', type: 'pendapatan_proyek', category: 'pendapatan', name: 'Pendapatan Proyek', project_id: null, current_balance: 200_000_000, is_active: true },
    { id: 'acc-hpp-mat', type: 'hpp_material', category: 'beban', name: 'HPP Material', project_id: null, current_balance: 70_000_000, is_active: true },
    { id: 'acc-hpp-lab', type: 'hpp_labor', category: 'beban', name: 'HPP Upah', project_id: null, current_balance: 30_000_000, is_active: true },
    { id: 'acc-hpp-uncat', type: 'hpp_uncategorized', category: 'beban', name: 'HPP Belum Dikategorikan', project_id: null, current_balance: 5_000_000, is_active: true },
    { id: 'acc-opex', type: 'beban_opex', category: 'beban', name: 'Beban Operasional', project_id: null, current_balance: 20_000_000, is_active: true },
  ];

  // Rincian kas: Modal 250jt + Termin 160jt + DP 60jt - Biaya Tunai 80jt - Opex 20jt - Dividen 15jt = 355jt
  // Tambah pelunasan piutang 0, termin akrual 40jt (Piutang 40jt -> Pendapatan 40jt, total Pendapatan = 200jt)
  // Perbaiki saldo kas di atas: 250 + 160 + 60 - 80 - 20 - 15 = 355jt!
  accounts[0].current_balance = 355_000_000;
  // Cek Neraca: Aktiva = Kas 355 + Piutang 40 = 395jt
  // Pasiva = Hutang 25 + DP 60 + Modal 250 + Dividen(-15) + Laba(200 - 105 - 20 = 75) = 395jt!

  const project_incomes = [
    { id: 'inc-1', project_id: 'p-1', date: '2026-11-02', amount: 60_000_000, category: 'dp', status: 'received', deleted_at: null, journal_entry_id: 'je-dp-1' },
    { id: 'inc-2', project_id: 'p-1', date: '2026-11-05', amount: 100_000_000, category: 'termin', status: 'received', deleted_at: null, journal_entry_id: 'je-inc-2' },
    { id: 'inc-3', project_id: 'p-2', date: '2026-11-10', amount: 60_000_000, category: 'pelunasan', status: 'received', deleted_at: null, journal_entry_id: 'je-inc-3' },
    { id: 'inc-4', project_id: 'p-2', date: '2026-11-12', amount: 40_000_000, category: 'termin', status: 'invoiced', deleted_at: null, journal_entry_id: 'je-inc-4' },
    // Baris yang harus dikecualikan oleh laporan operasional
    { id: 'inc-cancelled', project_id: 'p-1', date: '2026-11-14', amount: 25_000_000, category: 'termin', status: 'cancelled', deleted_at: null, journal_entry_id: null },
    { id: 'inc-deleted', project_id: 'p-1', date: '2026-11-15', amount: 15_000_000, category: 'termin', status: 'received', deleted_at: '2026-11-16T00:00:00Z', journal_entry_id: null },
  ];

  const cost_realizations = [
    { id: 'cost-1', project_id: 'p-1', date: '2026-11-06', total_amount: 45_000_000, rap_item_id: 'rap-mat', status: 'recorded', deleted_at: null, journal_entry_id: 'je-cost-1' },
    { id: 'cost-2', project_id: 'p-1', date: '2026-11-07', total_amount: 30_000_000, rap_item_id: 'rap-lab', status: 'recorded', deleted_at: null, journal_entry_id: 'je-cost-2' },
    { id: 'cost-3', project_id: 'p-2', date: '2026-11-09', total_amount: 25_000_000, rap_item_id: 'rap-mat', status: 'unpaid', deleted_at: null, journal_entry_id: 'je-cost-3' },
    { id: 'cost-4', project_id: 'p-2', date: '2026-11-11', total_amount: 5_000_000, rap_item_id: null, status: 'recorded', deleted_at: null, journal_entry_id: 'je-cost-4' },
    // Baris dividen/dibatalkan/soft-deleted harus dikecualikan
    { id: 'cost-div-legacy', project_id: 'p-1', date: '2026-11-18', total_amount: 15_000_000, rap_item_id: null, status: 'dividend', deleted_at: null, journal_entry_id: null },
    { id: 'cost-cancelled', project_id: 'p-1', date: '2026-11-19', total_amount: 9_000_000, rap_item_id: 'rap-mat', status: 'cancelled', deleted_at: null, journal_entry_id: null },
    { id: 'cost-deleted', project_id: 'p-2', date: '2026-11-20', total_amount: 12_000_000, rap_item_id: 'rap-mat', status: 'recorded', deleted_at: '2026-11-21T00:00:00Z', journal_entry_id: null },
  ];

  const opex_realizations = [
    { id: 'opx-1', category_id: 'cat-sewa', paid_date: '2026-11-03', amount: 12_000_000, status: 'recorded', deleted_at: null, journal_entry_id: 'je-opx-1' },
    { id: 'opx-2', category_id: 'cat-listrik', paid_date: '2026-11-08', amount: 8_000_000, status: 'recorded', deleted_at: null, journal_entry_id: 'je-opx-2' },
    { id: 'opx-deleted', category_id: 'cat-sewa', paid_date: '2026-11-09', amount: 3_000_000, status: 'cancelled', deleted_at: '2026-11-10T00:00:00Z', journal_entry_id: null },
  ];

  const journal_entries = [
    { id: 'je-open', entry_date: '2026-11-01', reference_type: 'opening', reference_id: null, description: 'Modal Disetor Awal' },
    { id: 'je-dp-1', entry_date: '2026-11-02', reference_type: 'project_income', reference_id: 'inc-1', description: 'DP Proyek 1' },
    { id: 'je-opx-1', entry_date: '2026-11-03', reference_type: 'opex', reference_id: 'opx-1', description: 'Sewa Kantor' },
    { id: 'je-inc-2', entry_date: '2026-11-05', reference_type: 'project_income', reference_id: 'inc-2', description: 'Termin 1 Proyek 1' },
    { id: 'je-cost-1', entry_date: '2026-11-06', reference_type: 'project_expense', reference_id: 'cost-1', description: 'Material Proyek 1' },
    { id: 'je-cost-2', entry_date: '2026-11-07', reference_type: 'project_expense', reference_id: 'cost-2', description: 'Upah Proyek 1' },
    { id: 'je-opx-2', entry_date: '2026-11-08', reference_type: 'opex', reference_id: 'opx-2', description: 'Listrik & Internet' },
    { id: 'je-cost-3', entry_date: '2026-11-09', reference_type: 'project_expense', reference_id: 'cost-3', description: 'Material Tempo Proyek 2' },
    { id: 'je-inc-3', entry_date: '2026-11-10', reference_type: 'project_income', reference_id: 'inc-3', description: 'Pelunasan Proyek 2' },
    { id: 'je-cost-4', entry_date: '2026-11-11', reference_type: 'project_expense', reference_id: 'cost-4', description: 'Beli Baut Tanpa RAP' },
    { id: 'je-inc-4', entry_date: '2026-11-12', reference_type: 'project_income', reference_id: 'inc-4', description: 'Tagihan Termin Proyek 2' },
    { id: 'je-div-1', entry_date: '2026-11-18', reference_type: 'dividend', reference_id: null, description: 'Dividen Pemilik' },
  ];

  const journal_lines = [
    { id: 'jl-1', journal_id: 'je-open', account_id: 'acc-kas', debit: 250_000_000, credit: 0, project_id: null, needs_review: false },
    { id: 'jl-2', journal_id: 'je-open', account_id: 'acc-modal', debit: 0, credit: 250_000_000, project_id: null, needs_review: false },

    { id: 'jl-3', journal_id: 'je-dp-1', account_id: 'acc-kas', debit: 60_000_000, credit: 0, project_id: 'p-1', needs_review: false },
    { id: 'jl-4', journal_id: 'je-dp-1', account_id: 'acc-dp', debit: 0, credit: 60_000_000, project_id: 'p-1', needs_review: false },

    { id: 'jl-5', journal_id: 'je-opx-1', account_id: 'acc-opex', debit: 12_000_000, credit: 0, project_id: null, needs_review: false },
    { id: 'jl-6', journal_id: 'je-opx-1', account_id: 'acc-kas', debit: 0, credit: 12_000_000, project_id: null, needs_review: false },

    { id: 'jl-7', journal_id: 'je-inc-2', account_id: 'acc-kas', debit: 100_000_000, credit: 0, project_id: 'p-1', needs_review: false },
    { id: 'jl-8', journal_id: 'je-inc-2', account_id: 'acc-rev', debit: 0, credit: 100_000_000, project_id: 'p-1', needs_review: false },

    { id: 'jl-9', journal_id: 'je-cost-1', account_id: 'acc-hpp-mat', debit: 45_000_000, credit: 0, project_id: 'p-1', needs_review: false },
    { id: 'jl-10', journal_id: 'je-cost-1', account_id: 'acc-kas', debit: 0, credit: 45_000_000, project_id: 'p-1', needs_review: false },

    { id: 'jl-11', journal_id: 'je-cost-2', account_id: 'acc-hpp-lab', debit: 30_000_000, credit: 0, project_id: 'p-1', needs_review: false },
    { id: 'jl-12', journal_id: 'je-cost-2', account_id: 'acc-kas', debit: 0, credit: 30_000_000, project_id: 'p-1', needs_review: false },

    { id: 'jl-13', journal_id: 'je-opx-2', account_id: 'acc-opex', debit: 8_000_000, credit: 0, project_id: null, needs_review: false },
    { id: 'jl-14', journal_id: 'je-opx-2', account_id: 'acc-kas', debit: 0, credit: 8_000_000, project_id: null, needs_review: false },

    { id: 'jl-15', journal_id: 'je-cost-3', account_id: 'acc-hpp-mat', debit: 25_000_000, credit: 0, project_id: 'p-2', needs_review: false },
    { id: 'jl-16', journal_id: 'je-cost-3', account_id: 'acc-hutang', debit: 0, credit: 25_000_000, project_id: 'p-2', needs_review: false },

    { id: 'jl-17', journal_id: 'je-inc-3', account_id: 'acc-kas', debit: 60_000_000, credit: 0, project_id: 'p-2', needs_review: false },
    { id: 'jl-18', journal_id: 'je-inc-3', account_id: 'acc-rev', debit: 0, credit: 60_000_000, project_id: 'p-2', needs_review: false },

    { id: 'jl-19', journal_id: 'je-cost-4', account_id: 'acc-hpp-uncat', debit: 5_000_000, credit: 0, project_id: 'p-2', needs_review: true, notes: 'Biaya tanpa item RAP — perlu tinjauan pemilik' },
    { id: 'jl-20', journal_id: 'je-cost-4', account_id: 'acc-kas', debit: 0, credit: 5_000_000, project_id: 'p-2', needs_review: false },

    { id: 'jl-21', journal_id: 'je-inc-4', account_id: 'acc-piutang', debit: 40_000_000, credit: 0, project_id: 'p-2', needs_review: false },
    { id: 'jl-22', journal_id: 'je-inc-4', account_id: 'acc-rev', debit: 0, credit: 40_000_000, project_id: 'p-2', needs_review: false },

    { id: 'jl-23', journal_id: 'je-div-1', account_id: 'acc-dividen', debit: 15_000_000, credit: 0, project_id: null, needs_review: false },
    { id: 'jl-24', journal_id: 'je-div-1', account_id: 'acc-kas', debit: 0, credit: 15_000_000, project_id: null, needs_review: false },
  ];

  return {
    dataset: 'SYNTHETIC',
    project_incomes,
    cost_realizations,
    opex_realizations,
    journal_entries,
    journal_lines,
    finance_accounts: accounts,
  };
}

/**
 * Mengevaluasi paritas laporan operasional lama vs buku besar serta mendeteksi anomali secara 100% offline.
 */
export function runOwnerParityCheck(rawInput, options = {}) {
  const incomes = pickTable(rawInput, 'project_incomes', 'planner_project_incomes');
  const costs = pickTable(rawInput, 'cost_realizations', 'planner_cost_realizations');
  const opexRows = pickTable(rawInput, 'opex_realizations', 'planner_opex_realizations');
  const entries = pickTable(rawInput, 'journal_entries', 'planner_journal_entries');
  const lines = pickTable(rawInput, 'journal_lines', 'planner_journal_lines');
  const accounts = pickTable(rawInput, 'finance_accounts', 'planner_finance_accounts');

  const accountById = new Map();
  for (const acc of accounts) {
    accountById.set(acc.id, acc);
  }

  const entryById = new Map();
  for (const je of entries) {
    entryById.set(je.id, je);
  }

  // 1. Hitung laporan operasional lama (mengecualikan status IN ('dividend','cancelled') dan deleted_at != null)
  let opRevenueNonDp = 0;
  let opDpReceived = 0;
  let opPendingExcluded = 0;
  let excludedIncomeRows = 0;
  const missingJournalEntryId = [];

  for (const row of incomes) {
    if (isExcludedOperationalRow(row)) {
      excludedIncomeRows += 1;
      continue;
    }
    const status = normalizeStatus(row.status || 'received');
    const amount = toRupiah(row.amount);
    const cat = normalizeStatus(row.category || 'other');

    if (status === 'pending' && cat !== 'retensi') {
      opPendingExcluded += amount;
      continue;
    }

    if (!row.journal_entry_id) {
      missingJournalEntryId.push({
        table: 'project_incomes',
        id: row.id,
        status,
        category: cat,
        amount,
      });
    }

    if (cat === 'dp' && status === 'received') {
      opDpReceived += amount;
    } else if (status === 'received' || status === 'invoiced' || status === 'accrued' || (cat === 'retensi' && status === 'pending')) {
      opRevenueNonDp += amount;
    }
  }

  let opHpp = 0;
  let excludedCostRows = 0;
  for (const row of costs) {
    if (isExcludedOperationalRow(row)) {
      excludedCostRows += 1;
      continue;
    }
    const amount = toRupiah(row.total_amount ?? row.amount ?? 0);
    opHpp += amount;
    if (!row.journal_entry_id) {
      missingJournalEntryId.push({
        table: 'cost_realizations',
        id: row.id,
        status: normalizeStatus(row.status || 'recorded'),
        amount,
      });
    }
  }

  let opOpex = 0;
  let excludedOpexRows = 0;
  for (const row of opexRows) {
    if (isExcludedOperationalRow(row)) {
      excludedOpexRows += 1;
      continue;
    }
    const amount = toRupiah(row.amount ?? 0);
    opOpex += amount;
    if (!row.journal_entry_id) {
      missingJournalEntryId.push({
        table: 'opex_realizations',
        id: row.id,
        status: normalizeStatus(row.status || 'recorded'),
        amount,
      });
    }
  }

  // 2. Hitung laporan & metrik dari buku besar (journal_entries, journal_lines, finance_accounts)
  let ledgerRevenue = 0;
  let ledgerHpp = 0;
  let ledgerOpex = 0;
  let ledgerOtherExpense = 0;
  let ledgerDpRecognized = 0;
  let hasF1Accounts = false;

  const linesByJournal = new Map();
  const needsReviewLines = [];
  let kasFromJournalLines = 0;

  for (const line of lines) {
    const acc = accountById.get(line.account_id);
    const accType = String(acc?.type || line.account_type || '');
    const je = entryById.get(line.journal_id);
    const refType = je?.reference_type ?? line.reference_type ?? null;
    const refId = je?.reference_id ?? line.reference_id ?? null;
    const debit = toRupiah(line.debit ?? 0);
    const credit = toRupiah(line.credit ?? 0);

    if (!linesByJournal.has(line.journal_id)) {
      linesByJournal.set(line.journal_id, []);
    }
    linesByJournal.get(line.journal_id).push({ debit, credit });

    if (line.needs_review === true) {
      needsReviewLines.push({
        lineId: line.id || null,
        journalId: line.journal_id,
        accountId: line.account_id,
        accountType: accType || null,
        debit,
        credit,
        projectId: line.project_id ?? null,
        notes: line.notes ?? null,
      });
    }

    if (accType === 'kas') {
      kasFromJournalLines += debit - credit;
    }

    if (accType === 'pendapatan_proyek' || accType === 'uang_muka_klien' || accType.startsWith('hpp_') || accType === 'beban_opex') {
      hasF1Accounts = true;
    }

    if (refType === 'revenue_recognition' && accType === 'pendapatan_proyek') {
      ledgerDpRecognized += credit - debit;
    }

    if (!isPlAccountType(accType)) continue;
    if (refType && EQUITY_TRANSFER_REFS.has(refType)) continue;

    if (refType === 'reversal') {
      const orig = refId ? entryById.get(refId) : undefined;
      const origType = orig?.reference_type || null;
      if (origType && EQUITY_TRANSFER_REFS.has(origType)) continue;

      if (accType === 'pendapatan_proyek' || origType === 'project_income' || (!origType && debit > 0 && credit === 0 && accType === 'laba')) {
        ledgerRevenue -= debit - credit;
      } else if (accType === 'beban_opex' || origType === 'opex') {
        ledgerOpex -= credit - debit;
      } else if (accType === 'beban_penyusutan' || origType === 'amortize' || origType === 'depreciation') {
        ledgerOtherExpense -= credit - debit;
      } else {
        ledgerHpp -= credit - debit;
      }
      continue;
    }

    if (accType === 'pendapatan_proyek') {
      ledgerRevenue += credit - debit;
    } else if (accType.startsWith('hpp_')) {
      ledgerHpp += debit - credit;
    } else if (accType === 'beban_opex') {
      ledgerOpex += debit - credit;
    } else if (accType === 'beban_penyusutan') {
      ledgerOtherExpense += debit - credit;
    } else if (accType === 'laba') {
      if (credit > 0) ledgerRevenue += credit;
      if (debit > 0) {
        if (refType === 'opex' || refType === 'bon_disbursement') ledgerOpex += debit;
        else if (refType === 'project_expense' || refType === 'payable_payment') ledgerHpp += debit;
        else if (refType === 'payroll_disbursement' || refType === 'payroll_accrual') {
          if (line.project_id) ledgerHpp += debit;
          else ledgerOpex += debit;
        } else {
          ledgerOtherExpense += debit;
        }
      }
    }
  }

  // Cek jurnal tidak seimbang (debit !== credit)
  const unbalancedJournals = [];
  const checkedJournalIds = new Set();

  for (const je of entries) {
    checkedJournalIds.add(je.id);
    const jLines = linesByJournal.get(je.id) || [];
    const totalDebit = jLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = jLines.reduce((s, l) => s + l.credit, 0);
    if (jLines.length === 0 || Math.abs(totalDebit - totalCredit) > TOLERANCE) {
      unbalancedJournals.push({
        journalId: je.id,
        referenceType: je.reference_type ?? null,
        entryDate: je.entry_date ?? null,
        lineCount: jLines.length,
        totalDebit: toRupiah(totalDebit),
        totalCredit: toRupiah(totalCredit),
        diff: toRupiah(totalDebit - totalCredit),
      });
    }
  }
  for (const [jid, jLines] of linesByJournal.entries()) {
    if (checkedJournalIds.has(jid)) continue;
    const totalDebit = jLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = jLines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > TOLERANCE) {
      unbalancedJournals.push({
        journalId: jid,
        referenceType: null,
        entryDate: null,
        lineCount: jLines.length,
        totalDebit: toRupiah(totalDebit),
        totalCredit: toRupiah(totalCredit),
        diff: toRupiah(totalDebit - totalCredit),
      });
    }
  }

  // 3. Total Kas & Neraca dari finance_accounts
  let kasFromAccounts = 0;
  const aktiva = [];
  const pasiva = [];
  let bsTotalPendapatan = 0;
  let bsTotalBeban = 0;
  let bsLegacyLaba = 0;

  for (const acc of accounts) {
    if (acc.is_active === false) continue;
    const bal = toRupiah(acc.current_balance ?? 0);
    const cat = effectiveAccountCategory(acc);

    if (acc.type === 'kas') {
      kasFromAccounts += bal;
    }

    if (cat === 'pendapatan') {
      bsTotalPendapatan += bal;
      continue;
    }
    if (cat === 'beban') {
      bsTotalBeban += bal;
      continue;
    }
    if (cat === 'pasiva' && acc.type === 'laba') {
      bsLegacyLaba += bal;
      continue;
    }
    if (Math.abs(bal) < TOLERANCE) continue;

    const row = { id: acc.id, name: acc.name, type: acc.type, category: cat, balance: bal };
    if (cat === 'aktiva') aktiva.push(row);
    else pasiva.push(row);
  }

  const bsComputedProfit = toRupiah(bsLegacyLaba + (bsTotalPendapatan - bsTotalBeban));
  if (Math.abs(bsComputedProfit) >= TOLERANCE) {
    pasiva.push({
      id: 'computed-laba',
      name: 'Laba Periode Berjalan (Dari Buku Besar)',
      type: 'laba',
      category: 'pasiva',
      balance: bsComputedProfit,
    });
  }

  const totalAktiva = toRupiah(aktiva.reduce((s, r) => s + r.balance, 0));
  const totalPasiva = toRupiah(pasiva.reduce((s, r) => s + r.balance, 0));
  const balanceSheetBalanced = Math.abs(totalAktiva - totalPasiva) <= TOLERANCE;
  const expenseInAktiva = aktiva.filter(
    (r) => String(r.type).startsWith('hpp_') || String(r.type).startsWith('beban_') || r.category === 'beban',
  ).length;

  const opExpectedRevenue = hasF1Accounts
    ? toRupiah(opRevenueNonDp + ledgerDpRecognized)
    : toRupiah(opRevenueNonDp + opDpReceived);
  const opNetProfit = toRupiah(opExpectedRevenue - opHpp - opOpex);
  const ledgerNetProfit = toRupiah(ledgerRevenue - ledgerHpp - ledgerOpex - ledgerOtherExpense);

  const comparison = {
    totalPendapatan: {
      operational: opExpectedRevenue,
      operationalNonDp: toRupiah(opRevenueNonDp),
      operationalDpReceived: toRupiah(opDpReceived),
      ledger: toRupiah(ledgerRevenue),
      diff: toRupiah(opExpectedRevenue - ledgerRevenue),
      matched: Math.abs(opExpectedRevenue - ledgerRevenue) <= TOLERANCE,
    },
    totalHpp: {
      operational: toRupiah(opHpp),
      ledger: toRupiah(ledgerHpp),
      diff: toRupiah(opHpp - ledgerHpp),
      matched: Math.abs(opHpp - ledgerHpp) <= TOLERANCE,
    },
    totalOpex: {
      operational: toRupiah(opOpex),
      ledger: toRupiah(ledgerOpex),
      diff: toRupiah(opOpex - ledgerOpex),
      matched: Math.abs(opOpex - ledgerOpex) <= TOLERANCE,
    },
    labaBersih: {
      operational: opNetProfit,
      ledger: ledgerNetProfit,
      diff: toRupiah(opNetProfit - ledgerNetProfit),
      matched: Math.abs(opNetProfit - ledgerNetProfit) <= TOLERANCE,
    },
    totalKas: {
      accountsBalance: toRupiah(kasFromAccounts),
      replayedFromJournalLines: toRupiah(kasFromJournalLines),
      diff: toRupiah(kasFromAccounts - kasFromJournalLines),
      matched: Math.abs(kasFromAccounts - kasFromJournalLines) <= TOLERANCE,
    },
    neraca: {
      totalAktiva,
      totalPasiva,
      isBalanced: balanceSheetBalanced,
      expenseInAktiva,
      aktivaCount: aktiva.length,
      pasivaCount: pasiva.length,
    },
  };

  const strictNeedsReview = Boolean(options.strictNeedsReview);
  const anomalies = {
    missingJournalEntryIdCount: missingJournalEntryId.length,
    missingJournalEntryId,
    unbalancedJournalsCount: unbalancedJournals.length,
    unbalancedJournals,
    needsReviewCount: needsReviewLines.length,
    needsReviewLines,
  };

  const parityPassed =
    comparison.totalPendapatan.matched
    && comparison.totalHpp.matched
    && comparison.totalOpex.matched
    && comparison.labaBersih.matched
    && comparison.totalKas.matched
    && comparison.neraca.isBalanced
    && comparison.neraca.expenseInAktiva === 0
    && anomalies.missingJournalEntryIdCount === 0
    && anomalies.unbalancedJournalsCount === 0
    && (!strictNeedsReview || anomalies.needsReviewCount === 0);

  return {
    mode: 'OFFLINE_LOCAL_ONLY',
    dataset: rawInput?.dataset || 'OWNER_LOCAL_EXPORT',
    ledgerSchemaMode: hasF1Accounts ? 'F1_COA' : 'F0_LEGACY_LABA',
    excludedRows: {
      incomes: excludedIncomeRows,
      costs: excludedCostRows,
      opex: excludedOpexRows,
      pendingIncomesExcluded: toRupiah(opPendingExcluded),
    },
    comparison,
    anomalies,
    ok: parityPassed,
    status: parityPassed ? 'PASS' : 'FAIL',
  };
}

function parseArgs(argv) {
  let inputPath = null;
  let demoSynthetic = false;
  let strictNeedsReview = false;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--demo-synthetic') {
      demoSynthetic = true;
    } else if (arg === '--strict-needs-review') {
      strictNeedsReview = true;
    } else if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--input' && argv[i + 1]) {
      inputPath = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--input=')) {
      inputPath = arg.slice('--input='.length);
    }
  }

  return { inputPath, demoSynthetic, strictNeedsReview, help };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      'Penggunaan: node scripts/g0-owner-local-parity-check.mjs [--demo-synthetic | --input <path-ke-export.json>] [--strict-needs-review]',
    );
    process.exit(0);
  }

  if (!args.demoSynthetic && !args.inputPath) {
    console.error(
      'Error: Harap tentukan --input <path-ke-export.json> atau --demo-synthetic.',
    );
    process.exit(1);
  }

  let payload;
  if (args.demoSynthetic) {
    payload = buildSyntheticOwnerExport();
  } else {
    const absPath = resolve(process.cwd(), args.inputPath);
    if (!existsSync(absPath)) {
      console.error(`Error: File tidak ditemukan: ${absPath}`);
      process.exit(1);
    }
    try {
      payload = JSON.parse(readFileSync(absPath, 'utf8'));
    } catch (err) {
      console.error(`Error: Gagal membaca JSON dari ${absPath}: ${err.message}`);
      process.exit(1);
    }
  }

  const report = runOwnerParityCheck(payload, { strictNeedsReview: args.strictNeedsReview });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
