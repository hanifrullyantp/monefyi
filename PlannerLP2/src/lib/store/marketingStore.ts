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
  AgentCustomNames,
  DEFAULT_AGENT_CUSTOM_NAMES,
} from '../types/marketing';
import {
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

export interface ActionAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorLabel: string;
  actionType: 'update_status' | 'update_budget' | 'scale_budget' | 'create_campaign';
  campaignId: string;
  campaignName: string;
  summary: string;
  previousValue?: string | number;
  newValue?: string | number;
  liveExecuted: boolean;
}

export interface DiscoveredMetaAccount {
  id: string;
  account_id?: string;
  name: string;
  account_status: number;
  currency?: string;
  amount_spent?: string;
}

interface MarketingStore {
  // Campaigns & Live State
  campaigns: MetaCampaign[];
  isRefreshingCampaigns: boolean;
  isLiveMeta: boolean;
  metaAccountName?: string;
  metaSyncError?: string | null;
  datePreset: string;
  discoveredAccounts: DiscoveredMetaAccount[];
  setDatePreset: (preset: string) => Promise<void>;
  selectAdAccount: (accountId: string) => Promise<void>;
  refreshCampaigns: () => Promise<void>;
  toggleCampaignStatus: (campaignId: string, actor?: string) => Promise<boolean>;
  updateCampaignDailyBudget: (
    campaignId: string,
    newBudget: number,
    actor?: string
  ) => Promise<boolean>;
  createWinningCampaignDraft: (payload: {
    name: string;
    dailyBudget: number;
    objective?: string;
    actor?: string;
  }) => Promise<{ ok: boolean; error?: string; createdId?: string }>;
  autoKillBleedingCampaigns: () => Promise<number>;
  autoScaleWinningCampaigns: () => Promise<number>;

  // Deep Ads Insights (Age, Gender, Region, Placement)
  insightsData: {
    ageGender: any[];
    regions: any[];
    placements: any[];
    recommendation: any;
  } | null;
  isLoadingInsights: boolean;
  refreshInsights: () => Promise<void>;

  // Action Audit Logs (Pergerakan AI & Manusia)
  actionLogs: ActionAuditLog[];
  addActionLog: (log: ActionAuditLog) => void;
  clearActionLogs: () => void;

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

  // Custom Agent Names
  customAgentNames: AgentCustomNames;
  updateAgentNames: (names: Partial<AgentCustomNames>) => void;
}

