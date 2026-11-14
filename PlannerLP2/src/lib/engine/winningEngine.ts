import { MetaCampaign, OrderBumpConfig, PostPurchaseUpsellConfig, MetaCapiStatus } from "../types/marketing";
import { MultiLlmRoutingConfig } from "./llmRouter";
import { EngineNotificationConfig } from "../services/telegramBotService";
import {
  buildPrior,
  classifyCampaign,
  resolveBreakEven,
  scaleStepPct,
  type BreakEven,
  type CampaignVerdict,
  type DecisionThresholds,
} from "./decisionCore";

export type EngineOperatingMode = "cuan" | "advance";
export type WinningPillarId = "offer" | "landing_page" | "checkout" | "ads_testing" | "tracking";

export interface WinningEngineConfig {
  mode: EngineOperatingMode;
  minDailyBudget: number;          // Default Mode Cuan: Rp 100.000
  maxDailyBudget: number;          // Default Mode Cuan: Rp 1.000.000
  approvedDailyCeiling: number;    // Plafon harian yang sudah disetujui user
  monthlySpendCap: number;         // Plafon bulanan (Rp)
  targetCpa: number;               // Target CPA maksimal (Rp)
  targetRoas: number;              // Target ROAS minimal (x)
  maxScalePctPerStep: number;      // Default 20% per 48 jam
  killSwitch: boolean;             // Tombol darurat hentikan otonomi
  budgetUnitVerified: boolean;     // Satuan budget IDR sudah dicocokkan dengan Ads Manager. Otonomi tertahan jika false.
  advanceMasterPlanApproved: boolean;
  // --- Otonomi & jendela data ---
  analysisWindowDays: number;            // Hanya data N hari terakhir yang dipakai untuk keputusan
  autonomous: boolean;                   // true = AI mengeksekusi aksi Meta yang lolos guardrail tanpa klik manual
  learningMinAgeDays: number;            // Kampanye lebih muda dari ini (dan belum cukup konversi) = learning phase
  learningMinOptimizationEvents: number; // Perkiraan ambang keluar learning Meta (~50 event)
  learningHardStopSpend: number;         // Batas darurat: kampanye learning tetap dihentikan jika spend melewati ini
  minPurchasesToScale: number;           // Minimal konversi dalam jendela sebelum boleh scale
  scaleCooldownHours: number;            // Jeda minimum antar perubahan budget
  minLinkClicksToJudge: number;          // Minimal klik link sebelum kampanye boleh dinilai boncos
  reconciliationTolerancePct: number;    // Toleransi pembelian Meta di atas pesanan lunas sebelum scale ditahan
  // --- Inti keputusan statistik ---
  breakEvenCpa: number;                  // 0 = dihitung otomatis dari nilai pesanan. > 0 = dipakai apa adanya (Rp)
  killMaxMultipleOfTarget: number;       // Garis rugi tidak boleh lebih dari N x target CPA, seberapa pun besar break-even di atas kertas
  contributionMarginPct: number;         // Persen dari nilai pesanan yang tersisa setelah biaya gateway dan pajak (asumsi, sesuaikan)
  winProbabilityToScale: number;         // 0-1: P(CPA <= target) minimal agar kampanye dianggap winner
  lossProbabilityToPause: number;        // 0-1: P(CPA > garis rugi) minimal agar kampanye boleh dihentikan
  priorStrengthClicks: number;           // Kekuatan prior (setara klik). Kecil = data kampanye cepat mengambil alih
  llmRouting: MultiLlmRoutingConfig;
  notifications: EngineNotificationConfig;
}

export interface PillarHealthScore {
  id: WinningPillarId;
  label: string;
  score: number;                   // 0 - 100
  status: "winning" | "perlu_optimasi" | "kritis" | "perlu_data";
  headlineMetric: string;
  honestDiagnosis: string;
  keyRecommendation: string;
}

export interface WinningActionPlan {
  id: string;
  pillar: WinningPillarId;
  pillarLabel: string;
  priority: "critical" | "high" | "medium";
  title: string;
  whatToDo: string;                // Bahasa sederhana: Apa yang akan dilakukan AI
  whyEvidence: string;             // Bukti angka riil: Kenapa harus dilakukan
  expectedImpact: string;          // Estimasi dampak bisnis
  actionType:
    | "update_offer_pricing"
    | "update_lp_copy"
    | "optimize_lp_speed"
    | "optimize_checkout_funnel"
    | "scale_campaign_budget"
    | "pause_bleeding_campaign"
    | "adjust_budget_to_range"
    | "create_rapid_test_campaign"
    | "create_ad_variant"
    | "repair_tracking_capi"
    | "approve_ceiling_increase";
  actionPayload: Record<string, any>;
  requiresCeilingReapproval: boolean;
  evidenceWindow?: string;      // jendela data yang dipakai sebagai bukti
  status: "pending" | "approved" | "executed" | "rejected" | "blocked_guardrail";
  approvedBy?: "user" | "engine"; // "engine" = disetujui otomatis oleh mode otonom. Tidak membebaskan aksi dari pemeriksaan bukti, learning, dan cooldown.
  confidence: number;
  createdAt: string;
  executedAt?: string;
  executionNote?: string;
}

export interface WinningLearningItem {
  id: string;
  pillar: WinningPillarId;
  category: string;
  finding: string;
  evidenceMetric: string;
  confidence: number;
}

export interface GuardrailDecision {
  allowed: boolean;
  clampedBudget?: number;
  requiresUserReapproval: boolean;
  reason: string;
}

export interface CampaignVerdictEntry {
  campaignId: string;
  name: string;
  verdict: CampaignVerdict;
}

export interface PortfolioSummary {
  activeDailyBudget: number;     // total budget harian kampanye aktif
  winnerDailyBudget: number;
  losingDailyBudget: number;     // uang harian yang mengalir ke kampanye yang terbukti merugi
  losingBudgetSharePct: number;  // porsi budget aktif yang terbuang
}

export interface CampaignWindowAuditEntry {
  campaignId: string;
  name: string;
  decision: "included" | "excluded" | "held";
  reason: string;
}

// Harga resmi Monefyi Estimator. Dipakai bersama oleh engine dan apply agar tidak ada dua harga berbeda.
export const MONEFYI_PRICING = {
  standardPrice: 93000,
  standardRegularPrice: 150000,
  proPrice: 199000,
  proRegularPrice: 250000,
  orderBumpUpgradePrice: 50000,
  orderBumpOriginalPrice: 199000,
} as const;

export const DEFAULT_WINNING_ENGINE_CONFIG: WinningEngineConfig = {
  mode: "cuan",
  minDailyBudget: 100000,
  maxDailyBudget: 1000000,
  approvedDailyCeiling: 1000000,
  monthlySpendCap: 30000000,
  targetCpa: 45000,
  targetRoas: 3.0,
  maxScalePctPerStep: 20,
  killSwitch: false,
  budgetUnitVerified: false,
  advanceMasterPlanApproved: false,
  analysisWindowDays: 14,
  autonomous: true,
  learningMinAgeDays: 7,
  learningMinOptimizationEvents: 50,
  learningHardStopSpend: 135000,
  minPurchasesToScale: 3,
  scaleCooldownHours: 48,
  minLinkClicksToJudge: 100,
  reconciliationTolerancePct: 25,
  breakEvenCpa: 0,
  killMaxMultipleOfTarget: 2.5,
  contributionMarginPct: 90,
  winProbabilityToScale: 0.8,
  lossProbabilityToPause: 0.9,
  priorStrengthClicks: 40,
  llmRouting: {
    openRouterApiKey: "",
    strategist: {
      provider: "openrouter",
      model: "anthropic/claude-3.5-sonnet",
      apiKey: "",
    },
    processor: {
      provider: "openrouter",
      model: "openai/gpt-6-luna-pro",
      apiKey: "",
    },
    technical: {
      provider: "openrouter",
      model: "openai/gpt-6-luna-pro",
      apiKey: "",
    },
  },
  notifications: {
    whatsappEnabled: true,
    whatsappAdminPhone: "",
    whatsappGatewayUrl: "https://api.fonnte.com/send",
    whatsappApiKey: "",
    telegramEnabled: true,
    telegramBotToken: "",
    telegramChatId: "",
  },
};

