import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearEntryEngineStateForTests,
  commitEntry,
  FINANCE_AGENT_INTENTS,
  prepareEntry,
  recordFinanceCorrection,
  type EntityCatalogItem,
} from '@agent-core/financeEntryEngine';
import { estimateJsonTokens } from '@agent-core/financeSnapshot';

const root = new URL('../../../../', import.meta.url);
const now = Date.parse('2026-11-24T03:00:00.000Z');

const PROJECTS: EntityCatalogItem[] = [
  { id: 'proj-a', name: 'Proyek A', aliases: ['prj a', 'alfa'] },
  { id: 'proj-b', name: 'Proyek B', aliases: ['prj b', 'beta'] },
  { id: 'proj-rumah-ana', name: 'Rumah Bu Ana' },
  { id: 'proj-ruko-ana', name: 'Ruko Bu Ana' },
];

const PARTIES: EntityCatalogItem[] = [
  { id: 'sup-jaya', name: 'TB Maju Jaya', aliases: ['maju jaya'] },
  { id: 'tukang-budi', name: 'Pak Budi', aliases: ['budi'] },
  { id: 'klien-ana', name: 'Bu Ana' },
];

const WALLETS: EntityCatalogItem[] = [
  { id: 'kas-bca', name: 'Bank BCA', aliases: ['bca'] },
  { id: 'kas-kecil', name: 'Kas Kecil', aliases: ['tunai', 'kas tunai'] },
];

