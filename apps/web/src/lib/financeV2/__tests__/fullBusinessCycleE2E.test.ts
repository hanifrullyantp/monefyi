import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../supabase', () => ({ supabase: {} }));

import {
  buildJournalTemplate,
  FINANCE_EVENT_CODES,
  linesAreBalanced,
  payableAccrual,
  periodCloseTransfer,
  projectCloseTransfer,
  toRupiah,
  type FinanceEventCode,
  type JournalAccountRole,
  type TemplateLine,
} from '../../../../../../packages/domain/src/journal';
import {
  computeRapCompletionFeedback,
  generateRapDraftFromHistory,
  type CompletedProjectHistoryRecord,
} from '../../../../../../packages/domain/src/rapLearning';
import {
  clearEntryEngineStateForTests,
  commitEntry,
  prepareEntry,
} from '../../../../../../agent-core/src/financeEntryEngine';
import {
  buildFinanceSnapshot,
  estimateJsonTokens,
} from '../../../../../../agent-core/src/financeSnapshot';
import type { AccountType, FinanceAccount } from '../../../types/financeV2';
import { computePeriodProfitFromAccounts } from '../../../services/financeV2/accountService';
import { businessReportFromLedger } from '../../../services/financeV1/businessReportService';
import { planBusinessModeDividend, planProjectModeDividend } from '../dividendModes';
import { buildOverviewThreeCards } from '../overviewCards';
import type { JournalLineEnriched } from '../reports/types';
import { buildProfitLossFromLines } from '../reports/profitLossReport';

type LedgerAccount = Pick<FinanceAccount, 'id' | 'name' | 'type' | 'category' | 'current_balance'>;

class InMemoryDoubleEntryLedger {
  accounts = new Map<string, LedgerAccount>();
  lines: JournalLineEnriched[] = [];
  private seq = 1;

  constructor() {
    const seed: Array<[string, string, AccountType, 'aktiva' | 'pasiva']> = [
      ['kas', 'Bank BCA', 'kas', 'aktiva'],
      ['kas_tujuan', 'Kas Utama Bisnis', 'kas', 'aktiva'],
      ['piutang', 'Piutang Usaha', 'piutang', 'aktiva'],
      ['piutang_retensi', 'Piutang Retensi', 'piutang_retensi', 'aktiva'],
      ['uang_muka_klien', 'Uang Muka Klien', 'uang_muka_klien', 'pasiva'],
      ['hutang', 'Hutang Usaha', 'hutang_dagang', 'pasiva'],
      ['hutang_dagang', 'Hutang Dagang', 'hutang_dagang', 'pasiva'],
      ['pendapatan_proyek', 'Pendapatan Proyek', 'pendapatan_proyek', 'pasiva'],
      ['hpp_material', 'HPP Material', 'hpp_material', 'pasiva'],
      ['hpp_labor', 'HPP Tenaga Kerja', 'hpp_labor', 'pasiva'],
      ['hpp_equipment', 'HPP Alat', 'hpp_equipment', 'pasiva'],
      ['hpp_overhead', 'HPP Overhead', 'hpp_overhead', 'pasiva'],
      ['hpp_other', 'HPP Lainnya', 'hpp_other', 'pasiva'],
      ['hpp_uncategorized', 'HPP Belum Dikategorikan', 'hpp_uncategorized', 'pasiva'],
      ['beban_opex', 'Beban Operasional', 'beban_opex', 'pasiva'],
      ['dividen', 'Dividen / Prive', 'dividen', 'pasiva'],
      ['laba_ditahan', 'Laba Ditahan', 'laba_ditahan', 'pasiva'],
      ['laba', 'Laba Periode', 'laba', 'pasiva'],
      ['modal', 'Modal Disetor', 'modal_disetor', 'pasiva'],
    ];
    for (const [role, name, type, category] of seed) {
      this.accounts.set(role, {
        id: `acc-${role}`,
        name,
        type,
        category,
        current_balance: 0,
      });
    }
  }