export const useMarketingStore = create<MarketingStore>()(
  persist(
    (set, get) => ({
      campaigns: [],
      isRefreshingCampaigns: false,
      isLiveMeta: false,
      metaAccountName: undefined,
      metaSyncError: null,
      datePreset: 'data_maximum',
      discoveredAccounts: [],
      insightsData: null,
      isLoadingInsights: false,
      actionLogs: [],

      addActionLog: (log) =>
        set((state) => ({ actionLogs: [log, ...state.actionLogs].slice(0, 100) })),
      clearActionLogs: () => set({ actionLogs: [] }),

      setDatePreset: async (preset: string) => {
        set({ datePreset: preset });
        await Promise.all([get().refreshCampaigns(), get().refreshInsights()]);
      },

      selectAdAccount: async (accountId: string) => {
        set((state) => ({
          apiConfig: { ...state.apiConfig, adAccountId: accountId },
        }));
        await Promise.all([get().refreshCampaigns(), get().refreshInsights()]);
      },

      refreshCampaigns: async () => {
        set({ isRefreshingCampaigns: true, metaSyncError: null });
        try {
          const { metaAccessToken, adAccountId, capiAccessToken, pixelId } = get().apiConfig;
          const { datePreset } = get();
          const result = await fetchMetaCampaigns(
            metaAccessToken,
            adAccountId,
            capiAccessToken,
            pixelId,
            datePreset
          );
          set((state) => ({
            campaigns: result.campaigns,
            isLiveMeta: result.isLive,
            metaAccountName: result.accountName,
            metaSyncError: result.error || null,
            discoveredAccounts:
              result.discoveredAccounts && result.discoveredAccounts.length > 0
                ? result.discoveredAccounts
                : state.discoveredAccounts,
            apiConfig:
              result.resolvedAccountId && result.resolvedAccountId !== state.apiConfig.adAccountId
                ? { ...state.apiConfig, adAccountId: result.resolvedAccountId }
                : state.apiConfig,
          }));
        } finally {
          set({ isRefreshingCampaigns: false });
        }
      },

      refreshInsights: async () => {
        const { metaAccessToken, capiAccessToken, adAccountId } = get().apiConfig;
        const token = metaAccessToken?.trim() || capiAccessToken?.trim();
        if (!token) return;

        set({ isLoadingInsights: true });
        try {
          const res = await fetch('/api/meta/insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken: metaAccessToken?.trim() || '',
              capiAccessToken: capiAccessToken?.trim() || '',
              adAccountId: adAccountId?.trim() || '',
              datePreset: get().datePreset,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) {
            set({
              insightsData: {
                ageGender: data.ageGender || [],
                regions: data.regions || [],
                placements: data.placements || [],
                recommendation: data.recommendation || null,
              },
            });
          }
        } catch {
          // Abaikan jika gagal memuat breakdown
        } finally {
          set({ isLoadingInsights: false });
        }
      },

      toggleCampaignStatus: async (campaignId: string, actor: string = 'human') => {
        const { campaigns, apiConfig, addActionLog } = get();
        const target = campaigns.find((c) => c.id === campaignId);
        if (!target) return false;

        const newStatus: CampaignStatus = target.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        const token = apiConfig.metaAccessToken || apiConfig.capiAccessToken;
        const result = await updateRemoteCampaignStatus(
          campaignId,
          newStatus,
          token,
          target.name,
          actor
        );

        if (result.ok) {
          if (result.log) addActionLog(result.log);
          set({
            campaigns: campaigns.map((c) =>
              c.id === campaignId
                ? {
                    ...c,
                    status: newStatus,
                    deliveryStatus: newStatus,
                    lastUpdated: new Date().toISOString(),
                  }
                : c
            ),
          });
          return true;
        }
        return false;
      },

      updateCampaignDailyBudget: async (
        campaignId: string,
        newBudget: number,
        actor: string = 'human'
      ) => {
        const { campaigns, apiConfig, addActionLog } = get();
        const target = campaigns.find((c) => c.id === campaignId);
        const token = apiConfig.metaAccessToken || apiConfig.capiAccessToken;
        const result = await updateRemoteCampaignBudget(
          campaignId,
          newBudget,
          token,
          target?.name,
          target?.dailyBudget,
          actor
        );

        if (result.ok) {
          if (result.log) addActionLog(result.log);
          set({
            campaigns: campaigns.map((c) =>
              c.id === campaignId
                ? { ...c, dailyBudget: newBudget, lastUpdated: new Date().toISOString() }
                : c
            ),
          });
          return true;
        }
        return false;
      },

      createWinningCampaignDraft: async ({
        name,
        dailyBudget,
        objective = 'OUTCOME_SALES',
        actor = 'ai_danu',
      }) => {
        const { apiConfig, addActionLog, refreshCampaigns } = get();
        const token = apiConfig.metaAccessToken || apiConfig.capiAccessToken;
        if (!token) {
          return { ok: false, error: 'Token Meta belum terpasang.' };
        }

        try {
          const res = await fetch('/api/meta/actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create_winning_campaign',
              accessToken: apiConfig.metaAccessToken,
              capiAccessToken: apiConfig.capiAccessToken,
              adAccountId: apiConfig.adAccountId,
              name,
              dailyBudget,
              objective,
              actor,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) {
            if (data.log) addActionLog(data.log);
            await refreshCampaigns();
            return { ok: true, createdId: data.createdCampaignId };
          }
          return { ok: false, error: data.error || 'Gagal membuat kampanye baru di Meta.' };
        } catch (err: any) {
          return { ok: false, error: err?.message };
        }
      },

      autoKillBleedingCampaigns: async () => {
        const { campaigns, rules, toggleCampaignStatus } = get();
        let killedCount = 0;

        for (const c of campaigns) {
          const health = evaluateCampaignHealth(c, rules);
          if (
            c.status === 'ACTIVE' &&
            (health === 'bleeding' || (c.cpa > rules.maxCpaThreshold && c.cpa > 0))
          ) {
            const ok = await toggleCampaignStatus(c.id, 'ai_bima');
            if (ok) killedCount++;
          }
        }
        return killedCount;
      },

      autoScaleWinningCampaigns: async () => {
        const { campaigns, rules, updateCampaignDailyBudget } = get();
        let scaledCount = 0;

        for (const c of campaigns) {
          const health = evaluateCampaignHealth(c, rules);
          if (
            c.status === 'ACTIVE' &&
            (health === 'winning' ||
              health === 'scale_ready' ||
              c.roas >= rules.minRoasScaleThreshold ||
              (c.results || 0) >= 3)
          ) {
            const baseBudget = c.dailyBudget > 0 ? c.dailyBudget : 100000;
            const newBudget = Math.round(baseBudget * (1 + rules.scaleBudgetPercentage / 100));
            const ok = await updateCampaignDailyBudget(c.id, newBudget, 'ai_bima');
            if (ok) scaledCount++;
          }
        }
        return scaledCount;
      },

      // Chat Messages (Bebas Emoticon)
      chatMessages: [
        {
          id: 'welcome_1',
          sender: 'cmo',
          text: `Selamat datang di **Monefyi Adspert**.\n\nSaya **Mas Danu** (CMO AI), memimpin tim spesialis untuk menganalisa data riil Meta Ads, demografi pemenang, dan mengeksekusi optimasi kampanye Anda:\n- **Bima (Media Buyer)**: Membaca metrik 26 kolom, menaikkan budget kampanye winning, dan mematikan iklan boncos.\n- **Sinta (Creative)**: Merancang hook 3-detik, copywriting PAS/HSO, dan skrip video.\n- **Aris (Funnel Specialist)**: Mengoptimalkan OCLP, Order Bump, Upsell OTO, dan CAPI server-side.\n\nTanyakan analisa kampanye atau minta kami menaikkan budget iklan terbaik Anda sekarang.`,
          timestamp: new Date().toISOString(),
        },
      ],
      addChatMessage: (msg) =>
        set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      clearChatMessages: () => set({ chatMessages: [] }),

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

      // Scale Funnel (Bebas Emoticon)
      orderBumpConfig: {
        enabled: true,
        productName: 'Template Excel RAP 2026 + SOP Proyek Lengkap',
        headline:
          'YA! Tambahkan Template Database 500+ Material & SOP Kontraktor (Hemat Rp 350.000)',
        description:
          'Dapatkan 10 template RAP siap pakai, rumus otomatis waste material, dan SOP tender proyek langsung ke akun Anda.',
        price: 49000,
        originalPrice: 399000,
        badgeText: 'ADD-ON SPESIAL',
        takeRateEstimate: 31,
      },
      updateOrderBumpConfig: (updates) =>
        set((state) => ({ orderBumpConfig: { ...state.orderBumpConfig, ...updates } })),

      upsellConfig: {
        enabled: true,
        productName: 'Upgrade Paket Pro Lifetime + 1-on-1 Setup Consultation',
        headline: 'Penawaran Khusus Terbatas Setelah Pembelian',
        subheadline:
          'Buka akses ke fitur Unlimited Projects, Multi-User Team, dan sesi konsultasi setup langsung bersama tim ahli kami.',
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

      // Custom Agent Names
      customAgentNames: DEFAULT_AGENT_CUSTOM_NAMES,
      updateAgentNames: (names) =>
        set((state) => ({
          customAgentNames: { ...state.customAgentNames, ...names },
        })),
    }),
    {
      name: 'monefyi_marketing_store',
      partialize: (state) => ({
        rules: state.rules,
        apiConfig: state.apiConfig,
        customAgentNames: state.customAgentNames,
        orderBumpConfig: state.orderBumpConfig,
        upsellConfig: state.upsellConfig,
        adBank: state.adBank,
        actionLogs: state.actionLogs.slice(0, 50),
        chatMessages: state.chatMessages.slice(-30),
      }),
    }
  )
);
