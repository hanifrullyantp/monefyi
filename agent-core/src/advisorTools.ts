import {
  analyzeProjectMargin,
  FINANCIAL_ADVISOR_DISCLAIMER,
  forecastCashFlow13Weeks,
  prioritizePayables,
  type AdvisorPayableItem,
  type ForecastCashFlowInput,
  type ProjectMarginInput,
} from '../../packages/domain/src/financialAdvisor.ts';
import { toRupiah } from '../../packages/domain/src/journal.ts';
import { estimateJsonTokens } from './financeSnapshot.ts';

export type AdvisorBriefFocus =
  | 'ringkasan'
  | 'kas_13_minggu'
  | 'margin_proyek'
  | 'prioritas_hutang';

export type AdvisorBriefInput = {
  asOfDate: string;
  focus?: AdvisorBriefFocus;
  forecastInput?: ForecastCashFlowInput;
  projectMarginInput?: ProjectMarginInput;
  payables?: AdvisorPayableItem[];
  availableCash?: number;
};

export type AdvisorBriefMetric = {
  key: string;
  label: string;
  value: number;
  unit: 'idr' | 'pct';
  source: string;
  period: string;
};

export type AdvisorBriefToolResult = {
  asOfDate: string;
  focus: AdvisorBriefFocus;
  summary: string;
  metrics: AdvisorBriefMetric[];
  assumptions: string[];
  risks: string[];
  nextSteps: string[];
  disclaimer: typeof FINANCIAL_ADVISOR_DISCLAIMER;
};

const MAX_ADVISOR_BRIEF_TOKENS = 400;

function formatIdr(amount: number): string {
  const n = toRupiah(amount);
  const abs = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n < 0 ? `-Rp ${abs}` : `Rp ${abs}`;
}

function shortText(text: string, maxLen = 72): string {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean;
}

/**
 * Builder output deterministik & ringkas (<= 400 token) untuk tool `get_advisor_brief`.
 * Seluruh angka dihitung oleh `packages/domain/src/financialAdvisor.ts`, dilengkapi provenance & disclaimer.
 */
