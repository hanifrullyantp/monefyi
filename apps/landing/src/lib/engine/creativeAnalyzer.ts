/**
 * Analisa kreatif berbasis metrik. Murni (tanpa I/O).
 * Pembanding utama adalah rekan sebaya di akun yang sama (median), bukan angka absolut karangan.
 * Keputusan pause memakai inti probabilitas yang sama dengan kampanye (decisionCore).
 */
import type { AdRecord } from "@/lib/engine/adCreativeData";
import { buildPrior, classifyCampaign, type CampaignVerdict, type DecisionThresholds } from "@/lib/engine/decisionCore";

export type AdFlag = "LOW_HOOK" | "LOW_CTR" | "LOW_HOLD" | "FATIGUE";

export interface AdAnalysis {
  id: string;
  name: string;
  adsetId: string;
  campaignId: string;
  effectiveStatus: string;
  spend: number;
  impressions: number;
  linkCtr: number;
  hookRatePct: number | null;
  holdRatePct: number | null;
  frequency: number;
  purchases: number;
  cpa: number | null;
  verdict: CampaignVerdict;
  inLearning: boolean;
  flags: AdFlag[];
  notes: string[];
}

export interface CreativeAnalysis {
  ads: AdAnalysis[];
  benchmarks: { medianHookRatePct: number | null; medianLinkCtr: number | null; peers: number };
  pauseCandidates: AdAnalysis[];
  winners: AdAnalysis[];
  fatigued: AdAnalysis[];
}

