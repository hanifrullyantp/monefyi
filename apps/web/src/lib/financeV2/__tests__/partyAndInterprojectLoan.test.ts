import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  rpcMock,
  fromMock,
  postJournalEntryMock,
  ensureChartOfAccountsMock,
  findSystemAccountMock,
  getOrCreateProjectKasAccountMock,
} = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
  postJournalEntryMock: vi.fn(),
  ensureChartOfAccountsMock: vi.fn(),
  findSystemAccountMock: vi.fn(),
  getOrCreateProjectKasAccountMock: vi.fn(),
}));

vi.mock('../../supabase', () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
  },
}));

vi.mock('../../../services/financeV2/journalService', () => ({
  postJournalEntry: postJournalEntryMock,
  createJournalEntry: postJournalEntryMock,
}));

vi.mock('../../../services/financeV2/accountService', () => ({
  ensureChartOfAccounts: ensureChartOfAccountsMock,
  findSystemAccount: findSystemAccountMock,
}));

vi.mock('../../../services/financeV2/kasService', () => ({
  getOrCreateProjectKasAccount: getOrCreateProjectKasAccountMock,
}));

import {
  buildJournalTemplate,
  FINANCE_EVENT_CODES,
  interprojectLoanDisbursement,
  interprojectLoanRepayment,
  linesAreBalanced,
  validateJournalDimensions,
} from '../../../../../../packages/domain/src/journal';
import {
  aggregatePartyBalancesById,
  aggregatePartyBalancesFromJournalLines,
  normalizePartyName,
  resolvePartyId,
  type PartyRecord,
} from '../../../../../../packages/domain/src/party';
import { buildPartyAccounts, findPartyAccount } from '../partyLedger';
import { buildProfitLossFromLines } from '../reports/profitLossReport';
import type { JournalLineEnriched } from '../reports/types';
import {
  computeInterprojectLoanBalancesFromLines,
  postInterprojectLoan,
  postInterprojectLoanRepayment,
} from '../../../services/financeV2/interprojectLoanService';
import { createPayable, recordPayablePayment } from '../../../services/financeV2/payableService';
import { createReceivable, recordReceivablePayment } from '../../../services/financeV2/receivableService';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../../../../..', import.meta.url)));
const MIGRATION_PATH = resolve(
  REPO_ROOT,
  'my-supabase-project/supabase/migrations/20261124145000_g0_6_party_id_and_interproject_loans.sql',
);

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

