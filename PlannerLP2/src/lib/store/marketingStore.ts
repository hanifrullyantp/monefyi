import { authedFetch } from "@/lib/auth/authedFetch";
import type { CampaignWindowAuditEntry } from "@/lib/engine/winningEngine";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  MetaCampaign,
  MetaAdSet,
  MetaAd,
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
  updateRemoteAdStatus,
  updateRemoteCampaignBudget,
  evaluateCampaignHealth,
} from '../services/metaAdsService';
import { getMockCapiStatus } from '../services/metaCapiService';
import {
  WinningEngineConfig,
  DEFAULT_WINNING_ENGINE_CONFIG,
  PillarHealthScore,
  WinningActionPlan,
  WinningLearningItem,
  runFivePillarDiagnostics,
} from '../engine/winningEngine';

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
  accountBilling?: {
    balance: number;
    amountSpent: number;
    spendCap: number;
    fundingSource: string;
    currency: string;
  };
  setDatePreset: (preset: string) => Promise<void>;
  selectAdAccount: (accountId: string) => Promise<void>;
  refreshCampaigns: () => Promise<void>;
  toggleCampaignStatus: (campaignId: string, actor?: string) => Promise<boolean>;
  toggleAdStatus: (adId: string, campaignId?: string, actor?: string) => Promise<boolean>;
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

  // Holistic 5-Pillar Winning Engine (Mode Cuan & Mode Advance)
  winningEngineConfig: WinningEngineConfig;
  updateWinningEngineConfig: (updates: Partial<WinningEngineConfig>) => void;
  loadConfigFromCloud: () => Promise<void>;
  winningOverallScore: number;
  winningPillars: PillarHealthScore[];
  winningPlans: WinningActionPlan[];
  winningLearnings: WinningLearningItem[];
  winningDataAudit: CampaignWindowAuditEntry[];
  winningExecutiveBrief: string;
  winningLlmInfo: {
    strategistProvider: string;
    strategistModel: string;
    technicalProvider: string;
    technicalModel: string;
  };
  isRunningEngineTick: boolean;
  executingPlanId: string | null;

  // Batch Analysis Tracker (Sonnet 5.5 Batch & Multi-device)
  batchAnalysisStatus: "idle" | "processing" | "ready" | "error";
  batchJobId: string | null;
  batchStartedAt: string | null;
  batchCompletedAt: string | null;
  batchProgressMessage: string;
  pollBatchStatus: () => Promise<{ status: string; isReady: boolean; message?: string }>;

  currentLpCopySnapshot: {
    heroTitle: string;
    heroSubtitle: string;
    ctaText: string;
    standardPrice: string;
    proPrice: string;
  };
  runWinningEngineTick: (sendNotification?: boolean) => Promise<{
    ok: boolean;
    message?: string;
  }>;
  approveAndExecutePlan: (
    planId: string,
    customPayloadOverrides?: Record<string, any>
  ) => Promise<{ ok: boolean; message: string }>;
  rejectPlan: (planId: string) => void;

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
  persist<MarketingStore, any>(
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

      // Holistic 5-Pillar Winning Engine Initial State
      winningEngineConfig: DEFAULT_WINNING_ENGINE_CONFIG,
      winningOverallScore: 0,
      winningPillars: [],
      winningPlans: [],
      winningLearnings: [],
      winningDataAudit: [],
      winningExecutiveBrief: '',
      winningLlmInfo: {
        strategistProvider: 'OpenRouter (Claude 3.5 Sonnet)',
        strategistModel: 'anthropic/claude-3.5-sonnet',
        technicalProvider: 'OpenRouter (Luna Pro 6)',
        technicalModel: 'openai/gpt-6-luna-pro',
      },
      isRunningEngineTick: false,
      executingPlanId: null,

      // Batch Analysis Initial State (Sonnet 5.5 Batch Tracker)
      batchAnalysisStatus: "idle",
      batchJobId: null,
      batchStartedAt: null,
      batchCompletedAt: null,
      batchProgressMessage: "",

      currentLpCopySnapshot: {
        heroTitle: 'Kirim Penawaran Sebelum Kamu Pulang Survei',
        heroSubtitle:
          'Hitung harga langsung di HP saat survei, lalu kirim PDF penawaran berlogo kamu sebelum klien sempat membandingkan dengan vendor lain.',
        ctaText: 'Lihat Pilihan Paket',
        standardPrice: 'Rp 93.000',
        proPrice: 'Rp 199.000',
      },

      updateWinningEngineConfig: (updates) => {
        set((state) => {
          const nextConfig: WinningEngineConfig = {
            ...state.winningEngineConfig,
            ...updates,
            llmRouting: {
              openRouterApiKey:
                updates.llmRouting?.openRouterApiKey ??
                state.winningEngineConfig.llmRouting.openRouterApiKey,
              strategist: {
                ...state.winningEngineConfig.llmRouting.strategist,
                ...(updates.llmRouting?.strategist || {}),
              },
              processor: {
                ...(state.winningEngineConfig.llmRouting.processor || {
                  provider: 'openrouter',
                  model: 'openai/gpt-6-luna-pro',
                }),
                ...(updates.llmRouting?.processor || {}),
              },
              technical: {
                ...state.winningEngineConfig.llmRouting.technical,
                ...(updates.llmRouting?.technical || {}),
              },
            },
            notifications: {
              ...state.winningEngineConfig.notifications,
              ...(updates.notifications || {}),
            },
          };
          return { winningEngineConfig: nextConfig };
        });
        // Simpan ke server supaya tidak kembali ke default saat reload dan supaya cron memakai nilai yang sama.
        const persistKeys = [
          'mode', 'advanceMasterPlanApproved', 'minDailyBudget', 'maxDailyBudget', 'approvedDailyCeiling',
          'monthlySpendCap', 'targetCpa', 'targetRoas', 'maxScalePctPerStep', 'killSwitch',
        ] as const;
        const payload: Record<string, unknown> = {};
        for (const k of persistKeys) {
          if ((updates as Record<string, unknown>)[k] !== undefined) payload[k] = (updates as Record<string, unknown>)[k];
        }
        if (Object.keys(payload).length > 0) {
          // Berpindah ke mode cuan membatalkan persetujuan master plan advance
          if (payload.mode === 'cuan') payload.advanceMasterPlanApproved = false;
          authedFetch('/api/engine/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
            .then(async (res) => {
              if (!res.ok) console.error('[engine config] gagal menyimpan ke server', res.status, await res.text().catch(() => ''));
            })
            .catch((err) => console.error('[engine config] gagal menyimpan ke server', err));
        }
      },

      loadConfigFromCloud: async () => {
        try {
          const res = await authedFetch('/api/engine/config?full=1');
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok && data.config) {
            const c = data.config;
            set((state) => ({
              apiConfig: {
                ...state.apiConfig,
                adAccountId: c.adAccountId || state.apiConfig.adAccountId,
                metaAccessToken: c.metaAccessToken || state.apiConfig.metaAccessToken,
                capiAccessToken: c.metaCapiToken || state.apiConfig.capiAccessToken,
                pixelId: c.metaPixelId || state.apiConfig.pixelId,
                aiProvider: c.openRouterApiKey ? 'openrouter' : state.apiConfig.aiProvider,
                aiApiKey: c.openRouterApiKey || state.apiConfig.aiApiKey,
              },
              winningEngineConfig: {
                ...state.winningEngineConfig,
                mode: c.mode || state.winningEngineConfig.mode,
                minDailyBudget: c.minDailyBudget || state.winningEngineConfig.minDailyBudget,
                maxDailyBudget: c.maxDailyBudget || state.winningEngineConfig.maxDailyBudget,
                approvedDailyCeiling:
                  c.approvedDailyCeiling || state.winningEngineConfig.approvedDailyCeiling,
                monthlySpendCap: c.monthlySpendCap || state.winningEngineConfig.monthlySpendCap,
                targetCpa: c.targetCpa || state.winningEngineConfig.targetCpa,
                targetRoas: c.targetRoas || state.winningEngineConfig.targetRoas,
                maxScalePctPerStep:
                  c.maxScalePctPerStep || state.winningEngineConfig.maxScalePctPerStep,
                killSwitch: Boolean(c.killSwitch),
                advanceMasterPlanApproved: Boolean(c.advanceMasterPlanApproved),
                llmRouting: {
                  openRouterApiKey:
                    c.openRouterApiKey || state.winningEngineConfig.llmRouting.openRouterApiKey,
                  strategist: {
                    provider: 'openrouter',
                    model: c.strategistModel || 'anthropic/claude-3.5-sonnet',
                  },
                  processor: {
                    provider: 'openrouter',
                    model: c.processorModel || 'openai/gpt-6-luna-pro',
                  },
                  technical: {
                    provider: 'openrouter',
                    model: c.technicalModel || 'openai/gpt-6-luna-pro',
                  },
                },
                notifications: {
                  ...state.winningEngineConfig.notifications,
                  whatsappAdminPhone:
                    c.whatsappAdminPhone ||
                    state.winningEngineConfig.notifications.whatsappAdminPhone,
                  whatsappApiKey:
                    c.whatsappApiKey ||
                    state.winningEngineConfig.notifications.whatsappApiKey,
                  telegramBotToken:
                    c.telegramBotToken ||
                    state.winningEngineConfig.notifications.telegramBotToken,
                  telegramChatId:
                    c.telegramChatId || state.winningEngineConfig.notifications.telegramChatId,
                },
              },
            }));
          }

          // Sinkronisasi status batch dari Supabase Cloud (Multi-device tracking)
          const batchRes = await authedFetch('/api/engine/batch');
          const batchData = await batchRes.json().catch(() => ({}));
          if (batchRes.ok && batchData.ok) {
            if (batchData.status === 'processing') {
              set({
                batchAnalysisStatus: 'processing',
                batchJobId: batchData.batchId,
                batchStartedAt: batchData.startedAt,
                batchProgressMessage:
                  batchData.message || 'Analisa Sonnet 5.5 Batch sedang diproses di belakang layar...',
                isRunningEngineTick: true,
              });
            } else if (batchData.status === 'ready') {
              set({
                batchAnalysisStatus: 'ready',
                batchJobId: batchData.batchId || get().batchJobId,
                batchStartedAt: batchData.startedAt || get().batchStartedAt,
                batchCompletedAt: batchData.completedAt || new Date().toISOString(),
                winningOverallScore: batchData.overallScore ?? get().winningOverallScore,
                winningPillars: batchData.pillars?.length ? batchData.pillars : get().winningPillars,
                winningPlans: batchData.plans?.length ? batchData.plans : get().winningPlans,
                winningExecutiveBrief: batchData.executiveBrief || get().winningExecutiveBrief,
                winningLearnings: batchData.learnings || get().winningLearnings,
                winningDataAudit: batchData.dataAudit || get().winningDataAudit,
                batchProgressMessage: 'Data siap! Hasil analisa 5 pilar Sonnet 5.5 telah tersedia.',
                isRunningEngineTick: false,
              });
            }
          }
        } catch {
          // Abaikan jika offline
        }
      },

      pollBatchStatus: async () => {
        try {
          const res = await authedFetch('/api/engine/batch');
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) {
            if (data.status === 'ready') {
              set({
                batchAnalysisStatus: 'ready',
                batchJobId: data.batchId || get().batchJobId,
                batchStartedAt: data.startedAt || get().batchStartedAt,
                batchCompletedAt: data.completedAt || new Date().toISOString(),
                batchProgressMessage: 'Analisa Sonnet 5.5 Batch selesai dan data siap ditampilkan.',
                winningOverallScore: data.overallScore ?? get().winningOverallScore,
                winningPillars: data.pillars?.length ? data.pillars : get().winningPillars,
                winningPlans: data.plans?.length ? data.plans : get().winningPlans,
                winningLearnings: data.learnings || get().winningLearnings,
                winningDataAudit: data.dataAudit || get().winningDataAudit,
                winningExecutiveBrief: data.executiveBrief || get().winningExecutiveBrief,
                isRunningEngineTick: false,
              });
              return { status: 'ready', isReady: true, message: 'Data siap!' };
            } else if (data.status === 'processing') {
              set({
                batchAnalysisStatus: 'processing',
                batchJobId: data.batchId || get().batchJobId,
                batchStartedAt: data.startedAt || get().batchStartedAt,
                batchProgressMessage:
                  data.message || 'Analisa Sonnet 5.5 Batch sedang diproses di belakang layar...',
                isRunningEngineTick: true,
              });
              return { status: 'processing', isReady: false, message: data.message };
            } else if (data.status === 'failed') {
              set({
                batchAnalysisStatus: 'error',
                batchProgressMessage: data.error || 'Batch gagal diproses oleh penyedia AI.',
                isRunningEngineTick: false,
              });
              return { status: 'failed', isReady: false, message: data.error };
            }
          }
          return { status: 'idle', isReady: false };
        } catch (err: any) {
          return { status: 'error', isReady: false, message: err?.message };
        }
      },

      runWinningEngineTick: async (sendNotification = false) => {
        set({ isRunningEngineTick: true, batchAnalysisStatus: 'processing' });
        try {
          const {
            campaigns,
            insightsData,
            orderBumpConfig,
            upsellConfig,
            capiStatus,
            winningEngineConfig,
            currentLpCopySnapshot,
            datePreset,
          } = get();

          // Pastikan kampanye terbaru dari Meta Ads ditarik sebelum analisa dibuat
          if (get().campaigns.length === 0) {
            await get().refreshCampaigns().catch(() => undefined);
          }

          const activeCampaigns = get().campaigns;

          const res = await authedFetch('/api/engine/tick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaigns: activeCampaigns,
              insightsData,
              orderBumpConfig,
              upsellConfig,
              capiStatus,
              config: winningEngineConfig,
              currentLpCopy: currentLpCopySnapshot,
              sendNotification,
              forceRealtime: true,
              datePreset,
            }),
          });

          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) {
            // Jika model berstatus Batch Asinkron
            if (data.isBatch) {
              set({
                batchAnalysisStatus: 'processing',
                batchJobId: data.batchId || null,
                batchStartedAt: data.startedAt || new Date().toISOString(),
                batchCompletedAt: null,
                batchProgressMessage:
                  data.message ||
                  'Permintaan telah dikirim ke antrean Sonnet 5.5 Batch. Sistem sedang memproses di belakang layar...',
                winningOverallScore: data.diagnostics?.overallScore || get().winningOverallScore,
                winningPillars: data.diagnostics?.pillars || get().winningPillars,
                isRunningEngineTick: true,
              });
              return {
                ok: true,
                message: data.message,
              };
            }

            set({
              batchAnalysisStatus: 'ready',
              batchCompletedAt: new Date().toISOString(),
              batchProgressMessage: 'Data siap! 5 pilar dan rencana winning berhasil disusun.',
              winningOverallScore: data.overallScore,
              winningPillars: data.pillars || [],
              winningPlans: data.plans || [],
              winningLearnings: data.learnings || [],
              winningDataAudit: data.dataAudit || [],
              winningExecutiveBrief: data.executiveBrief || '',
              winningLlmInfo: data.llmInfo || get().winningLlmInfo,
              isRunningEngineTick: false,
            });
            return {
              ok: true,
              message: sendNotification
                ? 'Analisa 5 Pilar selesai dan laporan telah dikirim ke WhatsApp & Telegram.'
                : 'Analisa 5 Pilar berhasil diperbarui.',
            };
          }
          set({ batchAnalysisStatus: 'error', isRunningEngineTick: false });
          return {
            ok: false,
            message: data.error || 'Gagal menjalankan analisa Winning Engine.',
          };
        } catch (err: any) {
          set({ batchAnalysisStatus: 'error', isRunningEngineTick: false });
          return {
            ok: false,
            message: err?.message || 'Gagal menghubungi server Winning Engine.',
          };
        } finally {
          if (get().batchAnalysisStatus !== 'processing') {
            set({ isRunningEngineTick: false });
          }
        }
      },

      approveAndExecutePlan: async (planId, customPayloadOverrides) => {
        const {
          winningPlans,
          winningEngineConfig,
          apiConfig,
          addActionLog,
          refreshCampaigns,
        } = get();
        const targetPlan = winningPlans.find((p) => p.id === planId);
        if (!targetPlan) {
          return { ok: false, message: 'Rencana tidak ditemukan.' };
        }

        const mergedPlan: WinningActionPlan = {
          ...targetPlan,
          actionPayload: {
            ...targetPlan.actionPayload,
            ...(customPayloadOverrides || {}),
          },
        };

        set({ executingPlanId: planId });
        try {
          // Jika rencana menaikkan plafon dan disetujui user, naikkan approvedDailyCeiling
          let activeConfig = winningEngineConfig;
          if (mergedPlan.requiresCeilingReapproval) {
            const newCeiling = Math.max(
              winningEngineConfig.approvedDailyCeiling,
              Number(
                mergedPlan.actionPayload.newBudget ||
                  mergedPlan.actionPayload.dailyBudget ||
                  winningEngineConfig.maxDailyBudget
              )
            );
            activeConfig = {
              ...winningEngineConfig,
              approvedDailyCeiling: newCeiling,
              maxDailyBudget: Math.max(winningEngineConfig.maxDailyBudget, newCeiling),
            };
            set({ winningEngineConfig: activeConfig });
          }

          const res = await authedFetch('/api/engine/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              plan: mergedPlan,
              config: activeConfig,
              userApproved: true,
              accessToken: apiConfig.metaAccessToken,
              capiAccessToken: apiConfig.capiAccessToken,
              adAccountId: apiConfig.adAccountId,
              sendNotification: true,
            }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) {
            return {
              ok: false,
              message: data.error || 'Gagal mengeksekusi rencana.',
            };
          }

          // Perbarui state lokal sesuai hasil eksekusi 5 pilar
          const nowIso = data.executedAt || new Date().toISOString();
          // Aksi yang belum punya eksekutor otomatis tidak boleh tampil seolah sudah berjalan
          const manualOnly = Boolean(data.manualActionRequired);
          set((state) => ({
            winningPlans: state.winningPlans.map((p) =>
              p.id === planId
                ? {
                    ...mergedPlan,
                    status: manualOnly ? 'approved' : 'executed',
                    executedAt: manualOnly ? undefined : nowIso,
                    executionNote: manualOnly
                      ? `Disetujui. Perlu dikerjakan manual: ${data.summary || ''}`
                      : data.summary,
                  }
                : p
            ),
            currentLpCopySnapshot:
              mergedPlan.actionType === 'update_lp_copy'
                ? {
                    ...state.currentLpCopySnapshot,
                    heroTitle:
                      mergedPlan.actionPayload.afterHeroTitle ||
                      state.currentLpCopySnapshot.heroTitle,
                    heroSubtitle:
                      mergedPlan.actionPayload.afterHeroSubtitle ||
                      state.currentLpCopySnapshot.heroSubtitle,
                    ctaText:
                      mergedPlan.actionPayload.afterCtaText ||
                      state.currentLpCopySnapshot.ctaText,
                  }
                : mergedPlan.actionType === 'update_offer_pricing'
                ? {
                    ...state.currentLpCopySnapshot,
                    standardPrice:
                      mergedPlan.actionPayload.recommendedEntryPrice ||
                      state.currentLpCopySnapshot.standardPrice,
                    proPrice:
                      mergedPlan.actionPayload.recommendedProPrice ||
                      state.currentLpCopySnapshot.proPrice,
                  }
                : state.currentLpCopySnapshot,
            orderBumpConfig: data.orderBumpUpdates
              ? { ...state.orderBumpConfig, ...data.orderBumpUpdates }
              : state.orderBumpConfig,
            capiStatus: data.capiUpdates
              ? { ...state.capiStatus, ...data.capiUpdates }
              : state.capiStatus,
          }));

          addActionLog({
            id: `win_${Date.now()}`,
            timestamp: nowIso,
            actor: 'ai_danu',
            actorLabel: 'Winning Engine (Disetujui User)',
            actionType:
              mergedPlan.actionType === 'scale_campaign_budget'
                ? 'scale_budget'
                : mergedPlan.actionType === 'pause_bleeding_campaign'
                ? 'update_status'
                : 'create_campaign',
            campaignId: String(mergedPlan.actionPayload.campaignId || mergedPlan.pillar),
            campaignName: String(
              mergedPlan.actionPayload.campaignName || mergedPlan.pillarLabel
            ),
            summary: data.summary || mergedPlan.title,
            liveExecuted: Boolean(data.liveExecuted),
          });

          if (
            mergedPlan.actionType === 'scale_campaign_budget' ||
            mergedPlan.actionType === 'pause_bleeding_campaign' ||
            mergedPlan.actionType === 'create_rapid_test_campaign'
          ) {
            await refreshCampaigns();
          }

          return {
            ok: true,
            message: data.summary || 'Rencana berhasil dijalankan.',
          };
        } catch (err: any) {
          return {
            ok: false,
            message: err?.message || 'Terjadi kesalahan saat mengeksekusi rencana.',
          };
        } finally {
          set({ executingPlanId: null });
        }
      },

      rejectPlan: (planId) =>
        set((state) => ({
          winningPlans: state.winningPlans.map((p) =>
            p.id === planId ? { ...p, status: 'rejected' } : p
          ),
        })),

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
          set((state) => {
            return {
              campaigns: result.campaigns,
              isLiveMeta: result.isLive,
              metaAccountName: result.accountName,
              metaSyncError: result.error || null,
              discoveredAccounts:
                result.discoveredAccounts && result.discoveredAccounts.length > 0
                  ? result.discoveredAccounts
                  : state.discoveredAccounts,
              accountBilling: result.accountBilling || state.accountBilling,
              apiConfig:
                result.resolvedAccountId &&
                result.resolvedAccountId !== state.apiConfig.adAccountId
                  ? { ...state.apiConfig, adAccountId: result.resolvedAccountId }
                  : state.apiConfig,
            };
          });
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
          const res = await authedFetch('/api/meta/insights', {
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
            const newInsights = {
              ageGender: data.ageGender || [],
              regions: data.regions || [],
              placements: data.placements || [],
              recommendation: data.recommendation || null,
            };
            set({ insightsData: newInsights });
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

      toggleAdStatus: async (adId: string, campaignId?: string, actor: string = 'human') => {
        const { campaigns, apiConfig, addActionLog } = get();
        let targetAd: MetaAd | undefined;
        let parentCampaignId = campaignId;

        for (const camp of campaigns) {
          if (campaignId && camp.id !== campaignId) continue;
          for (const adset of camp.adsets || []) {
            const found = adset.ads?.find((a) => a.id === adId);
            if (found) {
              targetAd = found;
              parentCampaignId = camp.id;
              break;
            }
          }
          if (targetAd) break;
        }

        if (!targetAd) return false;

        const newStatus = targetAd.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        const token = apiConfig.metaAccessToken || apiConfig.capiAccessToken;
        const result = await updateRemoteAdStatus(
          adId,
          newStatus,
          token,
          targetAd.name,
          actor,
          'ad',
          parentCampaignId
        );

        if (result.ok) {
          if (result.log) addActionLog(result.log);
          set({
            campaigns: campaigns.map((c) => {
              if (parentCampaignId && c.id !== parentCampaignId) return c;
              return {
                ...c,
                adsets: c.adsets?.map((adset) => ({
                  ...adset,
                  ads: adset.ads?.map((ad) =>
                    ad.id === adId
                      ? {
                          ...ad,
                          status: newStatus,
                          effectiveStatus: newStatus,
                        }
                      : ad
                  ),
                })),
              };
            }),
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
          const res = await authedFetch('/api/meta/actions', {
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
          text: `Selamat datang di **Monefyi Adspert**.\n\nSaya **Mas Danu** (CMO AI), memimpin tim spesialis untuk menganalisa data riil Meta Ads, demografi pemenang, dan mengeksekusi optimasi 5 Pilar Winning Anda:\n- **Bima (Media Buyer)**: Membaca metrik 26 kolom, menaikkan budget kampanye winning, dan mematikan iklan boncos.\n- **Sinta (Creative & LP Copywriter)**: Merancang hook 3-detik, copywriting Landing Page PAS/HSO, dan evaluasi Offer.\n- **Aris (Funnel & Tracking Specialist)**: Mengoptimalkan kecepatan OCLP, Order Bump, Upsell OTO, dan CAPI server-side.\n\nBuka tab **Winning Engine** atau tanyakan strategi kampanye Anda sekarang.`,
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
        productName: 'Upgrade ke Estimator PRO',
        headline:
          'YA! Upgrade ke Estimator PRO — Tambah Rp 50.000 (Hemat Rp 50.000)',
        description:
          'Khusus di halaman ini: Tambah Rp 50.000 untuk langsung upgrade ke Estimator PRO Seumur Hidup. Buka semua fitur Custom Branding Logo, SPK, Invoice & Kwitansi Resmi!',
        price: 50000,
        originalPrice: 199000,
        badgeText: 'PENAWARAN TERBATAS SEKALI INI SAJA',
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
      partialize: (state: any) =>
        ({
          rules: state.rules,
          apiConfig: state.apiConfig,
          winningEngineConfig: state.winningEngineConfig,
          currentLpCopySnapshot: state.currentLpCopySnapshot,
          customAgentNames: state.customAgentNames,
          orderBumpConfig: state.orderBumpConfig,
          upsellConfig: state.upsellConfig,
          adBank: state.adBank,
          actionLogs: state.actionLogs.slice(0, 50),
          chatMessages: state.chatMessages.slice(-30),
        } as any),
      merge: (persisted: unknown, current: MarketingStore): MarketingStore => {
        const persistedObj = (persisted as Partial<MarketingStore>) || {};
        const merged: MarketingStore = { ...current, ...persistedObj };
        // Sanitize agar orderBumpConfig tidak terkontaminasi teks lama "SOP"
        const headline = merged.orderBumpConfig?.headline || '';
        const prodName = merged.orderBumpConfig?.productName || '';
        if (
          headline.toLowerCase().includes('sop') ||
          headline.toLowerCase().includes('template') ||
          prodName.toLowerCase().includes('sop') ||
          prodName.toLowerCase().includes('template')
        ) {
          merged.orderBumpConfig = current.orderBumpConfig;
        }
        return merged;
      },
    }
  )
);
