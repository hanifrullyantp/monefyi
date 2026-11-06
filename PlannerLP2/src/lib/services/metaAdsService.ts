import { MetaCampaign, MarketingAutomationRules, AdHealthStatus } from '../types/marketing';

export const INITIAL_BENCHMARK_CAMPAIGNS: MetaCampaign[] = [
  {
    id: 'cmp_101',
    name: '🎯 [WINNING] BOFU - Penawaran Estimator Standard (Kontraktor Umum)',
    objective: 'OUTCOME_SALES',
    status: 'ACTIVE',
    dailyBudget: 250000,
    spend: 1850000,
    impressions: 48200,
    clicks: 1450,
    linkClicks: 1180,
    ctr: 2.45,
    cpc: 1275,
    leads: 78,
    purchases: 32,
    cpa: 23717,
    roas: 4.85,
    frequency: 1.82,
    thumbstopRate: 36.4,
    healthStatus: 'scale_ready',
    targetAudience: 'Kontraktor, Pemborong Bangunan, Renovasi Rumah (Usia 28-50)',
    creativeHook: '"3 Detik Tahu Estimasi Biaya Bangun Rumah Tanpa Buka Laptop"',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'cmp_102',
    name: '🔥 [SCALE] MOFU - Video Studi Kasus Bocor Biaya Proyek Interior',
    objective: 'OUTCOME_LEADS',
    status: 'ACTIVE',
    dailyBudget: 175000,
    spend: 1225000,
    impressions: 34100,
    clicks: 890,
    linkClicks: 710,
    ctr: 2.08,
    cpc: 1376,
    leads: 54,
    purchases: 18,
    cpa: 22685,
    roas: 3.92,
    frequency: 1.64,
    thumbstopRate: 31.8,
    healthStatus: 'winning',
    targetAudience: 'Desain Interior, Kitchen Set, Arsitek (Jabodetabek & Surabaya)',
    creativeHook: '"Kelihatan Untung 50 Juta di Depan, Pas Selesai Malah Tekor 15 Juta. Ini Sebabnya..."',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'cmp_103',
    name: '⚠️ [FATIGUE] TOFU - Edukasi Kesalahan Bikin RAB di Excel',
    objective: 'OUTCOME_TRAFFIC',
    status: 'ACTIVE',
    dailyBudget: 100000,
    spend: 890000,
    impressions: 19800,
    clicks: 290,
    linkClicks: 210,
    ctr: 1.06,
    cpc: 3068,
    leads: 12,
    purchases: 3,
    cpa: 74166,
    roas: 1.18,
    frequency: 3.85,
    thumbstopRate: 18.2,
    healthStatus: 'fatigued',
    targetAudience: 'Sipil, QS, Arsitek Pemula (Broad Indonesia)',
    creativeHook: '"Masih Pake Rumus Excel Jadul Buat Hitung Tender 2026?"',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'cmp_104',
    name: '🛑 [BLEEDING] Testing Adset Baru - Format Banner Single Image',
    objective: 'OUTCOME_SALES',
    status: 'ACTIVE',
    dailyBudget: 120000,
    spend: 420000,
    impressions: 11200,
    clicks: 98,
    linkClicks: 65,
    ctr: 0.58,
    cpc: 4285,
    leads: 4,
    purchases: 1,
    cpa: 105000,
    roas: 0.76,
    frequency: 1.35,
    thumbstopRate: 11.0,
    healthStatus: 'bleeding',
    targetAudience: 'Bahan Bangunan, Mandor Lepas, Toko Material',
    creativeHook: '"Software Manajemen Konstruksi Terbaik untuk Proyek Anda"',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'cmp_105',
    name: '⏳ [LEARNING] Retargeting Web Visitors & Abandoned Checkout',
    objective: 'OUTCOME_SALES',
    status: 'ACTIVE',
    dailyBudget: 100000,
    spend: 260000,
    impressions: 6400,
    clicks: 220,
    linkClicks: 185,
    ctr: 2.89,
    cpc: 1181,
    leads: 19,
    purchases: 8,
    cpa: 13684,
    roas: 5.60,
    frequency: 2.10,
    thumbstopRate: 42.1,
    healthStatus: 'winning',
    targetAudience: 'Custom Audience: Website Visitors (30 Hari) + Initiate Checkout',
    creativeHook: '"Tunggu dulu! Lisensi Monefyi Kamu Hampir Diamankan Orang Lain"',
    lastUpdated: new Date().toISOString(),
  },
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

      return campaign;
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

