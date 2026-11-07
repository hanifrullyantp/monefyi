import { MetaCampaign, MarketingAutomationRules, AdHealthStatus } from '../types/marketing';

export function enrichCampaignWithScaleMetrics(raw: Partial<MetaCampaign> & { id: string; name: string }): MetaCampaign {
  const spend = raw.spend || 0;
  const impressions = raw.impressions || 1;
  const clicks = raw.clicks || 0;
  const linkClicks = raw.linkClicks || Math.round(clicks * 0.8);
  const reach = raw.reach || Math.round(impressions * 0.72);
  const purchases = raw.purchases || 0;
  const leads = raw.leads || 0;
  const results = raw.results ?? (raw.objective === 'OUTCOME_LEADS' ? leads : purchases);
  const purchasesConversionValue = raw.purchasesConversionValue ?? Math.round(purchases * 299000);

  // Funnel Scale Stages
  const landingPageViews = raw.landingPageViews ?? Math.round(linkClicks * 0.82);
  const addsToCart = raw.addsToCart ?? Math.round(landingPageViews * 0.28);
  const checkoutsInitiated = raw.checkoutsInitiated ?? Math.round(addsToCart * 0.55);

  // Costs
  const costPerResult = results > 0 ? Math.round(spend / results) : 0;
  const costPerLpView = landingPageViews > 0 ? Math.round(spend / landingPageViews) : 0;
  const costPerAddToCart = addsToCart > 0 ? Math.round(spend / addsToCart) : 0;
  const costPerCheckoutInitiated = checkoutsInitiated > 0 ? Math.round(spend / checkoutsInitiated) : 0;
  const costPerPurchase = purchases > 0 ? Math.round(spend / purchases) : 0;

  // Rates
  const oclpRate = linkClicks > 0 ? Number(((landingPageViews / linkClicks) * 100).toFixed(1)) : 0;
  const lpToAtcRate = landingPageViews > 0 ? Number(((addsToCart / landingPageViews) * 100).toFixed(1)) : 0;
  const atcToIcRate = addsToCart > 0 ? Number(((checkoutsInitiated / addsToCart) * 100).toFixed(1)) : 0;
  const icToPurchaseRate = checkoutsInitiated > 0 ? Number(((purchases / checkoutsInitiated) * 100).toFixed(1)) : 0;

  // Media Buying Efficiency
  const cpm = Math.round((spend / impressions) * 1000);
  const ctrLink = Number(((linkClicks / impressions) * 100).toFixed(2));
  const ctrAll = Number(((clicks / impressions) * 100).toFixed(2));
  const cpcLink = linkClicks > 0 ? Math.round(spend / linkClicks) : 0;
  const cpcAll = clicks > 0 ? Math.round(spend / clicks) : 0;
  const videoThruPlays15s = raw.videoThruPlays15s ?? Math.round(impressions * 0.24);

  return {
    ...raw,
    objective: raw.objective || 'OUTCOME_SALES',
    status: raw.status || 'ACTIVE',
    dailyBudget: raw.dailyBudget || 150000,
    spend,
    impressions,
    clicks,
    linkClicks,
    reach,
    ctr: ctrLink,
    cpc: cpcLink,
    leads,
    purchases,
    results,
    purchasesConversionValue,
    costPerResult,
    cpa: costPerPurchase || costPerResult,
    roas: raw.roas || (spend > 0 ? Number((purchasesConversionValue / spend).toFixed(2)) : 0),
    frequency: raw.frequency || Number((impressions / reach).toFixed(2)),
    thumbstopRate: raw.thumbstopRate || 28.5,
    healthStatus: raw.healthStatus || 'review',
    targetAudience: raw.targetAudience || 'Umum',
    creativeHook: raw.creativeHook || '',
    lastUpdated: raw.lastUpdated || new Date().toISOString(),
    landingPageViews,
    addsToCart,
    checkoutsInitiated,
    costPerLpView,
    costPerAddToCart,
    costPerCheckoutInitiated,
    costPerPurchase,
    oclpRate,
    lpToAtcRate,
    atcToIcRate,
    icToPurchaseRate,
    cpm,
    ctrLink,
    ctrAll,
    cpcLink,
    cpcAll,
    videoThruPlays15s,
  };
}

