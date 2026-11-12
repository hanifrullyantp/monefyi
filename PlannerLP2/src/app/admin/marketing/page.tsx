"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { MarketingWarRoom } from "@/components/admin/marketing/MarketingWarRoom";
import { MetaAdsCommanderTable } from "@/components/admin/marketing/MetaAdsCommanderTable";
import { MetaAdsDeepInsights } from "@/components/admin/marketing/MetaAdsDeepInsights";
import { WinningAdCreator } from "@/components/admin/marketing/WinningAdCreator";
import { VideoAdAuditor } from "@/components/admin/marketing/VideoAdAuditor";
import { MarketingConfigModal } from "@/components/admin/marketing/MarketingConfigModal";
import { analyzeMarketingSystemIntegrations } from "@/lib/services/marketingAgentService";
import {
  BarChart3,
  Bot,
  RefreshCw,
  AlertTriangle,
  Info,
  Wifi,
  Cpu,
  X,
  ShieldAlert,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function MarketingAdminPage() {
  const router = useRouter();
  // Single Tab Mode: Halaman Ads Manager langsung menampilkan tabel Meta Ads Commander
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAdspertOpen, setIsAdspertOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showCreativeModal, setShowCreativeModal] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("Baru saja");

  const {
    apiConfig,
    campaigns,
    rules,
    winningEngineConfig,
    winningOverallScore,
    winningPlans,
    isRefreshingCampaigns,
    isLiveMeta,
    metaAccountName,
    metaSyncError,
    refreshCampaigns,
    refreshInsights,
    loadConfigFromCloud,
  } = useMarketingStore();

  const auditReport = analyzeMarketingSystemIntegrations(apiConfig, campaigns, rules);
  const pendingApprovalCount = winningPlans.filter((p) => p.status === "pending").length;

  useEffect(() => {
    loadConfigFromCloud().then(() => {
      refreshCampaigns().catch(() => undefined);
      refreshInsights().catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    refreshCampaigns().catch(() => undefined);
    refreshInsights().catch(() => undefined);
  }, [apiConfig.metaAccessToken, apiConfig.capiAccessToken, apiConfig.adAccountId]);

  const handleManualRefresh = async () => {
    await Promise.all([refreshCampaigns(), refreshInsights()]);
    setLastRefreshed(
      new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  };

  const hasConfiguredCredentials = Boolean(
    apiConfig.metaAccessToken || apiConfig.capiAccessToken
  );

  return (
    <div className="p-3 md:p-5 max-w-[1700px] mx-auto space-y-3 relative">
      {/* Top Header Bar: 1 Baris Penuh, Ringkas & Padat */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-2xl shadow-xs transition-colors relative">
        {/* Kiri: Title Ringkas 1 Baris */}
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs">
            <BarChart3 className="w-4 h-4" />
          </span>
          <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
            <span>Meta Ads Commander</span>
            <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded">
              {winningEngineConfig.mode === "cuan" ? "Mode Cuan" : "Mode Advance"}
            </span>
          </h1>
        </div>

        {/* Kanan: Seluruh Status & Aksi Dalam 1 Baris */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Status Meta */}
          <div
            className={cn(
              "px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5",
              isLiveMeta
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : hasConfiguredCredentials
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            )}
            title={
              isLiveMeta
                ? `Meta API: Live (${metaAccountName || "Terhubung"})`
                : "Mode Simulator"
            }
          >
            <Wifi
              className={cn(
                "w-3 h-3",
                isLiveMeta ? "text-emerald-600 animate-pulse" : "text-slate-400"
              )}
            />
            <span className="text-[11px] hidden sm:inline max-w-[120px] truncate">
              {isLiveMeta ? metaAccountName || "Meta Live" : "Sandbox"}
            </span>
          </div>

          {/* Status Dual-LLM Engine */}
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="px-2 py-1 rounded-xl text-xs font-bold border bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 flex items-center gap-1 cursor-pointer"
            title="Klik untuk ganti model AI Strategist (Claude) & AI Teknis (Gemini)"
          >
            <Cpu className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[11px] hidden md:inline">
              {winningEngineConfig.llmRouting.strategist.provider.toUpperCase()} +{" "}
              {winningEngineConfig.llmRouting.technical.provider.toUpperCase()}
            </span>
          </button>

          {/* Tombol Refresh Data */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshingCampaigns}
            className="p-1.5 sm:px-2.5 sm:py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            title={`Refresh data real-time (Terakhir: ${lastRefreshed})`}
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400",
                isRefreshingCampaigns && "animate-spin"
              )}
            />
            <span className="text-[11px] hidden lg:inline">
              {isRefreshingCampaigns ? "Sync..." : "Refresh"}
            </span>
          </button>

          {/* Icon Lonceng: Notifikasi & Alert Jumlah Notif */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={cn(
                "relative p-1.5 rounded-xl border transition-all cursor-pointer",
                isNotifOpen
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 border-amber-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
              )}
              title="Notifikasi & Rekomendasi Optimasi Adspert"
            >
              <Bell className="w-4 h-4" />
              {auditReport.detectedIssues.length + pendingApprovalCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse shadow-xs">
                  {auditReport.detectedIssues.length + pendingApprovalCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 top-10 z-50 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Notifikasi Adspert ({pendingApprovalCount} Pending)
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      5 Pilar: {winningOverallScore}%
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-2.5 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {auditReport.detectedIssues.length === 0 ? (
                    <p className="text-xs text-slate-500 p-2 text-center">
                      Semua kampanye berjalan optimal.
                    </p>
                  ) : (
                    auditReport.detectedIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-2.5 rounded-xl border text-xs space-y-1 bg-slate-50 dark:bg-slate-850",
                          issue.severity === "critical"
                            ? "border-rose-200 dark:border-rose-900/60"
                            : "border-amber-200 dark:border-amber-900/60"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "font-bold text-[9px] uppercase px-1.5 py-0.5 rounded",
                              issue.severity === "critical"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            )}
                          >
                            {issue.agent}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {issue.severity === "critical" ? "Penting" : "Saran"}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white text-[11px] leading-tight">
                          {issue.title}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                          {issue.diagnosis}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Monefyi Adspert Bot Icon */}
          <button
            type="button"
            onClick={() => setIsAdspertOpen(!isAdspertOpen)}
            className={cn(
              "relative p-1.5 rounded-xl border transition-all cursor-pointer shadow-xs",
              isAdspertOpen
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-900/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
            )}
            title="Buka / Tutup Monefyi Adspert"
          >
            <Bot className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse border-2 border-white dark:border-slate-900" />
          </button>
        </div>
      </div>

      {/* Banner Informasi Token jika belum live */}
      {!isLiveMeta && (
        <div className="bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-800 dark:text-white">
                Token Meta Ads belum terhubung.
              </span>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Masukkan Meta Access Token di menu AI Rules agar seluruh data riil langsung sinkron.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shrink-0 cursor-pointer text-xs"
          >
            Hubungkan Meta Ads
          </button>
        </div>
      )}

      {/* 1. HANYA SATU TAB: LANGSUNG MENAMPILKAN TABEL META ADS COMMANDER */}
      <MetaAdsCommanderTable
        onOpenWinningEngine={() => router.push("/admin/winning-engine")}
        onOpenInsights={() => setShowInsightsModal(true)}
        onOpenCreative={() => setShowCreativeModal(true)}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {/* MODAL 2: ADS INSIGHT & DEMOGRAFI */}
      {showInsightsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Ads Insight &amp; Demografi (Lokasi, Umur &amp; Gender)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInsightsModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <MetaAdsDeepInsights />
          </div>
        </div>
      )}

      {/* MODAL 3: PABRIK IKLAN CREATIVE */}
      {showCreativeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Pabrik Iklan Creative (Hook, Copywriting &amp; Video Audit)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreativeModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <WinningAdCreator />
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <VideoAdAuditor />
            </div>
          </div>
        </div>
      )}

      {/* Monefyi Adspert: POPUP CHAT MENIMPA KONTEN DI KANAN BAWAH */}
      {isAdspertOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[440px] max-w-[calc(100vw-32px)] h-[640px] max-h-[85vh] shadow-2xl rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-slide-up">
          <MarketingWarRoom
            variant="dock"
            onClose={() => setIsAdspertOpen(false)}
          />
        </div>
      )}

      {/* Config Modal */}
      <MarketingConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}
