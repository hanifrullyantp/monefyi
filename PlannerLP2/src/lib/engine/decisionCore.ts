/**
 * Decision Core: logika keputusan murni (tanpa I/O, tanpa Date.now) untuk Winning Engine.
 *
 * Prinsip:
 * 1. Keputusan pause/scale berdasar PROBABILITAS bahwa CPA sebenarnya di atas/bawah garis tertentu,
 *    bukan pengali tetap. Sampel kecil otomatis menghasilkan probabilitas yang tidak tegas,
 *    sehingga mesin menahan diri tanpa perlu aturan "minimal klik" yang berdiri sendiri.
 * 2. Garis rugi = min(break-even CPA dari nilai pesanan, kelipatan target CPA), bukan target CPA itu sendiri. Kampanye di atas target
 *    tetapi masih untung diperbaiki, tidak dimatikan.
 * 3. Tidak ada angka karangan. Jika bukti kurang, hasilnya "insufficient" dan alasannya disebut.
 *
 * Model: pembelian ~ Binomial(klik link, p), p ~ Beta(a0, b0) sebagai prior, CPC dianggap diketahui
 * (spend / klik). Maka CPA = CPC / p dan P(CPA <= X) = P(p >= CPC / X).
 */

// ---------------------------------------------------------------------------
// Fungsi matematika dasar
// ---------------------------------------------------------------------------

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** log Gamma (Lanczos). Akurat untuk x > 0. */
export function lgamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = 0.99999999999980993;
  const t = x + 7.5;
  for (let i = 0; i < 8; i++) a += LANCZOS[i] / (x + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function betacf(x: number, a: number, b: number): number {
  const MAXIT = 300, EPS = 3e-14, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** CDF distribusi Beta(a, b): P(p <= x). */
export function betaCdf(x: number, a: number, b: number): number {
  if (!(a > 0) || !(b > 0)) return NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbt = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  const bt = Math.exp(lbt);
  return x < (a + 1) / (a + b + 2)
    ? (bt * betacf(x, a, b)) / a
    : 1 - (bt * betacf(1 - x, b, a)) / b;
}

/** Kuantil distribusi Beta (bisection, deterministik). */
export function betaQuantile(q: number, a: number, b: number): number {
  let lo = 0, hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (betaCdf(mid, a, b) < q) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------------------
// Belief CPA
// ---------------------------------------------------------------------------

export interface CampaignEvidence {
  spend: number;
  linkClicks: number;
  purchases: number;
  revenue: number;
}

export interface BeliefPrior {
  a0: number;
  b0: number;
  source: "akun" | "target";
}

/**
 * Prior lemah dari performa seluruh akun (empirical Bayes). Jika akun belum punya cukup pembelian,
 * prior dipusatkan pada laju konversi yang pas dengan target CPA, dengan kekuatan yang sama kecil.
 * Kekuatan prior (setara klik) sengaja kecil agar data kampanye sendiri cepat mengambil alih.
 */
export function buildPrior(
  pool: { clicks: number; purchases: number; spend: number },
  targetCpa: number,
  strengthClicks: number
): BeliefPrior {
  const poolCpc = pool.clicks > 0 ? pool.spend / pool.clicks : 0;
  let mean: number;
  let source: BeliefPrior["source"];
  if (pool.purchases >= 5 && pool.clicks > 0) {
    mean = pool.purchases / pool.clicks;
    source = "akun";
  } else {
    mean = poolCpc > 0 && targetCpa > 0 ? poolCpc / targetCpa : 0.02;
    source = "target";
  }
  mean = Math.min(0.5, Math.max(0.001, mean));
  const k = Math.max(5, strengthClicks);
  return { a0: mean * k, b0: (1 - mean) * k, source };
}

export interface CpaBelief {
  cpc: number;
  a: number;
  b: number;
  /** P(CPA sebenarnya <= x). */
  probCpaAtMost(x: number): number;
  /** Kuantil CPA, mis. q=0.1 = batas bawah optimis, q=0.9 = batas atas pesimis. */
  cpaQuantile(q: number): number;
}

export function buildBelief(ev: CampaignEvidence, prior: BeliefPrior): CpaBelief | null {
  const clicks = Math.max(ev.linkClicks, ev.purchases); // pembelian tak mungkin melebihi klik; jaga data atribusi aneh
  if (!(clicks > 0) || !(ev.spend > 0)) return null;
  const cpc = ev.spend / clicks;
  const a = prior.a0 + ev.purchases;
  const b = prior.b0 + Math.max(0, clicks - ev.purchases);
  return {
    cpc,
    a,
    b,
    probCpaAtMost(x: number) {
      if (!(x > 0)) return 0;
      const pNeeded = cpc / x; // CPA <= x  <=>  p >= cpc / x
      if (pNeeded >= 1) return 0;
      return 1 - betaCdf(pNeeded, a, b);
    },
    cpaQuantile(q: number) {
      // CPA tinggi <=> p rendah, jadi kuantil CPA q memakai kuantil p (1 - q)
      const p = betaQuantile(1 - q, a, b);
      return p > 0 ? cpc / p : Infinity;
    },
  };
}

// ---------------------------------------------------------------------------
// Break-even CPA
// ---------------------------------------------------------------------------

export interface BreakEven {
  cpa: number;
  aov: number;
  aovSource: "data" | "harga_terendah";
  note: string;
}

/**
 * Garis rugi: berapa CPA maksimum sebelum setiap pesanan merugi.
 * Memakai nilai pesanan rata-rata dari data bila ada >= 5 pembelian; jika belum, memakai harga paket
 * TERENDAH (konservatif, tidak mengandaikan pembeli mengambil Pro).
 */
export function resolveBreakEven(input: {
  configured: number;          // > 0 = dipakai apa adanya
  totalPurchases: number;
  totalRevenue: number;
  lowestPrice: number;
  contributionMarginPct: number;
}): BreakEven {
  if (input.configured > 0) {
    return { cpa: input.configured, aov: 0, aovSource: "data", note: "Break-even CPA ditetapkan manual di konfigurasi." };
  }
  const margin = Math.min(1, Math.max(0.05, input.contributionMarginPct / 100));
  const haveData = input.totalPurchases >= 5 && input.totalRevenue > 0;
  const aov = haveData ? input.totalRevenue / input.totalPurchases : input.lowestPrice;
  return {
    cpa: Math.round(aov * margin),
    aov: Math.round(aov),
    aovSource: haveData ? "data" : "harga_terendah",
    note: haveData
      ? `Nilai pesanan rata-rata Rp ${Math.round(aov).toLocaleString("id-ID")} dari ${input.totalPurchases} pembelian, margin kontribusi ${input.contributionMarginPct}%.`
      : `Belum ada cukup pembelian, dipakai harga paket terendah Rp ${Math.round(aov).toLocaleString("id-ID")} (konservatif), margin kontribusi ${input.contributionMarginPct}%.`,
  };
}

// ---------------------------------------------------------------------------
// Klasifikasi kampanye
// ---------------------------------------------------------------------------

export type CampaignVerdictKind =
  | "learning"       // masih belajar, dibiarkan
  | "insufficient"   // bukti belum cukup untuk menilai
  | "winner"         // hampir pasti di bawah target CPA
  | "profitable"     // di atas target tetapi di bawah garis rugi: perbaiki, jangan dimatikan
  | "losing";        // hampir pasti di atas garis rugi: merugi

export interface DecisionThresholds {
  targetCpa: number;
  lossLineCpa: number;             // garis rugi: min(break-even, batas kelipatan target). Di atas ini kampanye dianggap merugi
  winProbability: number;          // P(CPA <= target) minimal untuk "winner"
  lossProbability: number;         // P(CPA > garis rugi) minimal untuk "losing"
  minPurchasesToScale: number;
  minLinkClicksToJudge: number;
  learningHardStopSpend: number;
}

export interface CampaignVerdict {
  kind: CampaignVerdictKind;
  pWin: number | null;             // P(CPA <= target)
  pLoss: number | null;            // P(CPA > garis rugi)
  cpaMedian: number | null;
  cpaLow: number | null;           // batas optimis (kuantil 10%)
  cpaHigh: number | null;          // batas pesimis (kuantil 90%)
  cpaObserved: number | null;      // spend / pembelian apa adanya
  reason: string;
}

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export function classifyCampaign(
  ev: CampaignEvidence,
  inLearning: boolean,
  prior: BeliefPrior,
  t: DecisionThresholds
): CampaignVerdict {
  const empty = { pWin: null, pLoss: null, cpaMedian: null, cpaLow: null, cpaHigh: null, cpaObserved: null };
  const observed = ev.purchases > 0 ? ev.spend / ev.purchases : null;
  const belief = buildBelief(ev, prior);
  if (!belief) {
    return { kind: inLearning ? "learning" : "insufficient", ...empty, reason: "Belum ada klik link atau belanja, belum bisa dinilai." };
  }

  const pWin = belief.probCpaAtMost(t.targetCpa);
  const pLoss = 1 - belief.probCpaAtMost(t.lossLineCpa);
  const base = {
    pWin,
    pLoss,
    cpaMedian: belief.cpaQuantile(0.5),
    cpaLow: belief.cpaQuantile(0.1),
    cpaHigh: belief.cpaQuantile(0.9),
    cpaObserved: observed,
  };
  const range = `CPA diperkirakan ${rp(base.cpaLow)} sampai ${Number.isFinite(base.cpaHigh) ? rp(base.cpaHigh) : "tak terbatas"} (rentang 80%)`;

  if (inLearning) {
    // Hanya batas darurat yang boleh menghentikan kampanye learning, dan tetap butuh bukti rugi.
    if (ev.spend >= t.learningHardStopSpend && pLoss >= t.lossProbability) {
      return {
        kind: "losing",
        ...base,
        reason: `Learning phase, tetapi belanja ${rp(ev.spend)} melewati batas darurat ${rp(t.learningHardStopSpend)} dan peluang merugi ${pct(pLoss)}. ${range}.`,
      };
    }
    return {
      kind: "learning",
      ...base,
      reason: `Learning phase. Dibiarkan belajar (belanja ${rp(ev.spend)}, batas darurat ${rp(t.learningHardStopSpend)}). ${range}.`,
    };
  }

  if (ev.linkClicks < t.minLinkClicksToJudge && ev.purchases < t.minPurchasesToScale) {
    return {
      kind: "insufficient",
      ...base,
      reason: `Sampel belum cukup: ${ev.linkClicks} klik link (minimal ${t.minLinkClicksToJudge}) dan ${ev.purchases} pembelian. ${range}.`,
    };
  }

  if (pLoss >= t.lossProbability) {
    return {
      kind: "losing",
      ...base,
      reason: `Peluang CPA di atas garis rugi ${rp(t.lossLineCpa)} adalah ${pct(pLoss)} (ambang ${pct(t.lossProbability)}). ${range}.`,
    };
  }

  if (ev.purchases >= t.minPurchasesToScale && pWin >= t.winProbability) {
    return {
      kind: "winner",
      ...base,
      reason: `Peluang CPA di bawah target ${rp(t.targetCpa)} adalah ${pct(pWin)} dari ${ev.purchases} pembelian. ${range}.`,
    };
  }

  // Terlihat di atas target, tetapi tidak cukup bukti rugi (atau memang masih untung).
  const aboveTarget = (base.cpaMedian ?? 0) > t.targetCpa;
  if (aboveTarget && (base.cpaMedian ?? Infinity) <= t.lossLineCpa) {
    return {
      kind: "profitable",
      ...base,
      reason: `CPA median ${rp(base.cpaMedian!)} di atas target ${rp(t.targetCpa)} tetapi di bawah garis rugi ${rp(t.lossLineCpa)}. Diperbaiki, bukan dimatikan. ${range}.`,
    };
  }

  return {
    kind: "insufficient",
    ...base,
    reason: `Belum tegas: peluang di bawah target ${pct(pWin)}, peluang merugi ${pct(pLoss)}. Butuh data lebih banyak. ${range}.`,
  };
}

// ---------------------------------------------------------------------------
// Ukuran langkah scale
// ---------------------------------------------------------------------------

/**
 * Langkah scale proporsional terhadap keyakinan dan ruang efisiensi.
 * - Sangat yakin (P >= 0.95) dan CPA median <= 70% target: langkah penuh.
 * - Yakin tetapi tipis: setengah langkah, minimal 10%.
 * Tidak pernah melebihi maxPct.
 */
export function scaleStepPct(verdict: CampaignVerdict, targetCpa: number, maxPct: number): number {
  const p = verdict.pWin ?? 0;
  const med = verdict.cpaMedian ?? Infinity;
  const strong = p >= 0.95 && med <= targetCpa * 0.7;
  const floor = Math.min(maxPct, 10);
  if (strong) return maxPct;
  if (p >= 0.9) return Math.max(floor, Math.round(maxPct * 0.75));
  return Math.max(floor, Math.round(maxPct * 0.5));
}
