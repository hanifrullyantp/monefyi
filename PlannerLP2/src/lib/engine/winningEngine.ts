import { MetaCampaign, OrderBumpConfig, PostPurchaseUpsellConfig, MetaCapiStatus } from "../types/marketing";
import { MultiLlmRoutingConfig } from "./llmRouter";
import { EngineNotificationConfig } from "../services/telegramBotService";

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
  advanceMasterPlanApproved: boolean;
  llmRouting: MultiLlmRoutingConfig;
  notifications: EngineNotificationConfig;
}

export interface PillarHealthScore {
  id: WinningPillarId;
  label: string;
  score: number;                   // 0 - 100
  status: "winning" | "perlu_optimasi" | "kritis";
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
    | "repair_tracking_capi"
    | "approve_ceiling_increase";
  actionPayload: Record<string, any>;
  requiresCeilingReapproval: boolean;
  status: "pending" | "approved" | "executed" | "rejected" | "blocked_guardrail";
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
  advanceMasterPlanApproved: false,
  llmRouting: {
    strategist: {
      provider: "claude",
      model: "claude-3-7-sonnet-latest",
      apiKey: "",
    },
    technical: {
      provider: "gemini",
      model: "gemini-2.5-flash",
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
export function evaluateGuardrailGate(
  plan: WinningActionPlan,
  config: WinningEngineConfig
): GuardrailDecision {
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

  // Di Mode Cuan, semua aksi wajib persetujuan manual dari user
  if (config.mode === "cuan" && plan.status !== "approved") {
    return {
      allowed: false,
      requiresUserReapproval: true,
      reason: "Mode Cuan aktif: Menunggu klik persetujuan Anda sebelum perubahan diterapkan.",
    };
  }

  // Di Mode Advance, pastikan Master Plan awal sudah disetujui
  if (config.mode === "advance" && !config.advanceMasterPlanApproved && plan.status !== "approved") {
    return {
      allowed: false,
      requiresUserReapproval: true,
      reason: "Mode Advance membutuhkan persetujuan Master Plan awal satu kali sebelum otonomi penuh berjalan.",
    };
  }

  // Validasi batas budget harian pada aksi anggaran
  if (
    plan.actionType === "scale_campaign_budget" ||
    plan.actionType === "adjust_budget_to_range" ||
    plan.actionType === "create_rapid_test_campaign"
  ) {
    const requestedBudget = Number(plan.actionPayload.newBudget || plan.actionPayload.dailyBudget || 0);
    const currentBudget = Number(plan.actionPayload.currentBudget || 0);

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

    if (currentBudget > 0 && plan.actionType === "scale_campaign_budget") {
      const maxAllowedStep = Math.round(currentBudget * (1 + config.maxScalePctPerStep / 100));
      const clamped = Math.min(
        Math.max(requestedBudget, config.minDailyBudget),
        Math.min(maxAllowedStep, config.maxDailyBudget)
      );
      return {
        allowed: true,
        clampedBudget: clamped,
        requiresUserReapproval: false,
        reason: `Lolos Guardrail Server (Kenaikan dijaga maksimal ${config.maxScalePctPerStep}% agar tidak mereset Learning Phase Meta).`,
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
}): {
  overallScore: number;
  pillars: PillarHealthScore[];
  plans: WinningActionPlan[];
  learnings: WinningLearningItem[];
} {
  const {
    campaigns,
    insightsData,
    orderBumpConfig,
    upsellConfig,
    capiStatus,
    config,
    currentLpCopy,
  } = params;

  const nowIso = new Date().toISOString();

  // Agregasi metrik kampanye riil
  const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + Number(c.impressions || 0), 0);
  const totalLinkClicks = campaigns.reduce((s, c) => s + Number(c.linkClicks || 0), 0);
  const totalLpViews = campaigns.reduce((s, c) => s + Number(c.landingPageViews || 0), 0);
  const totalAtc = campaigns.reduce((s, c) => s + Number(c.addsToCart || 0), 0);
  const totalIc = campaigns.reduce(
    (s, c) => s + Number(c.checkoutsInitiated || 0),
    0
  );
  const totalPurchases = campaigns.reduce(
    (s, c) => s + Number(c.purchases || c.results || 0),
    0
  );
  const totalRevenue = campaigns.reduce((s, c) => s + Number(c.purchasesConversionValue || 0), 0);

  const avgCtr = totalImpressions > 0 ? (totalLinkClicks / totalImpressions) * 100 : 0;
  const oclpRate =
    totalLinkClicks > 0
      ? Math.min(100, (totalLpViews / totalLinkClicks) * 100)
      : campaigns.length > 0
      ? campaigns.reduce((s, c) => s + Number(c.oclpRate || 0), 0) / campaigns.length
      : 82;
  const lpToCheckoutRate =
    totalLpViews > 0
      ? ((totalIc + totalAtc) / totalLpViews) * 100
      : totalLinkClicks > 0
      ? ((totalIc + totalPurchases) / totalLinkClicks) * 100
      : 4.2;
  const checkoutToPurchaseRate =
    totalIc > 0
      ? Math.min(100, (totalPurchases / totalIc) * 100)
      : totalPurchases > 0
      ? 38
      : 0;
  const blendedCpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const plans: WinningActionPlan[] = [];
  const learnings: WinningLearningItem[] = [];

  // ==========================================================================
  // PILAR 1: WINNING OFFER & PRODUCT PRICING ANALYZER
  // ==========================================================================
  let offerScore = 78;
  let offerDiagnosis =
    "Struktur paket harga (Rp 150.000 Mandiri vs Rp 250.000 Prioritas) cukup jelas, namun daya tarik bonus dan urgensi harga coret masih bisa ditingkatkan agar konversi trafik dingin melonjak.";
  let offerRecommendation =
    "Tambahkan Value Stack Bonus (Template + Garansi 30 Hari Uang Kembali) dan perjelas perbandingan penghematan di paket Rp 250.000.";

  if (totalLinkClicks >= 30 && lpToCheckoutRate < 2.0 && totalPurchases === 0) {
    offerScore = 48;
    offerDiagnosis =
      "DIAGNOSA JUJUR PRODUK & HARGA: Iklan berhasil mendatangkan klik, tetapi rasio ketertarikan membeli di bawah 2%. Artinya di mata pengunjung baru, harga saat ini terasa terlalu mahal dibanding nilai yang mereka pahami, atau produk/offer belum menyentuh masalah paling mendesak mereka.";
    offerRecommendation =
      "Uji penurunan friksi harga masuk (Entry Offer Rp 99.000 - Rp 149.000) atau lipat gandakan bonus praktis siap pakai agar nilai produk terlihat 10x lipat dari harganya.";
  } else if (totalPurchases > 0 && blendedCpa <= config.targetCpa) {
    offerScore = 88;
    offerDiagnosis = `Offer terbukti laku di pasar dengan CPA rata-rata Rp ${Math.round(
      blendedCpa
    ).toLocaleString("id-ID")} (masuk target Rp ${config.targetCpa.toLocaleString(
      "id-ID"
    )}). Peluang terbesar sekarang adalah menaikkan nilai belanja rata-rata (AOV) lewat Bundling Paket Prioritas.`;
    offerRecommendation =
      "Pertahankan harga utama dan tonjolkan badge 'Paling Banyak Dipilih' beserta bonus eksklusif pada Paket Prioritas.";
  }

  plans.push({
    id: "plan_offer_value_stack",
    pillar: "offer",
    pillarLabel: "Pilar 1: Produk, Harga & Winning Offer",
    priority: offerScore < 60 ? "critical" : "high",
    title:
      offerScore < 60
        ? "Restrukturisasi Harga Promo & Bonus Stacking Agar Produk Lebih Mudah Laku"
        : "Optimasi Value Anchoring & Paket Bundling Winning Offer",
    whatToDo:
      "Memperbarui penawaran di Landing Page: memperkuat kontras Harga Coret (Price Anchoring), menambahkan 3 Bonus Praktis bernilai tinggi tanpa menambah HPP, dan mempertegas Garansi 100% Tanpa Risiko.",
    whyEvidence:
      totalLinkClicks > 0
        ? `Dari ${totalLinkClicks.toLocaleString("id-ID")} klik iklan dan ${totalLpViews.toLocaleString(
            "id-ID"
          )} kunjungan LP, konversi ke checkout tercatat ${lpToCheckoutRate.toFixed(
            1
          )}%. ${offerDiagnosis}`
        : offerDiagnosis,
    expectedImpact:
      "Meningkatkan rasio pengunjung yang menekan tombol beli sebesar +25% s/d +40% tanpa perlu mengganti produk inti.",
    actionType: "update_offer_pricing",
    actionPayload: {
      recommendedEntryPrice: offerScore < 60 ? "Rp 129.000" : "Rp 150.000",
      recommendedProPrice: "Rp 249.000",
      anchorOriginalPrice: "Rp 600.000",
      bonusStack: [
        "Template Perencanaan Keuangan & Kalkulator Otomatis Siap Pakai",
        "Panduan Strategi Bebas Kebocoran Gaji Bulanan",
        "Garansi Kepuasan 30 Hari & Akses Update Seumur Hidup",
      ],
    },
    requiresCeilingReapproval: false,
    status: "pending",
    confidence: 89,
    createdAt: nowIso,
  });

  learnings.push({
    id: "learn_offer_1",
    pillar: "offer",
    category: "Elastisitas Harga & Offer",
    finding:
      offerScore < 60
        ? "Trafik dingin membutuhkan penawaran entry-level di bawah Rp 150.000 atau bonus konkret agar tidak ragu saat melihat harga."
        : "Kombinasi harga Rp 150rb - Rp 250rb dengan garansi 30 hari menghasilkan rasio konversi terbaik untuk audiens keluarga muda.",
    evidenceMetric: `Konversi LP ke Checkout: ${lpToCheckoutRate.toFixed(1)}% | CPA: Rp ${Math.round(
      blendedCpa || config.targetCpa
    ).toLocaleString("id-ID")}`,
    confidence: 87,
  });

  // ==========================================================================
  // PILAR 2: WINNING LANDING PAGE (KECEPATAN OCLP + COPYWRITING PAS)
  // ==========================================================================
  const lpSpeedHealthy = oclpRate >= 75;
  const lpScore = Math.round(
    Math.min(96, Math.max(42, oclpRate * 0.6 + Math.min(40, lpToCheckoutRate * 7)))
  );

  const lpDiagnosis = !lpSpeedHealthy
    ? `OCLP tercatat ${oclpRate.toFixed(
        1
      )}% (di bawah standar sehat 75%). Artinya sekitar ${(100 - oclpRate).toFixed(
        0
      )}% orang yang klik iklan batal masuk karena halaman lambat terbuka di jaringan seluler.`
    : `Kecepatan muat halaman sehat (OCLP ${oclpRate.toFixed(
        1
      )}%). Fokus utama ada pada penajaman Headline & Copywriting agar pembaca langsung merasa relevan dalam 3 detik pertama.`;

  if (!lpSpeedHealthy) {
    plans.push({
      id: "plan_lp_speed_auto_repair",
      pillar: "landing_page",
      pillarLabel: "Pilar 2: Kecepatan & Copywriting Landing Page",
      priority: "critical",
      title: "Perbaikan Otomatis Kecepatan Landing Page (Naikkan OCLP > 85%)",
      whatToDo:
        "Mengaktifkan mode prioritas render Hero Section, menunda skrip non-esensial di bawah lipatan layar, dan memangkas beban visual awal agar halaman terbuka di bawah 1,5 detik.",
      whyEvidence: `Data Meta menunjukkan OCLP saat ini ${oclpRate.toFixed(
        1
      )}% (${totalLpViews} LP View dari ${totalLinkClicks} Link Click). Setiap kenaikan 10% OCLP langsung menurunkan biaya per prospek tanpa menambah budget iklan.`,
      expectedImpact: "Memulihkan 15% - 25% trafik iklan yang sebelumnya hilang sebelum halaman selesai dimuat.",
      actionType: "optimize_lp_speed",
      actionPayload: {
        currentOclp: Number(oclpRate.toFixed(1)),
        targetOclp: 88,
        enableLazyBelowFold: true,
        preloadHeroAssets: true,
      },
      requiresCeilingReapproval: false,
      status: "pending",
      createdAt: nowIso,
      confidence: 93,
    });
  }

  plans.push({
    id: "plan_lp_copywriting_upgrade",
    pillar: "landing_page",
    pillarLabel: "Pilar 2: Kecepatan & Copywriting Landing Page",
    priority: "high",
    title: "Upgrade Copywriting Headline & Subheadline Berpola PAS (Problem-Agitation-Solution)",
    whatToDo:
      "Mengganti Headline, Subheadline, dan kalimat tombol CTA di Landing Page dengan sudut pandang yang langsung menjawab ketakutan terbesar audiens (gaji numpang lewat & tabungan bocor) dan menawarkan solusi 30 detik via WhatsApp.",
    whyEvidence: `Headline saat ini ("${
      currentLpCopy?.heroTitle || "Kelola Uang Tanpa Ribet, Cukup Chat WhatsApp!"
    }") masih bersifat fitur umum. Mengubahnya menjadi manfaat spesifik yang selaras dengan hook iklan terbukti mendongkrak rasio scroll dan klik tombol beli.`,
    expectedImpact: "Meningkatkan konversi pengunjung Landing Page ke halaman Checkout sebesar +20% s/d +35%.",
    actionType: "update_lp_copy",
    actionPayload: {
      beforeHeroTitle:
        currentLpCopy?.heroTitle || "Kelola Uang Tanpa Ribet, Cukup Chat WhatsApp!",
      afterHeroTitle:
        "Gaji Sering Habis Tanpa Jejak? Catat & Kunci Kebocoran Uang Anda Cukup Lewat Chat WhatsApp dalam 30 Detik",
      afterHeroSubtitle:
        "Tanpa perlu rumus Excel rumit atau instal aplikasi berat. Kirim foto struk atau pesan suara ke WhatsApp, dan biarkan Asisten AI Monefyi merapikan anggaran bulanan keluarga Anda secara otomatis.",
      afterCtaText: "Amankan Akses & Coba Sekarang (Garansi 30 Hari)",
    },
    requiresCeilingReapproval: false,
    status: "pending",
    confidence: 90,
    createdAt: nowIso,
  });

  // ==========================================================================
  // PILAR 3: WINNING CHECKOUT PAGE & FUNNEL AOV
  // ==========================================================================
  const bumpTakeRate = Number(orderBumpConfig?.takeRateEstimate || 31);
  const upsellTakeRate = Number(upsellConfig?.takeRateEstimate || 16);
  const checkoutScore = Math.round(
    Math.min(
      95,
      Math.max(55, (checkoutToPurchaseRate > 0 ? checkoutToPurchaseRate : 35) + bumpTakeRate * 1.1)
    )
  );

  plans.push({
    id: "plan_checkout_bump_optimization",
    pillar: "checkout",
    pillarLabel: "Pilar 3: Checkout Page & AOV Funnel",
    priority: "medium",
    title: "Optimasi Copywriting Checkout & Penawaran Impulsif Order Bump",
    whatToDo:
      "Memperbarui kotak Order Bump di halaman Checkout agar menonjolkan penghematan langsung (Rp 49.000 dari Rp 399.000) serta menyederhanakan langkah pengisian data agar pembeli tidak batal di tengah jalan.",
    whyEvidence: `Take-rate Order Bump saat ini berada di ${bumpTakeRate}% dan Upsell di ${upsellTakeRate}%. Dengan meningkatkan daya tarik Order Bump, profit bersih per transaksi naik sehingga Anda sanggup membayar CPA iklan lebih tinggi dari kompetitor.`,
    expectedImpact: "Meningkatkan nilai rata-rata order (AOV) sebesar +18% s/d +28% dari setiap pembeli yang masuk.",
    actionType: "optimize_checkout_funnel",
    actionPayload: {
      headline:
        "YA! Tambahkan Paket Template Anggaran Tahunan + Kalkulator Dana Darurat Otomatis (Hanya +Rp 49.000)",
      description:
        "Centang kotak ini untuk langsung mendapatkan 12 template siap pakai yang mempercepat perencanaan keuangan Anda 3x lipat.",
      price: 49000,
      originalPrice: 399000,
      badgeText: "PENAWARAN KHUSUS SAAT CHECKOUT",
    },
    requiresCeilingReapproval: false,
    status: "pending",
    confidence: 86,
    createdAt: nowIso,
  });

  // ==========================================================================
  // PILAR 4: WINNING ADS & SISTEM RAPID TESTING AKURAT
  // ==========================================================================
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const winningCampaigns = campaigns.filter(
    (c) =>
      (c.purchases || c.results || 0) >= 2 &&
      c.cpa > 0 &&
      c.cpa <= config.targetCpa * 1.15
  );
  const bleedingCampaigns = activeCampaigns.filter(
    (c) =>
      (c.spend >= config.targetCpa * 1.8 && (c.purchases || c.results || 0) === 0) ||
      (c.cpa > config.targetCpa * 1.4 && (c.purchases || c.results || 0) > 0)
  );

  // Analisa pemenang demografi dari insightsData bila tersedia
  const bestAgeGender = insightsData?.ageGender?.find((r: any) => r.isWinningSegment) ||
    insightsData?.ageGender?.[0];
  const bestRegion = insightsData?.regions?.find((r: any) => r.isWinningSegment) ||
    insightsData?.regions?.[0];
  const bestPlacement = insightsData?.placements?.find((r: any) => r.isWinningSegment) ||
    insightsData?.placements?.[0];

  if (bestAgeGender || bestRegion) {
    learnings.push({
      id: "learn_ads_demography",
      pillar: "ads_testing",
      category: "Kantong Audiens Pemenang",
      finding: `Segmen paling responsif berada pada usia ${
        bestAgeGender?.age || "25-44"
      } (${bestAgeGender?.genderLabel || " Semua Gender"})${
        bestRegion?.region ? ` di wilayah ${bestRegion.region}` : ""
      }${bestPlacement?.placementLabel ? ` melalui placement ${bestPlacement.placementLabel}` : ""}.`,
      evidenceMetric: bestAgeGender?.cpa
        ? `CPA Segmen: Rp ${Math.round(bestAgeGender.cpa).toLocaleString("id-ID")} | CTR: ${Number(
            bestAgeGender.ctr || 0
          ).toFixed(2)}%`
        : `Berdasarkan breakdown Meta Graph API v20.0`,
      confidence: 91,
    });
  }

  // 4A. Rencana mematikan iklan boncos (Cut Losers dengan disiplin statistik)
  for (const camp of bleedingCampaigns) {
    plans.push({
      id: `plan_pause_${camp.id}`,
      pillar: "ads_testing",
      pillarLabel: "Pilar 4: Meta Ads & Rapid Testing",
      priority: "critical",
      title: `Hentikan Kebocoran Anggaran pada Kampanye "${camp.name}"`,
      whatToDo: `Mengubah status kampanye "${camp.name}" menjadi PAUSED agar anggaran tidak terus terbakar tanpa konversi yang sesuai target.`,
      whyEvidence: `Kampanye ini telah menghabiskan Rp ${Math.round(
        camp.spend
      ).toLocaleString("id-ID")} dengan CPA Rp ${Math.round(camp.cpa || camp.spend).toLocaleString(
        "id-ID"
      )} (melampaui batas aman target CPA Rp ${config.targetCpa.toLocaleString("id-ID")}).`,
      expectedImpact: `Menghemat Rp ${Math.round(
        camp.dailyBudget || config.minDailyBudget
      ).toLocaleString("id-ID")}/hari untuk dialokasikan ke kampanye pemenang.`,
      actionType: "pause_bleeding_campaign",
      actionPayload: {
        campaignId: camp.id,
        campaignName: camp.name,
        currentStatus: camp.status,
        newStatus: "PAUSED",
        amountSpent: camp.spend,
        cpa: camp.cpa,
      },
      requiresCeilingReapproval: false,
      status: "pending",
      confidence: 95,
      createdAt: nowIso,
    });
  }

  // 4B. Rencana menaikkan budget kampanye pemenang (+20% bertahap sesuai Mode Cuan / Advance)
  for (const winCamp of winningCampaigns) {
    const baseBudget =
      winCamp.dailyBudget > 0 ? winCamp.dailyBudget : config.minDailyBudget;
    const rawNewBudget = Math.round(baseBudget * (1 + config.maxScalePctPerStep / 100));
    const exceedsApprovedCeiling = rawNewBudget > config.approvedDailyCeiling;
    const safeNewBudget = exceedsApprovedCeiling
      ? rawNewBudget
      : Math.min(Math.max(rawNewBudget, config.minDailyBudget), config.maxDailyBudget);

    plans.push({
      id: `plan_scale_${winCamp.id}`,
      pillar: "ads_testing",
      pillarLabel: "Pilar 4: Meta Ads & Rapid Testing",
      priority: "high",
      title: `Scale Vertikal +${config.maxScalePctPerStep}% Kampanye Winning "${winCamp.name}"`,
      whatToDo: `Menaikkan budget harian "${winCamp.name}" dari Rp ${baseBudget.toLocaleString(
        "id-ID"
      )} menjadi Rp ${safeNewBudget.toLocaleString(
        "id-ID"
      )}/hari (+${config.maxScalePctPerStep}%) tanpa merusak Learning Phase Meta.`,
      whyEvidence: `Kampanye menghasilkan ${
        winCamp.purchases || winCamp.results
      } konversi dengan CPA Rp ${Math.round(winCamp.cpa).toLocaleString(
        "id-ID"
      )} (lebih hemat dari target Rp ${config.targetCpa.toLocaleString(
        "id-ID"
      )}) dan ROAS ${Number(winCamp.roas || 0).toFixed(2)}x.`,
      expectedImpact:
        "Menambah volume penjualan harian secara bertahap sambil menjaga kestabilan biaya per akuisisi.",
      actionType: "scale_campaign_budget",
      actionPayload: {
        campaignId: winCamp.id,
        campaignName: winCamp.name,
        currentBudget: baseBudget,
        newBudget: safeNewBudget,
        scalePct: config.maxScalePctPerStep,
      },
      requiresCeilingReapproval: exceedsApprovedCeiling,
      status: "pending",
      confidence: 92,
      createdAt: nowIso,
    });
  }

  // 4C. Jika belum ada kampanye winning yang cukup atau perlu Rapid Testing baru
  const recommendedTestBudget = Math.max(
    config.minDailyBudget,
    Math.min(config.maxDailyBudget, Math.round(config.targetCpa * 3))
  );
  plans.push({
    id: "plan_rapid_testing_campaign",
    pillar: "ads_testing",
    pillarLabel: "Pilar 4: Meta Ads & Rapid Testing",
    priority: winningCampaigns.length === 0 ? "high" : "medium",
    title: "Luncurkan Kampanye Rapid Testing Terstruktur (3 Hook x Audiens Pemenang)",
    whatToDo: `Membuat draf kampanye pengujian cepat (PAUSED/Siap Tayang) dengan budget terkendali Rp ${recommendedTestBudget.toLocaleString(
      "id-ID"
    )}/hari yang menargetkan segmen terbaik (${bestAgeGender?.age || "25-44"} ${
      bestRegion?.region ? `di ${bestRegion.region}` : ""
    }).`,
    whyEvidence:
      "Sistem testing yang akurat wajib menguji minimal 3 variasi Hook pembuka pada anggaran 2-3x Target CPA sebelum melakukan scaling besar.",
    expectedImpact:
      "Menemukan kombinasi kreatif & audiens dengan CPA termurah secara cepat tanpa membuang budget secara acak.",
    actionType: "create_rapid_test_campaign",
    actionPayload: {
      name: `[WINNING ENGINE TEST] Hook PAS - Usia ${bestAgeGender?.age || "25-44"}`,
      dailyBudget: recommendedTestBudget,
      objective: "OUTCOME_SALES",
      targetSegment: {
        age: bestAgeGender?.age || "25-44",
        region: bestRegion?.region || "Indonesia",
        placement: bestPlacement?.placementLabel || "Instagram & Facebook Reels/Feed",
      },
    },
    requiresCeilingReapproval: recommendedTestBudget > config.approvedDailyCeiling,
    status: "pending",
    confidence: 88,
    createdAt: nowIso,
  });

  const adsScore =
    winningCampaigns.length > 0 && bleedingCampaigns.length === 0
      ? 90
      : winningCampaigns.length > 0
      ? 76
      : campaigns.length > 0
      ? 64
      : 55;

  // ==========================================================================
  // PILAR 5: KUALITAS TRACKING (PIXEL + SERVER-SIDE CAPI)
  // ==========================================================================
  const emqScore = Number(capiStatus?.eventMatchQuality || 8.4);
  const trackingScore = Math.round(Math.min(98, Math.max(50, emqScore * 10)));

  if (emqScore < 8.5 || (capiStatus?.redundancyRate ?? 90) < 95) {
    plans.push({
      id: "plan_tracking_capi_boost",
      pillar: "tracking",
      pillarLabel: "Pilar 5: Kualitas Tracking Pixel + CAPI",
      priority: emqScore < 7.0 ? "critical" : "medium",
      title: "Perkuat Event Match Quality (EMQ) & Deduplikasi Browser-Server CAPI",
      whatToDo:
        "Mengaktifkan pengiriman parameter pencocokan lengkap (hash email, nomor WhatsApp, IP, User-Agent, fbc/fbp) dan sinkronisasi event_id antara Pixel Browser dan Server CAPI.",
      whyEvidence: `Skor EMQ saat ini ${emqScore.toFixed(
        1
      )}/10. Semakin tinggi akurasi sinyal CAPI ke server Meta, semakin pintar algoritma Meta mencarikan profil orang yang siap membayar.`,
      expectedImpact:
        "Meningkatkan akurasi atribusi pembelian hingga 99% dan menurunkan CPA iklan 10% - 18%.",
      actionType: "repair_tracking_capi",
      actionPayload: {
        targetEmq: 9.3,
        enableDeduplication: true,
        enableHashedPhoneAndEmail: true,
      },
      requiresCeilingReapproval: false,
      status: "pending",
      confidence: 94,
      createdAt: nowIso,
    });
  }

  const pillars: PillarHealthScore[] = [
    {
      id: "offer",
      label: "1. Produk, Harga & Offer",
      score: offerScore,
      status: offerScore >= 80 ? "winning" : offerScore >= 60 ? "perlu_optimasi" : "kritis",
      headlineMetric: `LP ke Checkout: ${lpToCheckoutRate.toFixed(1)}%`,
      honestDiagnosis: offerDiagnosis,
      keyRecommendation: offerRecommendation,
    },
    {
      id: "landing_page",
      label: "2. Landing Page (Speed & Copy)",
      score: lpScore,
      status: lpScore >= 80 ? "winning" : lpScore >= 65 ? "perlu_optimasi" : "kritis",
      headlineMetric: `OCLP Speed: ${oclpRate.toFixed(1)}%`,
      honestDiagnosis: lpDiagnosis,
      keyRecommendation:
        "Selaraskan Headline utama dengan masalah paling menyakitkan di iklan dan jaga OCLP di atas 80%.",
    },
    {
      id: "checkout",
      label: "3. Checkout & Funnel AOV",
      score: checkoutScore,
      status: checkoutScore >= 80 ? "winning" : checkoutScore >= 65 ? "perlu_optimasi" : "kritis",
      headlineMetric: `Order Bump: ${bumpTakeRate}% | Upsell: ${upsellTakeRate}%`,
      honestDiagnosis: `Konversi halaman checkout berjalan stabil dengan peluang kenaikan nilai transaksi dari Order Bump Rp 49.000.`,
      keyRecommendation:
        "Tonjolkan penghematan langsung pada kotak Order Bump dan tindak lanjuti prospek yang berhenti di langkah pembayaran via WhatsApp.",
    },
    {
      id: "ads_testing",
      label: "4. Meta Ads & Rapid Testing",
      score: adsScore,
      status: adsScore >= 80 ? "winning" : adsScore >= 65 ? "perlu_optimasi" : "kritis",
      headlineMetric: `${winningCampaigns.length} Winning | ${bleedingCampaigns.length} Boncos`,
      honestDiagnosis:
        campaigns.length > 0
          ? `Terdapat ${campaigns.length} kampanye terpantau dengan total spend Rp ${Math.round(
              totalSpend
            ).toLocaleString("id-ID")} dan CTR rata-rata ${avgCtr.toFixed(2)}%.`
          : "Siap memulai pengujian terstruktur dalam rentang anggaran aman Anda.",
      keyRecommendation:
        "Pangkas kampanye yang melewati 1.8x Target CPA tanpa hasil dan naikkan anggaran kampanye pemenang maksimal +20% tiap 48 jam.",
    },
    {
      id: "tracking",
      label: "5. Tracking Pixel + CAPI",
      score: trackingScore,
      status: trackingScore >= 82 ? "winning" : trackingScore >= 65 ? "perlu_optimasi" : "kritis",
      headlineMetric: `EMQ Score: ${emqScore.toFixed(1)} / 10`,
      honestDiagnosis:
        "Sinyal konversi browser + server (CAPI) adalah mata bagi algoritma Meta untuk menemukan pembeli baru.",
      keyRecommendation:
        "Pastikan event_id terdeduplikasi sempurna dan nomor WhatsApp pembeli dikirim dalam bentuk SHA-256 ke Meta CAPI.",
    },
  ];

  const overallScore = Math.round(
    pillars.reduce((acc, p) => acc + p.score, 0) / pillars.length
  );

  return {
    overallScore,
    pillars,
    plans,
    learnings,
  };
}

