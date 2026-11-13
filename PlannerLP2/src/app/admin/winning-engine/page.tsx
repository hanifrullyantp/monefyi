"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WinningEngineCommandCenter } from "@/components/admin/marketing/WinningEngineCommandCenter";
import { MarketingConfigModal } from "@/components/admin/marketing/MarketingConfigModal";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { Sparkles, ArrowLeft, Settings, RefreshCw, Wifi } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function WinningEnginePage() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const {
    isLiveMeta,
    metaAccountName,
    winningEngineConfig,
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
    <div className="p-3 md:p-5 max-w-[1700px] mx-auto space-y-3 pb-12 animate-in fade-in">
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/admin/marketing"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
            title="Kembali ke Ads Manager"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="p-1.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 min-w-0">
            <span className="truncate">Winning Engine</span>
            <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded shrink-0">
              {winningEngineConfig.mode === "cuan" ? "Mode Cuan" : "Mode Advance"}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div
            className={cn(
              "px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5",
              isLiveMeta
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
            )}
            title={isLiveMeta ? `Meta API: Live (${metaAccountName || "Terhubung"})` : "Mode simulasi"}
          >
            <Wifi className={cn("w-3 h-3", isLiveMeta ? "text-emerald-600 animate-pulse" : "text-amber-500")} />
            <span className="text-[11px] hidden sm:inline max-w-[120px] truncate">
              {isLiveMeta ? metaAccountName || "Meta Live" : "Sandbox"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => runWinningEngineTick(false)}
            disabled={isRunningEngineTick}
            className="p-1.5 sm:px-2.5 sm:py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            title="Jalankan sinkronisasi dan evaluasi ulang engine"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400", isRunningEngineTick && "animate-spin")} />
            <span className="text-[11px] hidden lg:inline">
              {isRunningEngineTick ? "Menganalisa..." : "Evaluasi Ulang"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            title="Buka Pengaturan Guardrail & API"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guardrail</span>
          </button>
        </div>
      </div>

      <WinningEngineCommandCenter onOpenConfigModal={() => setIsConfigOpen(true)} />

      <MarketingConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
    </div>
  );
}