export const INITIAL_BENCHMARK_CAMPAIGNS: MetaCampaign[] = [
  enrichCampaignWithScaleMetrics({
    id: 'cmp_101',
    name: '[WINNING] BOFU - Penawaran Estimator Standard (Kontraktor Umum)',
    objective: 'OUTCOME_SALES',
    status: 'ACTIVE',
    dailyBudget: 250000,
    spend: 1850000,
    impressions: 48200,
    clicks: 1450,
    linkClicks: 1180,
    reach: 36200,
    landingPageViews: 990,
    addsToCart: 310,
    checkoutsInitiated: 145,
    purchases: 32,
    leads: 78,
    purchasesConversionValue: 9568000,
    healthStatus: 'scale_ready',
    targetAudience: 'Kontraktor, Pemborong Bangunan, Renovasi Rumah (Usia 28-50)',
    creativeHook: '3 Detik Tahu Estimasi Biaya Bangun Rumah Tanpa Buka Laptop',
    videoThruPlays15s: 14200,
    thumbstopRate: 36.4,
  }),
  enrichCampaignWithScaleMetrics({
    id: 'cmp_102',
    name: '[SCALE] MOFU - Video Studi Kasus Bocor Biaya Proyek Interior',
    objective: 'OUTCOME_LEADS',
    status: 'ACTIVE',
    dailyBudget: 175000,
    spend: 1225000,
    impressions: 34100,
    clicks: 890,
    linkClicks: 710,
    reach: 24800,
    landingPageViews: 590,
    addsToCart: 185,
    checkoutsInitiated: 88,
    purchases: 18,
    leads: 54,
    purchasesConversionValue: 5382000,
    healthStatus: 'winning',
    targetAudience: 'Desain Interior, Kitchen Set, Arsitek (Jabodetabek & Surabaya)',
    creativeHook: 'Kelihatan Untung 50 Juta di Depan, Pas Selesai Malah Tekor 15 Juta. Ini Sebabnya...',
    videoThruPlays15s: 9800,
    thumbstopRate: 31.8,
  }),
  enrichCampaignWithScaleMetrics({
    id: 'cmp_103',
    name: '[FATIGUE] TOFU - Edukasi Kesalahan Bikin RAB di Excel',
    objective: 'OUTCOME_TRAFFIC',
    status: 'ACTIVE',
    dailyBudget: 100000,
    spend: 890000,
    impressions: 19800,
    clicks: 290,
    linkClicks: 210,
    reach: 7200,
    landingPageViews: 140,
    addsToCart: 32,
    checkoutsInitiated: 11,
    purchases: 3,
    leads: 12,
    purchasesConversionValue: 897000,
    healthStatus: 'fatigued',
    targetAudience: 'Sipil, QS, Arsitek Pemula (Broad Indonesia)',
    creativeHook: 'Masih Pake Rumus Excel Jadul Buat Hitung Tender 2026?',
    videoThruPlays15s: 3100,
    thumbstopRate: 18.2,
  }),
  enrichCampaignWithScaleMetrics({
    id: 'cmp_104',
    name: '[BLEEDING] Testing Adset Baru - Format Banner Single Image',
    objective: 'OUTCOME_SALES',
    status: 'ACTIVE',
    dailyBudget: 120000,
    spend: 420000,
    impressions: 11200,
    clicks: 98,
    linkClicks: 65,
    reach: 8900,
    landingPageViews: 38,
    addsToCart: 7,
    checkoutsInitiated: 2,
    purchases: 1,
    leads: 4,
    purchasesConversionValue: 299000,
    healthStatus: 'bleeding',
    targetAudience: 'Bahan Bangunan, Mandor Lepas, Toko Material',
    creativeHook: 'Software Manajemen Konstruksi Terbaik untuk Proyek Anda',
    videoThruPlays15s: 850,
    thumbstopRate: 11.0,
  }),
  enrichCampaignWithScaleMetrics({
    id: 'cmp_105',
    name: '[LEARNING] Retargeting Web Visitors & Abandoned Checkout',
    objective: 'OUTCOME_SALES',
    status: 'ACTIVE',
    dailyBudget: 100000,
    spend: 260000,
    impressions: 6400,
    clicks: 220,
    linkClicks: 185,
    reach: 4800,
    landingPageViews: 160,
    addsToCart: 62,
    checkoutsInitiated: 34,
    purchases: 8,
    leads: 19,
    purchasesConversionValue: 2392000,
    healthStatus: 'learning',
    targetAudience: 'Custom Audience: Website Visitors (30 Hari) + Initiate Checkout',
    creativeHook: 'Tunggu dulu! Lisensi Monefyi Kamu Hampir Diamankan Orang Lain',
    videoThruPlays15s: 2200,
    thumbstopRate: 27.5,
  }),
];

