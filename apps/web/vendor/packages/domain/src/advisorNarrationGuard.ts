import {
  FINANCIAL_ADVISOR_DISCLAIMER,
  forecastCashFlow13Weeks,
  type ForecastCashFlowInput,
} from './financialAdvisor';
import { toRupiah } from './journal';

export type AdvisorKeyMetric = {
  label: string;
  valueFormatted: string;
  numericValue: number;
  source: string;
};

export type AdvisorMobileAnswerInput = {
  conclusionOneSentence: string;
  keyMetrics: AdvisorKeyMetric[];
  assumptions: string[];
  risks: string[];
  recommendedSteps: string[];
  disclaimer?: string;
};

export type NarrativeExtractionOptions = {
  allowedLiteralTokens?: string[];
};

export type NarrativeVerificationOptions = NarrativeExtractionOptions & {
  tolerance?: number;
};

export type NarrativeVerificationResult =
  | {
      ok: true;
      extractedNumbers: number[];
      unsourcedNumbers: [];
      reason: null;
    }
  | {
      ok: false;
      extractedNumbers: number[];
      unsourcedNumbers: number[];
      reason: 'unsourced_numbers_detected';
    };

export type ForecastBacktestCaseInput = {
  caseId: string;
  label: string;
  isShockCase?: boolean;
  failureCause?: string;
  forecastInput: ForecastCashFlowInput;
  actualEndingCashByWeek: number[];
};

export type ForecastBacktestWeekComparison = {
  weekIndex: number;
  weekEnd: string;
  predictedEndingCash: number;
  actualEndingCash: number;
  absError: number;
  apePct: number;
  unpredictedNegative: boolean;
};

export type ForecastBacktestCaseResult = {
  caseId: string;
  label: string;
  isShockCase: boolean;
  mapePct: number;
  maxAbsError: number;
  unpredictedNegativeCash: boolean;
  failedCase: boolean;
  failureCause: string | null;
  weeks: ForecastBacktestWeekComparison[];
};

export type ForecastBacktestSummary = {
  datasetKind: 'synthetic';
  totalCases: number;
  normalCasesCount: number;
  shockCasesCount: number;
  failedCasesCount: number;
  overallMapePct: number;
  normalMapePct: number;
  shockMapePct: number;
  failedMapePct: number;
  cases: ForecastBacktestCaseResult[];
  failedCases: ForecastBacktestCaseResult[];
  disclaimer: typeof FINANCIAL_ADVISOR_DISCLAIMER;
};

const MAX_MOBILE_ANSWER_TOKENS = 400;

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10_000) / 10_000;
}

function cleanSingleLine(text: string): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Estimasi konservatif jumlah token JSON/teks (~3.5 karakter/token). */
export function estimateAdvisorTokens(value: unknown): number {
  const serialized = JSON.stringify(value);
  return Math.ceil(serialized.length / 3.5);
}

function renderMobileSections(parts: {
  conclusion: string;
  metrics: AdvisorKeyMetric[];
  assumptions: string[];
  risks: string[];
  steps: string[];
  disclaimer: string;
}): string {
  const lines: string[] = [`Kesimpulan: ${parts.conclusion}`];

  lines.push('', 'Angka Kunci:');
  if (parts.metrics.length === 0) {
    lines.push('- Belum ada metrik kunci.');
  } else {
    for (const m of parts.metrics) {
      lines.push(`- ${cleanSingleLine(m.label)}: ${cleanSingleLine(m.valueFormatted)} [${cleanSingleLine(m.source)}]`);
    }
  }

  lines.push('', 'Asumsi:');
  for (const a of parts.assumptions) {
    lines.push(`- ${cleanSingleLine(a)}`);
  }

  lines.push('', 'Risiko:');
  for (const r of parts.risks) {
    lines.push(`- ${cleanSingleLine(r)}`);
  }

  lines.push('', 'Langkah Disarankan:');
  for (const s of parts.steps) {
    lines.push(`- ${cleanSingleLine(s)}`);
  }

  lines.push('', `Disclaimer: ${parts.disclaimer}`);
  return lines.join('\n');
}