describe('G0-6: Identitas Pihak via party_id & Pinjaman Antar Proyek via Jurnal Double-Entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pinjaman Antar Proyek (Domain & Buku Besar)', () => {
    it('template pencairan & pelunasan menghasilkan 4 baris seimbang dengan dampak L/R = 0 dan kas konsolidasi = 0', () => {
      expect(FINANCE_EVENT_CODES).toContain('interproject_loan_disbursement');
      expect(FINANCE_EVENT_CODES).toContain('interproject_loan_repayment');

      const disb = buildJournalTemplate('interproject_loan_disbursement', 12_500_000.4);
      expect(disb).toEqual([
        { role: 'piutang', debit: 12_500_000, credit: 0, side: 'from' },
        { role: 'kas', debit: 0, credit: 12_500_000, side: 'from' },
        { role: 'kas_tujuan', debit: 12_500_000, credit: 0, side: 'to' },
        { role: 'hutang_lain', debit: 0, credit: 12_500_000, side: 'to' },
      ]);
      expect(linesAreBalanced(disb)).toBe(true);
      expect(disb.reduce((s, l) => s + l.debit, 0)).toBe(25_000_000);
      expect(disb.reduce((s, l) => s + l.credit, 0)).toBe(25_000_000);

      const repay = buildJournalTemplate('interproject_loan_repayment', 12_500_000.4);
      expect(repay).toEqual([
        { role: 'hutang_lain', debit: 12_500_000, credit: 0, side: 'to' },
        { role: 'kas', debit: 0, credit: 12_500_000, side: 'to' },
        { role: 'kas_tujuan', debit: 12_500_000, credit: 0, side: 'from' },
        { role: 'piutang', debit: 0, credit: 12_500_000, side: 'from' },
      ]);
      expect(linesAreBalanced(repay)).toBe(true);
      expect(repay.reduce((s, l) => s + l.debit, 0)).toBe(25_000_000);
      expect(repay.reduce((s, l) => s + l.credit, 0)).toBe(25_000_000);

      expect(interprojectLoanDisbursement(0)).toEqual([]);
      expect(interprojectLoanRepayment(-50_000)).toEqual([]);
    });

    it('pencairan dan pelunasan menjaga saldo piutang Proyek A = hutang Proyek B, L/R = 0, kas konsolidasi = 0, lalu kembali 0 setelah lunas', () => {
      const amount = 20_000_000;
      const projA = 'proj-a';
      const projB = 'proj-b';

      const disbLines = interprojectLoanDisbursement(amount).map((l, idx) => ({
        journalId: 'j-disb',
        referenceType: 'interproject_loan',
        accountType: l.role === 'kas_tujuan' ? 'kas' : l.role,
        debit: l.debit,
        credit: l.credit,
        projectId: l.side === 'from' ? projA : projB,
        id: `l-d-${idx}`,
      }));

      const afterDisb = computeInterprojectLoanBalancesFromLines(disbLines);
      expect(afterDisb.byProject[projA]).toEqual({
        projectId: projA,
        receivableBalance: 20_000_000,
        payableBalance: 0,
        cashNetFromLoans: -20_000_000,
        netBalance: 20_000_000,
      });
      expect(afterDisb.byProject[projB]).toEqual({
        projectId: projB,
        receivableBalance: 0,
        payableBalance: 20_000_000,
        cashNetFromLoans: 20_000_000,
        netBalance: -20_000_000,
      });
      expect(afterDisb.totalReceivable).toBe(20_000_000);
      expect(afterDisb.totalPayable).toBe(20_000_000);
      expect(afterDisb.consolidatedCashImpact).toBe(0);
      expect(afterDisb.profitLossImpact).toBe(0);
      expect(afterDisb.isBalanced).toBe(true);

      // Pastikan Laba/Rugi laporan juga tidak terpengaruh
      const plReportAfterDisb = buildProfitLossFromLines(
        disbLines.map((l): JournalLineEnriched => ({
          journalId: l.journalId,
          entryDate: '2026-11-24',
          description: 'Pinjaman antar proyek',
          referenceType: 'interproject_loan',
          referenceId: null,
          accountId: `acc-${l.accountType}`,
          accountName: l.accountType,
          accountType: l.accountType as JournalLineEnriched['accountType'],
          accountCategory: l.accountType === 'hutang_lain' ? 'pasiva' : 'aktiva',
          debit: l.debit,
          credit: l.credit,
          projectId: l.projectId,
          partyId: null,
        })),
        { [projA]: 'Proyek A', [projB]: 'Proyek B' },
        {},
        {},
      );
      expect(plReportAfterDisb.revenue).toBe(0);
      expect(plReportAfterDisb.hpp).toBe(0);
      expect(plReportAfterDisb.opex).toBe(0);
      expect(plReportAfterDisb.netProfit).toBe(0);

      // Pelunasan bertahap: 8 juta lalu 12 juta
      const repay1 = interprojectLoanRepayment(8_000_000).map((l) => ({
        journalId: 'j-rep-1',
        referenceType: 'interproject_loan_repayment',
        accountType: l.role === 'kas_tujuan' ? 'kas' : l.role,
        debit: l.debit,
        credit: l.credit,
        projectId: l.side === 'from' ? projA : projB,
      }));
      const afterPartial = computeInterprojectLoanBalancesFromLines([...disbLines, ...repay1]);
      expect(afterPartial.byProject[projA].receivableBalance).toBe(12_000_000);
      expect(afterPartial.byProject[projB].payableBalance).toBe(12_000_000);
      expect(afterPartial.consolidatedCashImpact).toBe(0);
      expect(afterPartial.profitLossImpact).toBe(0);

      const repay2 = interprojectLoanRepayment(12_000_000).map((l) => ({
        journalId: 'j-rep-2',
        referenceType: 'interproject_loan_repayment',
        accountType: l.role === 'kas_tujuan' ? 'kas' : l.role,
        debit: l.debit,
        credit: l.credit,
        projectId: l.side === 'from' ? projA : projB,
      }));
      const afterFull = computeInterprojectLoanBalancesFromLines([...disbLines, ...repay1, ...repay2]);
      expect(afterFull.byProject[projA].receivableBalance).toBe(0);
      expect(afterFull.byProject[projA].cashNetFromLoans).toBe(0);
      expect(afterFull.byProject[projB].payableBalance).toBe(0);
      expect(afterFull.byProject[projB].cashNetFromLoans).toBe(0);
      expect(afterFull.totalReceivable).toBe(0);
      expect(afterFull.totalPayable).toBe(0);
      expect(afterFull.consolidatedCashImpact).toBe(0);
      expect(afterFull.profitLossImpact).toBe(0);
      expect(afterFull.isBalanced).toBe(true);
    });

    it('menolak pinjaman antar proyek ke proyek yang sama atau nominal <= 0', async () => {
      await expect(
        postInterprojectLoan({
          orgId: 'org-1',
          fromProjectId: 'proj-a',
          toProjectId: 'proj-a',
          amount: 5_000_000,
        }),
      ).rejects.toThrow(/tidak boleh sama/i);

      await expect(
        postInterprojectLoanRepayment({
          orgId: 'org-1',
          fromProjectId: 'proj-a',
          toProjectId: 'proj-a',
          amount: 5_000_000,
        }),
      ).rejects.toThrow(/tidak boleh sama/i);

      await expect(
        postInterprojectLoan({
          orgId: 'org-1',
          fromProjectId: 'proj-a',
          toProjectId: 'proj-b',
          amount: 0,
        }),
      ).rejects.toThrow(/lebih dari 0/i);

      await expect(
        postInterprojectLoan({
          orgId: 'org-1',
          fromProjectId: 'proj-a',
          toProjectId: 'proj-b',
          amount: -250_000,
        }),
      ).rejects.toThrow(/lebih dari 0/i);

      expect(rpcMock).not.toHaveBeenCalled();
      expect(postJournalEntryMock).not.toHaveBeenCalled();
    });

    it('service postInterprojectLoan memanggil RPC dan mendukung fallback 4-baris saat RPC belum terpasang', async () => {
      rpcMock.mockResolvedValueOnce({ data: 'j-rpc-1', error: null });
      const rpcRes = await postInterprojectLoan({
        orgId: 'org-1',
        fromProjectId: 'proj-a',
        toProjectId: 'proj-b',
        amount: 7_500_000,
        entryDate: '2026-11-24',
      });
      expect(rpcRes).toEqual({
        journalId: 'j-rpc-1',
        referenceType: 'interproject_loan',
        amount: 7_500_000,
        usedFallback: false,
      });
      expect(rpcMock).toHaveBeenCalledWith('planner_post_interproject_loan', {
        p_org_id: 'org-1',
        p_from_project_id: 'proj-a',
        p_to_project_id: 'proj-b',
        p_amount: 7_500_000,
        p_entry_date: '2026-11-24',
        p_description: 'Pinjaman antar proyek: proj-a -> proj-b',
        p_is_repayment: false,
        p_actor: null,
      });

      // Fallback pelunasan ketika RPC missing (PGRST202)
      rpcMock.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST202', message: 'Could not find function planner_post_interproject_loan' },
      });
      ensureChartOfAccountsMock.mockResolvedValue(undefined);
      getOrCreateProjectKasAccountMock
        .mockResolvedValueOnce({ id: 'kas-a' })
        .mockResolvedValueOnce({ id: 'kas-b' });
      findSystemAccountMock
        .mockResolvedValueOnce({ id: 'acc-piutang' })
        .mockResolvedValueOnce({ id: 'acc-hutang-lain' });
      postJournalEntryMock.mockResolvedValueOnce({ id: 'j-fb-repay' });

      const repayRes = await postInterprojectLoanRepayment({
        orgId: 'org-1',
        fromProjectId: 'proj-a',
        toProjectId: 'proj-b',
        amount: 7_500_000,
        entryDate: '2026-11-25',
      });
      expect(repayRes).toEqual({
        journalId: 'j-fb-repay',
        referenceType: 'interproject_loan_repayment',
        amount: 7_500_000,
        usedFallback: true,
      });
      expect(postJournalEntryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-1',
          entryDate: '2026-11-25',
          referenceType: 'interproject_loan_repayment',
          lines: [
            { accountId: 'acc-hutang-lain', debit: 7_500_000, credit: 0, projectId: 'proj-b' },
            { accountId: 'kas-b', debit: 0, credit: 7_500_000, projectId: 'proj-b' },
            { accountId: 'kas-a', debit: 7_500_000, credit: 0, projectId: 'proj-a' },
            { accountId: 'acc-piutang', debit: 0, credit: 7_500_000, projectId: 'proj-a' },
          ],
        }),
      );
    });
  });

  describe('Identitas Pihak via party_id & Validasi Dimensi', () => {
    const directory: PartyRecord[] = [
      { id: 'party-1', displayName: 'CV Sumber Jaya', aliases: ['Sumber Jaya Pusat'] },
      { id: 'party-2', displayName: 'cv sumber jaya', aliases: ['Sumber Jaya Cabang'] },
      { id: 'party-3', displayName: 'Toko Besi Maju', aliases: ['TB Maju'] },
      { id: 'party-4', displayName: 'Mandor Budi', aliases: ['Pak Budi'] },
    ];

    it('resolvePartyId mendahulukan partyId, mendukung normalized name/alias, dan menolak ambigu', () => {
      expect(normalizePartyName('  TB   Maju  ')).toBe('tb maju');

      // partyId menang atas teks nama
      const byId = resolvePartyId(directory, { partyId: 'party-2', name: 'CV Sumber Jaya' });
      expect(byId).toEqual({
        status: 'resolved',
        partyId: 'party-2',
        party: directory[1],
        matchedBy: 'party_id',
      });

      // partyId tidak dikenal tidak fallback diam-diam ke nama
      const badId = resolvePartyId(directory, { partyId: 'party-999', name: 'Toko Besi Maju' });
      expect(badId).toEqual({
        status: 'not_found',
        reason: 'party_id_tidak_ditemukan',
      });

      // Exact normalized name & alias
      expect(resolvePartyId(directory, { name: '  tb   maju ' })).toEqual({
        status: 'resolved',
        partyId: 'party-3',
        party: directory[2],
        matchedBy: 'alias',
      });

      // Dua pihak bernama sama beda kapitalisasi ditolak sebagai ambigu bila tanpa partyId
      const ambiguous = resolvePartyId(directory, { name: 'CV Sumber Jaya' });
      expect(ambiguous.status).toBe('ambiguous');
      if (ambiguous.status === 'ambiguous') {
        expect(ambiguous.candidates.map((c) => c.id)).toEqual(['party-1', 'party-2']);
      }
    });

    it('agregasi hutang/piutang berdasarkan party_id tidak mencampur dua pihak bernama mirip atau beda kapitalisasi', () => {
      const aggregated = aggregatePartyBalancesById(
        [
          {
            partyId: 'party-1',
            partyName: 'CV Sumber Jaya',
            kind: 'hutang',
            amount: 5_000_000,
            paidAmount: 1_000_000,
            projectId: 'proj-1',
          },
          {
            partyId: 'party-1',
            partyName: 'CV SUMBER JAYA',
            kind: 'hutang',
            amount: 2_000_000,
            projectId: 'proj-2',
          },
          {
            partyId: 'party-2',
            partyName: 'cv sumber jaya',
            kind: 'hutang',
            amount: 3_500_000,
            projectId: 'proj-1',
          },
          {
            partyId: 'party-3',
            partyName: 'CV Sumber Jaya ',
            kind: 'piutang',
            amount: 1_500_000,
            projectId: 'proj-1',
          },
        ],
        directory,
      );

      expect(aggregated.items).toHaveLength(3);
      const p1 = aggregated.items.find((x) => x.partyId === 'party-1');
      const p2 = aggregated.items.find((x) => x.partyId === 'party-2');
      const p3 = aggregated.items.find((x) => x.partyId === 'party-3');

      expect(p1?.hutang).toBe(6_000_000);
      expect(p1?.byProject['proj-1']?.hutang).toBe(4_000_000);
      expect(p1?.byProject['proj-2']?.hutang).toBe(2_000_000);
      expect(p2?.hutang).toBe(3_500_000);
      expect(p3?.piutang).toBe(1_500_000);

      // Dari baris jurnal buku besar juga terpisah per party_id
      const fromJournal = aggregatePartyBalancesFromJournalLines([
        { accountType: 'hutang_dagang', debit: 0, credit: 4_000_000, partyId: 'party-1', projectId: 'proj-1' },
        { accountType: 'hutang_dagang', debit: 0, credit: 3_500_000, partyId: 'party-2', projectId: 'proj-1' },
        { accountType: 'hutang_dagang', debit: 1_000_000, credit: 0, partyId: 'party-1', projectId: 'proj-1' },
      ]);
      expect(fromJournal.items).toHaveLength(2);
      expect(fromJournal.items.find((x) => x.partyId === 'party-1')?.hutang).toBe(3_000_000);
      expect(fromJournal.items.find((x) => x.partyId === 'party-2')?.hutang).toBe(3_500_000);

      // Baris tanpa party_id ditolak secara default
      expect(() =>
        aggregatePartyBalancesById([{ partyId: null, kind: 'hutang', amount: 100_000 }]),
      ).toThrow(/party_id/);

      // buildPartyAccounts (UI/service ledger) juga memisahkan berdasarkan party_id
      const partyAccounts = buildPartyAccounts({
        receivables: [],
        payables: [
          {
            id: 'pay-1',
            org_id: 'org-1',
            creditor_type: 'supplier',
            creditor_name: 'CV Sumber Jaya',
            creditor_project_id: 'proj-1',
            party_id: 'party-1',
            category: 'dagang',
            amount: 4_000_000,
            paid_amount: 0,
            due_date: null,
            status: 'open',
            notes: null,
            created_at: '2026-11-24T00:00:00Z',
          },
          {
            id: 'pay-2',
            org_id: 'org-1',
            creditor_type: 'supplier',
            creditor_name: 'cv sumber jaya',
            creditor_project_id: 'proj-1',
            party_id: 'party-2',
            category: 'dagang',
            amount: 2_500_000,
            paid_amount: 0,
            due_date: null,
            status: 'open',
            notes: null,
            created_at: '2026-11-24T00:00:00Z',
          },
        ],
      });
      expect(partyAccounts).toHaveLength(2);
      expect(findPartyAccount(partyAccounts, { partyId: 'party-1' })?.hutang).toBe(4_000_000);
      expect(findPartyAccount(partyAccounts, { partyId: 'party-2' })?.hutang).toBe(2_500_000);
    });

    it('validateJournalDimensions menolak baris hutang dan piutang tanpa party_id', () => {
      for (const role of ['hutang', 'hutang_dagang', 'hutang_pajak', 'hutang_lain', 'piutang', 'piutang_retensi']) {
        const res = validateJournalDimensions([{ role, projectId: 'proj-1', partyId: null }]);
        expect(res.ok, role).toBe(false);
        expect(res.errors.some((e) => e.includes('party_id'))).toBe(true);
      }

      const valid = validateJournalDimensions([
        { role: 'hutang_dagang', projectId: 'proj-1', partyId: 'party-1' },
        { role: 'piutang', projectId: 'proj-1', partyId: 'party-2' },
        { role: 'piutang_retensi', projectId: 'proj-1', partyId: 'party-2' },
      ]);
      expect(valid).toEqual({ ok: true, errors: [] });
    });

    it('payableService & receivableService menyertakan partyId pada baris jurnal hutang/piutang', async () => {
      const insertSinglePayable = vi.fn().mockResolvedValue({
        data: {
          id: 'pay-100',
          org_id: 'org-1',
          creditor_type: 'supplier',
          creditor_name: 'TB Maju',
          creditor_project_id: 'proj-1',
          party_id: 'party-3',
          category: 'dagang',
          amount: 2_000_000,
          paid_amount: 0,
          due_date: null,
          status: 'open',
          notes: null,
          created_at: '2026-11-24T00:00:00Z',
        },
        error: null,
      });
      const selectSinglePayable = vi.fn().mockResolvedValue({
        data: {
          id: 'pay-100',
          org_id: 'org-1',
          creditor_type: 'supplier',
          creditor_name: 'TB Maju',
          creditor_project_id: 'proj-1',
          party_id: 'party-3',
          category: 'dagang',
          amount: 2_000_000,
          paid_amount: 0,
          due_date: null,
          status: 'open',
          notes: null,
          created_at: '2026-11-24T00:00:00Z',
        },
        error: null,
      });
      const updateSinglePayable = vi.fn().mockResolvedValue({
        data: {
          id: 'pay-100',
          org_id: 'org-1',
          creditor_type: 'supplier',
          creditor_name: 'TB Maju',
          creditor_project_id: 'proj-1',
          party_id: 'party-3',
          category: 'dagang',
          amount: 2_000_000,
          paid_amount: 2_000_000,
          due_date: null,
          status: 'paid',
          notes: null,
          created_at: '2026-11-24T00:00:00Z',
        },
        error: null,
      });

      fromMock.mockImplementation((table: string) => {
        if (table === 'planner_payables') {
          return {
            insert: () => ({ select: () => ({ single: insertSinglePayable }) }),
            select: () => ({ eq: () => ({ single: selectSinglePayable }) }),
            update: () => ({ eq: () => ({ select: () => ({ single: updateSinglePayable }) }) }),
          };
        }
        return {};
      });

      findSystemAccountMock
        .mockResolvedValueOnce({ id: 'acc-hutang-dagang' })
        .mockResolvedValueOnce({ id: 'acc-laba' })
        .mockResolvedValueOnce({ id: 'acc-kas-bisnis' })
        .mockResolvedValueOnce({ id: 'acc-hutang-dagang' });
      postJournalEntryMock.mockResolvedValue({ id: 'j-pay' });

      await createPayable({
        orgId: 'org-1',
        creditorType: 'supplier',
        creditorName: 'TB Maju',
        creditorProjectId: 'proj-1',
        partyId: 'party-3',
        amount: 2_000_000,
      });

      expect(postJournalEntryMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          lines: [
            { accountId: 'acc-laba', debit: 2_000_000, credit: 0, projectId: 'proj-1' },
            { accountId: 'acc-hutang-dagang', debit: 0, credit: 2_000_000, partyId: 'party-3', projectId: 'proj-1' },
          ],
        }),
      );

      await recordPayablePayment({
        orgId: 'org-1',
        payableId: 'pay-100',
        amount: 2_000_000,
      });

      expect(postJournalEntryMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          lines: [
            { accountId: 'acc-hutang-dagang', debit: 2_000_000, credit: 0, partyId: 'party-3', projectId: 'proj-1' },
            { accountId: 'acc-kas-bisnis', debit: 0, credit: 2_000_000, projectId: 'proj-1' },
          ],
        }),
      );

      // Receivable service
      const insertSingleRec = vi.fn().mockResolvedValue({
        data: {
          id: 'rec-100',
          org_id: 'org-1',
          debtor_type: 'company',
          debtor_name: 'PT Klien',
          debtor_project_id: 'proj-1',
          party_id: 'party-1',
          amount: 5_000_000,
          paid_amount: 0,
          due_date: null,
          status: 'open',
          notes: null,
          created_at: '2026-11-24T00:00:00Z',
        },
        error: null,
      });
      const selectSingleRec = vi.fn().mockResolvedValue({
        data: {
          id: 'rec-100',
          org_id: 'org-1',
          debtor_type: 'company',
          debtor_name: 'PT Klien',
          debtor_project_id: 'proj-1',
          party_id: 'party-1',
          amount: 5_000_000,
          paid_amount: 0,
          due_date: null,
          status: 'open',
          notes: null,
          created_at: '2026-11-24T00:00:00Z',
        },
        error: null,
      });
      const updateSingleRec = vi.fn().mockResolvedValue({
        data: {
          id: 'rec-100',
          org_id: 'org-1',
          debtor_type: 'company',
          debtor_name: 'PT Klien',
          debtor_project_id: 'proj-1',
          party_id: 'party-1',
          amount: 5_000_000,
          paid_amount: 5_000_000,
          due_date: null,
          status: 'paid',
          notes: null,
          created_at: '2026-11-24T00:00:00Z',
        },
        error: null,
      });

      fromMock.mockImplementation((table: string) => {
        if (table === 'planner_receivables') {
          return {
            insert: () => ({ select: () => ({ single: insertSingleRec }) }),
            select: () => ({ eq: () => ({ single: selectSingleRec }) }),
            update: () => ({ eq: () => ({ select: () => ({ single: updateSingleRec }) }) }),
          };
        }
        return {};
      });

      findSystemAccountMock
        .mockResolvedValueOnce({ id: 'acc-piutang' })
        .mockResolvedValueOnce({ id: 'acc-laba' })
        .mockResolvedValueOnce({ id: 'acc-kas-bisnis' })
        .mockResolvedValueOnce({ id: 'acc-piutang' });

      await createReceivable({
        orgId: 'org-1',
        debtorType: 'company',
        debtorName: 'PT Klien',
        debtorProjectId: 'proj-1',
        partyId: 'party-1',
        amount: 5_000_000,
      });

      expect(postJournalEntryMock).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          lines: [
            { accountId: 'acc-piutang', debit: 5_000_000, credit: 0, partyId: 'party-1', projectId: 'proj-1' },
            { accountId: 'acc-laba', debit: 0, credit: 5_000_000, projectId: 'proj-1' },
          ],
        }),
      );

      await recordReceivablePayment({
        orgId: 'org-1',
        receivableId: 'rec-100',
        amount: 5_000_000,
      });

      expect(postJournalEntryMock).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          lines: [
            { accountId: 'acc-kas-bisnis', debit: 5_000_000, credit: 0, projectId: 'proj-1' },
            { accountId: 'acc-piutang', debit: 0, credit: 5_000_000, partyId: 'party-1', projectId: 'proj-1' },
          ],
        }),
      );
    });
  });

  describe('Uji Struktural SQL 20261124145000_g0_6_party_id_and_interproject_loans.sql', () => {
    it('berstatus BLOCKED remote, bebas mutasi jurnal, menambah party_id, dan memuat planner_post_interproject_loan', () => {
      const rawSql = readFileSync(MIGRATION_PATH, 'utf8');
      expect(rawSql).toContain('BLOCKED remote');

      const cleanedSql = stripSqlComments(rawSql);
      expect(cleanedSql).not.toMatch(/\bUPDATE\s+(?:public\.)?planner_journal_entries\b/i);
      expect(cleanedSql).not.toMatch(/\bDELETE\s+FROM\s+(?:public\.)?planner_journal_entries\b/i);
      expect(cleanedSql).not.toMatch(/\bUPDATE\s+(?:public\.)?planner_journal_lines\b/i);
      expect(cleanedSql).not.toMatch(/\bDELETE\s+FROM\s+(?:public\.)?planner_journal_lines\b/i);
      expect(cleanedSql).not.toMatch(/\bUPDATE\s+(?:public\.)?planner_journal_allocations\b/i);
      expect(cleanedSql).not.toMatch(/\bDELETE\s+FROM\s+(?:public\.)?planner_journal_allocations\b/i);

      expect(cleanedSql).toContain("'interproject_loan'");
      expect(cleanedSql).toContain("'interproject_loan_repayment'");

      for (const tbl of [
        'planner_payables',
        'planner_receivables',
        'planner_project_incomes',
        'planner_cost_realizations',
      ]) {
        expect(cleanedSql).toContain(tbl);
      }

      expect(cleanedSql).toContain('CREATE OR REPLACE FUNCTION public.planner_post_interproject_loan(');
      expect(cleanedSql).toContain('p_from_project_id = p_to_project_id');
      expect(cleanedSql).toContain('p_amount IS NULL OR p_amount <= 0');
      expect(cleanedSql).toContain('public.planner_post_journal(');
    });
  });
});