export function evaluateCampaignHealth(
  campaign: MetaCampaign,
  rules: MarketingAutomationRules
): AdHealthStatus {
  // If frequency is too high, creative is fatigued
  if (campaign.frequency >= rules.frequencyFatigueThreshold) {
    return 'fatigued';
  }

  // If spend is significant and CPA is too high, it's bleeding
  if (campaign.spend > campaign.dailyBudget * 1.5 && campaign.cpa > rules.maxCpaThreshold) {
    return 'bleeding';
  }

  // If ROAS exceeds threshold and CPA is healthy, scale ready
  if (campaign.roas >= rules.minRoasScaleThreshold && campaign.cpa <= rules.maxCpaThreshold * 0.7) {
    return 'scale_ready';
  }

  // Good winning campaign
  if (campaign.roas >= 2.5 && campaign.ctr >= 1.5) {
    return 'winning';
  }

  if (campaign.spend < campaign.dailyBudget * 0.8) {
    return 'learning';
  }

  return 'review';
}

export async function fetchMetaCampaigns(
  accessToken?: string,
  adAccountId?: string
): Promise<MetaCampaign[]> {
  const token = accessToken?.trim();
  const accountId = adAccountId?.trim();

  // If no live credentials provided, return benchmark sandbox campaigns
  if (!token || !accountId) {
    return INITIAL_BENCHMARK_CAMPAIGNS;
  }

  try {
    const formattedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const url = `https://graph.facebook.com/v20.0/${formattedId}/campaigns?fields=id,name,objective,status,daily_budget,insights{spend,impressions,clicks,cpc,ctr,actions,purchase_roas,frequency}&access_token=${token}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('Meta API call failed, fallback to sandbox', await res.text());
      return INITIAL_BENCHMARK_CAMPAIGNS;
    }

    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) {
      return INITIAL_BENCHMARK_CAMPAIGNS;
    }

    return data.data.map((item: any, idx: number) => {
      const insights = item.insights?.data?.[0] || {};
      const spend = Number(insights.spend || 0);
      const impressions = Number(insights.impressions || 1);
      const clicks = Number(insights.clicks || 0);
      const ctr = Number(insights.ctr || (clicks / impressions) * 100);
      const cpc = Number(insights.cpc || (clicks > 0 ? spend / clicks : 0));
      
      const purchaseAction = (insights.actions || []).find((a: any) => a.action_type === 'purchase');
      const purchases = Number(purchaseAction?.value || 0);
      const cpa = purchases > 0 ? Math.round(spend / purchases) : spend;
      const roasData = insights.purchase_roas?.[0]?.value || 0;
      const roas = Number(roasData) || (spend > 0 && purchases > 0 ? (purchases * 299000) / spend : 0);

      const campaign: MetaCampaign = {
        id: item.id,
        name: item.name,
        objective: item.objective || 'OUTCOME_SALES',
        status: item.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
        dailyBudget: Number(item.daily_budget || 200000),
        spend,
        impressions,
        clicks,
        linkClicks: Math.round(clicks * 0.8),
        ctr: Number(ctr.toFixed(2)),
        cpc: Math.round(cpc),
        leads: Math.round(purchases * 2.2),
        purchases,
        cpa: Math.round(cpa),
        roas: Number(Number(roas).toFixed(2)),
        frequency: Number(Number(insights.frequency || 1.4).toFixed(2)),
        thumbstopRate: 28.5,
        healthStatus: 'winning',
        targetAudience: 'Live Meta Audience Target',
        creativeHook: 'Direct from Meta Ads Manager',
        lastUpdated: new Date().toISOString(),
      };

      campaign.healthStatus = evaluateCampaignHealth(campaign, {
        autoKillBleeding: true,
        maxCpaThreshold: 50000,
        autoScaleWinning: true,
        minRoasScaleThreshold: 3.0,
        scaleBudgetPercentage: 20,
        frequencyFatigueThreshold: 3.5,
        requireApproval: false,
      });

      return enrichCampaignWithScaleMetrics(campaign);
    });
  } catch (err) {
    console.error('Error fetching live Meta API:', err);
    return INITIAL_BENCHMARK_CAMPAIGNS;
  }
}

export async function updateRemoteCampaignStatus(
  campaignId: string,
  newStatus: 'ACTIVE' | 'PAUSED',
  accessToken?: string
): Promise<boolean> {
  if (!accessToken?.trim()) return true; // Simulated success in sandbox
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${campaignId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        access_token: accessToken,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function updateRemoteCampaignBudget(
  campaignId: string,
  newDailyBudget: number,
  accessToken?: string
): Promise<boolean> {
  if (!accessToken?.trim()) return true; // Simulated success in sandbox
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${campaignId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daily_budget: Math.round(newDailyBudget),
        access_token: accessToken,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

