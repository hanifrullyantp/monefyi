import { CFO_ANALYTICS_DISCLAIMER } from './cfoAnalytics';
import type {
  ForecastCashFlow13WeeksResult,
  ForecastScenarioResult,
} from './financialAdvisor';
import {
  depreciationExpense,
  linesAreBalanced,
  toRupiah,
  type TemplateLine,
} from './journal';
import { normalizePeriodMonth } from './revenueRecognition';

export const TAX_DRAFT_DISCLAIMER =
  'Draf untuk ditinjau konsultan pajak — bukan nasihat hukum/pajak berlisensi' as const;

export const DEFAULT_CAPITALIZATION_THRESHOLD_RUPIAH = 5_000_000;
export const TAX_VERIFICATION_MAX_AGE_DAYS = 180;
const MS_PER_DAY = 86_400_000;

export type CfoTaxCapitalProvenance = {
  source: string;
  period: string;
  asOfDate: string;
  assumptions: string[];
  disclaimer: typeof TAX_DRAFT_DISCLAIMER | typeof CFO_ANALYTICS_DISCLAIMER;
};

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function parseYmdUtcMs(ymd: string, fieldName = 'tanggal'): number {
  const raw = String(ymd ?? '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Format ${fieldName} tidak valid (harus YYYY-MM-DD): ${ymd}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const probe = new Date(utc);
  if (
    probe.getUTCFullYear() !== year
    || probe.getUTCMonth() + 1 !== month
    || probe.getUTCDate() !== day
  ) {
    throw new Error(`Tanggal ${fieldName} tidak valid: ${ymd}`);
  }
  return utc;
}

function extractYmdPrefix(value: string, fieldName = 'tanggal'): string {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) {
    throw new Error(`Format ${fieldName} tidak valid: ${value}`);
  }
  parseYmdUtcMs(match[1], fieldName);
  return match[1];
}

function diffDaysUtc(fromYmd: string, toYmd: string, fromLabel: string, toLabel: string): number {
  const fromMs = parseYmdUtcMs(fromYmd, fromLabel);
  const toMs = parseYmdUtcMs(toYmd, toLabel);
  return Math.floor((toMs - fromMs) / MS_PER_DAY);
}

function getMonthLastDay(year: number, month1To12: number): number {
  return new Date(Date.UTC(year, month1To12, 0)).getUTCDate();
}