/**
 * Server-Side Guardrail Gate:
 * Memastikan tidak ada aksi AI yang melanggar plafon budget, aturan +20% learning phase,
 * atau menaikkan plafon tanpa persetujuan ulang dari user.
 */
export function isAutoEligible(plan: WinningActionPlan): boolean {
  // Hanya aksi Meta yang reversibel dan terukur yang boleh dijalankan AI tanpa klik.
  // Membuat kampanye baru dan mengubah offer/copy tetap butuh persetujuan.
  return plan.actionType === "pause_bleeding_campaign" || plan.actionType === "scale_campaign_budget";
}

export interface SalesReconciliation {
  status: "match" | "mismatch" | "tidak_dikonfigurasi";
  metaPurchases: number;
  paidOrders: number | null;
  note: string;
}

/**
 * Membandingkan pembelian versi Meta dengan pesanan yang benar-benar lunas.
 * Arah yang berbahaya hanya satu: Meta mencatat LEBIH BANYAK pembelian daripada yang dibayar
 * (CPA tampak bagus padahal uang belum masuk). Pesanan lunas yang lebih banyak dari Meta itu wajar
 * (penjualan organik, atribusi), sehingga tidak dianggap masalah.
 */
export function reconcileSales(
  metaPurchases: number,
  paidOrders: number | null | undefined,
  tolerancePct: number
): SalesReconciliation {
  if (paidOrders === null || paidOrders === undefined) {
    return {
      status: "tidak_dikonfigurasi",
      metaPurchases,
      paidOrders: null,
      note: "Data pesanan lunas belum terhubung (ORDERS_TABLE belum diisi), pembelian Meta belum bisa diverifikasi.",
    };
  }
  const allowed = paidOrders * (1 + tolerancePct / 100);
  if (metaPurchases > allowed && metaPurchases > 0) {
    return {
      status: "mismatch",
      metaPurchases,
      paidOrders,
      note: `Meta mencatat ${metaPurchases} pembelian, tetapi hanya ${paidOrders} pesanan yang lunas. CPA versi Meta kemungkinan terlalu bagus.`,
    };
  }
  return {
    status: "match",
    metaPurchases,
    paidOrders,
    note: `Pembelian Meta (${metaPurchases}) konsisten dengan pesanan lunas (${paidOrders}).`,
  };
}

/** Learning phase: pakai status resmi Meta bila ada, jika tidak gunakan perkiraan umur dan jumlah konversi. */
export function resolveLearningState(
  input: { learningStage?: string | null; ageDays: number | null; events: number },
  config: WinningEngineConfig
): { inLearning: boolean; source: "meta" | "heuristic" } {
  const stage = String(input.learningStage || "").toUpperCase();
  if (stage === "LEARNING") return { inLearning: true, source: "meta" };
  if (stage === "SUCCESS" || stage === "FAIL") return { inLearning: false, source: "meta" };
  const inLearning =
    input.ageDays !== null &&
    input.ageDays < config.learningMinAgeDays &&
    input.events < config.learningMinOptimizationEvents;
  return { inLearning, source: "heuristic" };
}

/**
 * Memilih kampanye yang layak dianalisa dan mencatat alasan setiap keputusan.
 * Data di luar jendela analisa (mis. kampanye beberapa bulan lalu) tidak pernah masuk ke diagnosa.
 */
export function prepareCampaignWindow(
  campaigns: MetaCampaign[],
  config: WinningEngineConfig,
  nowMs: number = Date.now()
): { included: MetaCampaign[]; audit: CampaignWindowAuditEntry[] } {
  const included: MetaCampaign[] = [];
  const audit: CampaignWindowAuditEntry[] = [];
  const days = config.analysisWindowDays;

  for (const c of campaigns) {
    const eff = String((c as any).effectiveStatus || c.deliveryStatus || c.status || "").toUpperCase();
    const spend = Number(c.spend || 0);
    const events = Number(c.purchases || c.results || 0) + Number((c as any).leads || 0);
    const createdMs = (c as any).createdTime ? Date.parse((c as any).createdTime) : NaN;
    const ageDays = Number.isFinite(createdMs) ? (nowMs - createdMs) / 86400000 : null;

    if (eff === "ARCHIVED" || eff === "DELETED") {
      audit.push({ campaignId: c.id, name: c.name, decision: "excluded", reason: `Status ${eff} di Meta, tidak dianalisa.` });
      continue;
    }
    if (!(spend > 0)) {
      audit.push({
        campaignId: c.id,
        name: c.name,
        decision: "excluded",
        reason: `Tidak ada belanja dalam ${days} hari terakhir, tidak dianalisa.`,
      });
      continue;
    }

    const learn = resolveLearningState({ learningStage: (c as any).learningStage, ageDays, events }, config);
    const inLearning = learn.inLearning;
    const enriched = { ...c, ageDays, inLearning, learningSource: learn.source } as MetaCampaign;
    included.push(enriched);
    audit.push({
      campaignId: c.id,
      name: c.name,
      decision: "included",
      reason: inLearning
        ? `Masuk analisa. Masih learning phase (${learn.source === "meta" ? "status resmi Meta" : `perkiraan: umur ${ageDays?.toFixed(1)} hari, ${events} konversi`}), keputusan dibatasi.`
        : `Masuk analisa. Belanja Rp ${Math.round(spend).toLocaleString("id-ID")} dalam ${days} hari terakhir.`,
    });
  }
  return { included, audit };
}