/**
 * Menyusun jawaban ringkas layar ponsel 5 bagian terstruktur (kesimpulan 1 kalimat ->
 * angka kunci + sumber -> asumsi -> risiko -> langkah disarankan + disclaimer wajib),
 * dijaga tetap <= 400 estimasi token.
 */
export function formatAdvisorMobileAnswer(input: AdvisorMobileAnswerInput): string {
  const conclusion = cleanSingleLine(input.conclusionOneSentence) || 'Ringkasan analisis keuangan siap ditinjau.';
  const disclaimer = cleanSingleLine(input.disclaimer ?? FINANCIAL_ADVISOR_DISCLAIMER) || FINANCIAL_ADVISOR_DISCLAIMER;

  const metrics = (input.keyMetrics ?? []).slice(0, 6);
  const assumptions = (input.assumptions ?? []).map(cleanSingleLine).filter(Boolean);
  const risks = (input.risks ?? []).map(cleanSingleLine).filter(Boolean);
  const steps = (input.recommendedSteps ?? []).map(cleanSingleLine).filter(Boolean);

  if (assumptions.length === 0) assumptions.push('Menggunakan data buku besar dan parameter skenario dasar.');
  if (risks.length === 0) risks.push('Tidak ada risiko likuiditas mendesak pada skenario dasar.');
  if (steps.length === 0) steps.push('Pantau arus kas dan realisasi proyek secara berkala.');

  let rendered = renderMobileSections({ conclusion, metrics, assumptions, risks, steps, disclaimer });

  while (estimateAdvisorTokens(rendered) > MAX_MOBILE_ANSWER_TOKENS) {
    if (assumptions.length > 1) {
      assumptions.pop();
    } else if (risks.length > 1) {
      risks.pop();
    } else if (steps.length > 1) {
      steps.pop();
    } else if (metrics.length > 2) {
      metrics.pop();
    } else {
      break;
    }
    rendered = renderMobileSections({ conclusion, metrics, assumptions, risks, steps, disclaimer });
  }

  return rendered;
}

