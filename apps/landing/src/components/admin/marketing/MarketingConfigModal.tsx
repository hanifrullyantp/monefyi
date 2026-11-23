"use client";

import { useState, useEffect } from "react";
import { authedFetch } from "@/lib/auth/authedFetch";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { LlmProviderType } from "@/lib/engine/llmRouter";
import {
  Settings,
  Key,
  Save,
  Check,
  Bot,
  Sliders,
  X,
  Target,
  BarChart3,
  Sparkles,
  Zap,
  Headphones,
  Cpu,
  Eye,
  EyeOff,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface MarketingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STRATEGIST_MODEL_PRESETS: Record<LlmProviderType, { id: string; label: string }[]> = {
  claude: [
    { id: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet (Rekomendasi Strategist & Copywriting)" },
    { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet (Tajam & Stabil)" },
  ],
  openrouter: [
    { id: "anthropic/claude-3.7-sonnet", label: "OpenRouter: Claude 3.7 Sonnet (Strategist)" },
    { id: "anthropic/claude-3.5-sonnet", label: "OpenRouter: Claude 3.5 Sonnet" },
    { id: "openai/gpt-6-luna-pro", label: "OpenRouter: Luna Pro 6 (GPT-6 Luna Pro)" },
    { id: "openai/gpt-4o", label: "OpenRouter: GPT-4o" },
  ],
  gemini: [
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Deep Reasoning)" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  ],
  openai: [
    { id: "gpt-4o", label: "OpenAI GPT-4o" },
    { id: "gpt-4o-mini", label: "OpenAI GPT-4o Mini" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
  ],
};

const TECHNICAL_MODEL_PRESETS: Record<LlmProviderType, { id: string; label: string }[]> = {
  gemini: [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Rekomendasi: Sangat Cepat & Murah)" },
    { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite (Ekstra Hemat)" },
  ],
  openrouter: [
    { id: "openai/gpt-6-luna-pro", label: "OpenRouter: Luna Pro 6 (GPT-6 Luna Pro - Unggulan)" },
    { id: "openai/gpt-6-luna", label: "OpenRouter: Luna 6 (GPT-6 Luna Fast)" },
    { id: "google/gemini-2.5-flash", label: "OpenRouter: Gemini 2.5 Flash (Murah)" },
    { id: "deepseek/deepseek-chat", label: "OpenRouter: DeepSeek V3 (Sangat Ekonomis)" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Groq: Llama 3.3 70B (Instan)" },
  ],
  claude: [
    { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku (Cepat)" },
  ],
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini (Hemat)" },
  ],
};

export function MarketingConfigModal({ isOpen, onClose }: MarketingConfigModalProps) {
  const {
    apiConfig,
    updateApiConfig,
    rules,
    updateRules,
    winningEngineConfig,
    updateWinningEngineConfig,
    customAgentNames,
    updateAgentNames,
    refreshCampaigns,
    refreshInsights,
  } = useMarketingStore();

  const [metaToken, setMetaToken] = useState(apiConfig.metaAccessToken || "");
  const [adAccountId, setAdAccountId] = useState(apiConfig.adAccountId || "act_5763154810473541");
  const [pixelId, setPixelId] = useState(apiConfig.pixelId || "1530674178146899");
  const [capiToken, setCapiToken] = useState(apiConfig.capiAccessToken || "");

  const [openRouterKey, setOpenRouterKey] = useState(
    winningEngineConfig.llmRouting.openRouterApiKey || apiConfig.aiApiKey || ""
  );
  const [strategistModel, setStrategistModel] = useState(
    winningEngineConfig.llmRouting.strategist.model || "anthropic/claude-3.5-sonnet"
  );
  const [processorModel, setProcessorModel] = useState(
    winningEngineConfig.llmRouting.processor?.model || "openai/gpt-6-luna-pro"
  );
  const [technicalModel, setTechnicalModel] = useState(
    winningEngineConfig.llmRouting.technical.model || "openai/gpt-6-luna-pro"
  );

  // WhatsApp & Telegram Notification State
  const [waPhone, setWaPhone] = useState(
    winningEngineConfig.notifications.whatsappAdminPhone || ""
  );
  const [waApiKey, setWaApiKey] = useState(
    winningEngineConfig.notifications.whatsappApiKey || ""
  );
  const [tgBotToken, setTgBotToken] = useState(
    winningEngineConfig.notifications.telegramBotToken || ""
  );
  const [tgChatId, setTgChatId] = useState(
    winningEngineConfig.notifications.telegramChatId || ""
  );

  const [showMetaToken, setShowMetaToken] = useState(false);
  const [showCapiToken, setShowCapiToken] = useState(false);

  const [maxCpa, setMaxCpa] = useState(rules.maxCpaThreshold);
  const [minRoas, setMinRoas] = useState(rules.minRoasScaleThreshold);
  const [scaleBudgetPct, setScaleBudgetPct] = useState(rules.scaleBudgetPercentage);
  const [freqThreshold, setFreqThreshold] = useState(rules.frequencyFatigueThreshold);

  // Custom Agent Names (Bebas Emoticon)
  const [cmoName, setCmoName] = useState(customAgentNames?.cmo || "Mas Danu");
  const [mediaBuyerName, setMediaBuyerName] = useState(customAgentNames?.media_buyer || "Bima");
  const [copywriterName, setCopywriterName] = useState(customAgentNames?.copywriter || "Sinta");
  const [funnelName, setFunnelName] = useState(customAgentNames?.funnel_aov || "Aris");
  const [csName, setCsName] = useState(customAgentNames?.cs || "Mbak Esti");

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isTestingMeta, setIsTestingMeta] = useState(false);
  const [metaTestMsg, setMetaTestMsg] = useState<{
    ok: boolean;
    message: string;
    details?: any;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMetaToken(apiConfig.metaAccessToken || "");
      setAdAccountId(apiConfig.adAccountId || "act_5763154810473541");
      setPixelId(apiConfig.pixelId || "1530674178146899");
      setCapiToken(apiConfig.capiAccessToken || "");

      setOpenRouterKey(
        winningEngineConfig.llmRouting.openRouterApiKey || apiConfig.aiApiKey || ""
      );
      setStrategistModel(
        winningEngineConfig.llmRouting.strategist.model || "anthropic/claude-3.5-sonnet"
      );
      setProcessorModel(
        winningEngineConfig.llmRouting.processor?.model || "openai/gpt-6-luna-pro"
      );
      setTechnicalModel(
        winningEngineConfig.llmRouting.technical.model || "openai/gpt-6-luna-pro"
      );

      setWaPhone(winningEngineConfig.notifications.whatsappAdminPhone || "");
      setWaApiKey(winningEngineConfig.notifications.whatsappApiKey || "");
      setTgBotToken(winningEngineConfig.notifications.telegramBotToken || "");
      setTgChatId(winningEngineConfig.notifications.telegramChatId || "");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestMeta = async () => {
    const activeToken = metaToken.trim() || capiToken.trim();
    const activeAccountId = adAccountId.trim() || "act_5763154810473541";

    if (!activeToken) {
      setMetaTestMsg({
        ok: false,
        message: "Masukkan Access Token terlebih dahulu untuk mengetes koneksi.",
      });
      return;
    }

    setIsTestingMeta(true);
    setMetaTestMsg(null);

    try {
      const res = await authedFetch("/api/meta/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: metaToken.trim(),
          capiAccessToken: capiToken.trim(),
          adAccountId: activeAccountId,
          pixelId: pixelId.trim() || "1530674178146899",
          testOnly: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        const resolvedToken = data.resolvedToken || activeToken;
        const resolvedActId = data.account?.id || activeAccountId;

        setMetaToken(resolvedToken);
        setAdAccountId(resolvedActId);

        updateApiConfig({
          metaAccessToken: resolvedToken,
          adAccountId: resolvedActId,
          pixelId: pixelId.trim() || "1530674178146899",
          capiAccessToken: capiToken.trim() || resolvedToken,
          aiProvider: "openrouter",
          aiApiKey: openRouterKey.trim(),
        });

        await Promise.all([refreshCampaigns(), refreshInsights()]);

        setMetaTestMsg({
          ok: true,
          message:
            data.message ||
            `Terhubung sukses ke ${data.account?.name} (${data.account?.currency})! Data kampanye telah disinkronkan.`,
          details: data.account,
        });
      } else {
        setMetaTestMsg({
          ok: false,
          message: data.error || "Gagal menghubungkan ke Meta Graph API.",
        });
      }
    } catch (err: any) {
      setMetaTestMsg({
        ok: false,
        message: err.message || "Gagal menghubungi server proxy Meta.",
      });
    } finally {
      setIsTestingMeta(false);
    }
  };

  const handleSave = async () => {
    const cleanToken = metaToken.trim() || capiToken.trim();
    const cleanActId = adAccountId.trim() || "act_5763154810473541";

    updateApiConfig({
      metaAccessToken: cleanToken,
      adAccountId: cleanActId,
      pixelId: pixelId.trim() || "1530674178146899",
      capiAccessToken: capiToken.trim() || cleanToken,
      aiProvider: "openrouter",
      aiApiKey: openRouterKey.trim(),
    });

    updateWinningEngineConfig({
      targetCpa: Number(maxCpa),
      targetRoas: Number(minRoas),
      maxScalePctPerStep: Number(scaleBudgetPct),
      llmRouting: {
        openRouterApiKey: openRouterKey.trim(),
        strategist: {
          provider: "openrouter",
          apiKey: openRouterKey.trim(),
          model: strategistModel.trim() || "anthropic/claude-3.5-sonnet",
        },
        processor: {
          provider: "openrouter",
          apiKey: openRouterKey.trim(),
          model: processorModel.trim() || "openai/gpt-6-luna-pro",
        },
        technical: {
          provider: "openrouter",
          apiKey: openRouterKey.trim(),
          model: technicalModel.trim() || "openai/gpt-6-luna-pro",
        },
      },
      notifications: {
        whatsappEnabled: true,
        whatsappAdminPhone: waPhone.trim(),
        whatsappApiKey: waApiKey.trim(),
        telegramEnabled: true,
        telegramBotToken: tgBotToken.trim(),
        telegramChatId: tgChatId.trim(),
      },
    });

    // Simpan permanen ke Supabase Cloud Database (Sinkron Multi-Device)
    try {
      await authedFetch("/api/engine/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adAccountId: cleanActId,
          metaAccessToken: cleanToken,
          metaCapiToken: capiToken.trim() || cleanToken,
          metaPixelId: pixelId.trim() || "1530674178146899",
          openRouterApiKey: openRouterKey.trim(),
          strategistModel: strategistModel.trim() || "anthropic/claude-3.5-sonnet",
          processorModel: processorModel.trim() || "openai/gpt-6-luna-pro",
          technicalModel: technicalModel.trim() || "openai/gpt-6-luna-pro",
          whatsappAdminPhone: waPhone.trim(),
          whatsappApiKey: waApiKey.trim(),
          telegramBotToken: tgBotToken.trim(),
          telegramChatId: tgChatId.trim(),
          targetCpa: Number(maxCpa),
          targetRoas: Number(minRoas),
          maxScalePctPerStep: Number(scaleBudgetPct),
        }),
      });
    } catch {
      // Abaikan jika offline
    }

    updateRules({
      maxCpaThreshold: Number(maxCpa),
      minRoasScaleThreshold: Number(minRoas),
      scaleBudgetPercentage: Number(scaleBudgetPct),
      frequencyFatigueThreshold: Number(freqThreshold),
    });

    updateAgentNames({
      cmo: cmoName.trim() || "Mas Danu",
      media_buyer: mediaBuyerName.trim() || "Bima",
      copywriter: copywriterName.trim() || "Sinta",
      funnel_aov: funnelName.trim() || "Aris",
      cs: csName.trim() || "Mbak Esti",
    });

    await refreshCampaigns();

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto transition-colors">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Konfigurasi Meta Ads API, Dual-LLM Switcher &amp; Notifikasi WA/Telegram
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur kredensial Meta Graph API, pembagian tugas LLM (Claude Strategist vs Gemini Teknis), dan kanal laporan otomatis.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Pengaturan berhasil disimpan dan disinkronkan ke Winning Engine!</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Section 1: Meta Marketing API */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              <span>1. Kredensial Meta Marketing Graph API &amp; CAPI</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ad Account ID
                </label>
                <input
                  type="text"
                  placeholder="act_1234567890"
                  value={adAccountId}
                  onChange={(e) => setAdAccountId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pixel ID
                </label>
                <input
                  type="text"
                  placeholder="1530674178146899"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Meta User / System User Access Token
                  </label>
                  {metaToken && (
                    <button
                      type="button"
                      onClick={() => setMetaToken("")}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Bersihkan Token
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showMetaToken ? "text" : "password"}
                    placeholder="EAA... (Token dengan scope ads_read, ads_management)"
                    value={metaToken}
                    onChange={(e) => setMetaToken(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 pr-10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMetaToken((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showMetaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Meta Conversions API (CAPI) Server Token
                  </label>
                  {capiToken && (
                    <button
                      type="button"
                      onClick={() => setCapiToken("")}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Bersihkan Token
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showCapiToken ? "text" : "password"}
                    placeholder="EAA... (Token CAPI server dari Events Manager)"
                    value={capiToken}
                    onChange={(e) => setCapiToken(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 pr-10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCapiToken((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showCapiToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 pt-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestMeta}
                    disabled={isTestingMeta}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>
                      {isTestingMeta ? "Menguji Koneksi ke Meta..." : "Tes Koneksi Meta Sekarang"}
                    </span>
                  </button>
                  <span className="text-[11px] text-slate-500">
                    Memverifikasi langsung ke server Facebook Graph API v20.0.
                  </span>
                </div>

                {metaTestMsg && (
                  <div
                    className={cn(
                      "p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2",
                      metaTestMsg.ok
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                        : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                    )}
                  >
                    {metaTestMsg.ok ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">{metaTestMsg.message}</p>
                      {metaTestMsg.details && (
                        <p className="text-[11px] opacity-80 mt-1 font-mono">
                          Akun: {metaTestMsg.details.name} | ID: {metaTestMsg.details.id} | Mata Uang:{" "}
                          {metaTestMsg.details.currency} | Status: {metaTestMsg.details.status}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: OpenRouter Unified Multi-LLM (Sonnet 3.5 + Luna 6 Pro + Gemini 2.5) */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                <span>2. OpenRouter Multi-LLM (1 Key untuk Sonnet 3.5, Luna &amp; Gemini)</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                Cukup 1 OpenRouter API Key
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Anda cukup memasukkan satu API Key OpenRouter. Sistem otomatis membagi tugas: <strong>Sonnet 3.5</strong> untuk strategi &amp; planning, <strong>Luna 6 Pro</strong> untuk filter data massal &amp; tren, dan <strong>Gemini 2.5</strong> untuk komunikasi user &amp; tugas rutin.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  OpenRouter API Key (sk-or-v1-...)
                </label>
                <input
                  type="password"
                  placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* 3 Kartu Pembagian Model Sesuai Tugas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                {/* 1. Strategist: Sonnet 3.5 */}
                <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-300 block">
                    AI Strategist &amp; Planning
                  </span>
                  <p className="text-[11px] font-extrabold text-slate-900 dark:text-white">
                    Anthropic Claude 3.5 Sonnet
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    Membuat analisa 5 pilar, menyusun rencana winning, evaluasi offer &amp; copywriting.
                  </p>
                  <input
                    type="text"
                    value={strategistModel}
                    onChange={(e) => setStrategistModel(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-lg p-1.5 text-[10px] font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* 2. Processor: Luna 6 Pro */}
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300 block">
                    Prapemrosesan &amp; Filter Massal
                  </span>
                  <p className="text-[11px] font-extrabold text-slate-900 dark:text-white">
                    Luna 6 Pro / OpenAI Luna
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    Prapemrosesan metrik ribuan baris, analisis visual adset &amp; tren real-time.
                  </p>
                  <input
                    type="text"
                    value={processorModel}
                    onChange={(e) => setProcessorModel(e.target.value)}
                    placeholder="openai/gpt-6-luna-pro"
                    className="w-full bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg p-1.5 text-[10px] font-mono text-slate-800 dark:text-slate-200"
                  />
                  <div className="flex gap-1 flex-wrap pt-0.5">
                    <button
                      type="button"
                      onClick={() => setProcessorModel("openai/gpt-6-luna-pro")}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-bold hover:bg-blue-200 cursor-pointer"
                    >
                      Luna Pro 6 (Aktif)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProcessorModel("openai/gpt-6-luna")}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      Luna 6 Fast
                    </button>
                  </div>
                </div>

                {/* 3. Technical: Gemini 2.5 Flash */}
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 block">
                    Komunikasi &amp; Tugas Cepat
                  </span>
                  <p className="text-[11px] font-extrabold text-slate-900 dark:text-white">
                    Google Gemini 2.5 Flash
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    Komunikasi interaktif chat dengan user, bot notifikasi, dan skoring cepat.
                  </p>
                  <input
                    type="text"
                    value={technicalModel}
                    onChange={(e) => setTechnicalModel(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg p-1.5 text-[10px] font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Notifikasi WhatsApp & Telegram */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              <span>3. Kanal Notifikasi Otomatis (WhatsApp &amp; Telegram)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Nomor WhatsApp Admin Penerima Laporan
                </label>
                <input
                  type="text"
                  placeholder="6281234567890"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  API Token WhatsApp Gateway (Fonnte / Wablas)
                </label>
                <input
                  type="password"
                  placeholder="Token Fonnte atau set di ENV FONNTE_TOKEN"
                  value={waApiKey}
                  onChange={(e) => setWaApiKey(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="password"
                  placeholder="123456789:ABCdefGHIjklMNO..."
                  value={tgBotToken}
                  onChange={(e) => setTgBotToken(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Telegram Chat ID Penerima
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 987654321 atau -100123456789"
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Automation Rules */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>4. Parameter Otomasi Pengendalian Iklan (Scale Model)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Batas CPA Boncos (IDR)
                </label>
                <input
                  type="number"
                  value={maxCpa}
                  onChange={(e) => setMaxCpa(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Min ROAS Scale
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={minRoas}
                  onChange={(e) => setMinRoas(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Scale Budget (%)
                </label>
                <input
                  type="number"
                  value={scaleBudgetPct}
                  onChange={(e) => setScaleBudgetPct(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Batas Frekuensi
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={freqThreshold}
                  onChange={(e) => setFreqThreshold(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Kustomisasi Nama Agen (Bebas Emoticon) */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>5. Kustomisasi Nama Panggilan Tim AI</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block mb-1 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  <span>CMO AI (Strategi &amp; Budget)</span>
                </label>
                <input
                  type="text"
                  value={cmoName}
                  onChange={(e) => setCmoName(e.target.value)}
                  placeholder="Mas Danu"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block mb-1 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  <span>Media Buyer (Meta Ads)</span>
                </label>
                <input
                  type="text"
                  value={mediaBuyerName}
                  onChange={(e) => setMediaBuyerName(e.target.value)}
                  placeholder="Bima"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Creative Strategist (Copywriter)</span>
                </label>
                <input
                  type="text"
                  value={copywriterName}
                  onChange={(e) => setCopywriterName(e.target.value)}
                  placeholder="Sinta"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>Funnel &amp; AOV Specialist</span>
                </label>
                <input
                  type="text"
                  value={funnelName}
                  onChange={(e) => setFunnelName(e.target.value)}
                  placeholder="Aris"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-teal-700 dark:text-teal-300 block mb-1 flex items-center gap-1">
                  <Headphones className="w-3 h-3" />
                  <span>Customer Support (CS Bot)</span>
                </label>
                <input
                  type="text"
                  value={csName}
                  onChange={(e) => setCsName(e.target.value)}
                  placeholder="Mbak Esti"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Konfigurasi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
