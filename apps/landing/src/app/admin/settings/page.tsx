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
  CreditCard,
  ExternalLink,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wifi,
} from "lucide-react";
import { MayarSettingsCard } from "@/components/admin/MayarSettingsCard";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useMarketingStore, type MetaAccountCredential } from "@/lib/store/marketingStore";
import { authedFetch } from "@/lib/auth/authedFetch";
import { LlmProviderType } from "@/lib/engine/llmRouter";
import { cn } from "@/lib/utils/cn";

const STRATEGIST_MODEL_PRESETS: Record<LlmProviderType, { id: string; label: string }[]> = {
  claude: [
    { id: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet (Rekomendasi: Strategist & Copywriting)" },
    { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet (Tajam & Stabil)" },
  ],
  openrouter: [
    { id: "openai/gpt-6-luna-pro", label: "OpenRouter: Luna Pro 6 (GPT-6 Luna Pro - Rekomendasi)" },
    { id: "openai/gpt-6-luna", label: "OpenRouter: Luna 6 (GPT-6 Luna Fast)" },
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
    { id: "openai/gpt-6-luna-pro", label: "OpenRouter: Luna Pro 6 (GPT-6 Luna Pro - Unggulan)" },
    { id: "openai/gpt-6-luna", label: "OpenRouter: Luna 6 (GPT-6 Luna Fast)" },
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

type SettingsTab = "features" | "ai" | "meta" | "whatsapp" | "payment" | "general";

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as SettingsTab) || "features";
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
    loadConfigFromCloud,
  } = useMarketingStore();

  const [tempSettings, setTempSettings] = useState(settings);
  const [saved, setSaved] = useState(false);

  // Meta & AI States (2 Akun Meta)
  const buildDefaultMetaAccounts = (api: typeof apiConfig): MetaAccountCredential[] => {
    if (Array.isArray(api.metaAccounts) && api.metaAccounts.length >= 2) {
      return api.metaAccounts.slice(0, 2);
    }
    const first = api.metaAccounts?.[0];
    return [
      {
        id: first?.id || "meta_1",
        label: first?.label || "Akun Meta 1 (Utama)",
        adAccountId: first?.adAccountId || api.adAccountId || "",
        pixelId: first?.pixelId || api.pixelId || "",
        metaAccessToken: first?.metaAccessToken || api.metaAccessToken || "",
        capiAccessToken: first?.capiAccessToken || api.capiAccessToken || "",
      },
      {
        id: "meta_2",
        label: "Akun Meta 2 (Baru)",
        adAccountId: "",
        pixelId: "",
        metaAccessToken: "",
        capiAccessToken: "",
      },
    ];
  };

  const [metaAccounts, setMetaAccounts] = useState<MetaAccountCredential[]>(() =>
    buildDefaultMetaAccounts(apiConfig)
  );
  const [activeMetaAccountId, setActiveMetaAccountId] = useState<string>(
    apiConfig.activeMetaAccountId || "meta_1"
  );
  const [showMetaTokens, setShowMetaTokens] = useState<Record<string, boolean>>({});
  const [showCapiTokens, setShowCapiTokens] = useState<Record<string, boolean>>({});
  const [testingMetaId, setTestingMetaId] = useState<string | null>(null);
  const [metaTestResults, setMetaTestResults] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});
  const [showMetaTutorial, setShowMetaTutorial] = useState(true);

  // OpenRouter Master Key (Loaded securely from Cloud / Store, never hardcoded)
  const [openRouterKey, setOpenRouterKey] = useState(
    winningEngineConfig.llmRouting.openRouterApiKey ||
    apiConfig.aiApiKey ||
    ""
  );
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

  // Multi-LLM States
  const [strategistProvider, setStrategistProvider] = useState<LlmProviderType>(
    winningEngineConfig.llmRouting.strategist.provider || "openrouter"
  );
  const [strategistKey, setStrategistKey] = useState(
    winningEngineConfig.llmRouting.strategist.apiKey ||
    winningEngineConfig.llmRouting.openRouterApiKey ||
    ""
  );
  const [strategistModel, setStrategistModel] = useState(
    winningEngineConfig.llmRouting.strategist.model || "openai/gpt-6-luna-pro"
  );

  const [technicalProvider, setTechnicalProvider] = useState<LlmProviderType>(
    winningEngineConfig.llmRouting.technical.provider || "openrouter"
  );
  const [technicalKey, setTechnicalKey] = useState(
    winningEngineConfig.llmRouting.technical.apiKey ||
    winningEngineConfig.llmRouting.openRouterApiKey ||
    ""
  );
  const [technicalModel, setTechnicalModel] = useState(
    winningEngineConfig.llmRouting.technical.model || "openai/gpt-6-luna-pro"
  );

  const [showStrategistKey, setShowStrategistKey] = useState(false);
  const [showTechnicalKey, setShowTechnicalKey] = useState(false);

  useEffect(() => {
    loadConfigFromCloud().then(() => {
      const state = useMarketingStore.getState();
      const cfg = state.winningEngineConfig;
      const api = state.apiConfig;
      if (cfg.llmRouting.openRouterApiKey) {
        setOpenRouterKey(cfg.llmRouting.openRouterApiKey);
        setStrategistKey((k) => k || cfg.llmRouting.openRouterApiKey || "");
        setTechnicalKey((k) => k || cfg.llmRouting.openRouterApiKey || "");
      }
      setMetaAccounts(buildDefaultMetaAccounts(api));
      if (api.activeMetaAccountId) setActiveMetaAccountId(api.activeMetaAccountId);
    });
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as SettingsTab;
    if (tabParam && ["features", "ai", "meta", "whatsapp", "payment", "general"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const updateMetaAccountField = (
    slotId: string,
    field: keyof MetaAccountCredential,
    value: string
  ) => {
    setMetaAccounts((prev) =>
      prev.map((acc) => (acc.id === slotId ? { ...acc, [field]: value } : acc))
    );
  };

  const handleTestMetaAccount = async (acc: MetaAccountCredential) => {
    const activeToken = acc.metaAccessToken.trim() || acc.capiAccessToken.trim();
    if (!activeToken) {
      setMetaTestResults((prev) => ({
        ...prev,
        [acc.id]: {
          ok: false,
          message: "Masukkan Access Token terlebih dahulu untuk mengetes koneksi.",
        },
      }));
      return;
    }

    setTestingMetaId(acc.id);
    setMetaTestResults((prev) => {
      const next = { ...prev };
      delete next[acc.id];
      return next;
    });

    try {
      const res = await authedFetch("/api/meta/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: acc.metaAccessToken.trim(),
          capiAccessToken: acc.capiAccessToken.trim(),
          adAccountId: acc.adAccountId.trim(),
          pixelId: acc.pixelId.trim() || "1530674178146899",
          testOnly: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        const resolvedId = data.account?.id || acc.adAccountId;
        if (resolvedId && resolvedId !== acc.adAccountId) {
          updateMetaAccountField(acc.id, "adAccountId", resolvedId);
        }
        setMetaTestResults((prev) => ({
          ...prev,
          [acc.id]: {
            ok: true,
            message:
              data.message ||
              `Terhubung ke ${data.account?.name || resolvedId} (${data.account?.currency || "IDR"})`,
          },
        }));
      } else {
        setMetaTestResults((prev) => ({
          ...prev,
          [acc.id]: {
            ok: false,
            message: data.error || "Gagal menghubungkan ke Meta Graph API.",
          },
        }));
      }
    } catch (err: any) {
      setMetaTestResults((prev) => ({
        ...prev,
        [acc.id]: {
          ok: false,
          message: err?.message || "Gagal menghubungi server proxy Meta.",
        },
      }));
    } finally {
      setTestingMetaId(null);
    }
  };

  const handleSaveAll = async () => {
    // 1. Simpan General Settings
    updateSettings(tempSettings);

    const finalOpenRouterKey =
      openRouterKey.trim() ||
      (strategistProvider === "openrouter" ? strategistKey.trim() : "") ||
      (technicalProvider === "openrouter" ? technicalKey.trim() : "") ||
      winningEngineConfig.llmRouting.openRouterApiKey ||
      "";

    const sanitizedAccounts = metaAccounts.map((acc) => ({
      ...acc,
      label: acc.label.trim() || (acc.id === "meta_1" ? "Akun Meta 1 (Utama)" : "Akun Meta 2 (Baru)"),
      adAccountId: acc.adAccountId.trim(),
      pixelId: acc.pixelId.trim(),
      metaAccessToken: acc.metaAccessToken.trim(),
      capiAccessToken: acc.capiAccessToken.trim(),
    }));
    const activeAcc =
      sanitizedAccounts.find((a) => a.id === activeMetaAccountId) || sanitizedAccounts[0];

    // 2. Simpan Meta API Config (2 Akun + Akun Aktif)
    updateApiConfig({
      metaAccessToken: activeAcc?.metaAccessToken || undefined,
      adAccountId: activeAcc?.adAccountId || undefined,
      pixelId: activeAcc?.pixelId || undefined,
      capiAccessToken: activeAcc?.capiAccessToken || undefined,
      activeMetaAccountId,
      metaAccounts: sanitizedAccounts,
      aiProvider: strategistProvider,
      aiApiKey: finalOpenRouterKey,
    });

    // 3. Simpan Dual-Slot Multi-LLM Config
    updateWinningEngineConfig({
      llmRouting: {
        openRouterApiKey: finalOpenRouterKey,
        strategist: {
          provider: strategistProvider,
          apiKey: strategistKey.trim() || finalOpenRouterKey,
          model: strategistModel,
        },
        processor: {
          provider: "openrouter",
          apiKey: finalOpenRouterKey,
          model: technicalModel.includes("luna")
            ? technicalModel
            : winningEngineConfig.llmRouting.processor?.model || "openai/gpt-6-luna-pro",
        },
        technical: {
          provider: technicalProvider,
          apiKey: technicalKey.trim() || finalOpenRouterKey,
          model: technicalModel,
        },
      },
    });

    // Simpan permanen ke Supabase Cloud Database (Sinkron Multi-Device)
    try {
      await authedFetch("/api/engine/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adAccountId: activeAcc?.adAccountId || "",
          metaAccessToken: activeAcc?.metaAccessToken || "",
          metaCapiToken: activeAcc?.capiAccessToken || "",
          metaPixelId: activeAcc?.pixelId || "1530674178146899",
          activeMetaAccountId,
          metaAccounts: sanitizedAccounts,
          openRouterApiKey: finalOpenRouterKey,
          strategistModel: strategistModel,
          processorModel: technicalModel.includes("luna")
            ? technicalModel
            : winningEngineConfig.llmRouting.processor?.model || "openai/gpt-6-luna-pro",
          technicalModel: technicalModel,
        }),
      });
    } catch {
      // Abaikan jika offline
    }

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
          { id: "features" as const, label: "Pusat Fitur & Halaman", icon: Settings, badge: "Hub" },
          { id: "ai" as const, label: "AI & Dual-LLM", icon: Cpu, badge: "Super Admin" },
          { id: "meta" as const, label: "Meta Ads & CAPI", icon: Key, badge: "API" },
          { id: "whatsapp" as const, label: "WhatsApp Bot", icon: MessageSquare },
          { id: "payment" as const, label: "Pembayaran Mayar", icon: CreditCard, badge: "Payment" },
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

      {/* TAB 0: PUSAT FITUR & HALAMAN (HUB SELURUH MENU LAINNYA) */}
      {activeTab === "features" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" />
              <span>Pusat Kendali Seluruh Fitur &amp; Halaman Froyek</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Akses cepat ke seluruh modul landing page, bot komunikasi, integrasi gateway, dan konten.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-5">
              {[
                {
                  title: "Bot WhatsApp CS & Tim",
                  desc: "Integrasi webhook & pesan otomatis WhatsApp",
                  href: "/admin/whatsapp",
                  category: "Komunikasi",
                  color: "emerald",
                },
                {
                  title: "Template Pesan WhatsApp",
                  desc: "Template follow-up lead, invoice, & recovery",
                  href: "/admin/crm-template",
                  category: "CRM & Penjualan",
                  color: "emerald",
                },
                {
                  title: "Pricing & Gateway Mayar",
                  desc: "Manajemen paket harga & pembayaran headless Mayar",
                  href: "/admin/pricing",
                  category: "Keuangan",
                  color: "blue",
                },
                {
                  title: "Konten Visual Landing",
                  desc: "Visual editor sections & hero landing page",
                  href: "/admin/konten",
                  category: "Landing Page",
                  color: "indigo",
                },
                {
                  title: "Konten JSON Data",
                  desc: "Editor database mentah JSON konfigurasi landing",
                  href: "/admin/konten-json",
                  category: "Landing Page",
                  color: "indigo",
                },
                {
                  title: "SEO & Tracking Pixel",
                  desc: "Meta pixel, GA4, GTM & OpenGraph metadata",
                  href: "/admin/seo",
                  category: "Marketing",
                  color: "amber",
                },
                {
                  title: "Toast Notifikasi Live",
                  desc: "Social proof popup pembelian riil di landing page",
                  href: "/admin/toast",
                  category: "Konversi",
                  color: "purple",
                },
                {
                  title: "Popup Relink Konversi",
                  desc: "Exit intent & popup promosi diskon spesial",
                  href: "/admin/relink-popup",
                  category: "Konversi",
                  color: "purple",
                },
                {
                  title: "FAQ & Tanya Jawab",
                  desc: "Kelola pertanyaan umum pelanggan estimator",
                  href: "/admin/faq",
                  category: "Konten",
                  color: "teal",
                },
                {
                  title: "Testimonial Pelanggan",
                  desc: "Review kepuasan user & rating kontraktor",
                  href: "/admin/testimonial",
                  category: "Social Proof",
                  color: "amber",
                },
                {
                  title: "Fitur & Keunggulan",
                  desc: "Daftar fitur estimator Froyek di homepage",
                  href: "/admin/features",
                  category: "Landing Page",
                  color: "indigo",
                },
                {
                  title: "Media Library",
                  desc: "Galeri gambar, mockup UI & aset grafis",
                  href: "/admin/media",
                  category: "Aset",
                  color: "cyan",
                },
                {
                  title: "Global & Merek",
                  desc: "Nama brand, logo, favicon & identitas",
                  href: "/admin/global",
                  category: "Branding",
                  color: "rose",
                },
                {
                  title: "Kontak & Sosial Media",
                  desc: "Nomor CS, Instagram, TikTok & email resmi",
                  href: "/admin/kontak",
                  category: "Branding",
                  color: "rose",
                },
                {
                  title: "Footer & Privasi",
                  desc: "Kebijakan privasi, syarat layanan & copyright",
                  href: "/admin/footer",
                  category: "Legal",
                  color: "slate",
                },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {item.category}
                      </span>
                      <span className="text-emerald-500 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        Buka &rarr;
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

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

          {/* Card Kunci Utama OpenRouter Multi-LLM Cloud Gateway */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/40 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-black text-white">
                  Kunci Utama OpenRouter (Multi-LLM Cloud Gateway)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Tersimpan di Supabase Cloud
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              API Key OpenRouter ini otomatis mengaktifkan seluruh model multi-LLM (Claude 3.7 Sonnet, GPT-6 Luna Pro, GPT-4o, DeepSeek V3, dan Gemini) untuk seluruh slot AI Froyek tanpa perlu mengisi API key satu per satu.
            </p>
            <div className="relative">
              <input
                type={showOpenRouterKey ? "text" : "password"}
                value={openRouterKey}
                onChange={(e) => {
                  setOpenRouterKey(e.target.value);
                  if (strategistProvider === "openrouter") setStrategistKey(e.target.value);
                  if (technicalProvider === "openrouter") setTechnicalKey(e.target.value);
                }}
                placeholder="sk-or-v1-..."
                className="w-full bg-white dark:bg-slate-950 border border-purple-500/50 rounded-xl p-2.5 pr-10 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-purple-400"
              />
              <button
                type="button"
                onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showOpenRouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
                <input
                  type="text"
                  value={strategistModel}
                  onChange={(e) => setStrategistModel(e.target.value)}
                  placeholder="ID Model Kustom (misal: openai/gpt-6-luna-pro)"
                  className="mt-1.5 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-[10px] font-mono text-slate-800 dark:text-slate-200"
                />
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
                <input
                  type="text"
                  value={technicalModel}
                  onChange={(e) => setTechnicalModel(e.target.value)}
                  placeholder="ID Model Kustom (misal: openai/gpt-6-luna-pro)"
                  className="mt-1.5 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-[10px] font-mono text-slate-800 dark:text-slate-200"
                />
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

      {/* TAB 2: META ADS API & CAPI (DUKUNG 2 AKUN META + TUTORIAL) */}
      {activeTab === "meta" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5 shadow-xs">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-600" />
                  <span>Kredensial Meta Marketing Graph API &amp; CAPI (2 Akun)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Simpan hingga <strong>2 akun Meta</strong> (Utama &amp; Cadangan/Baru). Pilih salah satu sebagai akun aktif yang dipakai oleh Meta Ads Commander &amp; Winning Engine, lalu klik <strong>Simpan Perubahan</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMetaTutorial((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Tutorial Ambil Token</span>
                {showMetaTutorial ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {metaAccounts.map((acc, index) => {
                const isActive = activeMetaAccountId === acc.id;
                const testResult = metaTestResults[acc.id];
                const isTesting = testingMetaId === acc.id;
                const showToken = Boolean(showMetaTokens[acc.id]);
                const showCapi = Boolean(showCapiTokens[acc.id]);

                return (
                  <div
                    key={acc.id}
                    className={cn(
                      "rounded-2xl border p-4 sm:p-5 space-y-4 transition-all",
                      isActive
                        ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 shadow-xs"
                        : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-800">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={cn(
                            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0",
                            isActive
                              ? "bg-blue-600 text-white"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          )}
                        >
                          Akun {index + 1}
                        </span>
                        <input
                          type="text"
                          value={acc.label}
                          onChange={(e) => updateMetaAccountField(acc.id, "label", e.target.value)}
                          placeholder={index === 0 ? "Akun Meta 1 (Utama)" : "Akun Meta 2 (Baru)"}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 min-w-0 flex-1"
                        />
                      </div>

                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveMetaAccountId(acc.id)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer shrink-0"
                        >
                          Jadikan Aktif
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Ad Account ID
                          </label>
                          <a
                            href="https://business.facebook.com/settings/ad-accounts"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                          >
                            Ambil ID <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                        <input
                          type="text"
                          value={acc.adAccountId}
                          onChange={(e) => updateMetaAccountField(acc.id, "adAccountId", e.target.value)}
                          placeholder="act_5763154810473541"
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Meta Pixel / Dataset ID
                          </label>
                          <a
                            href="https://business.facebook.com/events_manager2/list/pixel"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                          >
                            Ambil Pixel <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                        <input
                          type="text"
                          value={acc.pixelId}
                          onChange={(e) => updateMetaAccountField(acc.id, "pixelId", e.target.value)}
                          placeholder="1530674178146899"
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Meta User / System User Access Token
                          </label>
                          <a
                            href="https://business.facebook.com/settings/system-users"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                          >
                            Ambil System Token <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                        <div className="relative">
                          <input
                            type={showToken ? "text" : "password"}
                            value={acc.metaAccessToken}
                            onChange={(e) => updateMetaAccountField(acc.id, "metaAccessToken", e.target.value)}
                            placeholder="EAA..."
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 pr-10 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowMetaTokens((prev) => ({ ...prev, [acc.id]: !prev[acc.id] }))
                            }
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Conversions API (CAPI) Server Token
                          </label>
                          <a
                            href="https://business.facebook.com/events_manager2/list/pixel"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                          >
                            Ambil CAPI Token <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                        <div className="relative">
                          <input
                            type={showCapi ? "text" : "password"}
                            value={acc.capiAccessToken}
                            onChange={(e) => updateMetaAccountField(acc.id, "capiAccessToken", e.target.value)}
                            placeholder="EAA..."
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 pr-10 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowCapiTokens((prev) => ({ ...prev, [acc.id]: !prev[acc.id] }))
                            }
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showCapi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isTesting}
                        onClick={() => handleTestMetaAccount(acc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {isTesting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Wifi className="w-3.5 h-3.5" />
                        )}
                        <span>{isTesting ? "Mengetes..." : "Tes Koneksi Akun"}</span>
                      </button>

                      {acc.metaAccessToken && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Token terisi
                        </span>
                      )}
                    </div>

                    {testResult && (
                      <div
                        className={cn(
                          "p-2.5 rounded-xl text-xs flex items-start gap-2 border",
                          testResult.ok
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800"
                        )}
                      >
                        {testResult.ok ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        )}
                        <span className="leading-relaxed">{testResult.message}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* TUTORIAL LANGKAH DEMI LANGKAH + LINK LANGSUNG META */}
          {showMetaTutorial && (
            <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5 shadow-xs">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Tutorial Mengambil ID &amp; Token Meta (Dengan Link Langsung)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Klik tombol link biru pada tiap langkah di bawah untuk langsung membuka halaman Meta Business Suite / Developers yang sesuai.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Langkah 1: Ad Account ID */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      1. Ambil Ad Account ID (<code className="font-mono text-blue-600 dark:text-blue-400">act_...</code>)
                    </span>
                  </div>
                  <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Buka halaman <strong>Ad Accounts</strong> di Business Settings atau Ads Manager.</li>
                    <li>Pilih akun iklan yang ingin dihubungkan.</li>
                    <li>Salin deretan angka ID-nya (tambahkan awalan <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">act_</code>, contoh: <code className="font-mono">act_5763154810473541</code>).</li>
                  </ol>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href="https://business.facebook.com/settings/ad-accounts"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                      Buka Business Ad Accounts <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://adsmanager.facebook.com/adsmanager/manage/campaigns"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors"
                    >
                      Buka Ads Manager <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Langkah 2: Pixel / Dataset ID */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      2. Ambil Meta Pixel / Dataset ID
                    </span>
                  </div>
                  <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Buka <strong>Events Manager (Data Sources)</strong> atau menu <strong>Datasets</strong>.</li>
                    <li>Pilih Pixel yang terpasang pada website/landing page Anda.</li>
                    <li>Masuk ke tab <strong>Settings</strong>, lalu salin angka <strong>Dataset ID / Pixel ID</strong> (15–16 digit).</li>
                  </ol>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href="https://business.facebook.com/events_manager2/list/pixel"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                      Buka Events Manager <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://business.facebook.com/settings/datasets"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors"
                    >
                      Buka Business Datasets <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Langkah 3: System User / Access Token */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      3. Ambil System User Access Token (Permanen)
                    </span>
                  </div>
                  <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Buka <strong>System Users</strong> di Business Settings → klik <strong>Add</strong> (role: <em>Admin</em>).</li>
                    <li>Klik <strong>Assign Assets</strong> → pilih <strong>Ad Accounts</strong> (centang <em>Full Control / Manage Campaigns</em>) &amp; <strong>Datasets</strong>.</li>
                    <li>Klik <strong>Buat token / Generate New Token</strong> → pilih App → centang <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">ads_management</code>, <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">ads_read</code>, <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">business_management</code> → pilih masa berlaku <strong>Never</strong> → salin token (<code className="font-mono">EAA...</code>).</li>
                  </ol>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 space-y-1.5">
                    <p className="text-[11px] font-black text-amber-900 dark:text-amber-200">
                      Tombol &ldquo;Buat token&rdquo; abu-abu / muncul pesan &ldquo;aplikasi harus menjadi bagian dari portofolio bisnis ini&rdquo;?
                    </p>
                    <ol className="text-[11px] text-amber-800 dark:text-amber-300 space-y-1 list-decimal list-inside leading-relaxed">
                      <li>Buka <strong>Business Settings → Accounts → Apps</strong> pada Business Portfolio yang sama.</li>
                      <li>Klik <strong>Add → Connect an app ID</strong> (masukkan App ID Meta Anda) atau buat App baru bertipe <em>Business</em> di <strong>Meta for Developers</strong> lalu hubungkan ke Business Portfolio ini.</li>
                      <li>Setelah App masuk ke daftar portofolio, kembali ke <strong>System Users</strong> dan refresh halaman — tombol <strong>Buat token</strong> akan aktif.</li>
                    </ol>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      <a
                        href="https://business.facebook.com/settings/apps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                      >
                        Tambahkan App di Business Settings <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href="https://developers.facebook.com/apps/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:border-amber-500 transition-colors"
                      >
                        Buat App di Meta Developers <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href="https://business.facebook.com/settings/system-users"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                      Buka System Users <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://developers.facebook.com/tools/explorer/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors"
                    >
                      Graph API Explorer (Tes Cepat) <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://developers.facebook.com/tools/debug/accesstoken/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors"
                    >
                      Cek Expired Token <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Langkah 4: CAPI Server Token */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      4. Ambil Conversions API (CAPI) Server Token
                    </span>
                  </div>
                  <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Buka <strong>Events Manager (Data Sources)</strong> dan pilih Pixel Anda.</li>
                    <li>Klik tab <strong>Settings</strong> lalu scroll ke bagian <strong>Conversions API</strong>.</li>
                    <li>Di bawah <em>Set up direct integration</em>, klik <strong>Generate access token</strong>, lalu salin token (<code className="font-mono">EAA...</code>) ke kolom CAPI di atas.</li>
                  </ol>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href="https://business.facebook.com/events_manager2/list/pixel"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                      Generate CAPI Token di Events Manager <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
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

      {/* TAB 4: PEMBAYARAN MAYAR & MONITORING KONEKSI */}
      {activeTab === "payment" && <MayarSettingsCard />}

      {/* TAB 5: GENERAL & SEO */}
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
