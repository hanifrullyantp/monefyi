import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('../../supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

import {
  deriveReconciliationItems,
  matchBankStatementToLedger,
  parseBankStatementCsv,
  reconcileCashVsBank,
  type LedgerCashLine,
} from '../../../../../../packages/domain/src/bankStatement';
import {
  importAndMatchBankStatement,
  runCashBankReconciliation,
} from '../../../services/financeV2/bankReconciliationService';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../../../../..', import.meta.url)));
const MIGRATION_PATH = resolve(
  REPO_ROOT,
  'my-supabase-project/supabase/migrations/20261124151000_g1_2_bank_reconciliation.sql',
);

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

describe('G1-2: Impor Mutasi Bank, Pencocokan Otomatis, & Rekonsiliasi Kas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseBankStatementCsv (BCA, Mandiri, BRI/BNI, Generic, & Deduplikasi rowHash)', () => {
    it('mengurai format BCA (Tanggal,Keterangan,Cabang,Jumlah,Saldo dengan CR/DB, DD/MM, dan footer)', () => {
      const bcaCsv = [
        'Informasi Rekening',
        'No. Rekening : 1234567890',
        'Tanggal,Keterangan,Cabang,Jumlah,Saldo',
        '10/11,"TRSF E-BANKING CR 1110/FTSCY/WS95031 TERMIN 1 PT SINAR",0000,"15.000.000,00 CR","25.000.000,00"',
        '12/11,"BI-FAST DB TRANSFER KE TB MAJU JAYA",0000,"2.750.000,00 DB","22.250.000,00"',
        '15/11,"BIAYA ADM BANK",0000,"25.000,00 DB","22.225.000,00"',
        'PEND,"TARIKAN ATM BELUM POSTING",0000,"500.000,00 DB","21.725.000,00"',
        'Saldo Awal,,,"10.000.000,00",',
        'Saldo Akhir,,,"22.225.000,00",',
      ].join('\n');

      const parsed = parseBankStatementCsv(bcaCsv, { yearHint: 2026 });

      expect(parsed.bankFormat).toBe('bca');
      expect(parsed.delimiter).toBe(',');
      expect(parsed.rows).toHaveLength(3);
      expect(parsed.endingBalance).toBe(22_225_000);

      expect(parsed.rows[0]).toMatchObject({
        bankFormat: 'bca',
        entryDate: '2026-11-10',
        direction: 'in',
        amountRupiah: 15_000_000,
        runningBalance: 25_000_000,
        branch: '0000',
      });
      expect(parsed.rows[0].description).toContain('TERMIN 1 PT SINAR');
      expect(parsed.rows[0].rowHash).toMatch(/^[a-f0-9]{64}$/);

      expect(parsed.rows[1]).toMatchObject({
        entryDate: '2026-11-12',
        direction: 'out',
        amountRupiah: 2_750_000,
        runningBalance: 22_250_000,
      });

      expect(parsed.rows[2]).toMatchObject({
        entryDate: '2026-11-15',
        direction: 'out',
        amountRupiah: 25_000,
        runningBalance: 22_225_000,
      });

      // Baris PEND + Saldo Awal + Saldo Akhir masuk skippedRows
      expect(parsed.skippedRows.length).toBe(3);
    });

    it('mengurai format Mandiri (Tanggal,Deskripsi,Debit,Kredit,Saldo) dengan pemisah titik koma', () => {
      const mandiriCsv = [
        'Bank Mandiri - Mutasi Rekening',
        'Tanggal;Deskripsi;Debit;Kredit;Saldo',
        '2026-11-05;MCM Inhouse Trf Dari CV Karya Abadi;0;45.000.000,00;65.000.000,00',
        '2026-11-06;Pembayaran Vendor Semen Gresik;12.500.000,00;0;52.500.000,00',
        '2026-11-30;Bunga Giro November;0;120.000,00;52.620.000,00',
      ].join('\n');

      const parsed = parseBankStatementCsv(mandiriCsv);

      expect(parsed.bankFormat).toBe('mandiri');
      expect(parsed.delimiter).toBe(';');
      expect(parsed.rows).toHaveLength(3);
      expect(parsed.endingBalance).toBe(52_620_000);

      expect(parsed.rows[0]).toMatchObject({
        bankFormat: 'mandiri',
        entryDate: '2026-11-05',
        direction: 'in',
        amountRupiah: 45_000_000,
        runningBalance: 65_000_000,
      });
      expect(parsed.rows[1]).toMatchObject({
        entryDate: '2026-11-06',
        direction: 'out',
        amountRupiah: 12_500_000,
        runningBalance: 52_500_000,
      });
      expect(parsed.rows[2]).toMatchObject({
        entryDate: '2026-11-30',
        direction: 'in',
        amountRupiah: 120_000,
        runningBalance: 52_620_000,
      });
    });

    it('mengurai format BRI (TSV) dan Generic CSV dengan nominal bertanda & angka format US', () => {
      const briTsv = [
        'Bank Rakyat Indonesia (BRI)',
        'Tanggal\tDeskripsi\tDebit\tKredit\tSaldo',
        '14/11/2026\tBRIVA Masuk Proyek C\t0.00\t8,500,000.00\t18,500,000.00',
        '15/11/2026\tTransfer Keluar Upah Tukang\t3,200,000.00\t0.00\t15,300,000.00',
      ].join('\n');

      const briParsed = parseBankStatementCsv(briTsv);
      expect(briParsed.bankFormat).toBe('bri');
      expect(briParsed.delimiter).toBe('\t');
      expect(briParsed.rows).toHaveLength(2);
      expect(briParsed.rows[0]).toMatchObject({
        entryDate: '2026-11-14',
        direction: 'in',
        amountRupiah: 8_500_000,
        runningBalance: 18_500_000,
      });
      expect(briParsed.rows[1]).toMatchObject({
        entryDate: '2026-11-15',
        direction: 'out',
        amountRupiah: 3_200_000,
        runningBalance: 15_300_000,
      });

      const genericCsv = [
        'Date,Memo,Amount,Balance',
        '2026-11-20,Setoran Pelanggan,+1250000,11250000',
        '2026-11-21,Beli BBM Operasional,-350000,10900000',
      ].join('\n');

      const genericParsed = parseBankStatementCsv(genericCsv);
      expect(genericParsed.bankFormat).toBe('generic');
      expect(genericParsed.rows).toHaveLength(2);
      expect(genericParsed.rows[0]).toMatchObject({
        entryDate: '2026-11-20',
        direction: 'in',
        amountRupiah: 1_250_000,
        runningBalance: 11_250_000,
      });
      expect(genericParsed.rows[1]).toMatchObject({
        entryDate: '2026-11-21',
        direction: 'out',
        amountRupiah: 350_000,
        runningBalance: 10_900_000,
      });

      const bniCsv = [
        'Bank Negara Indonesia (BNI)',
        'Tanggal,Deskripsi,Debit,Kredit,Saldo',
        '22-11-2026,Transfer Masuk Pelunasan,0,"7.500.000,00","20.000.000,00"',
      ].join('\n');
      const bniParsed = parseBankStatementCsv(bniCsv);
      expect(bniParsed.bankFormat).toBe('bni');
      expect(bniParsed.rows[0]).toMatchObject({
        bankFormat: 'bni',
        entryDate: '2026-11-22',
        direction: 'in',
        amountRupiah: 7_500_000,
        runningBalance: 20_000_000,
      });
    });

    it('menghasilkan rowHash deterministik untuk deduplikasi impor ulang namun membedakan transaksi kembar', () => {
      const csv = [
        'Tanggal,Keterangan,Cabang,Jumlah,Saldo',
        '18/11,TRF ATM KELUAR,0000,"500.000,00 DB","9.500.000,00"',
        '18/11,TRF ATM KELUAR,0000,"500.000,00 DB","9.000.000,00"',
      ].join('\n');

      const first = parseBankStatementCsv(csv, { bankFormat: 'auto', yearHint: 2026 });
      const second = parseBankStatementCsv(csv, { bankFormat: 'bca', yearHint: 2026 });

      expect(first.rows).toHaveLength(2);
      // Sama saat diimpor ulang (baik auto maupun eksplisit bca)
      expect(first.rows[0].rowHash).toBe(second.rows[0].rowHash);
      expect(first.rows[1].rowHash).toBe(second.rows[1].rowHash);
      // Dua baris dengan saldo berbeda memiliki rowHash berbeda
      expect(first.rows[0].rowHash).not.toBe(first.rows[1].rowHash);
    });
  });

  describe('matchBankStatementToLedger (1-to-1, toleransi tanggal, deteksi ambigu, & antrean unmatched)', () => {
    it('mencocokkan 1-to-1 dalam toleransi 3 hari memakai skor kemiripan teks sebagai tie-breaker', () => {
      const csv = [
        'Tanggal,Deskripsi,Debit,Kredit,Saldo',
        '2026-11-12,BI-FAST KE TB MAJU JAYA SEMEN,2500000,0,17500000',
        '2026-11-14,TRF MASUK TERMIN PT SINAR,0,10000000,27500000',
        '2026-11-15,BIAYA ADMIN BANK,25000,0,27475000',
      ].join('\n');
      const parsed = parseBankStatementCsv(csv, { bankFormat: 'mandiri' });

      const ledgerLines: LedgerCashLine[] = [
        {
          id: 'line-1',
          journalId: 'je-1',
          entryDate: '2026-11-10', // selisih 2 hari (<= 3)
          description: 'Beli semen proyek A',
          partyName: 'TB Maju Jaya',
          debit: 0,
          credit: 2_500_000,
        },
        {
          id: 'line-2',
          journalId: 'je-2',
          entryDate: '2026-11-12',
          description: 'Bayar besi proyek B',
          partyName: 'PT Baja Sakti',
          debit: 0,
          credit: 2_500_000, // nominal sama tapi kemiripan teks kalah jauh
        },
        {
          id: 'line-3',
          journalId: 'je-3',
          entryDate: '2026-11-12', // selisih 2 hari
          description: 'Terima termin proyek',
          partyName: 'PT Sinar Abadi',
          debit: 10_000_000,
          credit: 0,
        },
        {
          id: 'line-4',
          journalId: 'je-4',
          entryDate: '2026-11-25', // setoran di buku belum masuk bank
          description: 'Terima DP Klien Baru',
          debit: 4_000_000,
          credit: 0,
        },
      ];

      const result = matchBankStatementToLedger(parsed.rows, ledgerLines, { dateToleranceDays: 3 });

      expect(result.matches).toHaveLength(2);
      expect(result.matches[0].bankRow.rowHash).toBe(parsed.rows[0].rowHash);
      expect(result.matches[0].ledgerLine.journalId).toBe('je-1');
      expect(result.matches[0].dateDiffDays).toBe(2);
      expect(result.matches[0].similarityScore).toBeGreaterThan(0);

      expect(result.matches[1].bankRow.rowHash).toBe(parsed.rows[1].rowHash);
      expect(result.matches[1].ledgerLine.journalId).toBe('je-3');

      expect(result.ambiguousMatches).toHaveLength(0);
      expect(result.unmatchedBankRows).toHaveLength(1);
      expect(result.unmatchedBankRows[0]).toMatchObject({
        description: 'BIAYA ADMIN BANK',
        amountRupiah: 25_000,
        status: 'unmatched',
      });
      expect(result.unmatchedLedgerLines.map((l) => l.id)).toEqual(['line-2', 'line-4']);
    });

    it('menolak pencocokan di luar toleransi tanggal dan memasukkan kandidat skor kembar ke ambiguousMatches (tanpa auto-match)', () => {
      const csv = [
        'Tanggal,Deskripsi,Debit,Kredit,Saldo',
        '2026-11-10,TARIKAN TUNAI ATM,500000,0,9500000',
        '2026-11-20,TRANSFER MASUK,0,3000000,12500000',
      ].join('\n');
      const parsed = parseBankStatementCsv(csv, { bankFormat: 'mandiri' });

      const ledgerLines: LedgerCashLine[] = [
        {
          id: 'amb-1',
          journalId: 'je-amb-1',
          entryDate: '2026-11-10',
          description: 'Kas keluar operasional pagi',
          debit: 0,
          credit: 500_000,
        },
        {
          id: 'amb-2',
          journalId: 'je-amb-2',
          entryDate: '2026-11-10',
          description: 'Kas keluar operasional sore',
          debit: 0,
          credit: 500_000,
        },
        {
          id: 'far-1',
          journalId: 'je-far-1',
          entryDate: '2026-11-14', // selisih 6 hari > 3 hari
          description: 'Transfer masuk klien',
          debit: 3_000_000,
          credit: 0,
        },
      ];

      const result = matchBankStatementToLedger(parsed.rows, ledgerLines, { dateToleranceDays: 3 });

      expect(result.matches).toHaveLength(0);
      expect(result.ambiguousMatches).toHaveLength(1);
      expect(result.ambiguousMatches[0].status).toBe('ambiguous');
      expect(result.ambiguousMatches[0].reason).toBe('tied_ledger_candidates');
      expect(result.ambiguousMatches[0].candidates.map((c) => c.ledgerLine.id)).toEqual([
        'amb-1',
        'amb-2',
      ]);

      expect(result.unmatchedBankRows).toHaveLength(1);
      expect(result.unmatchedBankRows[0].amountRupiah).toBe(3_000_000);
      expect(result.unmatchedBankRows[0].status).toBe('unmatched');
      expect(result.unmatchedLedgerLines).toHaveLength(3);
    });

    it('menandai tied_bank_rows bila dua baris mutasi bank bersaing pada satu baris buku dengan skor sama', () => {
      const csv = [
        'Tanggal,Deskripsi,Debit,Kredit,Saldo',
        '2026-11-10,BI-FAST KELUAR,750000,0,9250000',
        '2026-11-10,BI-FAST KELUAR,750000,0,8500000',
      ].join('\n');
      const parsed = parseBankStatementCsv(csv, { bankFormat: 'mandiri' });

      const ledgerLines: LedgerCashLine[] = [
        {
          id: 'single-1',
          journalId: 'je-single-1',
          entryDate: '2026-11-10',
          description: 'Biaya pengiriman material',
          debit: 0,
          credit: 750_000,
        },
      ];

      const result = matchBankStatementToLedger(parsed.rows, ledgerLines);
      expect(result.matches).toHaveLength(0);
      expect(result.ambiguousMatches).toHaveLength(2);
      expect(result.ambiguousMatches[0].reason).toBe('tied_bank_rows');
      expect(result.ambiguousMatches[1].reason).toBe('tied_bank_rows');
      expect(result.unmatchedLedgerLines).toHaveLength(1);
    });
  });

  describe('reconcileCashVsBank & deriveReconciliationItems', () => {
    it('menghasilkan status reconciled bila seluruh selisih terjelaskan (biaya admin bank + deposit in transit)', () => {
      const bookCashBalance = 10_000_000;
      // Di buku sudah catat setoran 1.000.000 (belum masuk bank); di bank sudah potong biaya admin 25.000 (belum dicatat buku)
      const bankEndingBalance = 8_975_000;

      const items = deriveReconciliationItems(
        [
          {
            rowIndex: 0,
            bankFormat: 'bca',
            entryDate: '2026-11-30',
            description: 'BIAYA ADMIN BANK NOV',
            branch: null,
            direction: 'out',
            amountRupiah: 25_000,
            runningBalance: 8_975_000,
            rowHash: 'h1',
            rawLine: '',
          },
        ],
        [
          {
            id: 'dep-1',
            journalId: 'je-dep-1',
            entryDate: '2026-11-30',
            description: 'Setoran cek termin klien',
            debit: 1_000_000,
            credit: 0,
          },
        ],
      );

      const rec = reconcileCashVsBank({
        bookCashBalance,
        bankEndingBalance,
        items,
        periodMonth: '2026-11-01',
        walletAccountId: 'wallet-bca',
      });

      expect(rec.status).toBe('reconciled');
      expect(rec.rawDifference).toBe(-1_025_000);
      expect(rec.explainedDifference).toBe(-1_025_000);
      expect(rec.unexplainedDifference).toBe(0);
      expect(rec.adjustedBookBalance).toBe(9_975_000);
      expect(rec.adjustedBankBalance).toBe(9_975_000);
      expect(rec.breakdown.bank_fee.totalRupiah).toBe(25_000);
      expect(rec.breakdown.deposit_in_transit.totalRupiah).toBe(1_000_000);
      expect(rec.provenance).toMatchObject({
        method: 'deterministic_bank_reconciliation_v1',
        periodMonth: '2026-11-01',
        walletAccountId: 'wallet-bca',
        unexplainedDifference: 0,
        itemCount: 2,
      });
    });

    it('menghasilkan status needs_review bila terdapat selisih yang tidak terjelaskan', () => {
      const rec = reconcileCashVsBank({
        bookCashBalance: 10_000_000,
        bankEndingBalance: 9_650_000,
        items: [
          { type: 'bank_fee', amountRupiah: 25_000, description: 'Biaya admin' },
          { type: 'bank_interest', amountRupiah: 50_000, description: 'Jasa giro' },
          { type: 'outstanding_withdrawal', amountRupiah: 100_000, description: 'Cek belum cair' },
        ],
      });

      // rawDifference = -350_000; explained = +50_000 - 25_000 + 100_000 = +125_000 -> unexplained = -475_000
      expect(rec.status).toBe('needs_review');
      expect(rec.rawDifference).toBe(-350_000);
      expect(rec.explainedDifference).toBe(125_000);
      expect(rec.unexplainedDifference).toBe(-475_000);
      expect(rec.adjustedBankBalance - rec.adjustedBookBalance).toBe(rec.unexplainedDifference);
    });
  });

  describe('Layanan bankReconciliationService (Supabase mock)', () => {
    it('importAndMatchBankStatement melakukan deduplikasi row_hash dan menyimpan hasil match ke Supabase', async () => {
      const csv = [
        'Tanggal,Keterangan,Cabang,Jumlah,Saldo',
        '10/11,"TRF MASUK TERMIN 1",0000,"5.000.000,00 CR","15.000.000,00"',
        '11/11,"BIAYA ADMIN BANK",0000,"25.000,00 DB","14.975.000,00"',
      ].join('\n');
      const preParsed = parseBankStatementCsv(csv, { yearHint: 2026 });

      const insertSpy = vi.fn().mockImplementation((payload: Array<Record<string, unknown>>) => ({
        select: () =>
          Promise.resolve({
            data: payload.map((row, idx) => ({
              ...row,
              id: `stmt-row-${idx + 1}`,
              created_at: '2026-11-24T08:00:00Z',
            })),
            error: null,
          }),
      }));

      fromMock.mockImplementation((table: string) => {
        if (table === 'planner_bank_statement_rows') {
          return {
            select: () => ({
              eq: () => ({
                eq: () =>
                  Promise.resolve({
                    // Simulasikan baris ke-1 sudah pernah diimpor sebelumnya -> harus di-dedup
                    data: [{ row_hash: preParsed.rows[0].rowHash, matched_journal_id: 'je-existing' }],
                    error: null,
                  }),
              }),
            }),
            insert: insertSpy,
          };
        }
        if (table === 'planner_journal_entries') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  lte: () =>
                    Promise.resolve({
                      data: [{ id: 'je-existing', entry_date: '2026-11-10', description: 'Termin 1' }],
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        if (table === 'planner_journal_lines') {
          return {
            select: () => ({
              eq: () => ({
                in: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: 'jl-existing',
                        journal_id: 'je-existing',
                        account_id: 'wallet-bca',
                        debit: 5_000_000,
                        credit: 0,
                        notes: null,
                      },
                    ],
                    error: null,
                  }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      });

      const res = await importAndMatchBankStatement({
        orgId: 'org-1',
        walletAccountId: 'wallet-bca',
        csvText: csv,
        yearHint: 2026,
        importedBy: 'user-1',
      });

      expect(res.duplicateHashes).toEqual([preParsed.rows[0].rowHash]);
      expect(res.insertedRows).toHaveLength(1);
      expect(res.insertedRows[0].row_hash).toBe(preParsed.rows[1].rowHash);
      expect(res.insertedRows[0].match_status).toBe('unmatched');
      expect(insertSpy).toHaveBeenCalledTimes(1);
    });

    it('runCashBankReconciliation menghitung saldo buku deterministik dan menyimpan snapshot rekonsiliasi', async () => {
      const insertRecSpy = vi.fn().mockImplementation((payload: Record<string, unknown>) => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                ...payload,
                id: 'rec-1',
                created_at: '2026-11-30T10:00:00Z',
              },
              error: null,
            }),
        }),
      }));

      fromMock.mockImplementation((table: string) => {
        if (table === 'planner_journal_entries') {
          return {
            select: () => ({
              eq: () => ({
                lte: () =>
                  Promise.resolve({
                    data: [
                      { id: 'je-1', entry_date: '2026-11-05', description: 'Setoran modal' },
                      { id: 'je-2', entry_date: '2026-11-28', description: 'Setoran termin dalam perjalanan' },
                    ],
                    error: null,
                  }),
                gte: () => ({
                  lte: () =>
                    Promise.resolve({
                      data: [
                        { id: 'je-1', entry_date: '2026-11-05', description: 'Setoran modal' },
                        { id: 'je-2', entry_date: '2026-11-28', description: 'Setoran termin dalam perjalanan' },
                      ],
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        if (table === 'planner_journal_lines') {
          return {
            select: () => ({
              eq: () => ({
                in: () =>
                  Promise.resolve({
                    data: [
                      { id: 'jl-1', journal_id: 'je-1', account_id: 'wallet-bca', debit: 10_000_000, credit: 0, notes: null },
                      { id: 'jl-2', journal_id: 'je-2', account_id: 'wallet-bca', debit: 2_000_000, credit: 0, notes: null },
                    ],
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === 'planner_bank_statement_rows') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    lte: () =>
                      Promise.resolve({
                        data: [
                          {
                            id: 'sr-1',
                            org_id: 'org-1',
                            wallet_account_id: 'wallet-bca',
                            bank_format: 'bca',
                            entry_date: '2026-11-05',
                            description: 'SETORAN MODAL',
                            direction: 'in',
                            amount_rupiah: 10_000_000,
                            running_balance: 10_000_000,
                            row_hash: 'h-modal',
                            match_status: 'matched',
                            matched_journal_id: 'je-1',
                            matched_score: 1,
                            raw_row_json: {},
                            imported_by: 'user-1',
                            created_at: '2026-11-30T09:00:00Z',
                          },
                          {
                            id: 'sr-2',
                            org_id: 'org-1',
                            wallet_account_id: 'wallet-bca',
                            bank_format: 'bca',
                            entry_date: '2026-11-30',
                            description: 'BIAYA ADMIN BANK',
                            direction: 'out',
                            amount_rupiah: 25_000,
                            running_balance: 9_975_000,
                            row_hash: 'h-adm',
                            match_status: 'unmatched',
                            matched_journal_id: null,
                            matched_score: null,
                            raw_row_json: {},
                            imported_by: 'user-1',
                            created_at: '2026-11-30T09:00:00Z',
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'planner_bank_reconciliations') {
          return {
            insert: insertRecSpy,
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      });

      const res = await runCashBankReconciliation({
        orgId: 'org-1',
        walletAccountId: 'wallet-bca',
        periodMonth: '2026-11',
        bankEndingBalance: 9_975_000,
        createdBy: 'user-1',
      });

      expect(res.reconciliation.bookCashBalance).toBe(12_000_000);
      expect(res.reconciliation.bankEndingBalance).toBe(9_975_000);
      expect(res.reconciliation.rawDifference).toBe(-2_025_000);
      expect(res.reconciliation.explainedDifference).toBe(-2_025_000);
      expect(res.reconciliation.unexplainedDifference).toBe(0);
      expect(res.reconciliation.status).toBe('reconciled');
      expect(res.record?.status).toBe('reconciled');
      expect(insertRecSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Uji Struktural SQL Migrasi 20261124151000_g1_2_bank_reconciliation.sql', () => {
    it('memiliki label BLOCKED remote, tabel mutasi & rekonsiliasi, UNIQUE row_hash, FK RESTRICT, RLS is_org_member, dan bebas mutasi jurnal', () => {
      const rawSql = readFileSync(MIGRATION_PATH, 'utf8');
      expect(rawSql).toContain('BLOCKED remote');

      const sql = stripSqlComments(rawSql);
      expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+planner_bank_statement_rows/i);
      expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+planner_bank_reconciliations/i);
      expect(sql).toMatch(/matched_journal_id\s+uuid\s+REFERENCES\s+planner_journal_entries\s*\(\s*id\s*\)\s+ON\s+DELETE\s+RESTRICT/i);
      expect(sql).toMatch(/UNIQUE\s*\(\s*org_id\s*,\s*wallet_account_id\s*,\s*row_hash\s*\)/i);
      expect(sql).toMatch(/status\s+text\s+NOT\s+NULL\s+CHECK\s*\(\s*status\s+IN\s*\(\s*'reconciled'\s*,\s*'needs_review'\s*\)\s*\)/i);

      // RLS is_org_member pada kedua tabel
      expect(sql).toMatch(/ALTER\s+TABLE\s+planner_bank_statement_rows\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      expect(sql).toMatch(/ALTER\s+TABLE\s+planner_bank_reconciliations\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      expect(sql).toMatch(/is_org_member\s*\(\s*org_id\s*,\s*'worker'\s*\)/i);
      expect(sql).toMatch(/is_org_member\s*\(\s*org_id\s*,\s*'manager'\s*\)/i);

      // Bebas mutasi tabel jurnal
      expect(sql).not.toMatch(/\bUPDATE\s+(?:public\.)?planner_journal_(?:entries|lines|allocations)\b/i);
      expect(sql).not.toMatch(/\bDELETE\s+FROM\s+(?:public\.)?planner_journal_(?:entries|lines|allocations)\b/i);
    });
  });
});
