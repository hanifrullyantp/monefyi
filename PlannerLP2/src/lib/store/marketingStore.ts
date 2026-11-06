import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  MetaCampaign,
  WinningAdTemplate,
  MarketingChatMessage,
  OrderBumpConfig,
  PostPurchaseUpsellConfig,
  AbandonedLead,
  MetaCapiStatus,
  MarketingAutomationRules,
  CampaignStatus,
} from '../types/marketing';
import {
  INITIAL_BENCHMARK_CAMPAIGNS,
  fetchMetaCampaigns,
  updateRemoteCampaignStatus,
  updateRemoteCampaignBudget,
  evaluateCampaignHealth,
} from '../services/metaAdsService';
import { getMockCapiStatus } from '../services/metaCapiService';

interface MarketingApiConfig {
  metaAccessToken?: string;
  adAccountId?: string;
  pixelId?: string;
  capiAccessToken?: string;
  aiProvider: 'gemini' | 'openai' | 'claude' | 'groq' | 'openrouter';
  aiApiKey?: string;
}

interface MarketingStore {
  // Campaigns
  campaigns: MetaCampaign[];
  isRefreshingCampaigns: boolean;
  refreshCampaigns: () => Promise<void>;
  toggleCampaignStatus: (campaignId: string) => Promise<void>;
  updateCampaignDailyBudget: (campaignId: string, newBudget: number) => Promise<void>;
  autoKillBleedingCampaigns: () => Promise<number>;
  autoScaleWinningCampaigns: () => Promise<number>;

  // War Room Chat
  chatMessages: MarketingChatMessage[];
  addChatMessage: (msg: MarketingChatMessage) => void;
  clearChatMessages: () => void;

  // Winning Ad Bank
  adBank: WinningAdTemplate[];
  saveAdToBank: (ad: WinningAdTemplate) => void;
  removeAdFromBank: (adId: string) => void;

  // Scale.co.id Funnel Settings
  orderBumpConfig: OrderBumpConfig;
  updateOrderBumpConfig: (updates: Partial<OrderBumpConfig>) => void;
  upsellConfig: PostPurchaseUpsellConfig;
  updateUpsellConfig: (updates: Partial<PostPurchaseUpsellConfig>) => void;

  // Abandoned Checkouts
  abandonedLeads: AbandonedLead[];
  markLeadFollowedUp: (leadId: string) => void;

  // Meta CAPI
  capiStatus: MetaCapiStatus;
  updateCapiStatus: (status: Partial<MetaCapiStatus>) => void;

  // Automation Rules & API
  rules: MarketingAutomationRules;
  updateRules: (rules: Partial<MarketingAutomationRules>) => void;
  apiConfig: MarketingApiConfig;
  updateApiConfig: (config: Partial<MarketingApiConfig>) => void;
}