export function buildAdvisorBriefTool(input: AdvisorBriefInput): AdvisorBriefToolResult {
  const focus: AdvisorBriefFocus = input.focus ?? 'ringkasan';
  const metrics: AdvisorBriefMetric[] = [];
  const summaryParts: string[] = [];
  const assumptions: string[] = [];
  const risks: string[] = [];
  const nextSteps: string[] = [];

  const includeForecast =
    Boolean(input.forecastInput) && (focus === 'ringkasan' || focus === 'kas_13_minggu');
  const includeMargin =
    Boolean(input.projectMarginInput) && (focus === 'ringkasan' || focus === 'margin_proyek');
  const effectivePayables = input.payables ?? input.forecastInput?.payables;
  const includePayables =
    Boolean(effectivePayables && effectivePayables.length > 0)
    && (focus === 'ringkasan' || focus === 'prioritas_hutang');

  if (includeForecast && input.forecastInput) {
    const forecast = forecastCashFlow13Weeks(input.forecastInput);
    const base = forecast.scenarios.base;
    const worst = forecast.scenarios.worst;
    const period = forecast.provenance.period;

    metrics.push({
      key: 'ending_cash_w13',
      label: 'Kas akhir base',
      value: base.endingCashWeek13,
      unit: 'idr',
      source: 'forecast_base',
      period,
    });
    metrics.push({
      key: 'min_cash_base',
      label: 'Kas min base',
      value: base.minEndingCash,
      unit: 'idr',
      source: 'forecast_base',
      period,
    });

    if (focus === 'kas_13_minggu') {
      metrics.push({
        key: 'min_cash_worst',
        label: 'Kas min worst',
        value: worst.minEndingCash,
        unit: 'idr',
        source: 'forecast_worst',
        period,
      });
    }

    summaryParts.push(`Kas akhir ${formatIdr(base.endingCashWeek13)}, min ${formatIdr(base.minEndingCash)}`);
    assumptions.push('Piutang & termin cair sesuai jatuh tempo pada skenario base.');

    if (base.firstNegativeCashDate) {
      risks.push(`Kas berisiko defisit mulai ${base.firstNegativeCashDate}.`);
      nextSteps.push('Percepat penagihan piutang sebelum tanggal defisit kas.');
    } else if (worst.firstNegativeCashDate) {
      risks.push(`Pada skenario worst, kas defisit mulai ${worst.firstNegativeCashDate}.`);
      nextSteps.push('Siapkan cadangan kas untuk mengantisipasi keterlambatan klien.');
    } else {
      risks.push('Arus kas dasar tetap positif selama periode proyeksi.');
      nextSteps.push('Pertahankan disiplin penagihan sesuai jadwal termin.');
    }
  }

  if (includeMargin && input.projectMarginInput) {
    const margin = analyzeProjectMargin(input.projectMarginInput);
    const period = margin.provenance.asOfDate;

    metrics.push({
      key: 'eac',
      label: 'EAC proyek',
      value: margin.eac,
      unit: 'idr',
      source: 'margin_eac',
      period,
    });
    metrics.push({
      key: 'proj_margin_pct',
      label: 'Margin proyeksi',
      value: margin.projectedMarginPct,
      unit: 'pct',
      source: 'margin_eac',
      period,
    });

    if (focus === 'margin_proyek') {
      metrics.push({
        key: 'projected_final_margin',
        label: 'Laba proyeksi',
        value: margin.projectedFinalMargin,
        unit: 'idr',
        source: 'margin_eac',
        period,
      });
    }

    summaryParts.push(`EAC ${formatIdr(margin.eac)} (margin ${margin.projectedMarginPct}%)`);
    assumptions.push(
      margin.eacMethod === 'cpi_performance'
        ? 'EAC memakai rasio realisasi terhadap progres proyek berjalan.'
        : 'EAC memakai realisasi ditambah sisa RAP dasar.',
    );

    if (margin.topVarianceDrivers.length > 0) {
      const topCat = margin.topVarianceDrivers[0].category;
      risks.push(`Pembengkakan biaya terbesar ada pada kategori ${topCat}.`);
      nextSteps.push(`Audit pengeluaran ${topCat} untuk menjaga margin.`);
    } else {
      risks.push('Realisasi biaya masih terkendali di bawah RAP.');
      nextSteps.push('Lanjutkan pemantauan realisasi biaya per kategori.');
    }
  }

  if (includePayables && effectivePayables) {
    const availableCash = input.availableCash ?? input.forecastInput?.openingCash ?? 0;
    const priority = prioritizePayables(effectivePayables, availableCash, input.asOfDate);

    metrics.push({
      key: 'pay_now_total',
      label: 'Prioritas bayar',
      value: priority.totalRecommendedPayNow,
      unit: 'idr',
      source: 'prioritas_hutang',
      period: input.asOfDate,
    });

    if (focus === 'prioritas_hutang') {
      metrics.push({
        key: 'deferred_total',
        label: 'Hutang ditunda',
        value: priority.totalDeferred,
        unit: 'idr',
        source: 'prioritas_hutang',
        period: input.asOfDate,
      });
      metrics.push({
        key: 'remaining_cash',
        label: 'Sisa kas',
        value: priority.remainingCashAfterPriority,
        unit: 'idr',
        source: 'prioritas_hutang',
        period: input.asOfDate,
      });
    }

    summaryParts.push(`Prioritas bayar ${formatIdr(priority.totalRecommendedPayNow)}`);
    assumptions.push('Alokasi bayar hutang dibatasi kas tersedia tanpa defisit.');

    if (priority.deferOrNegotiate.length > 0) {
      const firstDeferred = shortText(priority.deferOrNegotiate[0].partyName, 24);
      risks.push(`Sebagian hutang (${firstDeferred}) perlu negosiasi ulang jadwal.`);
      nextSteps.push(`Konfirmasi penjadwalan ulang dengan ${firstDeferred}.`);
    } else {
      nextSteps.push('Eksekusi pembayaran hutang prioritas sesuai jatuh tempo.');
    }
  }

  if (metrics.length === 0) {
    assumptions.push('Data advisor belum lengkap; gunakan get_finance_snapshot untuk ringkasan kas.');
    risks.push('Belum ada proyeksi kas atau margin yang dapat dievaluasi.');
    nextSteps.push('Siapkan saldo kas, piutang, hutang, dan RAP proyek sebelum analisis.');
  }

  const trimmedAssumptions = assumptions.slice(0, 2).map((s) => shortText(s, 72));
  const trimmedRisks = risks.slice(0, 2).map((s) => shortText(s, 72));
  const trimmedNextSteps = nextSteps.slice(0, 2).map((s) => shortText(s, 72));
  const cappedMetrics = metrics.slice(0, 5);

  const buildSummaryFromMetrics = (list: AdvisorBriefMetric[]): string => {
    if (list.length === 0) {
      return `Ringkasan advisor per ${input.asOfDate} belum memiliki metrik aktif.`;
    }
    return `${list
      .map((m) => `${m.label} ${m.unit === 'idr' ? formatIdr(m.value) : `${m.value}%`}`)
      .join('; ')}.`;
  };

  const summary = summaryParts.length > 0
    ? `${summaryParts.join('; ')}.`
    : `Ringkasan advisor per ${input.asOfDate} belum memiliki metrik aktif.`;

  const result: AdvisorBriefToolResult = {
    asOfDate: input.asOfDate,
    focus,
    summary,
    metrics: cappedMetrics,
    assumptions: trimmedAssumptions,
    risks: trimmedRisks,
    nextSteps: trimmedNextSteps,
    disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
  };

  let metricsTrimmed = false;
  while (estimateJsonTokens(result) > MAX_ADVISOR_BRIEF_TOKENS) {
    if (result.assumptions.length > 1) {
      result.assumptions.pop();
    } else if (result.risks.length > 1) {
      result.risks.pop();
    } else if (result.nextSteps.length > 1) {
      result.nextSteps.pop();
    } else if (result.metrics.length > 3) {
      result.metrics.pop();
      metricsTrimmed = true;
    } else {
      break;
    }
  }

  if (metricsTrimmed) {
    result.summary = buildSummaryFromMetrics(result.metrics);
  }

  return result;
}