export interface AnalyzeOptions {
  thresholds: DecisionThresholds;
  priorStrengthClicks: number;
  learningAdsets: string[];
  minImpressions?: number;
  maxPauses?: number;
  /** rasio terhadap median yang dianggap lemah */
  weakRatio?: number;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** CTR tertimbang impresi dari beberapa hari. */
function weightedCtr(days: AdRecord["daily"]): { ctr: number; impressions: number } {
  const imp = days.reduce((s, d) => s + d.impressions, 0);
  const clicks = days.reduce((s, d) => s + d.linkClicks, 0);
  return { ctr: imp > 0 ? (clicks / imp) * 100 : 0, impressions: imp };
}

export function detectFatigue(ad: AdRecord, minImpressionsLast3 = 1000): { fatigued: boolean; note: string } {
  if (ad.daily.length < 5) return { fatigued: false, note: "" };
  const last3 = ad.daily.slice(-3);
  const earlier = ad.daily.slice(0, -3);
  const a = weightedCtr(earlier);
  const b = weightedCtr(last3);
  if (a.impressions < minImpressionsLast3 || b.impressions < minImpressionsLast3 || a.ctr <= 0) return { fatigued: false, note: "" };
  const lastFreq = last3[last3.length - 1].frequency || ad.frequency;
  if (b.ctr < a.ctr * 0.7 && Math.max(lastFreq, ad.frequency) >= 2.5) {
    return { fatigued: true, note: `CTR link turun dari ${a.ctr.toFixed(2)}% ke ${b.ctr.toFixed(2)}% dalam 3 hari terakhir dengan frekuensi ${Math.max(lastFreq, ad.frequency).toFixed(1)}.` };
  }
  return { fatigued: false, note: "" };
}

export function analyzeAds(ads: AdRecord[], opt: AnalyzeOptions): CreativeAnalysis {
  const minImp = opt.minImpressions ?? 1000;
  const weak = opt.weakRatio ?? 0.6;
  const maxPauses = opt.maxPauses ?? 2;
  const learning = new Set(opt.learningAdsets);

  const pool = ads.reduce(
    (p, a) => ({ clicks: p.clicks + a.linkClicks, purchases: p.purchases + a.purchases, spend: p.spend + a.spend }),
    { clicks: 0, purchases: 0, spend: 0 }
  );
  const prior = buildPrior(pool, opt.thresholds.targetCpa, opt.priorStrengthClicks);

  const eligible = ads.filter((a) => a.impressions >= minImp);
  const hookOf = (a: AdRecord) => (a.isVideo && a.impressions > 0 ? a.video3s / a.impressions : null);
  const hooks = eligible.map(hookOf).filter((x): x is number => x !== null && x > 0);
  const medHook = hooks.length >= 3 ? median(hooks) : null;
  const ctrs = eligible.map((a) => a.linkCtr).filter((x) => x > 0);
  const medCtr = ctrs.length >= 3 ? median(ctrs) : null;

  const analyses: AdAnalysis[] = ads.map((a) => {
    const flags: AdFlag[] = [];
    const notes: string[] = [];
    const hook = hookOf(a);
    const hold = a.isVideo && a.video3s > 0 ? a.thruplays / a.video3s : null;
    const enough = a.impressions >= minImp;

    if (enough && hook !== null && medHook && hook < medHook * weak) {
      flags.push("LOW_HOOK");
      notes.push(`Hook rate ${(hook * 100).toFixed(1)}% jauh di bawah median akun ${(medHook * 100).toFixed(1)}%.`);
    }
    if (enough && medCtr && a.linkCtr > 0 && a.linkCtr < medCtr * weak) {
      flags.push("LOW_CTR");
      notes.push(`CTR link ${a.linkCtr.toFixed(2)}% jauh di bawah median akun ${medCtr.toFixed(2)}%.`);
    }
    const fat = detectFatigue(a, minImp);
    if (fat.fatigued) {
      flags.push("FATIGUE");
      notes.push(fat.note);
    }

    const inLearning = learning.has(a.adsetId);
    const verdict = classifyCampaign(
      { spend: a.spend, linkClicks: a.linkClicks, purchases: a.purchases, revenue: a.revenue },
      inLearning,
      prior,
      opt.thresholds
    );
    return {
      id: a.id,
      name: a.name,
      adsetId: a.adsetId,
      campaignId: a.campaignId,
      effectiveStatus: a.effectiveStatus,
      spend: a.spend,
      impressions: a.impressions,
      linkCtr: a.linkCtr,
      hookRatePct: hook !== null ? Math.round(hook * 1000) / 10 : null,
      holdRatePct: hold !== null ? Math.round(hold * 1000) / 10 : null,
      frequency: a.frequency,
      purchases: a.purchases,
      cpa: a.purchases > 0 ? a.spend / a.purchases : null,
      verdict,
      inLearning,
      flags,
      notes,
    };
  });

  // Kandidat pause: terbukti merugi, aktif, tidak learning, dan bukan satu-satunya iklan aktif di ad set-nya.
  const activeCount = new Map<string, number>();
  for (const a of analyses) if (a.effectiveStatus === "ACTIVE") activeCount.set(a.adsetId, (activeCount.get(a.adsetId) || 0) + 1);
  const pauseCandidates: AdAnalysis[] = [];
  const losing = analyses
    .filter((a) => a.effectiveStatus === "ACTIVE" && !a.inLearning && a.verdict.kind === "losing")
    .sort((x, y) => y.spend - x.spend);
  for (const a of losing) {
    if (pauseCandidates.length >= maxPauses) break;
    const left = activeCount.get(a.adsetId) || 0;
    if (left <= 1) {
      a.notes.push("Tidak dipause: ini satu-satunya iklan aktif di ad set-nya.");
      continue;
    }
    activeCount.set(a.adsetId, left - 1);
    pauseCandidates.push(a);
  }

  return {
    ads: analyses,
    benchmarks: { medianHookRatePct: medHook !== null ? Math.round(medHook * 1000) / 10 : null, medianLinkCtr: medCtr, peers: eligible.length },
    pauseCandidates,
    winners: analyses.filter((a) => a.verdict.kind === "winner"),
    fatigued: analyses.filter((a) => a.flags.includes("FATIGUE")),
  };
}


/**
 * Pilih iklan pemenang yang ad set-nya layak diduplikasi (maks 1 per run).
 * Syarat: vonis winner, aktif, tidak learning, tidak fatigue, pembelian cukup, belum pernah disalin baru-baru ini.
 */
export function pickDuplicateCandidate(
  analysis: CreativeAnalysis,
  opt: { minPurchases: number; recentlyDuplicatedAdsets: Set<string> }
): AdAnalysis | null {
  const pool = analysis.winners
    .filter(
      (a) =>
        a.effectiveStatus === "ACTIVE" &&
        !a.inLearning &&
        !a.flags.includes("FATIGUE") &&
        a.purchases >= opt.minPurchases &&
        a.cpa !== null &&
        !opt.recentlyDuplicatedAdsets.has(a.adsetId)
    )
    .sort((x, y) => (x.cpa as number) - (y.cpa as number));
  return pool[0] ?? null;
}
