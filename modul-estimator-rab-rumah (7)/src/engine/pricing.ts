import type { AppSettings, RapBreakdown } from "../data/types";

export interface RapConfig {
  /** Biaya tak langsung riil (direksi keet, K3, mobilisasi) sebagai % biaya langsung. */
  indirectPercent: number;
  /** Kontingensi risiko % dari (langsung + tak langsung). */
  contingencyPercent: number;
}

export const DEFAULT_RAP_CONFIG: RapConfig = { indirectPercent: 6, contingencyPercent: 4 };

export interface PricingInput {
  /** Sum of net BOQ line amounts, before commercial markup, in both modes. */
  directCost: number;
  settings: Pick<AppSettings, "overheadMode" | "overheadPercent" | "profitPercent" | "ppnPercent">;
  ppnEnabled: boolean;
  rap?: Partial<RapConfig>;
  /** Manual commercial margin is only used in a locked target simulation. */
  fixedMargin?: number;
}

export function computePricing(input: PricingInput): RapBreakdown {
  const cfg = { ...DEFAULT_RAP_CONFIG, ...(input.rap ?? {}) };
  const { settings, directCost: direct, ppnEnabled } = input;
  if (!Number.isSafeInteger(direct) || direct < 0) throw new Error('Biaya langsung harus berupa rupiah bulat nonnegatif.');
  for (const rate of [cfg.indirectPercent, cfg.contingencyPercent, settings.overheadPercent, settings.profitPercent, settings.ppnPercent]) {
    if (!Number.isFinite(rate) || rate < 0) throw new Error('Persentase biaya tidak valid.');
  }
  const indirect = Math.round(direct * cfg.indirectPercent / 100);
  const contingency = Math.round((direct + indirect) * cfg.contingencyPercent / 100);
  const rap = direct + indirect + contingency;
  const overhead = Math.round(direct * settings.overheadPercent / 100);
  if (input.fixedMargin !== undefined && (!Number.isSafeInteger(input.fixedMargin) || input.fixedMargin < 0)) {
    throw new Error('Target margin harus berupa rupiah bulat nonnegatif.');
  }
  const profit = input.fixedMargin === undefined ? Math.round(direct * settings.profitPercent / 100) : input.fixedMargin - overhead;
  const sellingPrice = rap + overhead + profit;
  const ppn = ppnEnabled ? Math.round(sellingPrice * settings.ppnPercent / 100) : 0;
  const total = sellingPrice + ppn;
  if (!Number.isSafeInteger(total)) throw new Error('Jumlah melampaui batas rupiah yang dapat dihitung tepat.');
  const margin = sellingPrice - rap;
  return {
    direct,
    indirect,
    contingency,
    rap,
    sellingPrice,
    ppn,
    margin,
    marginPercent: sellingPrice > 0 ? Math.round((margin / sellingPrice) * 1000) / 10 : 0,
    overhead, profit, total, ppnEnabled,
  };
}

export type PricingBasis = 'total' | 'sellingPrice' | 'rap' | 'margin';
export type PricingPolicy = Omit<PricingInput, 'directCost' | 'fixedMargin'>;
export interface TargetRequest {
  amount: number;
  basis: 'total' | 'rap' | 'margin';
  lock?: { basis: 'total' | 'rap' | 'margin'; amount: number };
}

/** Highest integral direct cost that fits the target, including each rounding step. */
export function invertPricing(target: number, basis: PricingBasis, policy: PricingPolicy): RapBreakdown {
  if (!Number.isSafeInteger(target) || target < 0) throw new Error('Target harus berupa rupiah bulat nonnegatif.');
  const at = (directCost: number) => computePricing({ ...policy, directCost });
  if (target === 0) return at(0);
  if (basis === 'margin' && policy.settings.overheadPercent + policy.settings.profitPercent === 0) {
    throw new Error('Margin positif tidak tersedia saat overhead dan profit nol.');
  }
  let lo = 0, hi = Math.max(1, target);
  while (at(hi)[basis] <= target) hi *= 2;
  while (lo < hi) {
    const mid = lo + Math.ceil((hi - lo) / 2);
    if (at(mid)[basis] <= target) lo = mid; else hi = mid - 1;
  }
  return at(lo);
}

export function resolvePricingTarget(request: TargetRequest, policy: PricingPolicy): RapBreakdown {
  const { amount, basis, lock } = request;
  if (!lock || lock.basis === basis) return invertPricing(amount, basis, policy);
  const pair = { [basis]: amount, [lock.basis]: lock.amount };
  const netSale = pair.total === undefined ? undefined : invertPricing(pair.total, 'total', {
    ...policy, settings: { ...policy.settings, overheadPercent: 0, profitPercent: 0 },
    rap: { indirectPercent: 0, contingencyPercent: 0 },
  }).sellingPrice;
  const requestedRap = pair.rap ?? (netSale! - pair.margin);
  if (requestedRap < 0) throw new Error('Target margin lebih besar daripada harga jual sebelum PPN.');
  const cost = invertPricing(requestedRap, 'rap', policy);
  const margin = pair.margin ?? (netSale! - cost.rap);
  if (margin < 0) throw new Error('Target total belum menutup modal yang dikunci.');
  return computePricing({ ...policy, directCost: cost.direct, fixedMargin: margin });
}

/** Legacy aggregate input can include markup; computeRab itself always supplies net lines. */
export function computeRap(input: PricingInput): RapBreakdown {
  const uplift = input.settings.overheadMode === 'dalam_harga'
    ? 1 + (input.settings.overheadPercent + input.settings.profitPercent) / 100 : 1;
  return computePricing({ ...input, directCost: Math.round(input.directCost / uplift) });
}

export const grandTotal = (price: RapBreakdown) => price.total;

export function summarizePortfolio(prices: RapBreakdown[]) {
  if (!prices.length) return null;
  const sum = (key: 'rap' | 'margin' | 'ppn' | 'total' | 'sellingPrice') => prices.reduce((s, p) => s + p[key], 0);
  return { count: prices.length, rap: sum('rap'), margin: sum('margin'), ppn: sum('ppn'), sellingPrice: sum('sellingPrice'), total: sum('total') };
}

/** Selesaikan tiga variabel terkait: isi yang null dari dua lainnya. */
export function solveTargets(params: {
  sellingPrice: number | null;
  margin: number | null;
  rap: number | null;
}): { sellingPrice: number; margin: number; rap: number } | null {
  const { sellingPrice, margin, rap } = params;
  if (sellingPrice !== null && rap !== null) return { sellingPrice, rap, margin: sellingPrice - rap };
  if (sellingPrice !== null && margin !== null) return { sellingPrice, margin, rap: sellingPrice - margin };
  if (rap !== null && margin !== null) return { rap, margin, sellingPrice: rap + margin };
  if (sellingPrice !== null) return { sellingPrice, rap: sellingPrice, margin: 0 };
  if (rap !== null) return { rap, sellingPrice: rap, margin: 0 };
  if (margin !== null) return { margin, sellingPrice: margin, rap: 0 };
  return null;
}
