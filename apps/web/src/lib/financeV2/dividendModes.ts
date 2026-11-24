import {
  businessDividendCash,
  projectDividendCash,
  toRupiah,
  type TemplateLine,
} from '../../../../../packages/domain/src/journal';
import {
  dividendPool,
  previewDividend,
  type DividendParty,
  type DividendPayout,
  type DividendPreviewLine,
} from '../projects/dividend';

export type DividendMode = 'per_proyek' | 'per_bisnis';

export type BusinessDividendInput = {
  totalCash: number;
  monthlyPlannedOpex: number;
  /** Default konservatif sesuai D-F2-01 = 1x opex bulanan terencana. */
  opexReserveMultiplier?: number;
  labaDitahan: number;
  alreadyPaidPeriod?: number;
  requestedAmount?: number;
  parties: DividendParty[];
  ownerPiutangByParty?: Record<string, number>;
  payouts?: DividendPayout[];
};

export type BusinessDividendPlan = {
  mode: 'per_bisnis';
  opexReserve: number;
  cashAfterReserve: number;
  maxDistributable: number;
  targetPool: number;
  pctTotal: number;
  totalCashOut: number;
  blockedReason: string | null;
  lines: DividendPreviewLine[];
  journalTemplate: TemplateLine[];
};

export type ProjectDividendModePlan = {
  mode: 'per_proyek';
  projectId: string;
  projectPool: number;
  pctTotal: number;
  totalCashOut: number;
  blockedReason: string | null;
  lines: DividendPreviewLine[];
  journalTemplate: TemplateLine[];
};

/**
 * Menghitung rencana pembagian dividen mode PER PROYEK (berbasis net kas proyek setelah biaya & offset piutang owner).
 */
export function planProjectModeDividend(input: {
  projectId: string;
  received: number;
  spent: number;
  totalPiutang: number;
  ownerPiutang: number;
  contractValue: number;
  parties: DividendParty[];
  ownerPiutangByParty: Record<string, number>;
  payouts: DividendPayout[];
}): ProjectDividendModePlan {
  const alreadyPaidCash = input.payouts.reduce((s, p) => s + (p.cashPaid || 0), 0);
  const pool = toRupiah(
    dividendPool({
      received: input.received,
      spent: input.spent,
      totalPiutang: input.totalPiutang,
      ownerPiutang: input.ownerPiutang,
      contractValue: input.contractValue,
      alreadyPaidCash,
    }),
  );

  const preview = previewDividend({
    pool,
    parties: input.parties,
    ownerPiutangByParty: input.ownerPiutangByParty,
    payouts: input.payouts,
  });

  const cashOut = toRupiah(preview.cashOut);
  let blockedReason: string | null = null;
  if (preview.pctTotal > 100) {
    blockedReason = 'Total porsi saham melebihi 100%.';
  } else if (cashOut <= 0) {
    blockedReason = 'Pool kas proyek bersih belum tersedia untuk dibagikan.';
  }

  return {
    mode: 'per_proyek',
    projectId: input.projectId,
    projectPool: pool,
    pctTotal: preview.pctTotal,
    totalCashOut: cashOut,
    blockedReason,
    lines: preview.lines,
    journalTemplate: cashOut > 0 && !blockedReason ? projectDividendCash(cashOut) : [],
  };
}

/**
 * Menghitung rencana pembagian dividen mode PER BISNIS dari Laba Ditahan,
 * dibatasi kas tersedia dikurangi cadangan opex (default 1x opex bulanan terencana).
 */
export function planBusinessModeDividend(input: BusinessDividendInput): BusinessDividendPlan {
  const multiplier = input.opexReserveMultiplier ?? 1;
  const opexReserve = toRupiah(Math.max(0, input.monthlyPlannedOpex) * Math.max(0, multiplier));
  const cashAfterReserve = toRupiah(Math.max(0, input.totalCash - opexReserve));
  const retainedAvailable = toRupiah(Math.max(0, input.labaDitahan - (input.alreadyPaidPeriod || 0)));
  const maxDistributable = toRupiah(Math.min(cashAfterReserve, retainedAvailable));

  const requested = input.requestedAmount != null ? toRupiah(input.requestedAmount) : maxDistributable;
  const targetPool = toRupiah(Math.max(0, Math.min(requested, maxDistributable)));

  const preview = previewDividend({
    pool: targetPool,
    parties: input.parties,
    ownerPiutangByParty: input.ownerPiutangByParty || {},
    payouts: input.payouts || [],
  });

  const cashOut = toRupiah(preview.cashOut);
  let blockedReason: string | null = null;
  if (preview.pctTotal > 100) {
    blockedReason = 'Total porsi saham melebihi 100%.';
  } else if (input.requestedAmount != null && toRupiah(input.requestedAmount) > maxDistributable) {
    blockedReason = `Nominal diminta melebihi batas kas & laba ditahan yang aman (${maxDistributable.toLocaleString('id-ID')}).`;
  } else if (maxDistributable <= 0) {
    blockedReason = 'Kas setelah cadangan opex atau laba ditahan tidak mencukupi untuk dividen.';
  }

  return {
    mode: 'per_bisnis',
    opexReserve,
    cashAfterReserve,
    maxDistributable,
    targetPool,
    pctTotal: preview.pctTotal,
    totalCashOut: cashOut,
    blockedReason,
    lines: preview.lines,
    journalTemplate: cashOut > 0 && !blockedReason ? businessDividendCash(cashOut) : [],
  };
}

