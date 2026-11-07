"use client";

import { useState, useEffect } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { MarketingWarRoom } from "@/components/admin/marketing/MarketingWarRoom";
import { WinningEngineCommandCenter } from "@/components/admin/marketing/WinningEngineCommandCenter";
import { MetaAdsCommanderTable } from "@/components/admin/marketing/MetaAdsCommanderTable";
import { MetaAdsDeepInsights } from "@/components/admin/marketing/MetaAdsDeepInsights";
import { WinningAdCreator } from "@/components/admin/marketing/WinningAdCreator";
import { VideoAdAuditor } from "@/components/admin/marketing/VideoAdAuditor";
import { FunnelAovPanel } from "@/components/admin/marketing/FunnelAovPanel";
import { MarketingConfigModal } from "@/components/admin/marketing/MarketingConfigModal";
import { analyzeMarketingSystemIntegrations } from "@/lib/services/marketingAgentService";
import {
  BarChart3,
  Sparkles,
  ShoppingBag,
  Settings,
  Bot,
  Zap,
  Video,
  RefreshCw,
  AlertTriangle,
  Info,
  Wifi,
  Cpu,
  X,
  ShieldAlert,
  Target,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ActiveTab =
  | "winning_engine"
  | "commander"
  | "insights"
  | "creative"
  | "video_audit"
  | "funnel_aov";

export default function MarketingAdminPage() {
  // Tab utama default adalah Winning Engine (Mesin 5 Pilar: Mode Cuan & Mode Advance)
  const [activeTab, setActiveTab] = useState<ActiveTab>("winning_engine");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAdspertOpen, setIsAdspertOpen] = useState(false); // Popup chat di kanan bawah (menimpa konten)
  const [isNotifOpen, setIsNotifOpen] = useState(false); // Dropdown popover notifikasi di lonceng
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
  } = useMarketingStore();

  // Audit Kesiapan Sistem & Diagnosa Tim AI
  const auditReport = analyzeMarketingSystemIntegrations(apiConfig, campaigns, rules);
  const pendingApprovalCount = winningPlans.filter((p) => p.status === "pending").length;

  useEffect(() => {
    setLastRefreshed(
      new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
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
            <span>Meta Ads &amp; Winning Engine</span>
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

          {/* Icon Lonceng: Notifikasi & Alert Jumlah Notif Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={cn(
                "relative p-1.5 rounded-xl border transition-all cursor-pointer",
                isNotifOpen
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 border-amber-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750"
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

            {/* Popover Notifikasi Dropdown Saat Lonceng Diklik */}
            {isNotifOpen && (
              <div className="absolute right-0 top-10 z-50 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Notifikasi Adspert &amp; Rencana ({pendingApprovalCount} Pending)
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
                      Semua sistem &amp; kampanye optimal.
                    </p>
                  ) : (
                    auditReport.detectedIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-2.5 rounded-xl border text-xs space-y-1 bg-slate-50 dark:bg-slate-800/60",
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
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          Solusi: {issue.actionableFix}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Monefyi Adspert: ICON SAJA */}
          <button
            type="button"
            onClick={() => setIsAdspertOpen(!isAdspertOpen)}
            className={cn(
              "relative p-1.5 rounded-xl border transition-all cursor-pointer shadow-xs",
              isAdspertOpen
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-900/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
            title="Buka / Tutup Monefyi Adspert (AI Expert)"
          >
            <Bot className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse border-2 border-white dark:border-slate-900" />
          </button>

          {/* Konfigurasi & Rules AI (Terlihat Jelas di Mobile & Desktop) */}
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="px-2.5 py-1 sm:px-3 sm:py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
            title="Konfigurasi Meta API, Multi-LLM & Notifikasi (Super Admin)"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-200" />
            <span className="text-[11px] font-black">AI Rules</span>
          </button>
        </div>
      </div>

      {/* Banner Informasi: Live Meta vs Sandbox Simulator */}
      {!isLiveMeta && (
        <div className="bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-800 dark:text-white">
                Token Meta Ads belum terhubung.
              </span>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Masukkan Access Token Meta di menu Rules &amp; AI Key agar seluruh metrik kampanye riil dan eksekusi anggaran terhubung langsung ke akun Meta Ads Anda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shrink-0 cursor-pointer shadow-xs"
          >
            Hubungkan Akun Meta Ads Anda
          </button>
        </div>
      )}

      {/* Pesan Error Sinkronisasi Meta Jika Ada */}
      {metaSyncError && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl text-xs text-rose-800 dark:text-rose-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gagal Menyinkronkan Data dari Meta Ads Manager:</p>
              <p className="mt-0.5 opacity-90">{metaSyncError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="font-bold underline hover:opacity-80 shrink-0"
          >
            Perbarui Token
          </button>
        </div>
      )}

      {/* Main Tabs Navigation: Ramping & Maksimal 1 Baris */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        {[
          {
            id: "winning_engine" as const,
            label: "Winning Engine (5 Pilar)",
            icon: Zap,
            badge: `${pendingApprovalCount} Rencana`,
          },
          {
            id: "commander" as const,
            label: "Tabel Ads Commander",
            icon: BarChart3,
            badge: `${campaigns.length}`,
          },
          {
            id: "insights" as const,
            label: "Insight & Demografi",
            icon: Target,
          },
          {
            id: "creative" as const,
            label: "Pabrik Creative",
            icon: Sparkles,
          },
          {
            id: "video_audit" as const,
            label: "Video Audit",
            icon: Video,
          },
          {
            id: "funnel_aov" as const,
            label: "Funnel & AOV",
            icon: ShoppingBag,
          },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer",
                isActive
                  ? "bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-2xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              <t.icon
                className={cn(
                  "w-3.5 h-3.5",
                  isActive
                    ? "text-emerald-400 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                )}
              />
              <span>{t.label}</span>
              {t.badge && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-extrabold",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  )}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Konten Tab Aktif */}
      <div className="w-full space-y-6">
        {activeTab === "winning_engine" && (
          <WinningEngineCommandCenter onOpenConfigModal={() => setIsConfigOpen(true)} />
        )}
        {activeTab === "commander" && <MetaAdsCommanderTable />}
        {activeTab === "insights" && <MetaAdsDeepInsights />}
        {activeTab === "creative" && <WinningAdCreator />}
        {activeTab === "video_audit" && <VideoAdAuditor />}
        {activeTab === "funnel_aov" && <FunnelAovPanel />}
      </div>

      {/* Monefyi Adspert: POPUP CHAT MENIMPA KONTEN DI KANAN BAWAH */}
      {isAdspertOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[440px] max-w-[calc(100vw-32px)] h-[640px] max-h-[85vh] shadow-2xl rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-slide-up">
          <MarketingWarRoom
            variant="dock"
            onClose={() => setIsAdspertOpen(false)}
          />
        </div>
      )}

      {/* Floating Launcher Button Saat Chat Diminimalkan */}
      {!isAdspertOpen && (
        <button
          type="button"
          onClick={() => setIsAdspertOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-950/30 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer border border-emerald-400/40 backdrop-blur-md"
          title="Buka Chat Monefyi Adspert"
        >
          <Bot className="w-4 h-4" />
          <span>Monefyi Adspert</span>
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
        </button>
      )}

      {/* Config Modal */}
      <MarketingConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}
