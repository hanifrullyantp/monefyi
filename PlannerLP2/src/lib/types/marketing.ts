export type MarketingAgentRole = 'cmo' | 'media_buyer' | 'copywriter' | 'funnel_aov';

export interface AgentCustomNames {
  cmo: string;
  media_buyer: string;
  copywriter: string;
  funnel_aov: string;
  cs: string;
}

export const DEFAULT_AGENT_CUSTOM_NAMES: AgentCustomNames = {
  cmo: 'Mas Danu',
  media_buyer: 'Bima',
  copywriter: 'Sinta',
  funnel_aov: 'Aris',
  cs: 'Mbak Esti',
};

export interface AgentInfo {
  role: MarketingAgentRole;
  name: string;
  title: string;
  badge: string;
  specialty: string;
  badgeColor: string;
}

export const MARKETING_AGENTS: Record<MarketingAgentRole, AgentInfo> = {
  cmo: {
    role: 'cmo',
    name: 'Mas Danu',
    title: 'Chief Marketing Officer',
    badge: 'CMO',
    specialty: 'Strategi Kampanye, Funneling & Alokasi Budget',
    badgeColor: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  media_buyer: {
    role: 'media_buyer',
    name: 'Bima',
    title: 'Meta Ads Media Buyer',
    badge: 'MEDIA BUYER',
    specialty: 'Membaca Metrik, Diagnosa Boncos & Pengendali Iklan',
    badgeColor: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  copywriter: {
    role: 'copywriter',
    name: 'Sinta',
    title: 'Creative & Copywriter Strategist',
    badge: 'COPYWRITER',
    specialty: 'Winning Hook 3-Detik, Copy PAS/HSO & Script UGC',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  funnel_aov: {
    role: 'funnel_aov',
    name: 'Aris',
    title: 'Funnel & AOV Specialist (Scale Model)',
    badge: 'FUNNEL & AOV',
    specialty: 'Order Bump, OTO Upsell, CAPI & Recovery Abandoned',
    badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
};

export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type AdHealthStatus = 'winning' | 'scale_ready' | 'learning' | 'review' | 'bleeding' | 'fatigued';

export interface MetaAd {
  id: string;
  name: string;
  adsetId: string;
  campaignId: string;
  status: string;
  effectiveStatus?: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  results: number;
  cpa: number;
  roas: number;
  ctr: number;
  cpc: number;
  creativeThumbnail?: string;
  creativeTitle?: string;
  creativeBody?: string;
}

export interface MetaAdSet {
  id: string;
  name: string;
  campaignId: string;
  status: string;
  effectiveStatus?: string;
  dailyBudget: number;
  lifetimeBudget: number;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  results: number;
  cpa: number;
  roas: number;
  ctr: number;
  cpc: number;
  ads?: MetaAd[];
}

export interface MetaCampaign {
  id: string;
  name: string;
  objective: 'OUTCOME_LEADS' | 'OUTCOME_SALES' | 'OUTCOME_TRAFFIC';
  status: CampaignStatus;
  deliveryStatus?: string; // e.g. "Active", "In Review", "Learning", "Off"
  dailyBudget: number; // in IDR
  spend: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
  ctr: number; // percentage, e.g. 2.4
  cpc: number; // IDR
  leads: number;
  purchases: number;
  cpa: number; // Cost Per Action / Purchase / Lead (IDR)
  roas: number; // e.g. 3.4
  frequency: number; // e.g. 1.8
  thumbstopRate: number; // 3-second video hook rate (%)
  healthStatus: AdHealthStatus;
  targetAudience: string;
  creativeHook: string;
  lastUpdated: string;
  adsets?: MetaAdSet[];

  // 26 Metrik Standar Agency & Scale Model
  results?: number;
  purchasesConversionValue?: number; // Nilai konversi penjualan (Rp)
  costPerResult?: number; // Cost per Result (Rp)
  reach?: number; // Unique reach accounts
  landingPageViews?: number; // Website landing page views
  addsToCart?: number; // Adds to cart count
  checkoutsInitiated?: number; // Checkouts initiated count
  costPerLpView?: number; // Cost per landing page view (Rp)
  costPerAddToCart?: number; // Cost per add to cart (Rp)
  costPerCheckoutInitiated?: number; // Cost per checkout initiated (Rp)
  costPerPurchase?: number; // Cost per purchase (Rp)
  
  // 4 Rasio Funnel Scale Model
  oclpRate?: number; // 1. OCLP (Link Click ke Landing Page View %)
  lpToAtcRate?: number; // 2. LP-ATC (Landing Page ke Add to Cart %)
  atcToIcRate?: number; // 3. ATC-IC (Add to Cart ke Initiate Checkout %)
  icToPurchaseRate?: number; // 4. IC-Purchase (Initiate Checkout ke Purchase %)

  // Metrik Efisiensi Media Buying
  cpm?: number; // CPM (Cost per 1,000 impressions)
  ctrLink?: number; // CTR (Link click-through rate %)
  ctrAll?: number; // CTR (All clicks %)
  cpcLink?: number; // CPC (Cost per link click Rp)
  cpcAll?: number; // CPC (Cost per all clicks Rp)
  videoThruPlays15s?: number; // 15-second ThruPlays count
}

export interface WinningAdTemplate {
  id: string;
  title: string;
  targetNiche: 'kontraktor_umum' | 'interior_kitchen' | 'arsitek_desain' | 'subkon_sipil';
  angle: 'takut_rugi_proyek' | 'efisiensi_rab_cepat' | 'kalah_tender' | 'standar_profesional';
  format: 'reels_ugc_9_16' | 'feed_carousel_1_1' | 'single_image_banner';
  hooks: string[];
  primaryTexts: {
    framework: 'PAS' | 'HSO' | 'BAB';
    text: string;
  }[];
  headlines: string[];
  ctaText: string;
  videoScript?: {
    durationSec: number;
    visualBeats: {
      time: string;
      visual: string;
      voiceover: string;
      onScreenText: string;
    }[];
  };
  metricsEstimate: {
    expectedCtr: string;
    targetCpa: string;
  };
  createdAt: string;
  savedInBank?: boolean;
}

export interface OrderBumpConfig {
  enabled: boolean;
  productName: string;
  headline: string;
  description: string;
  price: number;
  originalPrice: number;
  badgeText: string;
  takeRateEstimate: number; // e.g. 28%
}

export interface PostPurchaseUpsellConfig {
  enabled: boolean;
  productName: string;
  headline: string;
  subheadline: string;
  price: number;
  originalPrice: number;
  features: string[];
  takeRateEstimate: number; // e.g. 14%
}

export interface AbandonedLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  product: string;
  dropOffStage: 'initiate_checkout' | 'add_payment_info';
  timestamp: string;
  potentialValue: number;
  followUpStatus: 'pending' | 'sent' | 'recovered' | 'dismissed';
}

export interface MetaCapiStatus {
  connected: boolean;
  pixelId: string;
  eventMatchQuality: number; // 0 - 10
  serverEvents24h: number;
  browserEvents24h: number;
  redundancyRate: number; // %
  lastEventTime?: string;
}

export interface MarketingChatMessage {
  id: string;
  sender: MarketingAgentRole | 'user';
  text: string;
  timestamp: string;
  actionTaken?: {
    type: 'pause_campaign' | 'scale_budget' | 'generate_ad' | 'trigger_recovery' | 'update_bump';
    targetId?: string;
    details: string;
  };
}

export interface MarketingAutomationRules {
  autoKillBleeding: boolean;
  maxCpaThreshold: number; // IDR, default e.g. 50000
  autoScaleWinning: boolean;
  minRoasScaleThreshold: number; // default e.g. 3.0
  scaleBudgetPercentage: number; // default 20%
  frequencyFatigueThreshold: number; // default 3.2
  requireApproval: boolean;
}

export interface VideoAuditReport {
  id: string;
  videoTitle: string;
  targetNiche: string;
  currentIssue: string;
  overallScore: number; // 0 - 100
  breakdown: {
    thumbstopScore: number; // 0 - 100
    retentionScore: number; // 0 - 100
    clarityScore: number; // 0 - 100
    offerScore: number; // 0 - 100
  };
  keyFindings: {
    hookVerdict: string;
    dropOffWarning: string;
    proofVerdict: string;
    ctaVerdict: string;
  };
  recommendedFixes: {
    newHooks: string[];
    bRollSuggestions: string[];
    revisedVoiceover: string;
    onScreenTextFixes: string[];
  };
  auditedAt: string;
}

