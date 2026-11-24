import { toRupiah } from './journal';

export type DuplicateMatchReason =
  | 'duplicate_attachment_hash'
  | 'duplicate_invoice_number'
  | 'duplicate_amount_date_entity';

export type DuplicateSeverity = 'none' | 'medium' | 'high';

export type DuplicateCandidateEntry = {
  entryId?: string;
  attachmentHash?: string | null;
  invoiceNumber?: string | null;
  partyId?: string | null;
  projectId?: string | null;
  amount: number;
  entryDate: string;
};

export type ExistingDuplicateEntry = {
  entryId: string;
  attachmentHash?: string | null;
  invoiceNumber?: string | null;
  partyId?: string | null;
  projectId?: string | null;
  amount: number;
  entryDate: string;
};

export type DuplicateMatch = {
  entryId: string;
  reason: DuplicateMatchReason;
  score: number;
};

export type DuplicateDetectionResult = {
  isDuplicate: boolean;
  severity: DuplicateSeverity;
  matches: DuplicateMatch[];
  provenance: {
    detector: 'deterministic_duplicate_v1';
    dateWindowDays: number;
    inspectedEntriesCount: number;
    rulesMatched: DuplicateMatchReason[];
  };
};

export type AmountAnomalyFlag =
  | 'invalid_non_positive'
  | 'above_approval_threshold'
  | 'exceeds_rap_remaining'
  | 'statistical_outlier'
  | 'possible_extra_zero_typo';

export type AmountAnomalyStats = {
  sampleCount: number;
  mean: number;
  median: number;
  stdDev: number;
  zScore: number;
};

export type AmountAnomalyResult = {
  isAnomalous: boolean;
  flags: AmountAnomalyFlag[];
  stats: AmountAnomalyStats;
  requiresHumanConfirmation: boolean;
};

const DEFAULT_DATE_WINDOW_DAYS = 2;
const DEFAULT_HIGH_AMOUNT_THRESHOLD_IDR = 100_000_000;
const DEFAULT_Z_SCORE_THRESHOLD = 2.5;
const MS_PER_DAY = 86_400_000;

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function normToken(value?: string | null): string {
  return String(value ?? '').trim().toLowerCase();
}