function parseNumericLiteral(rawNumber: string): number | null {
  const t = rawNumber.trim();
  if (/^\d{1,3}(?:\.\d{3})+,\d{1,4}$/.test(t)) {
    const normalized = t.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  if (/^\d{1,3}(?:\.\d{3})+$/.test(t)) {
    const n = Number(t.replace(/\./g, ''));
    return Number.isFinite(n) ? n : null;
  }
  if (/^\d{1,3}(?:,\d{3})+$/.test(t)) {
    const n = Number(t.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  if (/^\d+$/.test(t)) {
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  if (/^\d+,\d{1,4}$/.test(t)) {
    const n = Number(t.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  if (/^\d+\.\d{1,4}$/.test(t)) {
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function unitMultiplier(unit: string | undefined): number {
  const u = (unit ?? '').toLowerCase();
  if (u === 'miliar' || u === 'milyar') return 1_000_000_000;
  if (u === 'juta' || u === 'jt') return 1_000_000;
  if (u === 'ribu' || u === 'rb' || u === 'k') return 1_000;
  return 1;
}

function maskStructuralTokens(text: string, allowedLiteralTokens?: string[]): string {
  let cleaned = String(text ?? '');

  const literals = [...new Set((allowedLiteralTokens ?? []).map((t) => String(t ?? '').trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length);

  for (const token of literals) {
    const escaped = escapeRegExp(token);
    const startsAlnum = /^[a-zA-Z0-9]/.test(token);
    const endsAlnum = /[a-zA-Z0-9]$/.test(token);
    const prefix = startsAlnum ? '(?<![a-zA-Z0-9_])' : '';
    const suffix = endsAlnum ? '(?![a-zA-Z0-9_])' : '';
    cleaned = cleaned.replace(new RegExp(`${prefix}${escaped}${suffix}`, 'gi'), ' ');
  }

  // Tanggal ISO YYYY-MM-DD bukan angka metrik narasi
  cleaned = cleaned.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ');

  // Nomor urut daftar di awal baris atau setelah bullet (mis. "1. Percepat..." atau "- 1. Percepat...")
  cleaned = cleaned.replace(/(^|\n)([ \t]*(?:[-*•][ \t]+)?)\d+[.)](?=[ \t]+)/g, '$1$2 ');

  return cleaned;
}

/**
 * Mengekstrak seluruh angka nominal/rupiah, persentase, dan angka berdiri sendiri
 * dari teks narasi (mengecualikan nomor urut daftar `1.`/`2.`, tanggal ISO `YYYY-MM-DD`,
 * kode pengenal alfanumerik seperti `proj-1`/`W13`, serta `allowedLiteralTokens`).
 */
export function extractNumbersFromNarrative(
  text: string,
  opts?: NarrativeExtractionOptions,
): number[] {
  const cleaned = maskStructuralTokens(text, opts?.allowedLiteralTokens);
  const numCore = '(?:\\d{1,3}(?:\\.\\d{3})+,\\d{1,4}|\\d{1,3}(?:\\.\\d{3})+|\\d{1,3}(?:,\\d{3})+|\\d+(?:[.,]\\d{1,4})?)';
  const compoundPattern =
    `(?<![a-zA-Z0-9_.-])(-?)(?:rp\\.?\\s*(-?))?(${numCore})\\s*(juta|jt)\\s+(${numCore})\\s*(ribu|rb|k)(?![a-zA-Z0-9_])`;
  const rpPattern =
    `(?<![a-zA-Z0-9_])(-?)rp\\.?\\s*(-?)(${numCore})(?:\\s*(miliar|milyar|juta|jt|ribu|rb|k))?(?![a-zA-Z0-9_])`;
  const standalonePattern =
    `(?<![a-zA-Z0-9_.-])(-?)(${numCore})(?:\\s*(miliar|milyar|juta|jt|ribu|rb|k|%))?(?![a-zA-Z0-9_])`;

  const combined = new RegExp(
    `${compoundPattern}|${rpPattern}|${standalonePattern}`,
    'gi',
  );

  const numbers: number[] = [];
  for (const m of cleaned.matchAll(combined)) {
    if (m[3] !== undefined) {
      // Compound: e.g. "2 juta 500 ribu" or "-Rp 2jt 500rb"
      const sign = m[1] === '-' || m[2] === '-' ? -1 : 1;
      const big = parseNumericLiteral(m[3]);
      const small = parseNumericLiteral(m[5]);
      if (big !== null && small !== null) {
        numbers.push(round4(sign * (big * 1_000_000 + small * 1_000)));
      }
      continue;
    }

    if (m[9] !== undefined) {
      // Rp-prefixed: e.g. "Rp 15.000.000", "-Rp 24.000.000", "Rp -500rb"
      const sign = m[7] === '-' || m[8] === '-' ? -1 : 1;
      const base = parseNumericLiteral(m[9]);
      if (base !== null) {
        numbers.push(round4(sign * base * unitMultiplier(m[10])));
      }
      continue;
    }

    if (m[12] !== undefined) {
      // Standalone / suffixed: e.g. "15jt", "500rb", "12,5%", "-24.000.000", "42"
      const sign = m[11] === '-' ? -1 : 1;
      const base = parseNumericLiteral(m[12]);
      if (base !== null) {
        numbers.push(round4(sign * base * unitMultiplier(m[13])));
      }
    }
  }

  return numbers;
}

/**
 * Memverifikasi bahwa 100% angka dalam teks narasi berasal dari `allowedNumbers`
 * (keluaran kode deterministik). Jika ada satu saja angka tanpa sumber, narasi ditolak.
 */
export function verifyNarrativeNumbersMatchSource(
  narrativeText: string,
  allowedNumbers: number[],
  opts?: NarrativeVerificationOptions,
): NarrativeVerificationResult {
  const extractedNumbers = extractNumbersFromNarrative(narrativeText, opts);
  const validAllowed = (allowedNumbers ?? []).filter((n) => Number.isFinite(n));
  const tolerance = Math.max(0, opts?.tolerance ?? 1e-6);

  const unsourcedNumbers: number[] = [];
  for (const num of extractedNumbers) {
    const matched = validAllowed.some((allowed) => Math.abs(num - allowed) <= tolerance);
    if (!matched && !unsourcedNumbers.some((existing) => Math.abs(existing - num) <= tolerance)) {
      unsourcedNumbers.push(num);
    }
  }

  if (unsourcedNumbers.length > 0) {
    return {
      ok: false,
      extractedNumbers,
      unsourcedNumbers,
      reason: 'unsourced_numbers_detected',
    };
  }

  return {
    ok: true,
    extractedNumbers,
    unsourcedNumbers: [],
    reason: null,
  };
}

/**
 * Menjalankan backtest proyeksi arus kas 13 minggu (skenario `base`) pada jendela historis/sintetis
 * dan menghitung MAPE jujur (keseluruhan, kasus normal, dan kasus shock/gagal) tanpa menyembunyikan kegagalan.
 */
export function runCashFlowForecastBacktest(
  cases: ForecastBacktestCaseInput[],
): ForecastBacktestSummary {
  if (!Array.isArray(cases) || cases.length === 0) {
    throw new Error('Minimal satu kasus backtest diperlukan');
  }

  const results: ForecastBacktestCaseResult[] = cases.map((c) => {
    if (!Array.isArray(c.actualEndingCashByWeek) || c.actualEndingCashByWeek.length === 0 || c.actualEndingCashByWeek.length > 13) {
      throw new Error(`actualEndingCashByWeek kasus '${c.caseId}' harus berisi 1..13 nilai mingguan`);
    }

    const forecast = forecastCashFlow13Weeks(c.forecastInput);
    const baseWeeks = forecast.scenarios.base.weeks;

    const weeks: ForecastBacktestWeekComparison[] = c.actualEndingCashByWeek.map((rawActual, idx) => {
      const predictedEndingCash = baseWeeks[idx].endingCash;
      const actualEndingCash = toRupiah(rawActual);
      const absError = Math.abs(actualEndingCash - predictedEndingCash);
      const apePct = (absError / Math.max(Math.abs(actualEndingCash), 1)) * 100;
      const unpredictedNegative = actualEndingCash < 0 && predictedEndingCash >= 0;

      return {
        weekIndex: idx + 1,
        weekEnd: baseWeeks[idx].weekEnd,
        predictedEndingCash,
        actualEndingCash,
        absError,
        apePct: round2(apePct),
        unpredictedNegative,
      };
    });

    const mapePct = round2(weeks.reduce((sum, w) => sum + w.apePct, 0) / weeks.length);
    const maxAbsError = weeks.reduce((max, w) => Math.max(max, w.absError), 0);
    const unpredictedNegativeCash = weeks.some((w) => w.unpredictedNegative);
    const failedCase = mapePct > 20 || unpredictedNegativeCash;

    let failureCause: string | null = null;
    if (failedCase) {
      const explicitCause = String(c.failureCause ?? '').trim();
      if (explicitCause) {
        failureCause = explicitCause;
      } else if (unpredictedNegativeCash && mapePct > 20) {
        failureCause = `Kas negatif tak terprediksi & MAPE ${mapePct}% > 20% (${c.label})`;
      } else if (unpredictedNegativeCash) {
        failureCause = `Kas negatif tak terprediksi pada proyeksi base (${c.label})`;
      } else {
        failureCause = `Deviasi MAPE ${mapePct}% melebihi ambang 20% (${c.label})`;
      }
    }

    return {
      caseId: c.caseId,
      label: c.label,
      isShockCase: Boolean(c.isShockCase),
      mapePct,
      maxAbsError,
      unpredictedNegativeCash,
      failedCase,
      failureCause,
      weeks,
    };
  });

  const normalCases = results.filter((r) => !r.isShockCase);
  const shockCases = results.filter((r) => r.isShockCase);
  const failedCases = results.filter((r) => r.failedCase);

  const avgMape = (items: ForecastBacktestCaseResult[]): number =>
    items.length > 0
      ? round2(items.reduce((sum, r) => sum + r.mapePct, 0) / items.length)
      : 0;

  return {
    datasetKind: 'synthetic',
    totalCases: results.length,
    normalCasesCount: normalCases.length,
    shockCasesCount: shockCases.length,
    failedCasesCount: failedCases.length,
    overallMapePct: avgMape(results),
    normalMapePct: avgMape(normalCases),
    shockMapePct: shockCases.length > 0 ? avgMape(shockCases) : avgMape(failedCases),
    failedMapePct: avgMape(failedCases),
    cases: results,
    failedCases,
    disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
  };
}