export function evaluateGuardrailGate(
  plan: WinningActionPlan,
  config: WinningEngineConfig
): GuardrailDecision {
  const payload = plan.actionPayload || {};
  // Hanya persetujuan MANUSIA yang melonggarkan pemeriksaan bukti, learning, dan cooldown.
  // Persetujuan otomatis dari mesin (approvedBy "engine") tetap melewati semuanya.
  const humanApproved = plan.status === "approved" && plan.approvedBy !== "engine";

  if (config.killSwitch) {
    return {
      allowed: false,
      requiresUserReapproval: true,
      reason: "Kill-Switch sedang aktif. Seluruh eksekusi otomatis dihentikan demi keamanan anggaran.",
    };
  }

  if (plan.requiresCeilingReapproval) {
    return {
      allowed: false,
      requiresUserReapproval: true,
      reason: "Kenaikan plafon budget di atas batas yang disetujui wajib mendapatkan persetujuan ulang dari Anda.",
    };
  }

  if (config.autonomous) {
    if (!humanApproved && !isAutoEligible(plan)) {
      return {
        allowed: false,
        requiresUserReapproval: true,
        reason: "Aksi ini di luar wewenang otonom (membuat kampanye baru atau mengubah offer/copy). Menunggu persetujuan Anda.",
      };
    }
  } else {
    if (config.mode === "cuan" && !humanApproved) {
      return {
        allowed: false,
        requiresUserReapproval: true,
        reason: "Mode Cuan aktif: Menunggu klik persetujuan Anda sebelum perubahan diterapkan.",
      };
    }
    if (config.mode === "advance" && !config.advanceMasterPlanApproved && !humanApproved) {
      return {
        allowed: false,
        requiresUserReapproval: true,
        reason: "Mode Advance membutuhkan persetujuan Master Plan awal satu kali sebelum otonomi penuh berjalan.",
      };
    }
  }

  // Learning phase: jangan hentikan atau scale kampanye yang sedang belajar, kecuali pause saat melewati batas darurat.
  if (!humanApproved && payload.inLearning) {
    if (plan.actionType === "scale_campaign_budget") {
      return {
        allowed: false,
        requiresUserReapproval: false,
        reason: "Kampanye masih learning phase Meta. Scale ditunda sampai keluar dari learning agar tidak mereset pembelajaran.",
      };
    }
    if (plan.actionType === "pause_bleeding_campaign" && Number(payload.amountSpent || 0) < config.learningHardStopSpend) {
      return {
        allowed: false,
        requiresUserReapproval: false,
        reason: `Kampanye masih learning phase dan belum melewati batas darurat Rp ${config.learningHardStopSpend.toLocaleString("id-ID")}. Dibiarkan belajar.`,
      };
    }
  }

  // Pause otomatis wajib punya bukti probabilitas rugi yang cukup. Pause yang disetujui manual tidak diblok di sini.
  if (plan.actionType === "pause_bleeding_campaign" && !humanApproved) {
    const pLoss = Number(payload.lossProbability);
    if (!Number.isFinite(pLoss) || pLoss < config.lossProbabilityToPause) {
      return {
        allowed: false,
        requiresUserReapproval: true,
        reason: `Bukti rugi belum cukup untuk pause otomatis: peluang CPA di atas garis rugi ${
          Number.isFinite(pLoss) ? (pLoss * 100).toFixed(0) + "%" : "tidak tercatat"
        }, ambang ${(config.lossProbabilityToPause * 100).toFixed(0)}%. Menunggu persetujuan Anda atau data tambahan.`,
      };
    }
  }

  // Jeda antar perubahan budget
  if (plan.actionType === "scale_campaign_budget" && payload.lastBudgetChangedAt && !humanApproved) {
    const hours = (Date.now() - Date.parse(payload.lastBudgetChangedAt)) / 3600000;
    if (hours < config.scaleCooldownHours) {
      return {
        allowed: false,
        requiresUserReapproval: false,
        reason: `Budget kampanye ini baru diubah ${hours.toFixed(0)} jam lalu. Jeda minimal ${config.scaleCooldownHours} jam agar Learning Phase tidak terganggu.`,
      };
    }
  }

  if (
    plan.actionType === "scale_campaign_budget" ||
    plan.actionType === "adjust_budget_to_range" ||
    plan.actionType === "create_rapid_test_campaign"
  ) {
    const requestedBudget = Number(payload.newBudget || payload.dailyBudget || 0);
    const currentBudget = Number(payload.currentBudget || 0);

    if (requestedBudget > config.approvedDailyCeiling) {
      return {
        allowed: false,
        clampedBudget: config.approvedDailyCeiling,
        requiresUserReapproval: true,
        reason: `Anggaran yang diusulkan (Rp ${requestedBudget.toLocaleString(
          "id-ID"
        )}) melebihi plafon harian yang disetujui (Rp ${config.approvedDailyCeiling.toLocaleString(
          "id-ID"
        )}). Membutuhkan persetujuan kenaikan plafon.`,
      };
    }

    if (plan.actionType === "scale_campaign_budget") {
      // Aksi otomatis wajib membawa bukti probabilitas dari inti keputusan, dan bukti itu diperiksa ulang di sini.
      if (!humanApproved) {
        const pWin = Number(payload.winProbability);
        if (!Number.isFinite(pWin) || pWin < config.winProbabilityToScale) {
          return {
            allowed: false,
            requiresUserReapproval: false,
            reason: `Bukti belum cukup untuk scale otomatis: peluang CPA di bawah target ${
              Number.isFinite(pWin) ? (pWin * 100).toFixed(0) + "%" : "tidak tercatat"
            }, ambang ${(config.winProbabilityToScale * 100).toFixed(0)}%.`,
          };
        }
      }
      // Tanpa angka budget saat ini, scale tidak boleh dihitung. Jangan menebak.
      if (!(currentBudget > 0)) {
        return {
          allowed: false,
          requiresUserReapproval: false,
          reason: "Budget harian saat ini belum terbaca dari Meta. Scale dibatalkan agar tidak menebak angka.",
        };
      }
      const stepPct = Math.min(config.maxScalePctPerStep, Number(payload.scalePct ?? config.maxScalePctPerStep));
      const maxAllowedStep = Math.round(currentBudget * (1 + stepPct / 100));
      const clamped = Math.min(requestedBudget, maxAllowedStep, config.maxDailyBudget, config.approvedDailyCeiling);
      return {
        allowed: true,
        clampedBudget: clamped,
        requiresUserReapproval: false,
        reason: `Lolos Guardrail Server. Kenaikan dibatasi maksimal ${stepPct}% dari Rp ${currentBudget.toLocaleString("id-ID")}.`,
      };
    }
  }

  return {
    allowed: true,
    requiresUserReapproval: false,
    reason: "Lolos pemeriksaan keamanan Guardrail Server.",
  };
}

/**
 * Menganalisa 5 Pilar Winning secara menyeluruh dari data riil Meta Ads, Landing Page,
 * Checkout Funnel, dan kualitas Pixel + CAPI.
 */