function normInvoice(value?: string | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function parseYmdUtcMs(ymd?: string | null): number | null {
  const raw = String(ymd ?? '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const utc = Date.UTC(year, month - 1, day);
  const probe = new Date(utc);
  if (
    probe.getUTCFullYear() !== year
    || probe.getUTCMonth() + 1 !== month
    || probe.getUTCDate() !== day
  ) {
    return null;
  }
  return utc;
}

function reasonPriority(reason: DuplicateMatchReason): number {
  if (reason === 'duplicate_attachment_hash') return 3;
  if (reason === 'duplicate_invoice_number') return 2;
  return 1;
}

/**
 * Mendeteksi potensi entri duplikat secara deterministik berdasarkan:
 * (a) kesamaan persis `attachmentHash` (severity: high),
 * (b) kesamaan `invoiceNumber` + `partyId` (severity: high),
 * (c) nominal integer rupiah identik + selisih tanggal <= `dateWindowDays` + proyek/pihak sama (severity: medium).
 */
export function detectDuplicateEntry(
  candidate: DuplicateCandidateEntry,
  existingEntries: ExistingDuplicateEntry[],
  opts?: { dateWindowDays?: number },
): DuplicateDetectionResult {
  const dateWindowDays = Math.max(0, Math.floor(opts?.dateWindowDays ?? DEFAULT_DATE_WINDOW_DAYS));
  const candId = normToken(candidate.entryId);
  const candHash = normToken(candidate.attachmentHash);
  const candInvoice = normInvoice(candidate.invoiceNumber);
  const candParty = normToken(candidate.partyId);
  const candProject = normToken(candidate.projectId);
  const candAmount = toRupiah(candidate.amount);
  const candDateMs = parseYmdUtcMs(candidate.entryDate);

  const bestByEntry = new Map<string, DuplicateMatch>();
  const rulesMatchedSet = new Set<DuplicateMatchReason>();

  for (const existing of existingEntries) {
    const existIdRaw = String(existing.entryId ?? '').trim();
    if (!existIdRaw) continue;
    if (candId && normToken(existIdRaw) === candId) continue;

    const triggered: DuplicateMatch[] = [];

    const existHash = normToken(existing.attachmentHash);
    if (candHash && existHash && candHash === existHash) {
      triggered.push({
        entryId: existIdRaw,
        reason: 'duplicate_attachment_hash',
        score: 1,
      });
      rulesMatchedSet.add('duplicate_attachment_hash');
    }

    const existInvoice = normInvoice(existing.invoiceNumber);
    const existParty = normToken(existing.partyId);
    if (candInvoice && existInvoice && candParty && existParty && candInvoice === existInvoice && candParty === existParty) {
      triggered.push({
        entryId: existIdRaw,
        reason: 'duplicate_invoice_number',
        score: 0.96,
      });
      rulesMatchedSet.add('duplicate_invoice_number');
    }

    const existAmount = toRupiah(existing.amount);
    const existDateMs = parseYmdUtcMs(existing.entryDate);
    const existProject = normToken(existing.projectId);
    if (candAmount > 0 && existAmount === candAmount && candDateMs != null && existDateMs != null) {
      const diffDays = Math.abs(candDateMs - existDateMs) / MS_PER_DAY;
      const sameProject = Boolean(candProject && existProject && candProject === existProject);
      const sameParty = Boolean(candParty && existParty && candParty === existParty);

      if (diffDays <= dateWindowDays && (sameProject || sameParty)) {
        const base = sameProject && sameParty ? 0.9 : 0.82;
        const score = round2(Math.max(0.7, base - diffDays * 0.03));
        triggered.push({
          entryId: existIdRaw,
          reason: 'duplicate_amount_date_entity',
          score,
        });
        rulesMatchedSet.add('duplicate_amount_date_entity');
      }
    }

    if (triggered.length > 0) {
      triggered.sort(
        (a, b) => reasonPriority(b.reason) - reasonPriority(a.reason) || b.score - a.score,
      );
      bestByEntry.set(existIdRaw, triggered[0]);
    }
  }

  const matches = Array.from(bestByEntry.values()).sort(
    (a, b) => b.score - a.score || reasonPriority(b.reason) - reasonPriority(a.reason) || a.entryId.localeCompare(b.entryId),
  );

  const hasHigh = matches.some(
    (m) => m.reason === 'duplicate_attachment_hash' || m.reason === 'duplicate_invoice_number',
  );
  const severity: DuplicateSeverity = matches.length === 0 ? 'none' : hasHigh ? 'high' : 'medium';

  return {
    isDuplicate: matches.length > 0,
    severity,
    matches,
    provenance: {
      detector: 'deterministic_duplicate_v1',
      dateWindowDays,
      inspectedEntriesCount: existingEntries.length,
      rulesMatched: Array.from(rulesMatchedSet),
    },
  };
}

function computeMedian(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Mendeteksi nominal janggal secara deterministik berdasarkan ambang persetujuan,
 * sisa anggaran RAP, statistik historis (z-score / rasio median), dan indikasi salah ketik nol berlebih.
 */
export function detectAnomalousAmount(
  candidate: number | { amount: number; rapRemainingBudget?: number },
  historicalAmounts: number[],
  opts?: {
    rapRemainingBudget?: number;
    highAmountThreshold?: number;
    zScoreThreshold?: number;
  },
): AmountAnomalyResult {
  const rawAmount = typeof candidate === 'number' ? candidate : candidate.amount;
  const amount = Number.isFinite(rawAmount) ? toRupiah(rawAmount) : 0;
  const rapRemainingBudget =
    opts?.rapRemainingBudget
    ?? (typeof candidate === 'object' && candidate ? candidate.rapRemainingBudget : undefined);
  const highAmountThreshold = opts?.highAmountThreshold ?? DEFAULT_HIGH_AMOUNT_THRESHOLD_IDR;
  const zScoreThreshold = opts?.zScoreThreshold ?? DEFAULT_Z_SCORE_THRESHOLD;

  const cleanHistory = (historicalAmounts || [])
    .filter((v) => Number.isFinite(v) && v > 0)
    .map((v) => toRupiah(v))
    .sort((a, b) => a - b);

  const sampleCount = cleanHistory.length;
  const meanRaw = sampleCount > 0 ? cleanHistory.reduce((sum, v) => sum + v, 0) / sampleCount : 0;
  const medianRaw = computeMedian(cleanHistory);
  const varianceRaw =
    sampleCount >= 2
      ? cleanHistory.reduce((sum, v) => sum + (v - meanRaw) ** 2, 0) / (sampleCount - 1)
      : 0;
  const stdDevRaw = Math.sqrt(varianceRaw);
  const zScoreRaw =
    sampleCount >= 2 && stdDevRaw > 0 && Number.isFinite(rawAmount) && amount > 0
      ? (amount - meanRaw) / stdDevRaw
      : 0;

  const stats: AmountAnomalyStats = {
    sampleCount,
    mean: round2(meanRaw),
    median: round2(medianRaw),
    stdDev: round2(stdDevRaw),
    zScore: round2(zScoreRaw),
  };

  const flags: AmountAnomalyFlag[] = [];

  if (!Number.isFinite(rawAmount) || amount <= 0) {
    flags.push('invalid_non_positive');
  } else {
    if (amount >= highAmountThreshold) {
      flags.push('above_approval_threshold');
    }
    if (rapRemainingBudget != null && Number.isFinite(rapRemainingBudget) && rapRemainingBudget > 0 && amount > rapRemainingBudget * 1.25) {
      flags.push('exceeds_rap_remaining');
    }
    if (sampleCount >= 4 && (zScoreRaw >= zScoreThreshold || (medianRaw > 0 && amount >= medianRaw * 4))) {
      flags.push('statistical_outlier');
    }
    if (sampleCount >= 2 && medianRaw > 0 && amount >= medianRaw * 8) {
      const div10 = amount / 10;
      if (div10 >= medianRaw * 0.5 && div10 <= medianRaw * 1.5) {
        flags.push('possible_extra_zero_typo');
      }
    }
  }

  const isAnomalous = flags.length > 0;
  return {
    isAnomalous,
    flags,
    stats,
    requiresHumanConfirmation: isAnomalous,
  };
}
