"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WinningEngineCommandCenter } from "@/components/admin/marketing/WinningEngineCommandCenter";
import { MarketingConfigModal } from "@/components/admin/marketing/MarketingConfigModal";
import { useMarketingStore } from "@/lib/store/marketingStore";
import {
  Sparkles,
  ArrowLeft,
  Settings,
  RefreshCw,
  Wifi,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function WinningEnginePage() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const {
    isLiveMeta,
    metaAccountName,
    loadConfigFromCloud,
    refreshCampaigns,
    refreshInsights,
    runWinningEngineTick,
    isRunningEngineTick,
  } = useMarketingStore();

  useEffect(() => {
    loadConfigFromCloud().then(() => {
      refreshCampaigns().catch(() => undefined);
      refreshInsights().catch(() => undefined);
    });
  }, []);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* Top Header Halaman Winning Engine */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <Link
            href="/admin/marketing"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer mt-0.5 sm:mt-0"
            title="Kembali ke Ads Manager"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Winning Engine (5 Pilar Scale Model)
              </h1>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-black border",
                  isLiveMeta
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                )}
              >
                {isLiveMeta ? `Live: ${metaAccountName || "Meta Ads"}` : "Mode Offline / Simulasi"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pusat otonomi strategi scale up dan evaluasi 5 pilar iklan (Offer, Landing Page, Checkout, Testing, & Tracking).
            </p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={() => runWinningEngineTick(false)}
            disabled={isRunningEngineTick}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title="Jalankan sinkronisasi dan evaluasi ulang engine"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRunningEngineTick && "animate-spin")} />
            <span>{isRunningEngineTick ? "Menganalisa..." : "Evaluasi Ulang"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            title="Buka Pengaturan Guardrail & API"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Pengaturan Guardrail</span>
          </button>
        </div>
      </div>

      {/* Konten Halaman Penuh Winning Engine (Tanpa Popup Modal) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs">
        <WinningEngineCommandCenter onOpenConfigModal={() => setIsConfigOpen(true)} />
      </div>

      {/* Modal Pengaturan Guardrail & API (Hanya jika tombol pengaturan diklik) */}
      <MarketingConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
    </div>
  );
}