  post(input: {
    entryDate: string;
    description: string;
    referenceType: string;
    referenceId: string;
    projectId: string | null;
    partyId: string | null;
    templateLines: TemplateLine[];
  }): void {
    expect(linesAreBalanced(input.templateLines)).toBe(true);
    const journalId = `je-${this.seq++}`;

    for (const tl of input.templateLines) {
      const acc = this.accounts.get(tl.role);
      if (!acc) throw new Error(`Akun role tidak ada: ${tl.role}`);
      const d = toRupiah(tl.debit);
      const c = toRupiah(tl.credit);
      expect(Number.isInteger(d) && Number.isInteger(c)).toBe(true);

      if (acc.category === 'aktiva') {
        acc.current_balance += d - c;
      } else if (
        acc.type.startsWith('hpp_') ||
        acc.type === 'beban_opex' ||
        acc.type === 'beban_penyusutan' ||
        acc.type === 'dividen'
      ) {
        // Akun kontra-ekuitas/beban menyimpan saldo debit sebagai nilai positif agar rollup persis seperti accountService
        acc.current_balance += d - c;
      } else {
        acc.current_balance += c - d;
      }

      this.lines.push({
        journalId,
        entryDate: input.entryDate,
        description: input.description,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        accountId: acc.id,
        accountName: acc.name,
        accountType: acc.type,
        accountCategory: acc.category,
        projectId: input.projectId,
        partyId: input.partyId,
        debit: d,
        credit: c,
      });
    }

    this.assertInvariants();
  }

  postRawBalanced(input: {
    entryDate: string;
    description: string;
    referenceType: string;
    referenceId: string;
    projectId: string | null;
    partyId: string | null;
    raw: Array<{ role: JournalAccountRole; debit: number; credit: number }>;
  }): void {
    this.post({
      ...input,
      templateLines: input.raw,
    });
  }

  assertInvariants(): void {
    const totalDebit = this.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = this.lines.reduce((s, l) => s + l.credit, 0);
    expect(totalDebit).toBe(totalCredit);

    // Neraca buku besar: Aktiva == Kewajiban + Modal + Laba Ditahan - Dividen + Laba Berjalan
    const all = Array.from(this.accounts.values());
    const kas = all.filter((a) => a.type === 'kas').reduce((s, a) => s + a.current_balance, 0);
    const piutang = this.accounts.get('piutang')!.current_balance;
    const retensi = this.accounts.get('piutang_retensi')!.current_balance;
    const totalAktiva = kas + piutang + retensi;

    const umKlien = this.accounts.get('uang_muka_klien')!.current_balance;
    const hutang =
      this.accounts.get('hutang')!.current_balance +
      this.accounts.get('hutang_dagang')!.current_balance;
    const modal = this.accounts.get('modal')!.current_balance;
    const labaDitahan = this.accounts.get('laba_ditahan')!.current_balance;
    const dividen = this.accounts.get('dividen')!.current_balance;
    const periodProfit = computePeriodProfitFromAccounts(all as FinanceAccount[]);
    const totalPasiva = umKlien + hutang + modal + labaDitahan - dividen + periodProfit;

    expect(totalAktiva).toBe(totalPasiva);

    // Kas buku besar == sum(debit kas - credit kas)
    const cashFlowSum = this.lines
      .filter((l) => l.accountType === 'kas')
      .reduce((s, l) => s + l.debit - l.credit, 0);
    expect(kas).toBe(cashFlowSum);
  }
}