export function runFivePillarDiagnostics(params: {
  campaigns: MetaCampaign[];
  insightsData?: {
    ageGender?: any[];
    regions?: any[];
    placements?: any[];
    recommendation?: any;
  } | null;
  orderBumpConfig?: OrderBumpConfig;
  upsellConfig?: PostPurchaseUpsellConfig;
  capiStatus?: MetaCapiStatus;
  config: WinningEngineConfig;
  currentLpCopy?: {
    heroTitle?: string;
    heroSubtitle?: string;
    ctaText?: string;
    proPrice?: string;
    standardPrice?: string;
  };
  budgetChangedAt?: Record<string, string>;
  holdCampaignIds?: Record<string, string>; // kampanye yang ditahan karena keputusan admin (campaignId -> alasan)
  paidOrders?: number | null;               // pesanan lunas dalam jendela analisa, untuk rekonsiliasi
  pagePriceFindings?: string[];             // temuan perbandingan harga landing page dengan konfigurasi
}): {
  overallScore: number;
  pillars: PillarHealthScore[];
  plans: WinningActionPlan[];
  learnings: WinningLearningItem[];
  dataAudit: CampaignWindowAuditEntry[];
  includedCampaigns: MetaCampaign[];
  reconciliation: SalesReconciliation;
  verdicts: CampaignVerdictEntry[];
  breakEven: BreakEven;
  portfolio: PortfolioSummary;
  configWarnings: string[];
} {
  const {
    pagePriceFindings,
    campaigns: rawCampaigns,
    insightsData,
    orderBumpConfig,
    upsellConfig,
    capiStatus,
    config,
    currentLpCopy,
    budgetChangedAt = {},
    holdCampaignIds = {},
    paidOrders = null,
  } = params;

  // Filter jendela data: hanya kampanye aktif dalam N hari terakhir yang masuk diagnosa
  const { included: campaigns, audit: dataAudit } = prepareCampaignWindow(rawCampaigns, config);

  // Rekonsiliasi: apakah pembelian versi Meta didukung pesanan yang benar-benar lunas?
  const metaPurchasesInWindow = campaigns.reduce((s, c) => s + Number(c.purchases || c.results || 0), 0);
  const reconciliation = reconcileSales(metaPurchasesInWindow, paidOrders, config.reconciliationTolerancePct);

  const nowIso = new Date().toISOString();
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
  const pctText = (p: number | null) => (p === null ? "n/a" : `${(p * 100).toFixed(0)}%`);

  // Agregasi metrik kampanye riil
  const clicksOf = (c: MetaCampaign) => Number((c as any).linkClicks || c.clicks || 0);
  const buysOf = (c: MetaCampaign) => Number(c.purchases || c.results || 0);
  const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + Number(c.impressions || 0), 0);
  const totalLinkClicks = campaigns.reduce((s, c) => s + clicksOf(c), 0);
  const totalLpViews = campaigns.reduce((s, c) => s + Number(c.landingPageViews || 0), 0);
  const totalIc = campaigns.reduce((s, c) => s + Number(c.checkoutsInitiated || 0), 0);
  const totalPurchases = campaigns.reduce((s, c) => s + buysOf(c), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + Number(c.purchasesConversionValue || 0), 0);

  const avgCtr = totalImpressions > 0 ? (totalLinkClicks / totalImpressions) * 100 : 0;

  // OCLP dihitung hanya pada kampanye yang punya LP view, agar kampanye awareness/WA tidak mengencerkan angka.
  const lpActiveCampaigns = campaigns.filter((c) => Number(c.landingPageViews || 0) > 0);
  const lpTotalViews = lpActiveCampaigns.reduce((s, c) => s + Number(c.landingPageViews || 0), 0);
  const lpTotalClicks = lpActiveCampaigns.reduce((s, c) => s + clicksOf(c), 0);
  const oclpRate =
    lpTotalClicks > 0 ? Math.min(100, (lpTotalViews / lpTotalClicks) * 100) : 0;

  const lpVisitors = lpTotalViews; // tanpa LP view, tidak ada pengunjung terukur. Tidak memakai klik sebagai pengganti.
  const lpToCheckoutRate = lpVisitors > 0 ? Math.min(100, (totalIc / lpVisitors) * 100) : 0;
  const checkoutToPurchaseRate = totalIc > 0 ? Math.min(100, (totalPurchases / totalIc) * 100) : 0;
  const blendedCpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0;

  const plans: WinningActionPlan[] = [];
  const learnings: WinningLearningItem[] = [];

  // ==========================================================================
  // INTI KEPUTUSAN: break-even, prior akun, dan vonis probabilistik per kampanye
  // ==========================================================================
  const breakEven = resolveBreakEven({
    configured: config.breakEvenCpa,
    totalPurchases,
    totalRevenue,
    lowestPrice: MONEFYI_PRICING.standardPrice,
    contributionMarginPct: config.contributionMarginPct,
  });
  const configWarnings: string[] = [];
  if (config.targetCpa > breakEven.cpa) {
    configWarnings.push(
      `Target CPA ${rp(config.targetCpa)} lebih tinggi dari break-even ${rp(breakEven.cpa)}. Kampanye yang mencapai target tetap merugi per pesanan. ${breakEven.note}`
    );
  }
  if (config.winProbabilityToScale <= 0.5) {
    configWarnings.push("winProbabilityToScale <= 0,5 berarti scale bisa terjadi pada kampanye yang lebih mungkin gagal daripada berhasil.");
  }

  const prior = buildPrior(
    { clicks: totalLinkClicks, purchases: totalPurchases, spend: totalSpend },
    config.targetCpa,
    config.priorStrengthClicks
  );
  const thresholds: DecisionThresholds = {
    targetCpa: config.targetCpa,
    lossLineCpa: Math.max(config.targetCpa, Math.min(breakEven.cpa, config.targetCpa * config.killMaxMultipleOfTarget)),
    winProbability: config.winProbabilityToScale,
    lossProbability: config.lossProbabilityToPause,
    minPurchasesToScale: config.minPurchasesToScale,
    minLinkClicksToJudge: config.minLinkClicksToJudge,
    learningHardStopSpend: config.learningHardStopSpend,
  };

  const verdicts: CampaignVerdictEntry[] = campaigns.map((c) => ({
    campaignId: c.id,
    name: c.name,
    verdict: classifyCampaign(
      { spend: Number(c.spend || 0), linkClicks: clicksOf(c), purchases: buysOf(c), revenue: Number(c.purchasesConversionValue || 0) },
      Boolean(c.inLearning),
      prior,
      thresholds
    ),
  }));
  const verdictOf = (id: string) => verdicts.find((v) => v.campaignId === id)!.verdict;

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const winners = activeCampaigns.filter((c) => verdictOf(c.id).kind === "winner");
  const losers = activeCampaigns.filter((c) => verdictOf(c.id).kind === "losing");

  // Portofolio: berapa budget harian yang saat ini mengalir ke kampanye terbukti rugi?
  const budgetOf = (c: MetaCampaign) => Number(c.dailyBudget || 0);
  const activeDailyBudget = activeCampaigns.reduce((s, c) => s + budgetOf(c), 0);
  const losingDailyBudget = losers.reduce((s, c) => s + budgetOf(c), 0);
  const portfolio: PortfolioSummary = {
    activeDailyBudget,
    winnerDailyBudget: winners.reduce((s, c) => s + budgetOf(c), 0),
    losingDailyBudget,
    losingBudgetSharePct: activeDailyBudget > 0 ? Math.round((losingDailyBudget / activeDailyBudget) * 100) : 0,
  };

  // Catat keputusan "tidak bertindak" beserta alasannya agar admin tahu mesin tidak lalai.
  for (const c of activeCampaigns) {
    const v = verdictOf(c.id);
    if (v.kind === "losing" && holdCampaignIds[c.id]) {
      dataAudit.push({ campaignId: c.id, name: c.name, decision: "held", reason: `Ditahan: ${holdCampaignIds[c.id]}` });
    } else if (v.kind === "learning" || v.kind === "insufficient" || v.kind === "profitable") {
      dataAudit.push({ campaignId: c.id, name: c.name, decision: "held", reason: v.reason });
    }
  }

  // Pemenang demografi dari insightsData bila tersedia
  const bestAgeGender = insightsData?.ageGender?.find((r: any) => r.isWinningSegment) || insightsData?.ageGender?.[0];
  const bestRegion = insightsData?.regions?.find((r: any) => r.isWinningSegment) || insightsData?.regions?.[0];
  const bestPlacement = insightsData?.placements?.find((r: any) => r.isWinningSegment) || insightsData?.placements?.[0];

  // ==========================================================================
  // Harga di landing page tidak sama dengan konfigurasi (selalu butuh persetujuan manual)
  // ==========================================================================
  if (pagePriceFindings && pagePriceFindings.length > 0) {
    plans.push({
      id: "plan_page_price_mismatch",
      pillar: "offer",
      pillarLabel: "Pilar 1: Offer & Harga",
      priority: "high",
      title: "Harga di landing page tidak sesuai konfigurasi",
      whatToDo:
        "Samakan harga yang tampil di landing page dengan MONEFYI_PRICING. Jika harga memang sudah berubah, perbarui konfigurasi lebih dulu.",
      whyEvidence: pagePriceFindings.join(" "),
      expectedImpact: "Hipotesis: harga yang konsisten antara iklan, halaman, dan checkout menaikkan kepercayaan. Dicek ulang setelah perbaikan.",
      actionType: "update_offer_pricing",
      actionPayload: {
        findings: pagePriceFindings,
        // Tujuan rencana ini menyamakan halaman dengan konfigurasi, jadi harga yang ditulis berasal dari MONEFYI_PRICING.
        recommendedEntryPrice: `Rp ${MONEFYI_PRICING.standardPrice.toLocaleString("id-ID")}`,
        recommendedProPrice: `Rp ${MONEFYI_PRICING.proPrice.toLocaleString("id-ID")}`,
        anchorOriginalPrice: `Rp ${MONEFYI_PRICING.proRegularPrice.toLocaleString("id-ID")}`,
      },
      requiresCeilingReapproval: false,
      status: "pending",
      confidence: 90,
      createdAt: nowIso,
    });
  }

  // ==========================================================================
  // PILAR 1: OFFER. Hanya dinilai jika ada cukup kunjungan LP. Tidak ada skor dasar karangan.
  // ==========================================================================
  const MIN_VISITS_FOR_FUNNEL = 100;
  const MIN_CHECKOUTS_FOR_CHECKOUT = 20;
  const offerDataAvailable = lpVisitors >= MIN_VISITS_FOR_FUNNEL;
  const entryPriceText = rp(MONEFYI_PRICING.standardPrice);
  let offerScore = 0;
  let offerDiagnosis = `Belum cukup data: ${lpVisitors} kunjungan landing page (minimal ${MIN_VISITS_FOR_FUNNEL}) dalam ${config.analysisWindowDays} hari. Offer belum bisa dinilai dari bukti.`;
  let offerRecommendation = "Kumpulkan trafik ke landing page sampai sampel cukup sebelum mengubah offer.";
  const offerWeak = offerDataAvailable && lpToCheckoutRate < 2.0 && (totalPurchases === 0 || blendedCpa > config.targetCpa);

  if (offerDataAvailable) {
    const cpaSignal = totalPurchases === 0 ? 0 : blendedCpa <= config.targetCpa ? 25 : blendedCpa <= breakEven.cpa ? 12 : 0;
    offerScore = Math.round(Math.min(100, 35 + Math.min(40, lpToCheckoutRate * 8) + cpaSignal));
    offerDiagnosis = `Dari ${lpVisitors.toLocaleString("id-ID")} kunjungan LP, ${totalIc} memulai checkout (${lpToCheckoutRate.toFixed(1)}%) dan ${totalPurchases} membeli. ${
      totalPurchases > 0 ? `CPA gabungan ${rp(blendedCpa)} (target ${rp(config.targetCpa)}, break-even ${rp(breakEven.cpa)}).` : "Belum ada pembelian dalam jendela ini."
    }`;
    offerRecommendation = offerWeak
      ? "Rasio LP ke checkout rendah. Uji perbaikan offer (paket masuk, perbandingan Standard vs Pro) sebelum menambah budget."
      : "Offer tidak menjadi hambatan utama pada data saat ini. Fokus pada Paket Pro lewat order bump.";
  }

  if (offerWeak) {
    plans.push({
      id: "plan_offer_value_stack",
      pillar: "offer",
      pillarLabel: "Pilar 1: Produk, Harga & Winning Offer",
      priority: offerScore < 60 ? "critical" : "high",
      title: "Perbaiki Offer: rasio kunjungan ke checkout rendah",
      whatToDo:
        "Siapkan variasi offer di landing page untuk diuji: perjelas perbandingan Standard vs Pro dan kontras harga coret. Isi bonus hanya dengan yang benar-benar ada di produk, dan diputuskan oleh Anda.",
      whyEvidence: offerDiagnosis,
      expectedImpact: "Hipotesis: rasio LP ke checkout naik. Diukur dari data halaman setelah 7 hari, tidak dijanjikan di sini.",
      evidenceWindow: `${config.analysisWindowDays} hari terakhir`,
      actionType: "update_offer_pricing",
      actionPayload: {
        productContext: "Monefyi Estimator (estimator.monefyi.com)",
        recommendedEntryPrice: `Rp ${MONEFYI_PRICING.standardPrice.toLocaleString("id-ID")}`,
        recommendedProPrice: `Rp ${MONEFYI_PRICING.proPrice.toLocaleString("id-ID")}`,
        anchorOriginalPrice: `Rp ${MONEFYI_PRICING.proRegularPrice.toLocaleString("id-ID")}`,
        bonusStack: [],
        evidence: { lpVisitors, checkouts: totalIc, purchases: totalPurchases, windowDays: config.analysisWindowDays },
      },
      requiresCeilingReapproval: false,
      status: "pending",
      confidence: 70,
      createdAt: nowIso,
    });
  }

  // ==========================================================================
  // PILAR 2: LANDING PAGE
  // ==========================================================================
  const lpDataAvailable = lpTotalViews > 0 && lpTotalClicks >= MIN_VISITS_FOR_FUNNEL;
  const lpSpeedHealthy = !lpDataAvailable || oclpRate >= 75;
  const lpScore = lpDataAvailable
    ? Math.round(Math.min(96, Math.max(10, oclpRate * 0.6 + Math.min(40, lpToCheckoutRate * 7))))
    : 0;

  const lpDiagnosis = !lpDataAvailable
    ? `Belum cukup data landing page: ${lpTotalClicks} klik link yang punya LP view (minimal ${MIN_VISITS_FOR_FUNNEL}). Kecepatan belum bisa dinilai.`
    : !lpSpeedHealthy
    ? `OCLP ${oclpRate.toFixed(1)}% (standar sehat 75%). Sekitar ${(100 - oclpRate).toFixed(0)}% pengklik iklan tidak sampai melihat halaman.`
    : `Kecepatan muat sehat (OCLP ${oclpRate.toFixed(1)}%).`;

  if (lpDataAvailable && !lpSpeedHealthy) {
    plans.push({
      id: "plan_lp_speed_auto_repair",
      pillar: "landing_page",
      pillarLabel: "Pilar 2: Kecepatan & Copywriting Landing Page",
      priority: "critical",
      title: "Perbaiki kecepatan landing page (OCLP di bawah 75%)",
      whatToDo:
        "Prioritaskan render hero section, tunda skrip demo di bawah lipatan layar, dan kurangi beban visual awal agar halaman terbuka cepat di jaringan seluler.",
      whyEvidence: `OCLP ${oclpRate.toFixed(1)}%: ${lpTotalViews} LP view dari ${lpTotalClicks} klik link, dalam ${config.analysisWindowDays} hari.`,
      expectedImpact: "Hipotesis: lebih sedikit pengunjung yang keluar sebelum halaman tampil. Diukur dari OCLP setelah 7 hari.",
      evidenceWindow: `${config.analysisWindowDays} hari terakhir`,
      actionType: "optimize_lp_speed",
      actionPayload: {
        currentOclp: Number(oclpRate.toFixed(1)),
        targetOclp: 85,
        enableLazyBelowFold: true,
        preloadHeroAssets: true,
      },
      requiresCeilingReapproval: false,
      status: "pending",
      createdAt: nowIso,
      confidence: 85,
    });
  }

  // Copy hanya disarankan saat kecepatan sehat (halaman terbuka) tetapi pengunjung tidak lanjut ke checkout.
  if (lpDataAvailable && lpSpeedHealthy && lpVisitors >= MIN_VISITS_FOR_FUNNEL && lpToCheckoutRate < 2.0) {
    plans.push({
      id: "plan_lp_copywriting_upgrade",
      pillar: "landing_page",
      pillarLabel: "Pilar 2: Kecepatan & Copywriting Landing Page",
      priority: "high",
      title: "Uji headline baru: halaman terbuka tetapi pengunjung tidak lanjut ke checkout",
      whatToDo:
        "Siapkan variasi headline, subheadline, dan CTA yang menonjolkan masalah utama kontraktor (kirim penawaran sebelum pulang survei) untuk diuji melawan versi sekarang.",
      whyEvidence: `Halaman terbuka normal (OCLP ${oclpRate.toFixed(1)}%), tetapi hanya ${lpToCheckoutRate.toFixed(1)}% dari ${lpVisitors} pengunjung memulai checkout.`,
      expectedImpact: "Hipotesis: rasio checkout naik. Diukur setelah 7 hari dengan pembanding versi lama.",
      evidenceWindow: `${config.analysisWindowDays} hari terakhir`,
      actionType: "update_lp_copy",
      actionPayload: {
        beforeHeroTitle: currentLpCopy?.heroTitle || "",
        afterHeroTitle:
          "Kirim Penawaran PDF Berlogo Sebelum Kamu Pulang Survei, Closing Sebelum Klien Sempat Bandingkan Vendor",
        afterHeroSubtitle:
          "Khusus kontraktor, interior & kitchen set: hitung harga proyek dalam 1 menit di HP saat survei, PDF penawaran siap kirim ke WhatsApp klien.",
        afterCtaText: "Coba Estimator Sekarang (Sekali Bayar)",
      },
      requiresCeilingReapproval: false,
      status: "pending",
      confidence: 70,
      createdAt: nowIso,
    });
  }

  // ==========================================================================
  // PILAR 3: CHECKOUT. Hanya dinilai dari checkout yang benar-benar tercatat.
  // ==========================================================================
  const checkoutDataAvailable = totalIc >= MIN_CHECKOUTS_FOR_CHECKOUT;
  const bumpTakeRate = typeof orderBumpConfig?.takeRateEstimate === "number" ? orderBumpConfig.takeRateEstimate : null;
  const upsellTakeRate = typeof upsellConfig?.takeRateEstimate === "number" ? upsellConfig.takeRateEstimate : null;
  const checkoutScore = checkoutDataAvailable ? Math.round(Math.min(95, Math.max(10, checkoutToPurchaseRate * 2.5))) : 0;
  const checkoutLeaky = checkoutDataAvailable && checkoutToPurchaseRate < 25;

  if (checkoutDataAvailable && (checkoutLeaky || totalPurchases >= 5)) {
    plans.push({
      id: "plan_checkout_bump_optimization",
      pillar: "checkout",
      pillarLabel: "Pilar 3: Checkout Page & AOV Funnel",
      priority: checkoutLeaky ? "high" : "medium",
      title: checkoutLeaky
        ? "Kurangi kebocoran di checkout dan perkuat Order Bump upgrade ke PRO"
        : "Optimasi Order Bump: upgrade ke Estimator PRO",
      whatToDo: `Pastikan order bump di halaman checkout menawarkan upgrade ke PRO (+${rp(MONEFYI_PRICING.orderBumpUpgradePrice)}), dan tindak lanjuti pembeli yang berhenti di langkah pembayaran lewat WhatsApp.`,
      whyEvidence: `${totalIc} checkout dimulai, ${totalPurchases} selesai (${checkoutToPurchaseRate.toFixed(1)}%) dalam ${config.analysisWindowDays} hari.${
        bumpTakeRate !== null ? ` Take-rate bump (perkiraan konfigurasi, belum terukur) ${bumpTakeRate}%.` : " Take-rate order bump belum terukur."
      }`,
      expectedImpact: "Hipotesis: nilai transaksi rata-rata atau penyelesaian checkout naik. Diukur setelah 7 hari.",
      evidenceWindow: `${config.analysisWindowDays} hari terakhir`,
      actionType: "optimize_checkout_funnel",
      actionPayload: {
        headline: `YA! Upgrade ke Estimator PRO, tambah ${rp(MONEFYI_PRICING.orderBumpUpgradePrice)}`,
        description: `Harga PRO di landing page ${rp(MONEFYI_PRICING.proPrice)}. Khusus di halaman ini cukup tambah ${rp(MONEFYI_PRICING.orderBumpUpgradePrice)} untuk upgrade ke PRO.`,
        price: MONEFYI_PRICING.orderBumpUpgradePrice,
        originalPrice: MONEFYI_PRICING.orderBumpOriginalPrice,
        badgeText: "PENAWARAN SEKALI INI SAJA",
      },
      requiresCeilingReapproval: false,
      status: "pending",
      confidence: 75,
      createdAt: nowIso,
    });
  }

  // ==========================================================================
  // PILAR 4: ADS. Rencana lahir dari vonis probabilistik, bukan pengali tetap.
  // ==========================================================================
  // 4A. Pause hanya jika hampir pasti merugi (di atas garis rugi), bukan sekadar di atas target.
  for (const camp of losers) {
    if (holdCampaignIds[camp.id]) continue;
    const v = verdictOf(camp.id);
    plans.push({
      id: `plan_pause_${camp.id}`,
      pillar: "ads_testing",
      pillarLabel: "Pilar 4: Meta Ads & Rapid Testing",
      priority: "critical",
      title: `Hentikan kampanye merugi "${camp.name}"`,
      whatToDo: `Ubah status kampanye "${camp.name}" menjadi PAUSED agar anggaran tidak terus terbakar di atas garis rugi ${rp(thresholds.lossLineCpa)}.`,
      whyEvidence: `${v.reason} Belanja ${rp(camp.spend)}, ${buysOf(camp)} pembelian, ${clicksOf(camp)} klik link.`,
      expectedImpact: `Menghentikan aliran ${rp(camp.dailyBudget || 0)} per hari ke kampanye yang peluang rugi ${pctText(v.pLoss)}.`,
      evidenceWindow: `${config.analysisWindowDays} hari terakhir`,
      actionType: "pause_bleeding_campaign",
      actionPayload: {
        campaignId: camp.id,
        campaignName: camp.name,
        currentStatus: camp.status,
        inLearning: Boolean(camp.inLearning),
        lossProbability: v.pLoss,
        lossLineCpa: thresholds.lossLineCpa,
        breakEvenCpa: breakEven.cpa,
        cpaRange80: [v.cpaLow, v.cpaHigh],
        evidence: {
          spend: Number(camp.spend || 0),
          purchases: buysOf(camp),
          linkClicks: clicksOf(camp),
          cpaObserved: v.cpaObserved,
          windowDays: config.analysisWindowDays,
        },
        newStatus: "PAUSED",
        amountSpent: camp.spend,
        cpa: camp.cpa,
      },
      requiresCeilingReapproval: false,
      status: "pending",
      confidence: Math.round(Math.min(99, (v.pLoss ?? 0) * 100)),
      createdAt: nowIso,
    });
  }

  // 4B. Scale hanya untuk winner yang terbukti secara probabilistik. Langkah proporsional terhadap keyakinan.
  for (const winCamp of winners) {
    const v = verdictOf(winCamp.id);
    if (reconciliation.status === "mismatch") {
      dataAudit.push({ campaignId: winCamp.id, name: winCamp.name, decision: "held", reason: `Scale ditunda: ${reconciliation.note}` });
      continue;
    }
    if (!(winCamp.dailyBudget > 0)) {
      dataAudit.push({
        campaignId: winCamp.id,
        name: winCamp.name,
        decision: "held",
        reason: "Ditahan: budget harian belum terbaca dari Meta, scale tidak dihitung dari tebakan.",
      });
      continue;
    }
    if (winCamp.dailyBudget >= config.maxDailyBudget) {
      dataAudit.push({
        campaignId: winCamp.id,
        name: winCamp.name,
        decision: "held",
        reason: `Winner (${v.reason}) tetapi budget ${rp(winCamp.dailyBudget)} sudah di batas maksimum ${rp(config.maxDailyBudget)}.`,
      });
      continue;
    }
    const lastChangeIso = budgetChangedAt[winCamp.id];
    if (lastChangeIso && (Date.now() - Date.parse(lastChangeIso)) / 3600000 < config.scaleCooldownHours) {
      dataAudit.push({
        campaignId: winCamp.id,
        name: winCamp.name,
        decision: "held",
        reason: `Ditahan: budget diubah kurang dari ${config.scaleCooldownHours} jam lalu.`,
      });
      continue;
    }
    const sigEditIso = (winCamp as any).lastSigEditAt;
    if (sigEditIso && (Date.now() - Date.parse(sigEditIso)) / 3600000 < config.scaleCooldownHours) {
      dataAudit.push({
        campaignId: winCamp.id,
        name: winCamp.name,
        decision: "held",
        reason: `Ditahan: ada perubahan signifikan pada ad set kurang dari ${config.scaleCooldownHours} jam lalu (termasuk perubahan manual). Scale menunggu agar tidak mereset learning.`,
      });
      continue;
    }

    const stepPct = scaleStepPct(v, config.targetCpa, config.maxScalePctPerStep);
    const baseBudget = winCamp.dailyBudget;
    const rawNewBudget = Math.round(baseBudget * (1 + stepPct / 100));
    const exceedsApprovedCeiling = rawNewBudget > config.approvedDailyCeiling;
    // Tidak pernah menaikkan ke minDailyBudget secara diam-diam: langkah selalu sebesar stepPct.
    const safeNewBudget = exceedsApprovedCeiling ? rawNewBudget : Math.min(rawNewBudget, config.maxDailyBudget);

    plans.push({
      id: `plan_scale_${winCamp.id}`,
      pillar: "ads_testing",
      pillarLabel: "Pilar 4: Meta Ads & Rapid Testing",
      priority: "high",
      title: `Scale +${stepPct}% kampanye winner "${winCamp.name}"`,
      whatToDo: `Naikkan budget harian "${winCamp.name}" dari ${rp(baseBudget)} menjadi ${rp(safeNewBudget)} (+${stepPct}%). Besar langkah mengikuti tingkat keyakinan, maksimal ${config.maxScalePctPerStep}%.`,
      whyEvidence: `${v.reason} ROAS ${Number(winCamp.roas || 0).toFixed(2)}x.`,
      expectedImpact: "Menambah volume penjualan bertahap. Hasil dinilai ulang 48 jam setelah perubahan, dan budget dikembalikan jika memburuk.",
      evidenceWindow: `${config.analysisWindowDays} hari terakhir`,
      actionType: "scale_campaign_budget",
      actionPayload: {
        campaignId: winCamp.id,
        campaignName: winCamp.name,
        currentBudget: baseBudget,
        newBudget: safeNewBudget,
        scalePct: stepPct,
        winProbability: v.pWin,
        cpaRange80: [v.cpaLow, v.cpaHigh],
        inLearning: Boolean(winCamp.inLearning),
        lastBudgetChangedAt: budgetChangedAt[winCamp.id] || null,
        evidence: {
          spend: Number(winCamp.spend || 0),
          purchases: buysOf(winCamp),
          linkClicks: clicksOf(winCamp),
          cpaObserved: v.cpaObserved,
          windowDays: config.analysisWindowDays,
        },
      },
      requiresCeilingReapproval: exceedsApprovedCeiling,
      status: "pending",
      confidence: Math.round(Math.min(99, (v.pWin ?? 0) * 100)),
      createdAt: nowIso,
    });
  }

  // 4C. Kampanye uji baru hanya diusulkan jika memang perlu: tidak ada winner, tidak ada yang sedang belajar,
  //     dan belum ada kampanye uji yang berjalan. Sebelumnya rencana ini muncul di setiap siklus.
  const testRunning = activeCampaigns.some((c) => /\[WINNING ENGINE TEST\]/i.test(c.name));
  const anyLearning = activeCampaigns.some((c) => c.inLearning);
  if (winners.length === 0 && !anyLearning && !testRunning) {
    const recommendedTestBudget = Math.max(
      config.minDailyBudget,
      Math.min(config.maxDailyBudget, Math.round(config.targetCpa * 3))
    );
    const avgCpc = totalLinkClicks > 0 ? totalSpend / totalLinkClicks : 0;
    const clicksPerDay = avgCpc > 0 ? recommendedTestBudget / avgCpc : 0;
    const daysToJudge = clicksPerDay > 0 ? Math.ceil(config.minLinkClicksToJudge / clicksPerDay) : null;
    plans.push({
      id: "plan_rapid_testing_campaign",
      pillar: "ads_testing",
      pillarLabel: "Pilar 4: Meta Ads & Rapid Testing",
      priority: "high",
      title: "Luncurkan kampanye uji terstruktur (3 hook)",
      whatToDo: `Buat draf kampanye uji (PAUSED) dengan budget ${rp(recommendedTestBudget)} per hari${
        bestAgeGender?.age ? `, menargetkan segmen ${bestAgeGender.age}` : ""
      }${bestRegion?.region ? ` di ${bestRegion.region}` : ""}.`,
      whyEvidence: `Tidak ada kampanye winner saat ini dan tidak ada yang sedang belajar atau diuji.${
        daysToJudge !== null
          ? ` Dengan CPC rata-rata ${rp(avgCpc)}, budget ini menghasilkan sekitar ${Math.round(clicksPerDay)} klik per hari, sehingga sampel minimum ${config.minLinkClicksToJudge} klik tercapai dalam kira-kira ${daysToJudge} hari.`
          : " Belum ada data CPC untuk memperkirakan lama pengujian."
      }`,
      expectedImpact: "Menemukan kombinasi kreatif dan audiens yang lolos uji probabilitas, tanpa membuang budget secara acak.",
      actionType: "create_rapid_test_campaign",
      actionPayload: {
        name: `[WINNING ENGINE TEST] Hook PAS${bestAgeGender?.age ? ` - Usia ${bestAgeGender.age}` : ""}`,
        dailyBudget: recommendedTestBudget,
        objective: "OUTCOME_SALES",
        targetSegment: {
          age: bestAgeGender?.age || null,
          region: bestRegion?.region || null,
          placement: bestPlacement?.placementLabel || null,
        },
      },
      requiresCeilingReapproval: recommendedTestBudget > config.approvedDailyCeiling,
      status: "pending",
      confidence: 75,
      createdAt: nowIso,
    });
  }

  // Skor Pilar 4: porsi belanja yang berada di kampanye sehat, berbobot. Bukan angka tetap.
  const VERDICT_WEIGHT: Record<string, number> = { winner: 1, profitable: 0.6, learning: 0.5, insufficient: 0.4, losing: 0 };
  const adsDataAvailable = campaigns.length > 0 && totalSpend >= config.targetCpa;
  const adsScore = adsDataAvailable
    ? Math.round(
        (campaigns.reduce((s, c) => s + Number(c.spend || 0) * (VERDICT_WEIGHT[verdictOf(c.id).kind] ?? 0.4), 0) / totalSpend) * 100
      )
    : 0;

  if (bestAgeGender || bestRegion) {
    learnings.push({
      id: "learn_ads_demography",
      pillar: "ads_testing",
      category: "Segmen Paling Responsif",
      finding: `Segmen paling responsif: ${bestAgeGender?.age ? `usia ${bestAgeGender.age}` : "usia belum terbaca"}${
        bestAgeGender?.genderLabel ? ` (${bestAgeGender.genderLabel})` : ""
      }${bestRegion?.region ? `, wilayah ${bestRegion.region}` : ""}${
        bestPlacement?.placementLabel ? `, placement ${bestPlacement.placementLabel}` : ""
      }.`,
      evidenceMetric: bestAgeGender?.cpa
        ? `CPA segmen: ${rp(bestAgeGender.cpa)} | CTR: ${Number(bestAgeGender.ctr || 0).toFixed(2)}%`
        : "Berdasarkan breakdown Meta Graph API",
      confidence: 70,
    });
  }
  learnings.push({
    id: "learn_break_even",
    pillar: "ads_testing",
    category: "Garis Rugi (Break-even CPA)",
    finding: breakEven.note,
    evidenceMetric: `Break-even CPA ${rp(breakEven.cpa)} | Garis rugi ${rp(thresholds.lossLineCpa)} | Target CPA ${rp(config.targetCpa)} | Prior dari ${prior.source}`,
    confidence: breakEven.aovSource === "data" ? 85 : 60,
  });

  // ==========================================================================
  // PILAR 5: TRACKING. Hanya data CAPI yang terverifikasi dari Meta yang dipakai. Data mock/default tidak dihitung.
  // ==========================================================================
  const capiVerified = Boolean(capiStatus && (capiStatus as any).verified === true);
  const emqScore = capiVerified ? Number(capiStatus!.eventMatchQuality) : null;
  const redundancy = capiVerified && typeof capiStatus!.redundancyRate === "number" ? capiStatus!.redundancyRate : null;
  const trackingScore = emqScore !== null ? Math.round(Math.min(98, Math.max(10, emqScore * 10))) : 0;

  if (capiVerified && (!capiStatus!.connected || (emqScore !== null && emqScore < 8.5) || (redundancy !== null && redundancy < 95))) {
    plans.push({
      id: "plan_tracking_capi_boost",
      pillar: "tracking",
      pillarLabel: "Pilar 5: Kualitas Tracking Pixel + CAPI",
      priority: !capiStatus!.connected || (emqScore !== null && emqScore < 7.0) ? "critical" : "medium",
      title: "Perkuat Event Match Quality dan deduplikasi browser-server CAPI",
      whatToDo:
        "Kirim parameter pencocokan lengkap (hash email, nomor WhatsApp, IP, User-Agent, fbc/fbp) dan sinkronkan event_id antara Pixel dan CAPI.",
      whyEvidence: `${!capiStatus!.connected ? "CAPI tidak terhubung. " : ""}EMQ terverifikasi ${emqScore?.toFixed(1)}/10${
        redundancy !== null ? `, deduplikasi ${redundancy.toFixed(1)}%` : ""
      }.`,
      expectedImpact: "Hipotesis: sinyal pembelian ke Meta lebih lengkap. Dampak CPA diukur dari perbandingan sebelum dan sesudah.",
      actionType: "repair_tracking_capi",
      actionPayload: { targetEmq: 9, enableDeduplication: true, enableHashedPhoneAndEmail: true },
      requiresCeilingReapproval: false,
      status: "pending",
      confidence: 85,
      createdAt: nowIso,
    });
  }

  // ==========================================================================
  // Ringkasan pilar
  // ==========================================================================
  const statusOf = (score: number, hasData: boolean, win: number, ok: number): PillarHealthScore["status"] =>
    !hasData ? "perlu_data" : score >= win ? "winning" : score >= ok ? "perlu_optimasi" : "kritis";

  const pillars: PillarHealthScore[] = [
    {
      id: "offer",
      label: "1. Produk, Harga & Offer",
      score: offerScore,
      status: statusOf(offerScore, offerDataAvailable, 80, 60),
      headlineMetric: offerDataAvailable ? `LP ke Checkout: ${lpToCheckoutRate.toFixed(1)}%` : "Data belum cukup",
      honestDiagnosis: offerDiagnosis,
      keyRecommendation: offerRecommendation,
    },
    {
      id: "landing_page",
      label: "2. Landing Page (Speed & Copy)",
      score: lpScore,
      status: statusOf(lpScore, lpDataAvailable, 80, 65),
      headlineMetric: lpDataAvailable ? `OCLP Speed: ${oclpRate.toFixed(1)}%` : "Data belum cukup",
      honestDiagnosis: lpDiagnosis,
      keyRecommendation: lpDataAvailable
        ? "Jaga OCLP di atas 80%, lalu uji headline bila rasio checkout rendah."
        : "Tunggu data kunjungan landing page sebelum mengubah apa pun.",
    },
    {
      id: "checkout",
      label: "3. Checkout & Funnel AOV",
      score: checkoutScore,
      status: statusOf(checkoutScore, checkoutDataAvailable, 80, 65),
      headlineMetric: checkoutDataAvailable
        ? `Checkout selesai: ${checkoutToPurchaseRate.toFixed(1)}%${bumpTakeRate !== null ? ` | Bump (perkiraan): ${bumpTakeRate}%` : ""}${upsellTakeRate !== null ? ` | Upsell (perkiraan): ${upsellTakeRate}%` : ""}`
        : "Data belum cukup",
      honestDiagnosis: checkoutDataAvailable
        ? `${totalIc} checkout dimulai, ${totalPurchases} selesai (${checkoutToPurchaseRate.toFixed(1)}%) dalam ${config.analysisWindowDays} hari. Skor memakai ambang heuristik engine, belum dikalibrasi ke data historis Monefyi.`
        : `Baru ${totalIc} checkout tercatat (minimal ${MIN_CHECKOUTS_FOR_CHECKOUT}). Checkout belum bisa dinilai.`,
      keyRecommendation: checkoutDataAvailable
        ? "Tawarkan upgrade ke PRO di checkout dan tindak lanjuti yang berhenti di pembayaran lewat WhatsApp."
        : "Tunggu data checkout cukup sebelum mengubah halaman checkout.",
    },
    {
      id: "ads_testing",
      label: "4. Meta Ads & Rapid Testing",
      score: adsScore,
      status: statusOf(adsScore, adsDataAvailable, 80, 65),
      headlineMetric: `${winners.length} Winner | ${losers.length} Merugi | ${portfolio.losingBudgetSharePct}% budget di kampanye merugi`,
      honestDiagnosis: adsDataAvailable
        ? `${campaigns.length} kampanye, total belanja ${rp(totalSpend)}, CTR link rata-rata ${avgCtr.toFixed(2)}%. Skor adalah porsi belanja di kampanye yang terbukti sehat. Garis rugi ${rp(thresholds.lossLineCpa)} (break-even ${rp(breakEven.cpa)}).`
        : "Belanja iklan dalam jendela analisa belum cukup untuk menilai.",
      keyRecommendation:
        "Hentikan hanya kampanye yang hampir pasti di atas garis rugi. Scale hanya yang hampir pasti di bawah target, dengan langkah sebanding keyakinan.",
    },
    {
      id: "tracking",
      label: "5. Tracking Pixel + CAPI",
      score: trackingScore,
      status: statusOf(trackingScore, capiVerified, 82, 65),
      headlineMetric: capiVerified ? `EMQ: ${emqScore!.toFixed(1)} / 10` : "Belum terverifikasi",
      honestDiagnosis: capiVerified
        ? "Sinyal konversi browser + server adalah bahan utama algoritma Meta mencari pembeli."
        : "Status CAPI yang diterima engine belum diverifikasi dari Meta (kemungkinan data contoh). Tidak dinilai agar tidak terlihat sehat secara palsu.",
      keyRecommendation: capiVerified
        ? "Pastikan event_id terdeduplikasi dan nomor WhatsApp pembeli dikirim ter-hash SHA-256."
        : "Hubungkan pembacaan EMQ nyata dari Meta Events Manager, lalu tandai verified.",
    },
  ];

  const scored = pillars.filter((p) => p.status !== "perlu_data");
  const overallScore = scored.length > 0 ? Math.round(scored.reduce((a, p) => a + p.score, 0) / scored.length) : 0;

  const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2 };
  plans.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.confidence - a.confidence);

  return {
    overallScore,
    pillars,
    plans,
    learnings,
    dataAudit,
    includedCampaigns: campaigns,
    reconciliation,
    verdicts,
    breakEven,
    portfolio,
    configWarnings,
  };
}
