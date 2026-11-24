#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

/**
 * PRNG deterministik Mulberry32 (berbasis seed tetap) untuk simulasi migrasi F1 skala besar.
 */
export function createSeededRng(seed = 20261124) {
  let state = seed >>> 0;
  return function nextFloat() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nextInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function toRupiah(amount) {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount);
}

export function hppAccountTypeForRapType(rapType) {
  const key = String(rapType || '').trim().toLowerCase();
  if (key === 'material') return 'hpp_material';
  if (key === 'labor' || key === 'tenaga' || key === 'tukang') return 'hpp_labor';
  if (key === 'equipment' || key === 'alat') return 'hpp_equipment';
  if (key === 'overhead') return 'hpp_overhead';
  if (key === 'other' || key === 'lain' || key === 'lainnya') return 'hpp_other';
  return 'hpp_uncategorized';
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

export function normalCategoryForAccountType(type) {
  if (AKTIVA_TYPES.has(type)) return 'aktiva';
  if (PENDAPATAN_TYPES.has(type)) return 'pendapatan';
  if (BEBAN_TYPES.has(type)) return 'beban';
  return 'pasiva';
}

/**
 * Membangkitkan dataset sintetis skala besar secara deterministik:
 * 25 proyek, 350 realisasi biaya (6 tipe RAP termasuk uncategorized), 150 pemasukan
 * (dp, termin, pelunasan, retensi), piutang, hutang, modal, dan dividen (>= 500 transaksi).
 */
export function generateSyntheticF1Dataset(options = {}) {
  const seed = options.seed ?? 20261124;
  const projectCount = options.projectCount ?? 25;
  const costCount = options.costCount ?? 350;
  const incomeCount = options.incomeCount ?? 150;
  const rng = createSeededRng(seed);

  const projects = [];
  const rapTypesById = {};
  const rapItemIdsByType = {
    material: [],
    labor: [],
    equipment: [],
    overhead: [],
    other: [],
  };

  for (let i = 1; i <= projectCount; i++) {
    const projectId = `proj-${String(i).padStart(2, '0')}`;
    projects.push({ id: projectId, name: `Proyek Sintetis ${i}` });
    for (const rapType of ['material', 'labor', 'equipment', 'overhead', 'other']) {
      const rapId = `rap-${projectId}-${rapType}`;
      rapTypesById[rapId] = rapType;
      rapItemIdsByType[rapType].push({ projectId, rapId });
    }
  }

  // Distribusi 6 tipe RAP (termasuk rapItemId = null untuk hpp_uncategorized)
  const rapBuckets = ['material', 'labor', 'equipment', 'overhead', 'other', 'uncategorized'];
  const costs = [];
  const hutangItems = [];
  let cashCostsTotal = 0;
  let openHutangTotal = 0;

  for (let i = 1; i <= costCount; i++) {
    const projectIdx = (i - 1) % projectCount;
    const projectId = projects[projectIdx].id;
    const bucket = rapBuckets[(i - 1) % rapBuckets.length];
    const rapItemId = bucket === 'uncategorized' ? null : `rap-${projectId}-${bucket}`;
    const amount = nextInt(rng, 25, 1_500) * 10_000; // Rp 250.000 - Rp 15.000.000
    const isCredit = i % 5 === 0; // 20% pembelian tempo (hutang dagang)

    costs.push({
      id: `cost-${String(i).padStart(3, '0')}`,
      projectId,
      description: `Biaya ${bucket} #${i}`,
      amount,
      rapItemId,
      paymentMethod: isCredit ? 'credit' : 'cash',
    });

    if (isCredit) {
      openHutangTotal += amount;
      hutangItems.push({
        id: `ap-${String(hutangItems.length + 1).padStart(3, '0')}`,
        projectId,
        amount,
      });
    } else {
      cashCostsTotal += amount;
    }
  }

  const incomeCategories = ['dp', 'termin', 'pelunasan', 'retensi'];
  const incomes = [];
  let totalReceivedIncomes = 0;
  let receivedIncomeCount = 0;
  let pendingIncomeCount = 0;

  for (let i = 1; i <= incomeCount; i++) {
    const projectIdx = (i - 1) % projectCount;
    const projectId = projects[projectIdx].id;
    const category = incomeCategories[(i - 1) % incomeCategories.length];
    // ~90% received, ~10% pending (untuk menguji bahwa pending tidak ikut direklasifikasi)
    const status = i % 10 === 0 ? 'pending' : 'received';
    const amount = nextInt(rng, 100, 4_500) * 10_000; // Rp 1.000.000 - Rp 45.000.000

    incomes.push({
      id: `inc-${String(i).padStart(3, '0')}`,
      projectId,
      category,
      amount,
      status,
    });

    if (status === 'received') {
      totalReceivedIncomes += amount;
      receivedIncomeCount += 1;
    } else {
      pendingIncomeCount += 1;
    }
  }

  // Piutang terbuka (20 tagihan)
  const piutangItems = [];
  let openPiutangTotal = 0;
  for (let i = 1; i <= 20; i++) {
    const projectId = projects[(i - 1) % projectCount].id;
    const amount = nextInt(rng, 100, 1_000) * 10_000;
    openPiutangTotal += amount;
    piutangItems.push({
      id: `ar-${String(i).padStart(3, '0')}`,
      projectId,
      amount,
    });
  }

  // Modal & dividen
  const modalDisetor = 3_500_000_000;
  const dividendItems = [];
  let dividenPaid = 0;
  for (let i = 1; i <= 5; i++) {
    const amount = nextInt(rng, 1_500, 4_000) * 10_000;
    dividenPaid += amount;
    dividendItems.push({
      id: `div-${String(i).padStart(2, '0')}`,
      amount,
    });
  }

  const totalCostsAmount = cashCostsTotal + openHutangTotal;
  const kasBalance = modalDisetor + totalReceivedIncomes - cashCostsTotal - dividenPaid;
  const labaLegacyBalance = totalReceivedIncomes + openPiutangTotal - totalCostsAmount;

  const accounts = [
    { type: 'kas', current_balance: kasBalance },
    { type: 'piutang', current_balance: openPiutangTotal },
    { type: 'hutang_dagang', current_balance: openHutangTotal },
    { type: 'modal_disetor', current_balance: modalDisetor },
    { type: 'dividen', current_balance: -dividenPaid },
    { type: 'laba', current_balance: labaLegacyBalance },
  ];

  const totalTransactions =
    costs.length
    + incomes.length
    + piutangItems.length
    + hutangItems.length
    + 1 // modal disetor
    + dividendItems.length;

  return {
    dataset: 'SYNTHETIC',
    seed,
    projects,
    rapTypesById,
    costs: costs.map(({ id, projectId, description, amount, rapItemId }) => ({
      id,
      projectId,
      description,
      amount,
      rapItemId,
    })),
    incomes,
    piutangItems,
    hutangItems,
    modalDisetor,
    dividendItems,
    accounts,
    stats: {
      projects: projects.length,
      costs: costs.length,
      uncategorizedCosts: costs.filter((c) => c.rapItemId === null).length,
      incomes: incomes.length,
      receivedIncomes: receivedIncomeCount,
      pendingIncomes: pendingIncomeCount,
      piutangEntries: piutangItems.length,
      hutangEntries: hutangItems.length,
      dividendEntries: dividendItems.length,
      totalTransactions,
    },
  };
}

export function summarizeAccounts(accounts) {
  let kas = 0;
  let piutang = 0;
  let hutang = 0;
  let uangMukaKlien = 0;
  let netProfit = 0;

  for (const a of accounts) {
    const bal = toRupiah(a.current_balance);
    if (a.type === 'kas') kas += bal;
    else if (a.type === 'piutang' || a.type === 'piutang_retensi') piutang += bal;
    else if (a.type.startsWith('hutang')) hutang += bal;
    else if (a.type === 'uang_muka_klien') uangMukaKlien += bal;
    else if (a.type === 'pendapatan_proyek' || a.type === 'laba') netProfit += bal;
    else if (a.type.startsWith('hpp_') || a.type === 'beban_opex' || a.type === 'beban_penyusutan') netProfit -= bal;
  }

  return { kas, piutang, hutang, uangMukaKlien, netProfit };
}

function applyReclassificationJournalsToAccounts(accounts, journals) {
  const cloned = accounts.map((a) => ({
    type: a.type,
    current_balance: toRupiah(a.current_balance),
  }));

  for (const journal of journals) {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of journal.lines) {
      const debit = toRupiah(line.debit);
      const credit = toRupiah(line.credit);
      if (debit < 0 || credit < 0 || (debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
        throw new Error(`Baris jurnal reklasifikasi tidak valid (${journal.referenceId})`);
      }
      totalDebit += debit;
      totalCredit += credit;
    }
    if (totalDebit <= 0 || totalDebit !== totalCredit) {
      throw new Error(`Jurnal reklasifikasi tidak seimbang (${journal.referenceId})`);
    }

    for (const line of journal.lines) {
      const debit = toRupiah(line.debit);
      const credit = toRupiah(line.credit);
      let target = cloned.find((a) => a.type === line.accountType);
      if (!target) {
        target = { type: line.accountType, current_balance: 0 };
        cloned.push(target);
      }
      const category = normalCategoryForAccountType(line.accountType);
      const delta = category === 'aktiva' || category === 'beban' ? debit - credit : credit - debit;
      target.current_balance += delta;
    }
  }

  return cloned;
}

function reconcileF1MigrationStandalone(input) {
  const before = summarizeAccounts(input.accounts);
  const reclassificationJournals = [];
  let dpReclassified = 0;
  let uncategorizedCount = 0;
  let uncategorizedTotal = 0;

  for (const c of input.costs) {
    const amount = toRupiah(c.amount);
    const rapType = c.rapItemId ? input.rapTypesById[c.rapItemId] : undefined;
    const targetAccountType = hppAccountTypeForRapType(rapType);
    const needsReview = !c.rapItemId || targetAccountType === 'hpp_uncategorized';

    if (needsReview) {
      uncategorizedCount += 1;
      uncategorizedTotal += amount;
    }
    if (amount <= 0) continue;

    reclassificationJournals.push({
      referenceType: 'f1_migration',
      referenceId: c.id,
      sourceKind: 'cost',
      projectId: c.projectId,
      description: `Reklasifikasi F1 biaya: ${c.description}`,
      lines: [
        { accountType: targetAccountType, debit: amount, credit: 0, projectId: c.projectId, needsReview },
        { accountType: 'laba', debit: 0, credit: amount, projectId: c.projectId, needsReview: false },
      ],
    });
  }

  for (const inc of input.incomes) {
    if (inc.status !== 'received') continue;
    const amount = toRupiah(inc.amount);
    if (amount <= 0) continue;

    const isDp = inc.category === 'dp';
    const targetAccountType = isDp ? 'uang_muka_klien' : 'pendapatan_proyek';
    if (isDp) dpReclassified += amount;

    reclassificationJournals.push({
      referenceType: 'f1_migration',
      referenceId: inc.id,
      sourceKind: 'income',
      projectId: inc.projectId,
      description: isDp
        ? `Reklasifikasi F1 uang muka klien (${inc.id})`
        : `Reklasifikasi F1 pendapatan proyek (${inc.category})`,
      lines: [
        { accountType: 'laba', debit: amount, credit: 0, projectId: inc.projectId, needsReview: false },
        { accountType: targetAccountType, debit: 0, credit: amount, projectId: inc.projectId, needsReview: false },
      ],
    });
  }

  const clonedBefore = input.accounts.map((a) => ({
    type: a.type,
    current_balance: toRupiah(a.current_balance),
  }));
  const simulatedAccounts = applyReclassificationJournalsToAccounts(clonedBefore, reclassificationJournals);
  const after = summarizeAccounts(simulatedAccounts);

  const mismatches = [];
  if (before.kas !== after.kas) mismatches.push('kas');
  if (before.piutang !== after.piutang) mismatches.push('piutang');
  if (before.hutang !== after.hutang) mismatches.push('hutang');
  if (after.netProfit + dpReclassified !== before.netProfit) mismatches.push('netProfit');
  if (after.uangMukaKlien - before.uangMukaKlien !== dpReclassified) mismatches.push('uangMukaKlien');

  return {
    dryRun: Boolean(input.dryRun),
    before,
    after,
    dpReclassified,
    matched: mismatches.length === 0,
    mismatches,
    reclassificationJournals,
    uncategorizedCount,
    uncategorizedTotal,
    simulatedAccounts,
  };
}

function buildBalanceSheetFromAccountSnapshots(accounts) {
  const aktiva = [];
  const pasiva = [];
  let totalPendapatan = 0;
  let totalBeban = 0;
  let legacyLaba = 0;

  for (const acc of accounts) {
    const category = normalCategoryForAccountType(acc.type);
    const bal = toRupiah(acc.current_balance);
    if (category === 'pendapatan') {
      totalPendapatan += bal;
      continue;
    }
    if (category === 'beban') {
      totalBeban += bal;
      continue;
    }
    if (category === 'pasiva' && acc.type === 'laba') {
      legacyLaba += bal;
      continue;
    }
    if (Math.abs(bal) < 0.01) continue;
    const row = { type: acc.type, category, balance: bal };
    if (category === 'aktiva') aktiva.push(row);
    else pasiva.push(row);
  }

  const combinedProfit = legacyLaba + (totalPendapatan - totalBeban);
  if (Math.abs(combinedProfit) >= 0.01) {
    pasiva.push({ type: 'laba', category: 'pasiva', balance: combinedProfit });
  }

  const totalAktiva = aktiva.reduce((s, r) => s + r.balance, 0);
  const totalPasiva = pasiva.reduce((s, r) => s + r.balance, 0);
  const balanceSheetBalanced = Math.abs(totalAktiva - totalPasiva) <= 0.01;
  const expenseInAktiva = aktiva.filter(
    (r) => r.type.startsWith('hpp_') || r.type.startsWith('beban_') || r.category === 'beban',
  ).length;
  const revenueInAktiva = aktiva.filter(
    (r) => r.type === 'pendapatan_proyek' || r.category === 'pendapatan',
  ).length;
  const expenseInPasiva = pasiva.filter(
    (r) => r.type.startsWith('hpp_') || r.type.startsWith('beban_') || r.category === 'beban',
  ).length;

  return {
    aktiva,
    pasiva,
    totalAktiva,
    totalPasiva,
    balanceSheetBalanced,
    expenseInAktiva,
    revenueInAktiva,
    expenseInPasiva,
  };
}

export function runStagingDryRunSimulation(options = {}) {
  const dataset = generateSyntheticF1Dataset(options);
  const accountsSnapshot = dataset.accounts.map((a) => ({ ...a }));

  const dryRunReport = reconcileF1MigrationStandalone({
    accounts: dataset.accounts,
    costs: dataset.costs,
    incomes: dataset.incomes,
    rapTypesById: dataset.rapTypesById,
    dryRun: true,
  });

  const inputMutatedDuringDryRun =
    JSON.stringify(dataset.accounts) !== JSON.stringify(accountsSnapshot);

  const executeReport = reconcileF1MigrationStandalone({
    accounts: dataset.accounts,
    costs: dataset.costs,
    incomes: dataset.incomes,
    rapTypesById: dataset.rapTypesById,
    dryRun: false,
  });

  const allJournalsBalanced = executeReport.reclassificationJournals.every((j) => {
    const dr = j.lines.reduce((s, l) => s + l.debit, 0);
    const cr = j.lines.reduce((s, l) => s + l.credit, 0);
    return dr > 0 && dr === cr;
  });

  const bsAfter = buildBalanceSheetFromAccountSnapshots(executeReport.simulatedAccounts);

  const matched =
    dryRunReport.matched
    && executeReport.matched
    && !inputMutatedDuringDryRun
    && allJournalsBalanced;

  const passed =
    matched === true
    && bsAfter.balanceSheetBalanced === true
    && bsAfter.expenseInAktiva === 0;

  return {
    dataset: 'SYNTHETIC',
    seed: dataset.seed,
    counts: {
      ...dataset.stats,
      journalsGenerated: executeReport.reclassificationJournals.length,
    },
    before: executeReport.before,
    after: executeReport.after,
    dpReclassified: executeReport.dpReclassified,
    reconciliation: {
      dryRunMatched: dryRunReport.matched,
      executeMatched: executeReport.matched,
      matched,
      mismatches: executeReport.mismatches,
      inputMutatedDuringDryRun,
      allJournalsBalanced,
      uncategorizedCount: executeReport.uncategorizedCount,
      uncategorizedTotal: executeReport.uncategorizedTotal,
    },
    balanceSheetAfter: {
      totalAktiva: bsAfter.totalAktiva,
      totalPasiva: bsAfter.totalPasiva,
      balanceSheetBalanced: bsAfter.balanceSheetBalanced,
      expenseInAktiva: bsAfter.expenseInAktiva,
      revenueInAktiva: bsAfter.revenueInAktiva,
      expenseInPasiva: bsAfter.expenseInPasiva,
      rowsAktivaCount: bsAfter.aktiva.length,
      rowsPasivaCount: bsAfter.pasiva.length,
    },
    status: passed ? 'PASS' : 'FAIL',
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const result = runStagingDryRunSimulation();
  console.log(JSON.stringify(result, null, 2));
  const ok =
    result.reconciliation.matched === true
    && result.balanceSheetAfter.balanceSheetBalanced === true
    && result.balanceSheetAfter.expenseInAktiva === 0;
  process.exit(ok ? 0 : 1);
}
