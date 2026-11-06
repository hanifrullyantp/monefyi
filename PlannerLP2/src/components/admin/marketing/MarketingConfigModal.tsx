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
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface MarketingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MarketingConfigModal({ isOpen, onClose }: MarketingConfigModalProps) {
  const { apiConfig, updateApiConfig, rules, updateRules } = useMarketingStore();

  const [metaToken, setMetaToken] = useState(apiConfig.metaAccessToken || "");
  const [adAccountId, setAdAccountId] = useState(apiConfig.adAccountId || "");
  const [pixelId, setPixelId] = useState(apiConfig.pixelId || "1530674178146899");
  const [capiToken, setCapiToken] = useState(apiConfig.capiAccessToken || "");
  const [aiProvider, setAiProvider] = useState(apiConfig.aiProvider || "gemini");
  const [aiKey, setAiKey] = useState(apiConfig.aiApiKey || "");

  const [maxCpa, setMaxCpa] = useState(rules.maxCpaThreshold);
  const [minRoas, setMinRoas] = useState(rules.minRoasScaleThreshold);
  const [scaleBudgetPct, setScaleBudgetPct] = useState(rules.scaleBudgetPercentage);
  const [freqThreshold, setFreqThreshold] = useState(rules.frequencyFatigueThreshold);

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

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Konfigurasi Meta Ads API &amp; Otomasi Rules
              </h2>
              <p className="text-xs text-slate-400">
                Hubungkan akun Meta Ads nyata atau biarkan kosong untuk mode Sandbox
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            Pengaturan berhasil disimpan!
          </div>
        )}

        <div className="space-y-5">
          {/* Section 1: Meta Marketing API */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              1. Kredensial Meta Marketing Graph API
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Ad Account ID
                </label>
                <input
                  type="text"
                  placeholder="act_1234567890"
                  value={adAccountId}
                  onChange={(e) => setAdAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Pixel ID
                </label>
                <input
                  type="text"
                  placeholder="1530674178146899"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Meta User / System User Access Token
                </label>
                <input
                  type="password"
                  placeholder="EAA..."
                  value={metaToken}
                  onChange={(e) => setMetaToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Dibutuhkan izin: <code>ads_read</code>, <code>ads_management</code>. Jika kosong, sistem otomatis memakai dataset benchmark sandbox simulator.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Meta Conversions API (CAPI) Token
                </label>
                <input
                  type="password"
                  placeholder="EAA... (Token CAPI dari Events Manager)"
                  value={capiToken}
                  onChange={(e) => setCapiToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: AI Provider BYOK */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              2. Multi-Provider AI (BYOK - Bring Your Own Key)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Penyedia AI
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500"
                >
                  <option value="gemini">Google Gemini (Disarankan Cepat &amp; Efisien)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="claude">Anthropic Claude (Sonnet 3.5)</option>
                  <option value="groq">Groq Llama 3 (Kecepatan Tinggi)</option>
                  <option value="openrouter">OpenRouter Multi-Model</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  API Key AI
                </label>
                <input
                  type="password"
                  placeholder="sk-... / AIzaSy..."
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Automation Rules */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              3. Parameter Rule Otomasi Pengendalian
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Max CPA Boncos (IDR)
                </label>
                <input
                  type="number"
                  value={maxCpa}
                  onChange={(e) => setMaxCpa(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Min ROAS Scale
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={minRoas}
                  onChange={(e) => setMinRoas(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Kenaikan Budget (%)
                </label>
                <input
                  type="number"
                  value={scaleBudgetPct}
                  onChange={(e) => setScaleBudgetPct(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Batas Frekuensi
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={freqThreshold}
                  onChange={(e) => setFreqThreshold(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-900/30"
          >
            <Save className="w-4 h-4" />
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
}