describe('F3 — Engine AI Pencatat 9 Intent (prepare_entry / commit_entry)', () => {
  beforeEach(() => {
    clearEntryEngineStateForTests();
  });

  it('memproses kalimat wajib: "belanja engsel pintu proyek A 50.000" -> material Proyek A auto_commit', () => {
    const prep = prepareEntry({
      text: 'belanja engsel pintu proyek A 50.000',
      projects: PROJECTS,
      parties: PARTIES,
      wallets: WALLETS,
      now,
      model: 'tier-small-flash-lite',
    });
    expect(prep.ok).toBe(true);
    if (!prep.ok || prep.status !== 'prepared') return;
    expect(prep.intent).toBe('catat_biaya_proyek');
    expect(prep.eventCode).toBe('project_cost_material');
    expect(prep.projectId).toBe('proj-a');
    expect(prep.amount).toBe(50_000);
    expect(prep.confidenceBand).toBe('high');
    expect(prep.action).toBe('auto_commit');
    expect(prep.meta.source).toBe('agent');
    expect(prep.meta.model).toBe('tier-small-flash-lite');

    const commit = commitEntry({
      prepareToken: prep.prepareToken,
      idempotencyKey: 'idem-engsel-1',
      now,
    });
    expect(commit.ok).toBe(true);
    if (commit.ok) {
      expect(commit.entry.amount).toBe(50_000);
      expect(commit.entry.meta.prepare_token).toBe(prep.prepareToken);
    }

    const replay = commitEntry({
      prepareToken: prep.prepareToken,
      idempotencyKey: 'idem-engsel-1',
      now,
    });
    expect(replay.ok && replay.status).toBe('idempotent_replay');
  });

  it('memproses kalimat wajib: "belanja Rp150.000 untuk proyek B" dan memicu koreksi menjadi aturan org', () => {
    const prep = prepareEntry({
      text: 'belanja Rp150.000 untuk proyek B',
      projects: PROJECTS,
      wallets: WALLETS,
      now,
      candidateSelector: () => ({ chosenCode: 'project_cost_overhead', score: 0.82 }),
    });
    expect(prep.ok).toBe(true);
    if (!prep.ok || prep.status !== 'prepared') return;
    expect(prep.projectId).toBe('proj-b');
    expect(prep.amount).toBe(150_000);
    expect(prep.tier).toBe('llm_closed_choice');
    expect(prep.eventCode).toBe('project_cost_overhead');
    expect(prep.action).toBe('confirm_one_tap');

    // Simpan koreksi pengguna menjadi org rule
    const rule = recordFinanceCorrection({
      keyword: 'belanja Rp150.000 untuk proyek B',
      intent: 'catat_biaya_proyek',
      eventCode: 'project_cost_material',
      projectId: 'proj-b',
    });
    const prepAfterRule = prepareEntry({
      text: 'belanja Rp150.000 untuk proyek B',
      projects: PROJECTS,
      wallets: WALLETS,
      orgRules: [rule],
      now,
    });
    expect(prepAfterRule.ok && prepAfterRule.status === 'prepared' && prepAfterRule.tier).toBe('org_rule');
    expect(prepAfterRule.ok && prepAfterRule.status === 'prepared' && prepAfterRule.eventCode).toBe('project_cost_material');
  });

  it('memproses "beli keramik perbaikan workshop": opex jika < 5jt, tanya Aset Tetap jika >= 5jt, & minta nominal jika kosong', () => {
    const noAmt = prepareEntry({
      text: 'beli keramik perbaikan workshop',
      projects: PROJECTS,
      wallets: WALLETS,
      now,
    });
    expect(noAmt.ok).toBe(false);
    if (!noAmt.ok) expect(noAmt.error.code).toBe('missing_amount');

    const opex = prepareEntry({
      text: 'beli keramik perbaikan workshop 1.2jt',
      projects: PROJECTS,
      wallets: WALLETS,
      now,
    });
    expect(opex.ok).toBe(true);
    if (opex.ok && opex.status === 'prepared') {
      expect(opex.intent).toBe('catat_opex');
      expect(opex.eventCode).toBe('opex_expense');
      expect(opex.opexCategory).toBe('Perawatan Workshop');
      expect(opex.amount).toBe(1_200_000);
      expect(opex.action).toBe('confirm_one_tap');
    }

    const assetAsk = prepareEntry({
      text: 'beli keramik perbaikan workshop 6jt',
      projects: PROJECTS,
      wallets: WALLETS,
      now,
    });
    expect(assetAsk.ok).toBe(false);
    if (!assetAsk.ok) {
      expect(assetAsk.error.code).toBe('confirm_asset_vs_opex');
      expect(assetAsk.candidates?.length).toBe(2);
    }
  });

  it('mendukung seluruh 13 intent tertutup termasuk pemasukan, hutang, piutang, kasbon, transfer, tanya saldo, 4 intent G1, dan dividen wajib approval', () => {
    expect(FINANCE_AGENT_INTENTS).toHaveLength(13);

    const dp = prepareEntry({ text: 'terima DP Proyek A dari Bu Ana 25jt kemarin', projects: PROJECTS, parties: PARTIES, wallets: WALLETS, now });
    expect(dp.ok && dp.status === 'prepared' && dp.eventCode).toBe('client_dp');
    expect(dp.ok && dp.status === 'prepared' && dp.entryDate).toBe('2026-11-23');

    const payDebt = prepareEntry({ text: 'bayar hutang TB Maju Jaya 4jt', projects: PROJECTS, parties: PARTIES, wallets: WALLETS, now });
    expect(payDebt.ok && payDebt.status === 'prepared' && payDebt.eventCode).toBe('payable_payment');

    const recAmbig = prepareEntry({ text: 'terima piutang Bu Ana 8jt', projects: PROJECTS, parties: PARTIES, wallets: WALLETS, now });
    expect(recAmbig.ok).toBe(false);
    if (!recAmbig.ok) expect(recAmbig.error.code).toBe('entity_ambiguous');

    const recRecv = prepareEntry({ text: 'terima piutang Ruko Bu Ana 8jt', projects: PROJECTS, parties: PARTIES, wallets: WALLETS, now });
    expect(recRecv.ok && recRecv.status === 'prepared' && recRecv.eventCode).toBe('receivable_receipt');

    const kasbon = prepareEntry({ text: 'kasbon Pak Budi proyek A 500rb', projects: PROJECTS, parties: PARTIES, wallets: WALLETS, now });
    expect(kasbon.ok && kasbon.status === 'prepared' && kasbon.eventCode).toBe('kasbon_disbursement');

    const tf = prepareEntry({ text: 'transfer kas dari BCA ke Kas Kecil 3jt', wallets: WALLETS, now });
    expect(tf.ok && tf.status === 'prepared' && tf.eventCode).toBe('wallet_transfer');
    expect(tf.ok && tf.status === 'prepared' && tf.targetWalletId).toBe('kas-kecil');

    const saldo = prepareEntry({ text: 'berapa saldo kas dan laba bulan ini', wallets: WALLETS, now });
    expect(saldo.ok && saldo.status).toBe('read_snapshot');

    const divPrep = prepareEntry({ text: 'bagi dividen bisnis 10jt', wallets: WALLETS, now });
    expect(divPrep.ok).toBe(true);
    if (!divPrep.ok || divPrep.status !== 'prepared') return;
    expect(divPrep.requiresOwnerApproval).toBe(true);
    expect(divPrep.action).not.toBe('auto_commit');
    const blockedDiv = commitEntry({ prepareToken: divPrep.prepareToken, idempotencyKey: 'div-1', now, ownerApproved: false });
    expect(blockedDiv.ok).toBe(false);
    if (!blockedDiv.ok) expect(blockedDiv.error.code).toBe('butuh_persetujuan_pemilik');
    const approvedDiv = commitEntry({ prepareToken: divPrep.prepareToken, idempotencyKey: 'div-1', now, ownerApproved: true });
    expect(approvedDiv.ok).toBe(true);
  });

  it('menolak pengeluaran pribadi, proyek ambigu mengembalikan needs_choice <= 5, dan periode terkunci ditolak', () => {
    const personal = prepareEntry({ text: 'beli kopi ngopi pribadi 35rb', projects: PROJECTS, now });
    expect(personal.ok).toBe(false);
    if (!personal.ok) expect(personal.error.code).toBe('personal_expense_blocked');

    const ambig = prepareEntry({ text: 'beli semen Bu Ana 500rb', projects: PROJECTS, now });
    expect(ambig.ok).toBe(false);
    if (!ambig.ok) {
      expect(ambig.status).toBe('needs_choice');
      expect(ambig.error.code).toBe('entity_ambiguous');
      expect(ambig.candidates?.length).toBeLessThanOrEqual(5);
    }

    const locked = prepareEntry({
      text: 'beli paku proyek A 50rb 2026-10-15',
      projects: PROJECTS,
      lockedPeriods: ['2026-10-01'],
      now,
    });
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.error.code).toBe('periode_terkunci');
  });

  it('anggaran token docs/finance/AGENT-GUIDE.md <= 1.500 token', () => {
    const guide = readFileSync(new URL('docs/finance/AGENT-GUIDE.md', root), 'utf8');
    const tokens = estimateJsonTokens(guide);
    expect(tokens).toBeLessThanOrEqual(1500);
  });
});