export const useMarketingStore = create<MarketingStore>()(
  persist(
    (set, get) => ({
      campaigns: INITIAL_BENCHMARK_CAMPAIGNS,
      isRefreshingCampaigns: false,

      refreshCampaigns: async () => {
        set({ isRefreshingCampaigns: true });
        try {
          const { metaAccessToken, adAccountId } = get().apiConfig;
          const fresh = await fetchMetaCampaigns(metaAccessToken, adAccountId);
          set({ campaigns: fresh });
        } finally {
          set({ isRefreshingCampaigns: false });
        }
      },

      toggleCampaignStatus: async (campaignId: string) => {
        const { campaigns, apiConfig } = get();
        const target = campaigns.find(c => c.id === campaignId);
        if (!target) return;

        const newStatus: CampaignStatus = target.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        await updateRemoteCampaignStatus(campaignId, newStatus, apiConfig.metaAccessToken);

        set({
          campaigns: campaigns.map(c =>
            c.id === campaignId
              ? { ...c, status: newStatus, lastUpdated: new Date().toISOString() }
              : c
          ),
        });
      },

      updateCampaignDailyBudget: async (campaignId: string, newBudget: number) => {
        const { campaigns, apiConfig } = get();
        await updateRemoteCampaignBudget(campaignId, newBudget, apiConfig.metaAccessToken);

        set({
          campaigns: campaigns.map(c =>
            c.id === campaignId
              ? { ...c, dailyBudget: newBudget, lastUpdated: new Date().toISOString() }
              : c
          ),
        });
      },

      autoKillBleedingCampaigns: async () => {
        const { campaigns, rules, apiConfig } = get();
        let killedCount = 0;

        const updated = campaigns.map(c => {
          const health = evaluateCampaignHealth(c, rules);
          if (c.status === 'ACTIVE' && (health === 'bleeding' || c.cpa > rules.maxCpaThreshold)) {
            killedCount++;
            updateRemoteCampaignStatus(c.id, 'PAUSED', apiConfig.metaAccessToken);
            return { ...c, status: 'PAUSED' as CampaignStatus, healthStatus: 'bleeding' as const };
          }
          return c;
        });

        set({ campaigns: updated });
        return killedCount;
      },

      autoScaleWinningCampaigns: async () => {
        const { campaigns, rules, apiConfig } = get();
        let scaledCount = 0;

        const updated = campaigns.map(c => {
          const health = evaluateCampaignHealth(c, rules);
          if (c.status === 'ACTIVE' && (health === 'winning' || health === 'scale_ready' || c.roas >= rules.minRoasScaleThreshold)) {
            scaledCount++;
            const newBudget = Math.round(c.dailyBudget * (1 + rules.scaleBudgetPercentage / 100));
            updateRemoteCampaignBudget(c.id, newBudget, apiConfig.metaAccessToken);
            return { ...c, dailyBudget: newBudget, healthStatus: 'scale_ready' as const };
          }
          return c;
        });

        set({ campaigns: updated });
        return scaledCount;
      },

      // Chat Messages
      chatMessages: [
        {
          id: 'welcome_1',
          sender: 'cmo',
          text: `Selamat datang di **War Room Marketing Monefyi**! 🎯\n\nSaya **Mas Danu** (CMO AI), memimpin tim khusus untuk mengoptimalkan iklan Meta Ads dan konversi landing page Anda:\n• **Bima (Media Buyer)**: Siap membaca metrik CPA/ROAS dan mengendalikan status iklan.\n• **Sinta (Creative)**: Siap memproduksi hook 3-detik, copywriter PAS/HSO, dan script video Reels.\n• **Aris (Funnel Specialist)**: Menerapkan best practice Scale.co.id (Order Bump, Upsell OTO, dan CAPI server-side).\n\nAda kampanye atau strategi yang ingin kita diskusikan hari ini?`,
          timestamp: new Date().toISOString(),
        },
      ],
      addChatMessage: (msg) =>
        set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      clearChatMessages: () =>
        set({ chatMessages: [] }),

      // Ad Bank
      adBank: [],
      saveAdToBank: (ad) =>
        set((state) => ({
          adBank: [
            { ...ad, savedInBank: true },
            ...state.adBank.filter((item) => item.id !== ad.id),
          ],
        })),
      removeAdFromBank: (adId) =>
        set((state) => ({
          adBank: state.adBank.filter((item) => item.id !== adId),
        })),

      // Scale Funnel
      orderBumpConfig: {
        enabled: true,
        productName: 'Template Excel RAP 2026 + SOP Proyek Lengkap',
        headline: '🔥 YA! Tambahkan Template Database 500+ Material & SOP Kontraktor (Hemat Rp 350.000)',
        description: 'Dapatkan 10 template RAP siap pakai, rumus otomatis waste material, dan SOP tender proyek langsung ke akun Anda.',
        price: 49000,
        originalPrice: 399000,
        badgeText: 'HOT ADD-ON',
        takeRateEstimate: 31,
      },
      updateOrderBumpConfig: (updates) =>
        set((state) => ({ orderBumpConfig: { ...state.orderBumpConfig, ...updates } })),

      upsellConfig: {
        enabled: true,
        productName: 'Upgrade Paket Pro Lifetime + 1-on-1 Setup Consultation',
        headline: '🎉 Penawaran Khusus Terbatas Setelah Pembelian!',
        subheadline: 'Buka akses ke fitur Unlimited Projects, Multi-User Team, dan sesi konsultasi setup langsung bersama tim ahli kami.',
        price: 499000,
        originalPrice: 1200000,
        features: [
          'Lisensi Lifetime tanpa biaya langganan bulanan',
          'Sesi 1-on-1 setup database harga proyek bersama spesialis',
          'Akses eksklusif grup komunitas kontraktor & vendor Monefyi',
        ],
        takeRateEstimate: 16,
      },
      updateUpsellConfig: (updates) =>
        set((state) => ({ upsellConfig: { ...state.upsellConfig, ...updates } })),

      // Abandoned Leads
      abandonedLeads: [
        {
          id: 'lead_901',
          name: 'Pak Hendra Pratama',
          phone: '081288992211',
          email: 'hendra.pratama@gmail.com',
          product: 'Estimator Standard',
          dropOffStage: 'add_payment_info',
          timestamp: '15 menit yang lalu',
          potentialValue: 299000,
          followUpStatus: 'pending',
        },
        {
          id: 'lead_902',
          name: 'Ibu Maya Lestari',
          phone: '085712345678',
          email: 'maya.interior@yahoo.com',
          product: 'Estimator Pro + Order Bump',
          dropOffStage: 'initiate_checkout',
          timestamp: '42 menit yang lalu',
          potentialValue: 348000,
          followUpStatus: 'pending',
        },
        {
          id: 'lead_903',
          name: 'Pak Rudi Hartono',
          phone: '081399887766',
          email: 'rudi.konstruksi@gmail.com',
          product: 'Estimator Standard',
          dropOffStage: 'add_payment_info',
          timestamp: '2 jam yang lalu',
          potentialValue: 299000,
          followUpStatus: 'recovered',
        },
      ],
      markLeadFollowedUp: (leadId) =>
        set((state) => ({
          abandonedLeads: state.abandonedLeads.map((l) =>
            l.id === leadId ? { ...l, followUpStatus: 'sent' } : l
          ),
        })),

      // Meta CAPI
      capiStatus: getMockCapiStatus(),
      updateCapiStatus: (updates) =>
        set((state) => ({ capiStatus: { ...state.capiStatus, ...updates } })),

      // Automation Rules
      rules: {
        autoKillBleeding: true,
        maxCpaThreshold: 45000,
        autoScaleWinning: true,
        minRoasScaleThreshold: 3.0,
        scaleBudgetPercentage: 20,
        frequencyFatigueThreshold: 3.5,
        requireApproval: false,
      },
      updateRules: (updates) =>
        set((state) => ({ rules: { ...state.rules, ...updates } })),

      // API Config
      apiConfig: {
        metaAccessToken: '',
        adAccountId: '',
        pixelId: '1530674178146899',
        capiAccessToken: '',
        aiProvider: 'gemini',
        aiApiKey: '',
      },
      updateApiConfig: (updates) =>
        set((state) => ({ apiConfig: { ...state.apiConfig, ...updates } })),
    }),
    {
      name: 'monefyi_marketing_store',
      partialize: (state) => ({
        rules: state.rules,
        apiConfig: state.apiConfig,
        orderBumpConfig: state.orderBumpConfig,
        upsellConfig: state.upsellConfig,
        adBank: state.adBank,
        chatMessages: state.chatMessages.slice(-30), // keep latest 30 messages
      }),
    }
  )
);

