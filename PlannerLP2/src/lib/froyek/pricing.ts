import type { FroyekPlanId, PromoCode, RecommendRule } from "./schema";

export interface WizardAnswers {
  role: string;
  team: string;
  projectType: string;
  scale: string;
  problem: string;
  features: string[];
}

export interface Recommendation {
  planId: FroyekPlanId;
  reasons: string[];
}

function ruleScore(rule: RecommendRule, answers: WizardAnswers): number {
  const checks: Array<[string | undefined, boolean]> = [
    [rule.when.role, !rule.when.role || rule.when.role === answers.role],
    [rule.when.team, !rule.when.team || rule.when.team === answers.team],
    [rule.when.problem, !rule.when.problem || rule.when.problem === answers.problem],
    [rule.when.feature, !rule.when.feature || answers.features.includes(rule.when.feature)],
  ];
  if (checks.some(([, ok]) => !ok)) return 0;
  return checks.filter(([expected]) => Boolean(expected)).length;
}

function fallback(answers: WizardAnswers): Recommendation {
  const onlyQuote = answers.features.length > 0
    && answers.features.every((feature) => feature === "penawaran");
  if (onlyQuote) {
    return {
      planId: "estimator_standard",
      reasons: [
        "Kebutuhan yang kamu pilih ada di lisensi penawaran Estimator. Nama Estimator hanya untuk modul itu.",
      ],
    };
  }
  if (answers.team === "6+" || answers.features.includes("keuangan")) {
    return {
      planId: "pro",
      reasons: [
        "Keuangan proyek dan tim lebih dari satu orang ada di Froyek Pro, bukan di paket gratis.",
      ],
    };
  }
  return {
    planId: "pro",
    reasons: [
      "Mengelola proyek, RAP, dan laporan ada di paket berbayar. Paket gratis tidak membuka proyek baru.",
    ],
  };
}

/** Pilih paket dari aturan JSON. Skor tertinggi menang. Seri memakai aturan yang lebih dulu. */
export function recommendPlan(answers: WizardAnswers, rules: RecommendRule[]): Recommendation {
  let bestScore = 0;
  const matched: RecommendRule[] = [];
  for (const rule of rules) {
    const score = ruleScore(rule, answers);
    if (score > bestScore) {
      bestScore = score;
      matched.length = 0;
      matched.push(rule);
    } else if (score > 0 && score === bestScore) {
      matched.push(rule);
    }
  }
  if (bestScore === 0 || matched.length === 0) return fallback(answers);
  return {
    planId: matched[0].planId,
    reasons: matched.map((rule) => rule.reason),
  };
}

export const LIST_PRICES: Record<Exclude<FroyekPlanId, "enterprise">, {
  product: "standard" | "pro";
  amount: number;
  mayarProduct: string;
}> = {
  estimator_standard: { product: "standard", amount: 93_000, mayarProduct: "estimator_standard" },
  estimator_pro: { product: "pro", amount: 199_000, mayarProduct: "estimator_pro" },
  pro: { product: "pro", amount: 199_000, mayarProduct: "planner_pro" },
};

export type Charge =
  | { ok: true; contact: true; planId: "enterprise" }
  | {
      ok: true;
      contact: false;
      planId: Exclude<FroyekPlanId, "enterprise">;
      product: "standard" | "pro";
      amount: number;
      mayarProduct: string;
    }
  | { ok: false; error: string };

export function resolveFroyekCharge(
  planId: string,
  promoCode: string | undefined,
  promos: PromoCode[],
): Charge {
  if (planId === "enterprise") return { ok: true, contact: true, planId: "enterprise" };
  if (!(planId in LIST_PRICES)) {
    return { ok: false, error: "Paket tidak dikenali." };
  }
  const plan = planId as Exclude<FroyekPlanId, "enterprise">;
  const list = LIST_PRICES[plan];
  const code = (promoCode || "").trim().toLowerCase();
  if (!code) {
    return { ok: true, contact: false, planId: plan, ...list };
  }
  const promo = promos.find(
    (item) => item.code.trim().toLowerCase() === code && item.planId === plan,
  );
  if (!promo) return { ok: false, error: "Kode promo tidak berlaku untuk paket ini." };
  if (promo.amount > list.amount) {
    return { ok: false, error: "Nominal promo lebih tinggi dari harga daftar." };
  }
  return { ok: true, contact: false, planId: plan, ...list, amount: promo.amount };
}
