"use client";

import { useState } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import {
  Settings,
  Key,
  Shield,
  Layers,
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
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface MarketingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OPENROUTER_POPULAR_MODELS = [
  { id: "openai/gpt-5.6-luna", label: "OpenAI Luna (Promo Efisien & Cepat)" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Sangat Murah)" },
  { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku (Copywriting Cepat)" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek V3 (Ekonomis & Kuat)" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B (Open Weights)" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini" },
];

export function MarketingConfigModal({ isOpen, onClose }: MarketingConfigModalProps) {
  const { apiConfig, updateApiConfig, rules, updateRules, customAgentNames, updateAgentNames } =
    useMarketingStore();

  const [metaToken, setMetaToken] = useState(apiConfig.metaAccessToken || "");
  const [adAccountId, setAdAccountId] = useState(apiConfig.adAccountId || "");
  const [pixelId, setPixelId] = useState(apiConfig.pixelId || "1530674178146899");
  const [capiToken, setCapiToken] = useState(apiConfig.capiAccessToken || "");
  const [aiProvider, setAiProvider] = useState(apiConfig.aiProvider || "gemini");
  const [aiKey, setAiKey] = useState(apiConfig.aiApiKey || "");
  const [openRouterModel, setOpenRouterModel] = useState("openai/gpt-5.6-luna");

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

  if (!isOpen) return null;

  const handleSave = () => {
    updateApiConfig({
      metaAccessToken: metaToken.trim(),
      adAccountId: adAccountId.trim(),
      pixelId: pixelId.trim(),
      capiAccessToken: capiToken.trim(),
      aiProvider,
      aiApiKey: aiKey.trim(),
    });

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

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto transition-colors">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Konfigurasi Meta Ads API, Multi-AI &amp; Otomasi Rules
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hubungkan kredensial akun live Meta Ads atau aktifkan simulator sandbox mandiri.
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
            <span>Pengaturan berhasil disimpan dan disinkronkan ke seluruh sistem!</span>
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
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Meta User / System User Access Token
                </label>
                <input
                  type="password"
                  placeholder="EAA... (Token dengan scope ads_read, ads_management)"
                  value={metaToken}
                  onChange={(e) => setMetaToken(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Jika dibiarkan kosong, dashboard otomatis berjalan dalam mode simulator sandbox dengan data benchmark Monefyi.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Meta Conversions API (CAPI) Server Token
                </label>
                <input
                  type="password"
                  placeholder="EAA... (Token CAPI server dari Events Manager)"
                  value={capiToken}
                  onChange={(e) => setCapiToken(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Multi-AI & OpenRouter Model Selector */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              <span>2. Multi-Provider AI (BYOK &amp; Model Routing)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Penyedia AI
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="gemini">Google Gemini (Tugas Teknis &amp; Keuangan)</option>
                  <option value="openrouter">OpenRouter (Mendukung Luna &amp; Multi-Model)</option>
                  <option value="claude">Anthropic Claude (Ide Kreatif &amp; Copywriting)</option>
                  <option value="openai">OpenAI (GPT-4o &amp; GPT-4o mini)</option>
                  <option value="groq">Groq (Inference Ekstra Cepat)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  API Key AI
                </label>
                <input
                  type="password"
                  placeholder="sk-or-... / AIzaSy... / sk-ant-..."
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Khusus OpenRouter: Pilihan Model Spesifik & Luna */}
              {aiProvider === "openrouter" && (
                <div className="md:col-span-2 p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      Model OpenRouter Pilihan (Termasuk Promo Luna)
                    </span>
                    <span className="text-[10px] text-purple-700 dark:text-purple-400">
                      Format: provider/model-id
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2">
                    <div>
                      <select
                        value={OPENROUTER_POPULAR_MODELS.some(m => m.id === openRouterModel) ? openRouterModel : "__custom"}
                        onChange={(e) => {
                          if (e.target.value !== "__custom") setOpenRouterModel(e.target.value);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                      >
                        {OPENROUTER_POPULAR_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                        <option value="__custom">Input Model Kustom...</option>
                      </select>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={openRouterModel}
                        onChange={(e) => setOpenRouterModel(e.target.value)}
                        placeholder="Contoh: openai/gpt-5.6-luna"
                        className="w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl p-2 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Model Luna di OpenRouter memiliki efisiensi tinggi, latency cepat, dan dukungan output terstruktur untuk pembacaan metrik serta bot pesan.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Automation Rules */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>3. Parameter Otomasi Pengendalian Iklan (Scale Model)</span>
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

          {/* Section 4: Kustomisasi Nama Agen (Bebas Emoticon) */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>4. Kustomisasi Nama Panggilan Tim AI</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ubah nama panggilan agen agar sesuai dengan kultur komunikasi tim Anda.
            </p>

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
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Konfigurasi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