describe('F4 — Uji End-to-End Siklus Bisnis Penuh Froyek (Buku Besar Tunggal + Agent)', () => {
  beforeEach(() => {
    clearEntryEngineStateForTests();
  });

  it('menjalankan siklus bisnis utuh tanpa melanggar satu pun invarian akuntansi maupun V1==V2', () => {
    const now = Date.parse('2026-11-24T03:00:00.000Z');
    const ledger = new InMemoryDoubleEntryLedger();

    // 1. Setoran modal awal Rp 100jt
    ledger.post({
      entryDate: '2026-11-01',
      description: 'Setoran modal awal pemilik',
      referenceType: 'capital_injection',
      referenceId: 'cap-1',
      projectId: null,
      partyId: 'owner-1',
      templateLines: [
        { role: 'kas', debit: 100_000_000, credit: 0 },
        { role: 'modal' as JournalAccountRole, debit: 0, credit: 100_000_000 },
      ],
    });

    // 2. AI Belajar RAP menyusun draf rentang dari 3 proyek selesai sebelumnya + wajib persetujuan pemilik
    const pastHistory: CompletedProjectHistoryRecord[] = [
      {
        projectId: 'old-1',
        projectType: 'renovasi_rumah',
        status: 'finance_closed',
        volume: 100,
        volumeUnit: 'm2',
        plannedByCategory: { material: 20_000_000, labor: 10_000_000 },
        actualByCategory: { material: 21_000_000, labor: 10_000_000, equipment: 2_000_000, overhead: 1_000_000, other: 500_000 },
      },
      {
        projectId: 'old-2',
        projectType: 'renovasi_rumah',
        status: 'completed',
        volume: 80,
        volumeUnit: 'm2',
        plannedByCategory: { material: 16_000_000, labor: 8_000_000 },
        actualByCategory: { material: 16_800_000, labor: 8_000_000, equipment: 1_600_000, overhead: 800_000, other: 400_000 },
      },
      {
        projectId: 'old-3',
        projectType: 'renovasi_rumah',
        status: 'finance_closed',
        volume: 120,
        volumeUnit: 'm2',
        plannedByCategory: { material: 24_000_000, labor: 12_000_000 },
        actualByCategory: { material: 25_200_000, labor: 12_000_000, equipment: 2_400_000, overhead: 1_200_000, other: 600_000 },
      },
    ];
    const draftA = generateRapDraftFromHistory({
      projectType: 'renovasi_rumah',
      volume: 100,
      volumeUnit: 'm2',
      history: pastHistory,
    });
    expect(draftA.provenance).toBe('Berdasarkan 3 proyek serupa');
    expect(draftA.requiresOwnerApproval).toBe(true);
    const rapPlannedA = draftA.totalMid;
    const rapPlannedB = 50_000_000;

    // 3. Terima DP Proyek A (30jt) & Proyek B (40jt) -> masuk Uang Muka Klien (kewajiban, belum laba)
    ledger.post({
      entryDate: '2026-11-05',
      description: 'Terima DP Proyek A',
      referenceType: 'project_income',
      referenceId: 'dp-a',
      projectId: 'proj-a',
      partyId: 'klien-a',
      templateLines: buildJournalTemplate('client_dp', 30_000_000),
    });
    ledger.post({
      entryDate: '2026-11-06',
      description: 'Terima DP Proyek B',
      referenceType: 'project_income',
      referenceId: 'dp-b',
      projectId: 'proj-b',
      partyId: 'klien-b',
      templateLines: buildJournalTemplate('client_dp', 40_000_000),
    });
    // Setelah DP saja, laba periode harus tetap 0 karena DP adalah Uang Muka Klien (kewajiban)!
    expect(buildProfitLossFromLines(ledger.lines, {}, {}, {}, {}).revenue).toBe(0);

    // 4. Agent AI mencatat biaya proyek & opex (termasuk 3 contoh kalimat wajib + kasus aset >= 5jt)
    const projectsCatalog = [
      { id: 'proj-a', name: 'Proyek A' },
      { id: 'proj-b', name: 'Proyek B' },
    ];
    const partiesCatalog = [{ id: 'sup-1', name: 'TB Maju Jaya' }];
    const walletsCatalog = [{ id: 'acc-kas', name: 'Bank BCA', aliases: ['bca'] }];

    const pEngsel = prepareEntry({
      text: 'belanja engsel pintu proyek A 50.000',
      projects: projectsCatalog,
      wallets: walletsCatalog,
      now,
      model: 'tier-small-flash-lite',
    });
    expect(pEngsel.ok && pEngsel.status === 'prepared').toBe(true);
    if (!pEngsel.ok || pEngsel.status !== 'prepared') throw new Error('expected prepared');
    const cEngsel = commitEntry({ prepareToken: pEngsel.prepareToken, idempotencyKey: 'e2e-1', now });
    expect(cEngsel.ok).toBe(true);
    ledger.post({
      entryDate: pEngsel.entryDate,
      description: 'Engsel pintu Proyek A',
      referenceType: 'project_cost',
      referenceId: 'cost-engsel',
      projectId: pEngsel.projectId,
      partyId: null,
      templateLines: pEngsel.lines,
    });

    const pProyekB = prepareEntry({
      text: 'belanja Rp150.000 untuk proyek B',
      projects: projectsCatalog,
      wallets: walletsCatalog,
      now,
      model: 'tier-small-haiku-mini',
      candidateSelector: () => ({ chosenCode: 'project_cost_material', score: 0.85 }),
    });
    expect(pProyekB.ok && pProyekB.status === 'prepared').toBe(true);
    if (!pProyekB.ok || pProyekB.status !== 'prepared') throw new Error('expected prepared');
    ledger.post({
      entryDate: pProyekB.entryDate,
      description: 'Belanja Proyek B via agent',
      referenceType: 'project_cost',
      referenceId: 'cost-b1',
      projectId: pProyekB.projectId,
      partyId: null,
      templateLines: pProyekB.lines,
    });

    const pTukangA = prepareEntry({
      text: 'bayar tukang proyek A 10jt',
      projects: projectsCatalog,
      wallets: walletsCatalog,
      now,
    });
    if (!pTukangA.ok || pTukangA.status !== 'prepared') throw new Error('expected prepared');
    ledger.post({
      entryDate: pTukangA.entryDate,
      description: 'Upah tukang Proyek A',
      referenceType: 'project_cost',
      referenceId: 'cost-tukang-a',
      projectId: pTukangA.projectId,
      partyId: null,
      templateLines: pTukangA.lines,
    });

    const pWorkshopOpex = prepareEntry({
      text: 'beli keramik perbaikan workshop 1.2jt',
      projects: projectsCatalog,
      wallets: walletsCatalog,
      now,
    });
    if (!pWorkshopOpex.ok || pWorkshopOpex.status !== 'prepared') throw new Error('expected prepared');
    expect(pWorkshopOpex.eventCode).toBe('opex_expense');
    ledger.post({
      entryDate: pWorkshopOpex.entryDate,
      description: 'Keramik perbaikan workshop',
      referenceType: 'opex_realization',
      referenceId: 'opx-workshop',
      projectId: null,
      partyId: null,
      templateLines: pWorkshopOpex.lines,
    });

    const pWorkshopAssetAsk = prepareEntry({
      text: 'beli keramik perbaikan workshop 6jt',
      projects: projectsCatalog,
      wallets: walletsCatalog,
      now,
    });
    expect(pWorkshopAssetAsk.ok).toBe(false);
    if (!pWorkshopAssetAsk.ok) expect(pWorkshopAssetAsk.error.code).toBe('confirm_asset_vs_opex');

    // 5. Hutang supplier material Proyek A 5jt lalu dibayar lunas lewat agent
    ledger.post({
      entryDate: '2026-11-12',
      description: 'Material kredit TB Maju Jaya Proyek A',
      referenceType: 'payable_accrual',
      referenceId: 'ap-1',
      projectId: 'proj-a',
      partyId: 'sup-1',
      templateLines: payableAccrual(5_000_000, 'material'),
    });
    const pPayAp = prepareEntry({
      text: 'bayar hutang TB Maju Jaya proyek A 5jt',
      projects: projectsCatalog,
      parties: partiesCatalog,
      wallets: walletsCatalog,
      now,
    });
    if (!pPayAp.ok || pPayAp.status !== 'prepared') throw new Error('expected prepared');
    ledger.post({
      entryDate: pPayAp.entryDate,
      description: 'Pelunasan hutang TB Maju Jaya',
      referenceType: 'payable_payment',
      referenceId: 'ap-pay-1',
      projectId: pPayAp.projectId,
      partyId: pPayAp.partyId,
      templateLines: pPayAp.lines,
    });
    expect(ledger.accounts.get('hutang_dagang')!.current_balance + ledger.accounts.get('hutang')!.current_balance).toBe(0);

    // 6. Biaya material tambahan Proyek B 25jt + akui DP ke pendapatan + termin + retensi
    ledger.post({
      entryDate: '2026-11-15',
      description: 'Belanja material Proyek B',
      referenceType: 'project_cost',
      referenceId: 'cost-b2',
      projectId: 'proj-b',
      partyId: null,
      templateLines: buildJournalTemplate('project_cost_material', 25_000_000),
    });
    // Pengakuan DP Proyek A (30jt) + Proyek B (40jt) dari Uang Muka Klien menjadi Pendapatan Proyek
    ledger.postRawBalanced({
      entryDate: '2026-11-18',
      description: 'Pengakuan DP Proyek A saat progres serah terima',
      referenceType: 'dp_recognition',
      referenceId: 'rec-dp-a',
      projectId: 'proj-a',
      partyId: 'klien-a',
      raw: [
        { role: 'uang_muka_klien', debit: 30_000_000, credit: 0 },
        { role: 'pendapatan_proyek', debit: 0, credit: 30_000_000 },
      ],
    });
    ledger.postRawBalanced({
      entryDate: '2026-11-18',
      description: 'Pengakuan DP Proyek B saat progres serah terima',
      referenceType: 'dp_recognition',
      referenceId: 'rec-dp-b',
      projectId: 'proj-b',
      partyId: 'klien-b',
      raw: [
        { role: 'uang_muka_klien', debit: 40_000_000, credit: 0 },
        { role: 'pendapatan_proyek', debit: 0, credit: 40_000_000 },
      ],
    });
    // Termin Proyek A 46jt + Retensi ditahan 4jt -> total omzet Proyek A = 80jt; retensi kemudian cair 4jt
    ledger.post({
      entryDate: '2026-11-20',
      description: 'Termin 1 Proyek A',
      referenceType: 'project_income',
      referenceId: 'term-a',
      projectId: 'proj-a',
      partyId: 'klien-a',
      templateLines: buildJournalTemplate('client_termin', 46_000_000),
    });
    ledger.post({
      entryDate: '2026-11-20',
      description: 'Retensi ditahan Proyek A',
      referenceType: 'project_income',
      referenceId: 'ret-hold-a',
      projectId: 'proj-a',
      partyId: 'klien-a',
      templateLines: buildJournalTemplate('client_retention_hold', 4_000_000),
    });
    expect(ledger.accounts.get('piutang_retensi')!.current_balance).toBe(4_000_000);
    ledger.post({
      entryDate: '2026-11-22',
      description: 'Pencairan retensi Proyek A',
      referenceType: 'retention_release',
      referenceId: 'ret-rel-a',
      projectId: 'proj-a',
      partyId: 'klien-a',
      templateLines: buildJournalTemplate('client_retention_release', 4_000_000),
    });
    expect(ledger.accounts.get('piutang_retensi')!.current_balance).toBe(0);

    // Akrual tagihan final Proyek B 45jt lalu pelunasan Proyek B 45jt -> total omzet Proyek B = 85jt, piutang kembali 0
    ledger.post({
      entryDate: '2026-11-21',
      description: 'Tagihan akhir / BAST Proyek B',
      referenceType: 'project_income',
      referenceId: 'inv-b',
      projectId: 'proj-b',
      partyId: 'klien-b',
      templateLines: buildJournalTemplate('receivable_accrual', 45_000_000),
    });
    expect(ledger.accounts.get('piutang')!.current_balance).toBe(45_000_000);
    ledger.post({
      entryDate: '2026-11-22',
      description: 'Pelunasan Proyek B',
      referenceType: 'project_income',
      referenceId: 'lunas-b',
      projectId: 'proj-b',
      partyId: 'klien-b',
      templateLines: buildJournalTemplate('client_pelunasan', 45_000_000),
    });
    expect(ledger.accounts.get('piutang')!.current_balance).toBe(0);

    // 7. Cek konsistensi mutlak: Buku Besar == V1 businessReportFromLedger == 3 Kartu Overview == Agent Snapshot
    const v1Report = businessReportFromLedger({
      filters: { dateFrom: '2026-11-01', dateTo: '2026-11-30' },
      lines: ledger.lines,
      projectNames: { 'proj-a': 'Proyek A', 'proj-b': 'Proyek B' },
      opexCategoryNames: { 'cat-wk': 'Perawatan Workshop' },
      receivableProjectMap: {},
      opexRealizationCategory: { 'opx-workshop': 'cat-wk' },
    });

    const cards = buildOverviewThreeCards({
      todayIso: '2026-11-24',
      monthLabel: '2026-11',
      accounts: Array.from(ledger.accounts.values()),
      monthLines: ledger.lines,
      allProjectLines: ledger.lines,
      projectNames: { 'proj-a': 'Proyek A', 'proj-b': 'Proyek B' },
      opexCategoryNames: { 'cat-wk': 'Perawatan Workshop' },
      opexRealizationCategory: { 'opx-workshop': 'cat-wk' },
      rapPlannedByProject: { 'proj-a': rapPlannedA, 'proj-b': rapPlannedB },
      receivables: [],
      payables: [],
      monthlyOpexPlanned: 5_000_000,
    });

    // Total Omzet = 80jt (A) + 85jt (B) = 165.000.000
    // Total HPP = (50rb + 10jt + 5jt) (A = 15.050.000) + (150rb + 25jt) (B = 25.150.000) = 40.200.000
    // Laba Kotor = 124.800.000; Opex = 1.200.000; Laba Bersih = 123.600.000
    expect(v1Report.revenue.total).toBe(165_000_000);
    expect(v1Report.hpp.total).toBe(40_200_000);
    expect(v1Report.grossProfit).toBe(124_800_000);
    expect(v1Report.opex.total).toBe(1_200_000);
    expect(v1Report.netProfit).toBe(123_600_000);
    expect(cards.card3BusinessMonth.grossProfit).toBe(v1Report.grossProfit);
    expect(cards.card3BusinessMonth.netProfit).toBe(v1Report.netProfit);

    const snapshot = buildFinanceSnapshot({
      asOf: '2026-11-24',
      monthLabel: '2026-11',
      wallets: cards.card1CashDebt.wallets.map((w) => ({ id: w.accountId, name: w.name, balance: w.balance })),
      receivableTotal: cards.card1CashDebt.totalReceivable,
      receivableDue: cards.card1CashDebt.overdueReceivable,
      retentionTotal: cards.card1CashDebt.retentionReceivable,
      payableTotal: cards.card1CashDebt.totalPayable,
      payableDue: cards.card1CashDebt.overduePayable,
      monthRevenue: cards.card3BusinessMonth.revenue,
      monthHpp: cards.card3BusinessMonth.hpp,
      monthGrossProfit: cards.card3BusinessMonth.grossProfit,
      monthOpexActual: cards.card3BusinessMonth.opexActual,
      monthOpexPlanned: cards.card3BusinessMonth.opexPlanned,
      monthNetProfit: cards.card3BusinessMonth.netProfit,
      projects: cards.card2Projects.map((p) => ({
        id: p.projectId,
        name: p.projectName,
        revenue: p.revenue,
        hpp: p.hpp,
        profit: p.profit,
        rapUsagePct: p.rapUsagePct,
      })),
    });
    expect(estimateJsonTokens(snapshot)).toBeLessThanOrEqual(400);

    // 8. Tutup Proyek A (sweep kas proyek -> kas utama + pindahkan laba Proyek A -> Laba Ditahan) + Feedback Loop RAP
    const profitA = 80_000_000 - 15_050_000; // 64.950.000
    ledger.post({
      entryDate: '2026-11-23',
      description: 'Tutup keuangan Proyek A (transfer kas proyek -> kas utama)',
      referenceType: 'project_close',
      referenceId: 'close-a-cash',
      projectId: 'proj-a',
      partyId: null,
      templateLines: projectCloseTransfer(profitA),
    });
    ledger.post({
      entryDate: '2026-11-23',
      description: 'Tutup keuangan Proyek A (laba proyek -> Laba Ditahan)',
      referenceType: 'project_close',
      referenceId: 'close-a-profit',
      projectId: 'proj-a',
      partyId: null,
      templateLines: periodCloseTransfer(profitA),
    });
    const feedbackA = computeRapCompletionFeedback({
      projectId: 'proj-a',
      projectType: 'renovasi_rumah',
      volume: 100,
      volumeUnit: 'm2',
      plannedByCategory: { material: 21_000_000, labor: 10_000_000 },
      actualByCategory: { material: 5_050_000, labor: 10_000_000 },
    });
    expect(feedbackA.totalActual).toBe(15_050_000);

    // Uji mode dividen per proyek pada Proyek A (dibatasi kolam bersihnya)
    const projDivPlan = planProjectModeDividend({
      projectId: 'proj-a',
      received: 80_000_000,
      spent: 15_050_000,
      totalPiutang: 0,
      ownerPiutang: 0,
      contractValue: 80_000_000,
      parties: [{ id: 'owner-1', name: 'Pemilik', sharePct: 100, isOwner: true }],
      ownerPiutangByParty: {},
      payouts: [],
    });
    expect(projDivPlan.projectPool).toBe(64_950_000);
    expect(linesAreBalanced(projDivPlan.journalTemplate)).toBe(true);

    // Uji mode dividen per bisnis (dari Laba Ditahan 64.95jt dengan cadangan 1x opex 5jt)
    const kasSebelumDividen = Array.from(ledger.accounts.values())
      .filter((a) => a.type === 'kas')
      .reduce((s, a) => s + a.current_balance, 0);
    const bizDivPlan = planBusinessModeDividend({
      totalCash: kasSebelumDividen,
      monthlyPlannedOpex: 5_000_000,
      labaDitahan: ledger.accounts.get('laba_ditahan')!.current_balance,
      requestedAmount: 20_000_000,
      parties: [{ id: 'owner-1', name: 'Pemilik', sharePct: 100, isOwner: true }],
    });
    expect(bizDivPlan.blockedReason).toBeNull();
    expect(bizDivPlan.totalCashOut).toBe(20_000_000);
    ledger.post({
      entryDate: '2026-11-24',
      description: 'Pembagian dividen bisnis periode Nov 2026',
      referenceType: 'dividend',
      referenceId: 'div-nov',
      projectId: null,
      partyId: 'owner-1',
      templateLines: bizDivPlan.journalTemplate,
    });

    // 9. Tutup Periode (pindahkan sisa netProfit di luar project_close A agar tidak dobel!)
    const remainingPeriodProfit = v1Report.netProfit - profitA; // 123.600.000 - 64.950.000 = 58.650.000
    ledger.post({
      entryDate: '2026-11-30',
      description: 'Tutup periode Nov 2026 (sisa laba di luar project_close)',
      referenceType: 'period_close',
      referenceId: 'close-2026-11',
      projectId: null,
      partyId: null,
      templateLines: periodCloseTransfer(remainingPeriodProfit),
    });

    // Setelah tutup periode, Laba Ditahan == 1x netProfit (123.600.000), dividen 20jt terpisah, dan sisa Laba Periode == 0!
    expect(ledger.accounts.get('laba_ditahan')!.current_balance).toBe(v1Report.netProfit);
    expect(ledger.accounts.get('dividen')!.current_balance).toBe(20_000_000);
    expect(
      computePeriodProfitFromAccounts(Array.from(ledger.accounts.values()) as FinanceAccount[]),
    ).toBe(0);

    // Dan laporan P&L setelah project_close + period_close + dividend tetap bersih = 123.600.000 (tidak nol/dobel)!
    const v1AfterClose = businessReportFromLedger({
      filters: { dateFrom: '2026-11-01', dateTo: '2026-11-30' },
      lines: ledger.lines,
      projectNames: { 'proj-a': 'Proyek A', 'proj-b': 'Proyek B' },
      opexCategoryNames: { 'cat-wk': 'Perawatan Workshop' },
      receivableProjectMap: {},
      opexRealizationCategory: { 'opx-workshop': 'cat-wk' },
    });
    expect(v1AfterClose.netProfit).toBe(123_600_000);
    expect(FINANCE_EVENT_CODES.includes('dividend_business_cash' as FinanceEventCode)).toBe(true);
  });
});