function getMonthLastDayYmd(normalizedMonthStart: string): string {
  const year = Number(normalizedMonthStart.slice(0, 4));
  const month = Number(normalizedMonthStart.slice(5, 7));
  const lastDay = getMonthLastDay(year, month);
  return `${normalizedMonthStart.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
}

function addMonthsClampedYmd(baseYmd: string, deltaMonths: number): string {
  parseYmdUtcMs(baseYmd, 'baseDate');
  const year = Number(baseYmd.slice(0, 4));
  const monthIdx = Number(baseYmd.slice(5, 7)) - 1;
  const day = Number(baseYmd.slice(8, 10));

  const totalMonths = year * 12 + monthIdx + Math.trunc(deltaMonths);
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthIdx = ((totalMonths % 12) + 12) % 12;
  const maxDay = getMonthLastDay(targetYear, targetMonthIdx + 1);
  const targetDay = Math.min(day, maxDay);

  return `${targetYear}-${String(targetMonthIdx + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

function buildNextMonthDueDate(normalizedPeriodStart: string, dueDay: number): string {
  const year = Number(normalizedPeriodStart.slice(0, 4));
  const month1To12 = Number(normalizedPeriodStart.slice(5, 7));
  const totalMonths = year * 12 + (month1To12 - 1) + 1;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth1To12 = (totalMonths % 12) + 1;
  const maxDay = getMonthLastDay(nextYear, nextMonth1To12);
  const clampedDay = Math.min(Math.max(1, Math.trunc(dueDay)), maxDay);
  return `${nextYear}-${String(nextMonth1To12).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

function isValidRate(rate: number | null | undefined): rate is number {
  return typeof rate === 'number' && Number.isFinite(rate) && rate >= 0;
}

function isValidDueDay(day: number | null | undefined): day is number {
  return typeof day === 'number' && Number.isFinite(day) && day >= 1 && day <= 31;
}

// ============================================================================
// 1. Modul Pajak Konfigurabel & Kalender Setor/Lapor
// ============================================================================

export type IncomeTaxRegime = 'pph_final_konstruksi' | 'pph_badan' | 'pph_final_umkm';

export type TaxProfileConfig = {
  profileCode: string;
  effectiveFrom: string;
  regulationRef: string;
  verifiedAt?: string | null;
  isPkp: boolean;
  ppnRatePct?: number | null;
  incomeTaxRegime?: IncomeTaxRegime | null;
  incomeTaxRatePct?: number | null;
  paymentDueDayOfNextMonth?: number | null;
  filingDueDayOfNextMonth?: number | null;
  ppnPaymentDueDayOfNextMonth?: number | null;
  ppnFilingDueDayOfNextMonth?: number | null;
};

export type TaxDraftInput = {
  periodMonth: string;
  revenueTaxable: number;
  pkpEstimated?: number;
  ppnInputCredit?: number;
  taxConfig?: TaxProfileConfig | null;
  asOfDate?: string;
  sourceLabel?: string;
};

export type TaxCalendarItem = {
  taxType: 'ppn' | IncomeTaxRegime;
  dueDate: string;
  action: 'setor' | 'lapor';
  estimatedAmount: number;
};

export type TaxWarningCode = 'config_required' | 'verification_missing' | 'verification_stale';

export type TaxDraftAndCalendarResult = {
  status: 'draft_ready' | 'config_required';
  periodMonth: string;
  profileCode: string | null;
  regulationRef: string | null;
  effectiveFrom: string | null;
  verifiedAt: string | null;
  verificationStatus: 'verified' | 'missing' | 'stale';
  daysSinceVerification: number | null;
  isPkp: boolean;
  ppnRatePct: number | null;
  ppnOutput: number;
  ppnInputCredit: number;
  ppnNetPayable: number;
  ppnPayable: number;
  ppnOverpayment: number;
  incomeTaxRegime: IncomeTaxRegime | null;
  incomeTaxRatePct: number | null;
  pphTaxBase: number;
  pphAmount: number;
  totalCashTaxLiability: number;
  calendar: TaxCalendarItem[];
  missingConfigFields: string[];
  warningCodes: TaxWarningCode[];
  warnings: string[];
  provenance: CfoTaxCapitalProvenance & {
    profileCode: string | null;
    regulationRef: string | null;
    verifiedAt: string | null;
  };
  disclaimer: typeof TAX_DRAFT_DISCLAIMER;
};

/**
 * Menghitung draf PPN dan PPh + kalender setor/lapor sepenuhnya dari TaxProfileConfig.
 * Tarif pajak dan tanggal setor/lapor TIDAK PERNAH di-hardcode: bila konfigurasi kosong,
 * fungsi mengembalikan status & peringatan `config_required` tanpa menebak tarif.
 */
export function calculateTaxDraftAndCalendar(
  input: TaxDraftInput,
): TaxDraftAndCalendarResult {
  const normalizedPeriodStart = normalizePeriodMonth(input.periodMonth);
  const periodYm = normalizedPeriodStart.slice(0, 7);
  const periodEndDate = getMonthLastDayYmd(normalizedPeriodStart);
  const asOfDate = input.asOfDate ? extractYmdPrefix(input.asOfDate, 'asOfDate') : periodEndDate;

  const revenueTaxable = Math.max(0, toRupiah(input.revenueTaxable));
  const pkpEstimated = Math.max(0, toRupiah(input.pkpEstimated ?? 0));
  const ppnInputCreditRaw = Math.max(0, toRupiah(input.ppnInputCredit ?? 0));

  const cfg = input.taxConfig ?? null;
  const missingConfigFields: string[] = [];
  const warningCodes: TaxWarningCode[] = [];
  const warnings: string[] = [];
  const assumptions: string[] = [
    `Periode pajak ${periodYm} (posisi evaluasi ${asOfDate}).`,
  ];

  const pushWarning = (code: TaxWarningCode, message: string) => {
    if (!warningCodes.includes(code)) warningCodes.push(code);
    warnings.push(message);
  };

  if (!cfg) {
    missingConfigFields.push(
      'taxConfig',
      'incomeTaxRegime',
      'incomeTaxRatePct',
      'paymentDueDayOfNextMonth',
      'filingDueDayOfNextMonth',
    );
    pushWarning(
      'config_required',
      'config_required: Konfigurasi profil pajak (TaxProfileConfig) belum diisi; sistem tidak menebak tarif pajak.',
    );
    pushWarning(
      'verification_missing',
      'Wajib verifikasi tarif ke regulasi terkini karena profil pajak belum terkonfigurasi.',
    );

    return {
      status: 'config_required',
      periodMonth: periodYm,
      profileCode: null,
      regulationRef: null,
      effectiveFrom: null,
      verifiedAt: null,
      verificationStatus: 'missing',
      daysSinceVerification: null,
      isPkp: false,
      ppnRatePct: null,
      ppnOutput: 0,
      ppnInputCredit: ppnInputCreditRaw,
      ppnNetPayable: 0,
      ppnPayable: 0,
      ppnOverpayment: 0,
      incomeTaxRegime: null,
      incomeTaxRatePct: null,
      pphTaxBase: 0,
      pphAmount: 0,
      totalCashTaxLiability: 0,
      calendar: [],
      missingConfigFields,
      warningCodes,
      warnings,
      provenance: {
        source: input.sourceLabel ?? 'konfigurasi_pajak_organisasi',
        period: periodYm,
        asOfDate,
        profileCode: null,
        regulationRef: null,
        verifiedAt: null,
        assumptions,
        disclaimer: TAX_DRAFT_DISCLAIMER,
      },
      disclaimer: TAX_DRAFT_DISCLAIMER,
    };
  }

  const profileCode = String(cfg.profileCode ?? '').trim() || null;
  const regulationRef = String(cfg.regulationRef ?? '').trim() || null;
  const effectiveFrom = cfg.effectiveFrom
    ? extractYmdPrefix(cfg.effectiveFrom, 'effectiveFrom')
    : null;
  const verifiedAt = cfg.verifiedAt && String(cfg.verifiedAt).trim()
    ? extractYmdPrefix(cfg.verifiedAt, 'verifiedAt')
    : null;

  if (!profileCode) missingConfigFields.push('profileCode');
  if (!regulationRef) missingConfigFields.push('regulationRef');
  if (!effectiveFrom) missingConfigFields.push('effectiveFrom');

  let verificationStatus: 'verified' | 'missing' | 'stale' = 'verified';
  let daysSinceVerification: number | null = null;
  if (!verifiedAt) {
    verificationStatus = 'missing';
    pushWarning(
      'verification_missing',
      'Wajib verifikasi tarif ke regulasi terkini (tanggal verifikasi verifiedAt masih kosong).',
    );
  } else {
    daysSinceVerification = diffDaysUtc(verifiedAt, asOfDate, 'verifiedAt', 'asOfDate');
    if (daysSinceVerification > TAX_VERIFICATION_MAX_AGE_DAYS) {
      verificationStatus = 'stale';
      pushWarning(
        'verification_stale',
        `Wajib verifikasi tarif ke regulasi terkini (verifikasi terakhir ${verifiedAt}, berusia ${daysSinceVerification} hari > ${TAX_VERIFICATION_MAX_AGE_DAYS} hari).`,
      );
    }
  }

  const isPkp = Boolean(cfg.isPkp);
  let ppnRatePct: number | null = null;
  let ppnOutput = 0;
  let ppnInputCreditApplied = 0;
  let ppnNetPayable = 0;
  let ppnPayable = 0;
  let ppnOverpayment = 0;

  if (isPkp) {
    if (!isValidRate(cfg.ppnRatePct)) {
      missingConfigFields.push('ppnRatePct');
    } else {
      ppnRatePct = cfg.ppnRatePct;
      ppnOutput = toRupiah((revenueTaxable * ppnRatePct) / 100);
      ppnInputCreditApplied = ppnInputCreditRaw;
      ppnNetPayable = toRupiah(ppnOutput - ppnInputCreditApplied);
      ppnPayable = ppnNetPayable > 0 ? ppnNetPayable : 0;
      ppnOverpayment = ppnNetPayable < 0 ? Math.abs(ppnNetPayable) : 0;
      assumptions.push(
        `PKP aktif: PPN Keluaran ${ppnRatePct}% atas DPP ${revenueTaxable} dikurangi PPN Masukan ${ppnInputCreditApplied}.`,
      );
    }
  } else {
    assumptions.push('Non-PKP: PPN Keluaran tidak dipungut dan PPN Masukan tidak dikreditkan.');
  }

  const validRegime: IncomeTaxRegime | null =
    cfg.incomeTaxRegime === 'pph_final_konstruksi'
    || cfg.incomeTaxRegime === 'pph_badan'
    || cfg.incomeTaxRegime === 'pph_final_umkm'
      ? cfg.incomeTaxRegime
      : null;

  if (!validRegime) {
    missingConfigFields.push('incomeTaxRegime');
  }

  let incomeTaxRatePct: number | null = null;
  if (!isValidRate(cfg.incomeTaxRatePct)) {
    missingConfigFields.push('incomeTaxRatePct');
  } else {
    incomeTaxRatePct = cfg.incomeTaxRatePct;
  }

  let pphTaxBase = 0;
  let pphAmount = 0;
  if (validRegime && incomeTaxRatePct !== null) {
    pphTaxBase = validRegime === 'pph_badan' ? pkpEstimated : revenueTaxable;
    pphAmount = toRupiah((pphTaxBase * incomeTaxRatePct) / 100);
    assumptions.push(
      `Rezim ${validRegime} dengan tarif konfigurasi ${incomeTaxRatePct}% atas dasar pengenaan ${pphTaxBase}.`,
    );
  }

  const paymentDueDay = isValidDueDay(cfg.paymentDueDayOfNextMonth)
    ? Math.trunc(cfg.paymentDueDayOfNextMonth)
    : null;
  const filingDueDay = isValidDueDay(cfg.filingDueDayOfNextMonth)
    ? Math.trunc(cfg.filingDueDayOfNextMonth)
    : null;

  if (paymentDueDay === null) missingConfigFields.push('paymentDueDayOfNextMonth');
  if (filingDueDay === null) missingConfigFields.push('filingDueDayOfNextMonth');

  const ppnPaymentDueDay = isValidDueDay(cfg.ppnPaymentDueDayOfNextMonth)
    ? Math.trunc(cfg.ppnPaymentDueDayOfNextMonth)
    : paymentDueDay;
  const ppnFilingDueDay = isValidDueDay(cfg.ppnFilingDueDayOfNextMonth)
    ? Math.trunc(cfg.ppnFilingDueDayOfNextMonth)
    : filingDueDay;

  if (missingConfigFields.length > 0) {
    pushWarning(
      'config_required',
      `config_required: Kolom konfigurasi pajak belum lengkap (${missingConfigFields.join(', ')}); sistem tidak menebak nilai bawaan.`,
    );
  }

  const calendar: TaxCalendarItem[] = [];
  if (validRegime && incomeTaxRatePct !== null) {
    if (paymentDueDay !== null) {
      calendar.push({
        taxType: validRegime,
        dueDate: buildNextMonthDueDate(normalizedPeriodStart, paymentDueDay),
        action: 'setor',
        estimatedAmount: pphAmount,
      });
    }
    if (filingDueDay !== null) {
      calendar.push({
        taxType: validRegime,
        dueDate: buildNextMonthDueDate(normalizedPeriodStart, filingDueDay),
        action: 'lapor',
        estimatedAmount: pphAmount,
      });
    }
  }

  if (isPkp && ppnRatePct !== null) {
    if (ppnPaymentDueDay !== null) {
      calendar.push({
        taxType: 'ppn',
        dueDate: buildNextMonthDueDate(normalizedPeriodStart, ppnPaymentDueDay),
        action: 'setor',
        estimatedAmount: ppnPayable,
      });
    }
    if (ppnFilingDueDay !== null) {
      calendar.push({
        taxType: 'ppn',
        dueDate: buildNextMonthDueDate(normalizedPeriodStart, ppnFilingDueDay),
        action: 'lapor',
        estimatedAmount: ppnPayable,
      });
    }
  }

  calendar.sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate)
      || a.taxType.localeCompare(b.taxType)
      || a.action.localeCompare(b.action),
  );

  const hasRequiredRateMissing =
    !validRegime
    || incomeTaxRatePct === null
    || (isPkp && ppnRatePct === null)
    || paymentDueDay === null
    || filingDueDay === null;

  const status: 'draft_ready' | 'config_required' = hasRequiredRateMissing
    ? 'config_required'
    : 'draft_ready';

  return {
    status,
    periodMonth: periodYm,
    profileCode,
    regulationRef,
    effectiveFrom,
    verifiedAt,
    verificationStatus,
    daysSinceVerification,
    isPkp,
    ppnRatePct,
    ppnOutput,
    ppnInputCredit: ppnInputCreditApplied,
    ppnNetPayable,
    ppnPayable,
    ppnOverpayment,
    incomeTaxRegime: validRegime,
    incomeTaxRatePct,
    pphTaxBase,
    pphAmount,
    totalCashTaxLiability: toRupiah(ppnPayable + pphAmount),
    calendar,
    missingConfigFields,
    warningCodes,
    warnings,
    provenance: {
      source: input.sourceLabel ?? 'konfigurasi_pajak_organisasi',
      period: periodYm,
      asOfDate,
      profileCode,
      regulationRef,
      verifiedAt,
      assumptions,
      disclaimer: TAX_DRAFT_DISCLAIMER,
    },
    disclaimer: TAX_DRAFT_DISCLAIMER,
  };
}

// ============================================================================
// 2. Aset Tetap: Evaluasi Kapitalisasi & Penyusutan Terjadwal Garis Lurus
// ============================================================================

export type AssetCapitalizationInput = {
  id?: string | null;
  name: string;
  acquisitionCostRupiah: number;
  usefulLifeMonths: number;
  acquisitionDate?: string;
  category?: string;
};

export type AssetCapitalizationDecision = 'capitalize_fixed_asset' | 'expense_opex';

export type AssetCapitalizationResult = {
  id: string | null;
  name: string;
  acquisitionCostRupiah: number;
  usefulLifeMonths: number;
  capitalizationThresholdRupiah: number;
  decision: AssetCapitalizationDecision;
  meetsThreshold: boolean;
  exceedsOneYearLife: boolean;
  recommendedAccountRole: 'aktiva_tetap' | 'beban_opex';
  reason: string;
  provenance: CfoTaxCapitalProvenance;
  disclaimer: typeof CFO_ANALYTICS_DISCLAIMER;
};

/**
 * Mengevaluasi apakah pengeluaran dikapitalisasi sebagai Aset Tetap atau dibebankan sebagai Opex.
 * Default ambang Rp 5.000.000 (D-F1-02), dapat dikonfigurasi organisasi.
 */
export function evaluateAssetCapitalization(
  item: AssetCapitalizationInput,
  capitalizationThresholdRupiah = DEFAULT_CAPITALIZATION_THRESHOLD_RUPIAH,
): AssetCapitalizationResult {
  const name = String(item.name ?? '').trim();
  if (!name) throw new Error('Nama aset/pengeluaran wajib diisi');

  const threshold = Math.max(0, toRupiah(capitalizationThresholdRupiah));
  const acquisitionCostRupiah = Math.max(0, toRupiah(item.acquisitionCostRupiah));
  const usefulLifeMonths = Math.max(0, Math.trunc(Number(item.usefulLifeMonths ?? 0) || 0));
  const asOfDate = item.acquisitionDate
    ? extractYmdPrefix(item.acquisitionDate, 'acquisitionDate')
    : '1970-01-01';

  const meetsThreshold = acquisitionCostRupiah >= threshold;
  const exceedsOneYearLife = usefulLifeMonths > 12;
  const decision: AssetCapitalizationDecision =
    meetsThreshold && exceedsOneYearLife ? 'capitalize_fixed_asset' : 'expense_opex';

  const reason = decision === 'capitalize_fixed_asset'
    ? `Nilai perolehan ${acquisitionCostRupiah} >= ambang ${threshold} dan masa manfaat ${usefulLifeMonths} bulan (> 12 bulan) -> dikapitalisasi sebagai Aset Tetap.`
    : !meetsThreshold
      ? `Nilai perolehan ${acquisitionCostRupiah} < ambang kapitalisasi ${threshold} -> dibebankan sebagai Beban Operasional.`
      : `Masa manfaat ${usefulLifeMonths} bulan <= 12 bulan -> dibebankan sebagai Beban Operasional.`;

  return {
    id: item.id ? String(item.id).trim() : null,
    name,
    acquisitionCostRupiah,
    usefulLifeMonths,
    capitalizationThresholdRupiah: threshold,
    decision,
    meetsThreshold,
    exceedsOneYearLife,
    recommendedAccountRole:
      decision === 'capitalize_fixed_asset' ? 'aktiva_tetap' : 'beban_opex',
    reason,
    provenance: {
      source: 'kebijakan_kapitalisasi_aset',
      period: asOfDate.slice(0, 7),
      asOfDate,
      assumptions: [
        `Ambang kapitalisasi aktif: Rp ${threshold} (default D-F1-02 = Rp 5.000.000).`,
        'Syarat kapitalisasi: nilai perolehan >= ambang DAN masa manfaat > 12 bulan.',
      ],
      disclaimer: CFO_ANALYTICS_DISCLAIMER,
    },
    disclaimer: CFO_ANALYTICS_DISCLAIMER,
  };
}

export type FixedAssetDepreciationInput = {
  assetId: string;
  assetName: string;
  acquisitionCostRupiah: number;
  residualValueRupiah?: number;
  usefulLifeMonths: number;
  accumulatedDepreciationRupiah?: number;
  bookValueRupiah?: number;
  acquisitionDate?: string;
  status?: 'active' | 'disposed' | 'fully_depreciated' | 'inactive' | string;
};

export type ScheduledDepreciationEntry = {
  assetId: string;
  assetName: string;
  periodMonth: string;
  method: 'straight_line';
  openingBookValueRupiah: number;
  residualValueRupiah: number;
  depreciationAmountRupiah: number;
  endingBookValueRupiah: number;
  eventCode: 'depreciation_expense';
  referenceType: 'depreciation';
  idempotencyKey: string;
  journalLines: TemplateLine[];
  isBalanced: boolean;
};

export type ScheduledDepreciationPlanResult = {
  ok: boolean;
  reason: 'ok' | 'periode_terkunci';
  periodMonth: string;
  entries: ScheduledDepreciationEntry[];
  skippedAssetIds: string[];
  totalDepreciationRupiah: number;
  provenance: CfoTaxCapitalProvenance;
  disclaimer: typeof CFO_ANALYTICS_DISCLAIMER;
};

/**
 * Menyusun rencana jurnal penyusutan bulanan garis lurus untuk seluruh aset aktif.
 * Menolak tegas (`ok: false`, `reason: 'periode_terkunci'`) bila `periodMonth` masuk `lockedPeriods`.
 */
export function buildScheduledDepreciationPlan(
  assets: FixedAssetDepreciationInput[],
  periodMonth: string,
  lockedPeriods: string[] = [],
): ScheduledDepreciationPlanResult {
  const normalizedPeriodStart = normalizePeriodMonth(periodMonth);
  const periodYm = normalizedPeriodStart.slice(0, 7);
  const periodEndDate = getMonthLastDayYmd(normalizedPeriodStart);

  const lockedNormalizedSet = new Set(
    (lockedPeriods ?? [])
      .map((p) => String(p ?? '').trim())
      .filter(Boolean)
      .map((p) => normalizePeriodMonth(p).slice(0, 7)),
  );

  if (lockedNormalizedSet.has(periodYm)) {
    return {
      ok: false,
      reason: 'periode_terkunci',
      periodMonth: periodYm,
      entries: [],
      skippedAssetIds: [],
      totalDepreciationRupiah: 0,
      provenance: {
        source: 'jadwal_penyusutan_aset_tetap',
        period: periodYm,
        asOfDate: periodEndDate,
        assumptions: [
          `Periode ${periodYm} berstatus terkunci; penyusutan ditolak untuk menjaga integritas tutup periode.`,
        ],
        disclaimer: CFO_ANALYTICS_DISCLAIMER,
      },
      disclaimer: CFO_ANALYTICS_DISCLAIMER,
    };
  }

  const sortedAssets = [...assets].sort((a, b) =>
    String(a.assetId).localeCompare(String(b.assetId)),
  );

  const entries: ScheduledDepreciationEntry[] = [];
  const skippedAssetIds: string[] = [];
  let totalDepreciationRupiah = 0;

  for (const asset of sortedAssets) {
    const assetId = String(asset.assetId ?? '').trim();
    if (!assetId) throw new Error('assetId wajib diisi');
    const assetName = String(asset.assetName ?? '').trim() || assetId;
    const status = String(asset.status ?? 'active').trim().toLowerCase();

    if (status !== 'active') {
      skippedAssetIds.push(assetId);
      continue;
    }

    if (asset.acquisitionDate) {
      const acqYmd = extractYmdPrefix(asset.acquisitionDate, 'acquisitionDate');
      if (acqYmd.slice(0, 7) > periodYm) {
        skippedAssetIds.push(assetId);
        continue;
      }
    }

    const acquisitionCost = Math.max(0, toRupiah(asset.acquisitionCostRupiah));
    const residualValue = Math.min(
      acquisitionCost,
      Math.max(0, toRupiah(asset.residualValueRupiah ?? 0)),
    );
    const usefulLifeMonths = Math.trunc(Number(asset.usefulLifeMonths ?? 0) || 0);

    if (usefulLifeMonths <= 0) {
      skippedAssetIds.push(assetId);
      continue;
    }

    const openingBookValue = asset.bookValueRupiah != null
      ? Math.max(0, toRupiah(asset.bookValueRupiah))
      : Math.max(
          0,
          toRupiah(
            acquisitionCost - Math.max(0, toRupiah(asset.accumulatedDepreciationRupiah ?? 0)),
          ),
        );

    const remainingDepreciable = Math.max(0, toRupiah(openingBookValue - residualValue));
    if (remainingDepreciable <= 0) {
      skippedAssetIds.push(assetId);
      continue;
    }

    const monthlyRaw = (acquisitionCost - residualValue) / usefulLifeMonths;
    const monthlyRounded = Math.max(1, toRupiah(monthlyRaw));
    const depreciationAmount = Math.min(remainingDepreciable, monthlyRounded);

    if (depreciationAmount <= 0) {
      skippedAssetIds.push(assetId);
      continue;
    }

    const endingBookValue = toRupiah(openingBookValue - depreciationAmount);
    const journalLines = depreciationExpense(depreciationAmount);
    const isBalanced = linesAreBalanced(journalLines);

    entries.push({
      assetId,
      assetName,
      periodMonth: periodYm,
      method: 'straight_line',
      openingBookValueRupiah: openingBookValue,
      residualValueRupiah: residualValue,
      depreciationAmountRupiah: depreciationAmount,
      endingBookValueRupiah: endingBookValue,
      eventCode: 'depreciation_expense',
      referenceType: 'depreciation',
      idempotencyKey: `depreciation:${assetId}:${periodYm}`,
      journalLines,
      isBalanced,
    });
    totalDepreciationRupiah += depreciationAmount;
  }

  return {
    ok: true,
    reason: 'ok',
    periodMonth: periodYm,
    entries,
    skippedAssetIds,
    totalDepreciationRupiah: toRupiah(totalDepreciationRupiah),
    provenance: {
      source: 'jadwal_penyusutan_aset_tetap',
      period: periodYm,
      asOfDate: periodEndDate,
      assumptions: [
        'Metode garis lurus bulanan: (Harga Perolehan - Nilai Residu) / Masa Manfaat (bulan).',
        'Nilai buku dibatasi agar tidak pernah turun di bawah nilai residu.',
      ],
      disclaimer: CFO_ANALYTICS_DISCLAIMER,
    },
    disclaimer: CFO_ANALYTICS_DISCLAIMER,
  };
}

// ============================================================================
// 3. Pendanaan / Cicilan Pinjaman & Kebutuhan Modal Kerja
// ============================================================================

export type FinancingLoanInput = {
  loanId?: string | null;
  lenderName: string;
  principalRupiah: number;
  annualInterestRatePct: number;
  tenorMonths: number;
  startDate: string;
  monthlyInstallmentOverrideRupiah?: number | null;
};

export type LoanAmortizationRow = {
  monthIndex: number;
  dueDate: string;
  openingBalanceRupiah: number;
  installmentRupiah: number;
  principalPaidRupiah: number;
  interestPaidRupiah: number;
  endingBalanceRupiah: number;
  cashFlowImpactRupiah: number;
};

export type LoanAmortizationScheduleResult = {
  loanId: string | null;
  lenderName: string;
  principalRupiah: number;
  annualInterestRatePct: number;
  tenorMonths: number;
  startDate: string;
  monthlyInstallmentNominalRupiah: number;
  schedule: LoanAmortizationRow[];
  totalPrincipalRupiah: number;
  totalInterestRupiah: number;
  totalPaymentRupiah: number;
  endingBalanceRupiah: number;
  cashFlowImpact: {
    totalOutflowRupiah: number;
    averageMonthlyOutflowRupiah: number;
    firstPaymentDate: string | null;
    lastPaymentDate: string | null;
  };
  provenance: CfoTaxCapitalProvenance;
  disclaimer: typeof CFO_ANALYTICS_DISCLAIMER;
};

/**
 * Menghasilkan jadwal amortisasi cicilan bulanan (pokok, bunga, sisa pokok) dengan
 * penyelesaian penuh di bulan akhir sehingga `endingBalanceRupiah === 0`.
 */
export function buildLoanAmortizationSchedule(
  loan: FinancingLoanInput,
): LoanAmortizationScheduleResult {
  const lenderName = String(loan.lenderName ?? '').trim();
  if (!lenderName) throw new Error('Nama pemberi pinjaman (lenderName) wajib diisi');

  const principalRupiah = Math.max(0, toRupiah(loan.principalRupiah));
  const tenorMonths = Math.trunc(Number(loan.tenorMonths));
  if (!Number.isFinite(tenorMonths) || tenorMonths <= 0) {
    throw new Error(`tenorMonths harus > 0: ${loan.tenorMonths}`);
  }
  const annualInterestRatePct = Math.max(0, Number(loan.annualInterestRatePct ?? 0));
  if (!Number.isFinite(annualInterestRatePct)) {
    throw new Error('annualInterestRatePct tidak valid');
  }
  const startDate = extractYmdPrefix(loan.startDate, 'startDate');

  if (principalRupiah === 0) {
    return {
      loanId: loan.loanId ? String(loan.loanId).trim() : null,
      lenderName,
      principalRupiah: 0,
      annualInterestRatePct,
      tenorMonths,
      startDate,
      monthlyInstallmentNominalRupiah: 0,
      schedule: [],
      totalPrincipalRupiah: 0,
      totalInterestRupiah: 0,
      totalPaymentRupiah: 0,
      endingBalanceRupiah: 0,
      cashFlowImpact: {
        totalOutflowRupiah: 0,
        averageMonthlyOutflowRupiah: 0,
        firstPaymentDate: null,
        lastPaymentDate: null,
      },
      provenance: {
        source: 'jadwal_amortisasi_pinjaman',
        period: startDate.slice(0, 7),
        asOfDate: startDate,
        assumptions: ['Pokok pinjaman Rp 0 sehingga tidak ada jadwal angsuran.'],
        disclaimer: CFO_ANALYTICS_DISCLAIMER,
      },
      disclaimer: CFO_ANALYTICS_DISCLAIMER,
    };
  }

  const monthlyRate = annualInterestRatePct / 100 / 12;
  let baseInstallment: number;
  if (loan.monthlyInstallmentOverrideRupiah != null && loan.monthlyInstallmentOverrideRupiah > 0) {
    baseInstallment = toRupiah(loan.monthlyInstallmentOverrideRupiah);
  } else if (monthlyRate === 0) {
    baseInstallment = toRupiah(principalRupiah / tenorMonths);
  } else {
    const factor = Math.pow(1 + monthlyRate, tenorMonths);
    baseInstallment = toRupiah((principalRupiah * monthlyRate * factor) / (factor - 1));
  }

  const schedule: LoanAmortizationRow[] = [];
  let remainingBalance = principalRupiah;
  let totalPrincipalRupiah = 0;
  let totalInterestRupiah = 0;
  let totalPaymentRupiah = 0;

  for (let monthIndex = 1; monthIndex <= tenorMonths; monthIndex += 1) {
    const openingBalance = remainingBalance;
    const interest = toRupiah(openingBalance * monthlyRate);
    let principalPaid: number;
    let installment: number;

    if (monthIndex === tenorMonths) {
      principalPaid = openingBalance;
      installment = toRupiah(principalPaid + interest);
    } else {
      const candidatePrincipal = toRupiah(baseInstallment - interest);
      principalPaid = Math.min(openingBalance, Math.max(0, candidatePrincipal));
      installment = toRupiah(principalPaid + interest);
    }

    const endingBalance = toRupiah(openingBalance - principalPaid);
    const dueDate = addMonthsClampedYmd(startDate, monthIndex);

    schedule.push({
      monthIndex,
      dueDate,
      openingBalanceRupiah: openingBalance,
      installmentRupiah: installment,
      principalPaidRupiah: principalPaid,
      interestPaidRupiah: interest,
      endingBalanceRupiah: endingBalance,
      cashFlowImpactRupiah: -installment,
    });

    remainingBalance = endingBalance;
    totalPrincipalRupiah += principalPaid;
    totalInterestRupiah += interest;
    totalPaymentRupiah += installment;
  }

  return {
    loanId: loan.loanId ? String(loan.loanId).trim() : null,
    lenderName,
    principalRupiah,
    annualInterestRatePct,
    tenorMonths,
    startDate,
    monthlyInstallmentNominalRupiah: baseInstallment,
    schedule,
    totalPrincipalRupiah: toRupiah(totalPrincipalRupiah),
    totalInterestRupiah: toRupiah(totalInterestRupiah),
    totalPaymentRupiah: toRupiah(totalPaymentRupiah),
    endingBalanceRupiah: remainingBalance,
    cashFlowImpact: {
      totalOutflowRupiah: toRupiah(totalPaymentRupiah),
      averageMonthlyOutflowRupiah: toRupiah(totalPaymentRupiah / tenorMonths),
      firstPaymentDate: schedule[0]?.dueDate ?? null,
      lastPaymentDate: schedule[schedule.length - 1]?.dueDate ?? null,
    },
    provenance: {
      source: 'jadwal_amortisasi_pinjaman',
      period: `${startDate.slice(0, 7)}..${schedule[schedule.length - 1]?.dueDate.slice(0, 7) ?? startDate.slice(0, 7)}`,
      asOfDate: startDate,
      assumptions: [
        `Anuitas bulanan dengan bunga ${annualInterestRatePct}%/tahun selama ${tenorMonths} bulan.`,
        'Selisih pembulatan rupiah ditutup pada angsuran bulan terakhir agar sisa pokok tepat Rp 0.',
      ],
      disclaimer: CFO_ANALYTICS_DISCLAIMER,
    },
    disclaimer: CFO_ANALYTICS_DISCLAIMER,
  };
}

export type WorkingCapitalFundingNeedResult = {
  needsFunding: boolean;
  minCashBufferRupiah: number;
  baseMinEndingCashRupiah: number;
  recommendedFundingRupiah: number;
  neededByDate: string | null;
  firstShortfallWeekIndex: number | null;
  peakDeficitWeekIndex: number | null;
  peakDeficitDate: string | null;
  shortfallWeekCount: number;
  worstCaseNeedsFunding: boolean;
  worstCaseRecommendedFundingRupiah: number;
  worstCaseNeededByDate: string | null;
  recommendation: string;
  provenance: CfoTaxCapitalProvenance;
  disclaimer: typeof CFO_ANALYTICS_DISCLAIMER;
};

function isFull13WeekResult(
  forecast: ForecastCashFlow13WeeksResult | ForecastScenarioResult,
): forecast is ForecastCashFlow13WeeksResult {
  return 'scenarios' in forecast && Boolean(forecast.scenarios?.base);
}

/**
 * Mengevaluasi kebutuhan tambahan modal kerja dari hasil forecast 13 minggu terhadap
 * batas buffer kas minimum (`minCashBufferRupiah`) secara deterministik.
 */
export function evaluateWorkingCapitalFundingNeed(
  forecast13w: ForecastCashFlow13WeeksResult | ForecastScenarioResult,
  minCashBufferRupiah: number,
): WorkingCapitalFundingNeedResult {
  const buffer = Math.max(0, toRupiah(minCashBufferRupiah));
  const baseScenario = isFull13WeekResult(forecast13w)
    ? forecast13w.scenarios.base
    : forecast13w;
  const worstScenario = isFull13WeekResult(forecast13w)
    ? forecast13w.scenarios.worst
    : null;
  const asOfDate = isFull13WeekResult(forecast13w)
    ? forecast13w.asOfDate
    : baseScenario.weeks[0]?.weekStart ?? '1970-01-01';

  const weeks = baseScenario.weeks;
  const baseMinEndingCashRupiah = weeks.length > 0
    ? Math.min(...weeks.map((w) => toRupiah(w.endingCash)))
    : toRupiah(baseScenario.minEndingCash);

  const shortfallWeeks = weeks.filter((w) => toRupiah(w.endingCash) < buffer);
  const needsFunding = baseMinEndingCashRupiah < buffer && shortfallWeeks.length > 0;

  let recommendedFundingRupiah = 0;
  let neededByDate: string | null = null;
  let firstShortfallWeekIndex: number | null = null;
  let peakDeficitWeekIndex: number | null = null;
  let peakDeficitDate: string | null = null;

  if (needsFunding) {
    const firstShortfall = shortfallWeeks[0];
    const peakShortfall = shortfallWeeks.reduce(
      (minW, w) => (w.endingCash < minW.endingCash ? w : minW),
      shortfallWeeks[0],
    );
    neededByDate = firstShortfall.weekStart;
    firstShortfallWeekIndex = firstShortfall.weekIndex;
    peakDeficitWeekIndex = peakShortfall.weekIndex;
    peakDeficitDate = peakShortfall.weekStart;
    recommendedFundingRupiah = Math.max(0, toRupiah(buffer - peakShortfall.endingCash));
  }

  let worstCaseNeedsFunding = false;
  let worstCaseRecommendedFundingRupiah = 0;
  let worstCaseNeededByDate: string | null = null;

  if (worstScenario) {
    const worstShortfall = worstScenario.weeks.filter((w) => toRupiah(w.endingCash) < buffer);
    if (worstScenario.minEndingCash < buffer && worstShortfall.length > 0) {
      worstCaseNeedsFunding = true;
      worstCaseNeededByDate = worstShortfall[0].weekStart;
      worstCaseRecommendedFundingRupiah = Math.max(
        0,
        toRupiah(buffer - worstScenario.minEndingCash),
      );
    }
  }

  const recommendation = needsFunding
    ? `Modal kerja tambahan sebesar Rp ${recommendedFundingRupiah.toLocaleString('id-ID')} dibutuhkan paling lambat ${neededByDate} (Minggu ke-${firstShortfallWeekIndex}) agar kas tetap >= buffer Rp ${buffer.toLocaleString('id-ID')}.`
    : worstCaseNeedsFunding
      ? `Skenario base memenuhi buffer kas Rp ${buffer.toLocaleString('id-ID')}, namun skenario worst membutuhkan cadangan Rp ${worstCaseRecommendedFundingRupiah.toLocaleString('id-ID')} sebelum ${worstCaseNeededByDate}.`
      : `Kas 13 minggu aman di atas buffer minimum Rp ${buffer.toLocaleString('id-ID')} tanpa kebutuhan pendanaan tambahan.`;

  return {
    needsFunding,
    minCashBufferRupiah: buffer,
    baseMinEndingCashRupiah,
    recommendedFundingRupiah,
    neededByDate,
    firstShortfallWeekIndex,
    peakDeficitWeekIndex,
    peakDeficitDate,
    shortfallWeekCount: shortfallWeeks.length,
    worstCaseNeedsFunding,
    worstCaseRecommendedFundingRupiah,
    worstCaseNeededByDate,
    recommendation,
    provenance: {
      source: 'evaluasi_kebutuhan_modal_kerja_13w',
      period: `${weeks[0]?.weekStart ?? asOfDate}..${weeks[weeks.length - 1]?.weekEnd ?? asOfDate}`,
      asOfDate,
      assumptions: [
        `Buffer kas minimum ditetapkan Rp ${buffer}.`,
        'Kebutuhan dana = selisih maksimum antara buffer kas dan titik kas terendah pada horizon 13 minggu.',
      ],
      disclaimer: CFO_ANALYTICS_DISCLAIMER,
    },
    disclaimer: CFO_ANALYTICS_DISCLAIMER,
  };
}

// ============================================================================
// 4. Perencanaan Skenario Tahunan (12 Bulan x 3 Skenario)
// ============================================================================

export type AnnualScenarioKey = 'conservative' | 'base' | 'growth';

export type AnnualScenarioMultipliers = {
  revenueMultiplier: number;
  hppMultiplier: number;
  opexMultiplier: number;
};

export type AnnualScenarioPlanInput = {
  fiscalYear: number;
  startMonth?: string;
  openingCash: number;
  baselineMonthlyRevenue: number;
  baselineHppRatioPct: number;
  baselineMonthlyOpex: number;
  otherMonthlyExpense?: number;
  monthlyRevenueGrowthPct?: number;
  monthlySeasonalityWeights?: number[];
  scenarioOverrides?: Partial<Record<AnnualScenarioKey, Partial<AnnualScenarioMultipliers>>>;
  asOfDate?: string;
  sourceLabel?: string;
};

export type AnnualScenarioMonthRow = {
  monthIndex: number;
  periodMonth: string;
  revenue: number;
  hpp: number;
  grossProfit: number;
  opex: number;
  otherExpense: number;
  netProfit: number;
  endingCash: number;
};

export type AnnualScenarioSummary = {
  scenario: AnnualScenarioKey;
  openingCash: number;
  multipliers: AnnualScenarioMultipliers;
  months: AnnualScenarioMonthRow[];
  annualSummary: {
    totalRevenue: number;
    totalHpp: number;
    totalGrossProfit: number;
    totalOpex: number;
    totalOtherExpense: number;
    totalNetProfit: number;
    endingCashMonth12: number;
    minEndingCash: number;
    netMarginPct: number;
  };
  assumptions: string[];
};

export type AnnualScenarioPlanResult = {
  fiscalYear: number;
  startMonth: string;
  openingCash: number;
  scenarios: Record<AnnualScenarioKey, AnnualScenarioSummary>;
  provenance: CfoTaxCapitalProvenance;
  disclaimer: typeof CFO_ANALYTICS_DISCLAIMER;
};

const DEFAULT_ANNUAL_SCENARIO_MULTIPLIERS: Record<
  AnnualScenarioKey,
  AnnualScenarioMultipliers
> = {
  conservative: {
    revenueMultiplier: 0.85,
    hppMultiplier: 1.05,
    opexMultiplier: 1.05,
  },
  base: {
    revenueMultiplier: 1.0,
    hppMultiplier: 1.0,
    opexMultiplier: 1.0,
  },
  growth: {
    revenueMultiplier: 1.2,
    hppMultiplier: 0.97,
    opexMultiplier: 1.0,
  },
};

function buildSingleAnnualScenario(params: {
  scenario: AnnualScenarioKey;
  startMonthNormalized: string;
  openingCash: number;
  baselineMonthlyRevenue: number;
  baselineHppRatioPct: number;
  baselineMonthlyOpex: number;
  otherMonthlyExpense: number;
  monthlyGrowthPct: number;
  weights: number[];
  multipliers: AnnualScenarioMultipliers;
}): AnnualScenarioSummary {
  const {
    scenario,
    startMonthNormalized,
    openingCash,
    baselineMonthlyRevenue,
    baselineHppRatioPct,
    baselineMonthlyOpex,
    otherMonthlyExpense,
    monthlyGrowthPct,
    weights,
    multipliers,
  } = params;

  const months: AnnualScenarioMonthRow[] = [];
  let runningCash = openingCash;
  let totalRevenue = 0;
  let totalHpp = 0;
  let totalGrossProfit = 0;
  let totalOpex = 0;
  let totalOtherExpense = 0;
  let totalNetProfit = 0;
  let minEndingCash = openingCash;

  for (let i = 0; i < 12; i += 1) {
    const monthStart = addMonthsClampedYmd(startMonthNormalized, i);
    const periodMonth = monthStart.slice(0, 7);
    const growthFactor = Math.pow(1 + monthlyGrowthPct / 100, i);
    const weight = weights[i];

    const revenue = toRupiah(
      baselineMonthlyRevenue * weight * growthFactor * multipliers.revenueMultiplier,
    );
    const effectiveHppRatio = Math.min(
      1,
      Math.max(0, (baselineHppRatioPct / 100) * multipliers.hppMultiplier),
    );
    const hpp = toRupiah(revenue * effectiveHppRatio);
    const grossProfit = toRupiah(revenue - hpp);
    const opex = toRupiah(baselineMonthlyOpex * multipliers.opexMultiplier);
    const otherExpense = toRupiah(otherMonthlyExpense);
    const netProfit = toRupiah(grossProfit - opex - otherExpense);
    runningCash = toRupiah(runningCash + netProfit);

    minEndingCash = Math.min(minEndingCash, runningCash);
    totalRevenue += revenue;
    totalHpp += hpp;
    totalGrossProfit += grossProfit;
    totalOpex += opex;
    totalOtherExpense += otherExpense;
    totalNetProfit += netProfit;

    months.push({
      monthIndex: i + 1,
      periodMonth,
      revenue,
      hpp,
      grossProfit,
      opex,
      otherExpense,
      netProfit,
      endingCash: runningCash,
    });
  }

  const netMarginPct = totalRevenue > 0 ? round2((totalNetProfit / totalRevenue) * 100) : 0;

  return {
    scenario,
    openingCash,
    multipliers,
    months,
    annualSummary: {
      totalRevenue: toRupiah(totalRevenue),
      totalHpp: toRupiah(totalHpp),
      totalGrossProfit: toRupiah(totalGrossProfit),
      totalOpex: toRupiah(totalOpex),
      totalOtherExpense: toRupiah(totalOtherExpense),
      totalNetProfit: toRupiah(totalNetProfit),
      endingCashMonth12: runningCash,
      minEndingCash,
      netMarginPct,
    },
    assumptions: [
      `Skenario ${scenario}: pengali pendapatan ${multipliers.revenueMultiplier}x, pengali rasio HPP ${multipliers.hppMultiplier}x, pengali opex ${multipliers.opexMultiplier}x.`,
      `Rasio HPP dasar ${baselineHppRatioPct}% | Pertumbuhan bulanan dasar ${monthlyGrowthPct}%/bulan.`,
    ],
  };
}

/**
 * Menyusun proyeksi keuangan tahunan 12 bulan x 3 skenario (`conservative`, `base`, `growth`)
 * secara deterministik dalam bilangan bulat rupiah lengkap dengan ringkasan tahunan & provenance.
 */
export function buildAnnualScenarioPlan(
  input: AnnualScenarioPlanInput,
): AnnualScenarioPlanResult {
  const fiscalYear = Math.trunc(Number(input.fiscalYear));
  if (!Number.isFinite(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2100) {
    throw new Error(`fiscalYear tidak valid: ${input.fiscalYear}`);
  }

  const startMonthNormalized = normalizePeriodMonth(
    input.startMonth ?? `${fiscalYear}-01`,
  );
  const startYm = startMonthNormalized.slice(0, 7);
  const endYm = addMonthsClampedYmd(startMonthNormalized, 11).slice(0, 7);
  const asOfDate = input.asOfDate
    ? extractYmdPrefix(input.asOfDate, 'asOfDate')
    : startMonthNormalized;

  const openingCash = toRupiah(input.openingCash);
  const baselineMonthlyRevenue = Math.max(0, toRupiah(input.baselineMonthlyRevenue));
  const baselineHppRatioPct = Math.min(
    100,
    Math.max(0, Number(input.baselineHppRatioPct ?? 0) || 0),
  );
  const baselineMonthlyOpex = Math.max(0, toRupiah(input.baselineMonthlyOpex));
  const otherMonthlyExpense = Math.max(0, toRupiah(input.otherMonthlyExpense ?? 0));
  const monthlyGrowthPct = Number(input.monthlyRevenueGrowthPct ?? 0) || 0;

  let weights = Array.from({ length: 12 }, () => 1);
  if (input.monthlySeasonalityWeights) {
    if (input.monthlySeasonalityWeights.length !== 12) {
      throw new Error('monthlySeasonalityWeights harus berisi tepat 12 angka (Januari..Desember)');
    }
    weights = input.monthlySeasonalityWeights.map((w) => {
      const n = Number(w);
      if (!Number.isFinite(n) || n < 0) {
        throw new Error('Setiap bobot musiman bulanan harus angka >= 0');
      }
      return n;
    });
  }

  const resolveMultipliers = (key: AnnualScenarioKey): AnnualScenarioMultipliers => ({
    ...DEFAULT_ANNUAL_SCENARIO_MULTIPLIERS[key],
    ...(input.scenarioOverrides?.[key] ?? {}),
  });

  const conservative = buildSingleAnnualScenario({
    scenario: 'conservative',
    startMonthNormalized,
    openingCash,
    baselineMonthlyRevenue,
    baselineHppRatioPct,
    baselineMonthlyOpex,
    otherMonthlyExpense,
    monthlyGrowthPct,
    weights,
    multipliers: resolveMultipliers('conservative'),
  });

  const base = buildSingleAnnualScenario({
    scenario: 'base',
    startMonthNormalized,
    openingCash,
    baselineMonthlyRevenue,
    baselineHppRatioPct,
    baselineMonthlyOpex,
    otherMonthlyExpense,
    monthlyGrowthPct,
    weights,
    multipliers: resolveMultipliers('base'),
  });

  const growth = buildSingleAnnualScenario({
    scenario: 'growth',
    startMonthNormalized,
    openingCash,
    baselineMonthlyRevenue,
    baselineHppRatioPct,
    baselineMonthlyOpex,
    otherMonthlyExpense,
    monthlyGrowthPct,
    weights,
    multipliers: resolveMultipliers('growth'),
  });

  return {
    fiscalYear,
    startMonth: startYm,
    openingCash,
    scenarios: {
      conservative,
      base,
      growth,
    },
    provenance: {
      source: input.sourceLabel ?? 'perencanaan_skenario_tahunan_cfo',
      period: `${startYm}..${endYm}`,
      asOfDate,
      assumptions: [
        `Proyeksi 12 bulan untuk tahun fiskal ${fiscalYear} (${startYm}..${endYm}) dengan kas awal Rp ${openingCash}.`,
        'Kas akhir dihitung kumulatif dari kas awal + laba bersih bulanan (tanpa asumsi pinjaman/dividen baru kecuali dimasukkan di beban lain).',
      ],
      disclaimer: CFO_ANALYTICS_DISCLAIMER,
    },
    disclaimer: CFO_ANALYTICS_DISCLAIMER,
  };
}
