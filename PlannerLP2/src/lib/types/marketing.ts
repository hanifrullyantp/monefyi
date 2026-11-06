export type MarketingAgentRole = 'cmo' | 'media_buyer' | 'copywriter' | 'funnel_aov';

export interface AgentInfo {
  role: MarketingAgentRole;
  name: string;
  title: string;
  avatar: string;
  specialty: string;
  badgeColor: string;
}

export const MARKETING_AGENTS: Record<MarketingAgentRole, AgentInfo> = {
  cmo: {
    role: 'cmo',
    name: 'Mas Danu',
    title: 'Chief Marketing Officer',
    avatar: '🎯',
    specialty: 'Strategi Kampanye, Funneling & Alokasi Budget',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  media_buyer: {
    role: 'media_buyer',
    name: 'Bima',
    title: 'Meta Ads Media Buyer',
    avatar: '📊',
    specialty: 'Membaca Metrik, Diagnosa Boncos & Pengendali Iklan',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  copywriter: {
    role: 'copywriter',
    name: 'Sinta',
    title: 'Creative & Copywriter Strategist',
    avatar: '🎨',
    specialty: 'Winning Hook 3-Detik, Copy PAS/HSO & Script UGC',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  funnel_aov: {
    role: 'funnel_aov',
    name: 'Aris',
    title: 'Funnel & AOV Specialist (Scale Model)',
    avatar: '🚀',
    specialty: 'Order Bump, OTO Upsell, CAPI & Recovery Abandoned',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
  },
};

export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type AdHealthStatus = 'winning' | 'scale_ready' | 'learning' | 'review' | 'bleeding' | 'fatigued';

export interface MetaCampaign {
  id: string;
  name: string;
  objective: 'OUTCOME_LEADS' | 'OUTCOME_SALES' | 'OUTCOME_TRAFFIC';
  status: CampaignStatus;
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

