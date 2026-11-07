"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Save,
  Cpu,
  Key,
  ShieldCheck,
  Check,
  Bot,
  Zap,
  Globe,
  Settings,
  Eye,
  EyeOff,
  Sparkles,
  Sliders,
} from "lucide-react";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { LlmProviderType } from "@/lib/engine/llmRouter";
import { cn } from "@/lib/utils/cn";

const STRATEGIST_MODEL_PRESETS: Record<LlmProviderType, { id: string; label: string }[]> = {
  claude: [
    { id: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet (Rekomendasi: Strategist & Copywriting)" },
    { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet (Tajam & Stabil)" },
  ],
  openrouter: [
    { id: "anthropic/claude-3.7-sonnet", label: "OpenRouter: Claude 3.7 Sonnet (Strategist)" },
    { id: "anthropic/claude-3.5-sonnet", label: "OpenRouter: Claude 3.5 Sonnet" },
    { id: "openai/gpt-4o", label: "OpenRouter: GPT-4o" },
  ],
  gemini: [
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Deep Reasoning & Analysis)" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  ],
  openai: [
    { id: "gpt-4o", label: "OpenAI GPT-4o" },
    { id: "gpt-4o-mini", label: "OpenAI GPT-4o Mini" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Groq: Llama 3.3 70B Versatile" },
  ],
};

const TECHNICAL_MODEL_PRESETS: Record<LlmProviderType, { id: string; label: string }[]> = {
  gemini: [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Rekomendasi: Sangat Cepat & Hemat)" },
    { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite (Super Cepat)" },
  ],
  openrouter: [
    { id: "google/gemini-2.5-flash", label: "OpenRouter: Gemini 2.5 Flash" },
    { id: "deepseek/deepseek-chat", label: "OpenRouter: DeepSeek V3 (Ekonomis)" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Groq: Llama 3.3 70B (Instan)" },
  ],
  claude: [
    { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
  ],
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
};

type SettingsTab = "ai" | "meta" | "whatsapp" | "general";

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as SettingsTab) || "ai";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Stores
  const { settings, updateSettings } = useSettingsStore();
  const {
    apiConfig,
    updateApiConfig,
    winningEngineConfig,
    updateWinningEngineConfig,
    rules,
    updateRules,
    refreshCampaigns,
  } = useMarketingStore();

  const [tempSettings, setTempSettings] = useState(settings);
  const [saved, setSaved] = useState(false);

  // Meta & AI States
  const [adAccountId, setAdAccountId] = useState(apiConfig.adAccountId || "act_5763154810473541");
  const [pixelId, setPixelId] = useState(apiConfig.pixelId || "1530674178146899");
  const [metaToken, setMetaToken] = useState(apiConfig.metaAccessToken || "");
  const [capiToken, setCapiToken] = useState(apiConfig.capiAccessToken || "");

  // Multi-LLM States
  const [strategistProvider, setStrategistProvider] = useState<LlmProviderType>(
    winningEngineConfig.llmRouting.strategist.provider || "claude"
  );
  const [strategistKey, setStrategistKey] = useState(
    winningEngineConfig.llmRouting.strategist.apiKey || ""
  );
  const [strategistModel, setStrategistModel] = useState(
    winningEngineConfig.llmRouting.strategist.model || "claude-3-7-sonnet-latest"
  );

  const [technicalProvider, setTechnicalProvider] = useState<LlmProviderType>(
    winningEngineConfig.llmRouting.technical.provider || "gemini"
  );
  const [technicalKey, setTechnicalKey] = useState(
    winningEngineConfig.llmRouting.technical.apiKey || ""
  );
  const [technicalModel, setTechnicalModel] = useState(
    winningEngineConfig.llmRouting.technical.model || "gemini-2.5-flash"
  );

  const [showStrategistKey, setShowStrategistKey] = useState(false);
  const [showTechnicalKey, setShowTechnicalKey] = useState(false);
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [showCapiToken, setShowCapiToken] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as SettingsTab;
    if (tabParam && ["ai", "meta", "whatsapp", "general"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleSaveAll = async () => {
    // 1. Simpan General Settings
    updateSettings(tempSettings);

    // 2. Simpan Meta API Config
    updateApiConfig({
      metaAccessToken: metaToken.trim() || undefined,
      adAccountId: adAccountId.trim() || undefined,
      pixelId: pixelId.trim() || undefined,
      capiAccessToken: capiToken.trim() || undefined,
      aiProvider: strategistProvider,
      aiApiKey: strategistKey.trim() || technicalKey.trim() || undefined,
    });

    // 3. Simpan Dual-Slot Multi-LLM Config
    updateWinningEngineConfig({
      llmRouting: {
        strategist: {
          provider: strategistProvider,
          apiKey: strategistKey.trim() || undefined,
          model: strategistModel,
        },
        technical: {
          provider: technicalProvider,
          apiKey: technicalKey.trim() || undefined,
          model: technicalModel,
        },
      },
    });

    await refreshCampaigns().catch(() => undefined);

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const generalFields = [
    { key: "siteName", label: "Nama Site", type: "text" },
    { key: "siteUrl", label: "URL Site", type: "text" },
    { key: "waNumber", label: "No. WA CS (format: 628xxx)", type: "text" },
    { key: "metaTitle", label: "Meta Title (SEO)", type: "text" },
    { key: "metaDescription", label: "Meta Description", type: "textarea" },
    { key: "googleAnalyticsId", label: "Google Analytics ID", type: "text" },
    { key: "fbPixelId", label: "Facebook Pixel ID (Global)", type: "text" },
    { key: "gtmId", label: "GTM ID", type: "text" },
  ] as const;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-900/20">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Pengaturan Sistem</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Super Admin
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Konfigurasi AI Engine (Dual-LLM), Meta Graph API, Bot WhatsApp, dan SEO Landing Page.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl px-5 py-2.5 text-xs sm:text-sm font-black shadow-md shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saved ? "Berhasil Disimpan!" : "Simpan Perubahan"}</span>
        </button>
      </div>

      {/* Tabs Navigasi Pengaturan (Touch-Friendly di Mobile) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        {[
          { id: "ai" as const, label: "AI & Dual-LLM", icon: Cpu, badge: "Super Admin" },
          { id: "meta" as const, label: "Meta Ads & CAPI", icon: Key, badge: "API" },
          { id: "whatsapp" as const, label: "WhatsApp Bot", icon: MessageSquare },
          { id: "general" as const, label: "General & SEO", icon: Globe },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all border cursor-pointer",
                isActive
                  ? "bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600 shadow-2xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              <t.icon className={cn("w-4 h-4", isActive ? "text-indigo-400 dark:text-white" : "text-slate-500 dark:text-slate-400")} />
              <span>{t.label}</span>
              {t.badge && (
                <span
                  className={cn(
                    "text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                  )}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PENGATURAN AI & DUAL-LLM (SUPER ADMIN) */}
      {activeTab === "ai" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Dual-Slot Multi-LLM Engine Routing</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Konfigurasi pembagian tugas AI otomatis: <strong>Slot Strategist</strong> menangani evaluasi sudut pandang, hook copy &amp; arah kreatif (Claude/Gemini Pro/GPT-4o), sedangkan <strong>Slot Teknis</strong> mengeksekusi audit metrik, budget scale, dan deteksi boncos secara instan &amp; hemat (Gemini Flash/Groq).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Slot A: Strategist Engine */}
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                  SLOT A: STRATEGIST &amp; COPY
                </span>
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">Deep Reasoning</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Penyedia AI (Provider)
                </label>
                <select
                  value={strategistProvider}
                  onChange={(e) => {
                    const p = e.target.value as LlmProviderType;
                    setStrategistProvider(p);
                    const def = STRATEGIST_MODEL_PRESETS[p]?.[0]?.id;
                    if (def) setStrategistModel(def);
                  }}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="claude">Anthropic Claude (Rekomendasi Utama)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="openrouter">OpenRouter Multi-Model</option>
                  <option value="groq">Groq Llama 3.3</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pilihan Model
                </label>
                <select
                  value={strategistModel}
                  onChange={(e) => setStrategistModel(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {(STRATEGIST_MODEL_PRESETS[strategistProvider] || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    API Key ({strategistProvider.toUpperCase()})
                  </label>
                  {strategistKey && (
                    <span className="text-[10px] text-emerald-600 font-bold">Terisi</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showStrategistKey ? "text" : "password"}
                    value={strategistKey}
                    onChange={(e) => setStrategistKey(e.target.value)}
                    placeholder={`Tempel API Key ${strategistProvider}...`}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 pr-10 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStrategistKey(!showStrategistKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showStrategistKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Slot B: Technical & Realtime Engine */}
            <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-600 text-white">
                  SLOT B: AUDIT TEKNIS &amp; AUTO-SCALE
                </span>
                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300">Fast &amp; Ultra-Murah</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Penyedia AI (Provider)
                </label>
                <select
                  value={technicalProvider}
                  onChange={(e) => {
                    const p = e.target.value as LlmProviderType;
                    setTechnicalProvider(p);
                    const def = TECHNICAL_MODEL_PRESETS[p]?.[0]?.id;
                    if (def) setTechnicalModel(def);
                  }}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="gemini">Google Gemini (Rekomendasi Utama)</option>
                  <option value="openrouter">OpenRouter (DeepSeek / Gemini)</option>
                  <option value="groq">Groq (Instan Llama)</option>
                  <option value="claude">Anthropic Claude Haiku</option>
                  <option value="openai">OpenAI GPT-4o Mini</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pilihan Model
                </label>
                <select
                  value={technicalModel}
                  onChange={(e) => setTechnicalModel(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  {(TECHNICAL_MODEL_PRESETS[technicalProvider] || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    API Key ({technicalProvider.toUpperCase()})
                  </label>
                  {technicalKey && (
                    <span className="text-[10px] text-emerald-600 font-bold">Terisi</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showTechnicalKey ? "text" : "password"}
                    value={technicalKey}
                    onChange={(e) => setTechnicalKey(e.target.value)}
                    placeholder={`Tempel API Key ${technicalProvider}...`}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 pr-10 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTechnicalKey(!showTechnicalKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showTechnicalKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: META ADS API & CAPI */}
      {activeTab === "meta" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600" />
              <span>Kredensial Meta Marketing Graph API &amp; CAPI</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hubungkan akun iklan Meta Anda untuk monitoring real-time, scale otomatis, dan integrasi server-side Conversions API (CAPI).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Ad Account ID
              </label>
              <input
                type="text"
                value={adAccountId}
                onChange={(e) => setAdAccountId(e.target.value)}
                placeholder="act_5763154810473541"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Meta Pixel ID
              </label>
              <input
                type="text"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="1530674178146899"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Meta User / System User Access Token
              </label>
              <div className="relative">
                <input
                  type={showMetaToken ? "text" : "password"}
                  value={metaToken}
                  onChange={(e) => setMetaToken(e.target.value)}
                  placeholder="EAA..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 pr-10 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowMetaToken(!showMetaToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showMetaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Conversions API (CAPI) Server Token
              </label>
              <div className="relative">
                <input
                  type={showCapiToken ? "text" : "password"}
                  value={capiToken}
                  onChange={(e) => setCapiToken(e.target.value)}
                  placeholder="EAA..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 pr-10 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCapiToken(!showCapiToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCapiToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WHATSAPP BOT */}
      {activeTab === "whatsapp" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Bot WhatsApp AI &amp; Customer Service</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Atur nomor kontak WhatsApp resmi dan integrasi bot CS otomatis.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Nomor WhatsApp CS (Format Internasional: 628xxx)
              </label>
              <input
                type="text"
                value={tempSettings.waNumber || ""}
                onChange={(e) => setTempSettings((p) => ({ ...p, waNumber: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Live Chat Pojok Kanan</span>
                <button
                  type="button"
                  onClick={() => setTempSettings((p) => ({ ...p, liveChatEnabled: !p.liveChatEnabled }))}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                    tempSettings.liveChatEnabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  )}
                >
                  {tempSettings.liveChatEnabled ? "Aktif" : "Nonaktif"}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tombol WA Melayang</span>
                <button
                  type="button"
                  onClick={() => setTempSettings((p) => ({ ...p, waFloatEnabled: !p.waFloatEnabled }))}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                    tempSettings.waFloatEnabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  )}
                >
                  {tempSettings.waFloatEnabled ? "Aktif" : "Nonaktif"}
                </button>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                    Pusat Kontrol Bot WhatsApp (Fonnte / Wablas)
                  </p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    Kelola skrip obrolan, webhook follow-up order abandoned, dan notifikasi gaji mandor.
                  </p>
                </div>
              </div>
              <a
                href="/admin/whatsapp"
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shrink-0 transition-all"
              >
                Buka Bot WA &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GENERAL & SEO */}
      {activeTab === "general" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Identitas Website, Brand &amp; Pelacakan Analytics</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generalFields.map(({ key, label, type }) => (
              <div key={key} className={type === "textarea" ? "md:col-span-2" : ""}>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {label}
                </label>
                {type === "textarea" ? (
                  <textarea
                    rows={3}
                    value={tempSettings[key] || ""}
                    onChange={(e) => setTempSettings((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={tempSettings[key] || ""}
                    onChange={(e) => setTempSettings((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
