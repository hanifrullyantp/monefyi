"use client";

import { useState, useEffect } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { MarketingWarRoom } from "@/components/admin/marketing/MarketingWarRoom";
import { MetaAdsCommanderTable } from "@/components/admin/marketing/MetaAdsCommanderTable";
import { WinningAdCreator } from "@/components/admin/marketing/WinningAdCreator";
import { VideoAdAuditor } from "@/components/admin/marketing/VideoAdAuditor";
import { FunnelAovPanel } from "@/components/admin/marketing/FunnelAovPanel";
import { MarketingConfigModal } from "@/components/admin/marketing/MarketingConfigModal";
import { analyzeMarketingSystemIntegrations } from "@/lib/services/marketingAgentService";
import {
  MessageSquare,
  BarChart3,
  Sparkles,
  ShoppingBag,
  Settings,
  Bot,
  Zap,
  Flame,
  ShieldCheck,
  Video,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PanelRightClose,
  PanelRightOpen,
  Wifi,
  Cpu,
  X,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ActiveTab = "commander" | "creative" | "video_audit" | "funnel_aov";

export default function MarketingAdminPage() {
  // Tab utama default adalah Meta Ads Commander
  const [activeTab, setActiveTab] = useState<ActiveTab>("commander");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAdspertOpen, setIsAdspertOpen] = useState(false); // Default popup chat tertutup (bisa dibuka menimpa konten)
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false); // Default notif analisa diminimalkan
  const [isAnalysisDismissed, setIsAnalysisDismissed] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("Baru saja");

  const {
    apiConfig,
    campaigns,
    rules,
    isRefreshingCampaigns,
    isLiveMeta,
    metaAccountName,
    metaSyncError,
    refreshCampaigns,
  } = useMarketingStore();

  // Audit Kesiapan Sistem & Diagnosa Tim AI
  const auditReport = analyzeMarketingSystemIntegrations(apiConfig, campaigns, rules);

  useEffect(() => {
    setLastRefreshed(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    // Panggil refresh sekali saat halaman pertama kali dibuka
    refreshCampaigns().catch(() => undefined);
  }, []);

  const handleManualRefresh = async () => {
    await refreshCampaigns();
    setLastRefreshed(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  };

  const hasConfiguredCredentials = Boolean(apiConfig.metaAccessToken && apiConfig.adAccountId);

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-6 relative">
      {/* Top Header: Judul, Status Koneksi AI & Meta, Refresh Realtime */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-900/20">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Meta Ads Commander &amp; Monefyi Adspert
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pengendalian Kampanye Real-Time, Monitoring Funnel Scale, dan Rekomendasi Tim AI Terpadu.
              </p>
            </div>
          </div>
        </div>

        {/* Status Koneksi AI & Meta + Tombol Aksi */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Meta */}
          <div
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2",
              isLiveMeta
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : hasConfiguredCredentials
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            )}
          >
            <Wifi className={cn("w-3.5 h-3.5", isLiveMeta ? "text-emerald-600 dark:text-emerald-400 animate-pulse" : "text-slate-400")} />
            <span>
              Meta API: {isLiveMeta ? `Live (${metaAccountName || "Terhubung"})` : hasConfiguredCredentials ? "Menghubungkan..." : "Mode Simulator Sandbox"}
            </span>
          </div>

          {/* Status AI */}
          <div className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>AI: {apiConfig.aiProvider ? apiConfig.aiProvider.toUpperCase() : "BUILT-IN"} Ready</span>
          </div>

          {/* Tombol Refresh Data Real-Time */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshingCampaigns}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh data real-time dari Meta Ads Manager"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400", isRefreshingCampaigns && "animate-spin")} />
            <span>{isRefreshingCampaigns ? "Menyinkronkan..." : "Refresh Data"}</span>
            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">({lastRefreshed})</span>
          </button>

          {/* Toggle Popup Chat Monefyi Adspert */}
          <button
            type="button"
            onClick={() => setIsAdspertOpen(!isAdspertOpen)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-xs",
              isAdspertOpen
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-900/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
            title="Buka / Tutup Popup Chat Monefyi Adspert"
          >
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span>Monefyi Adspert</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Tombol Konfigurasi */}
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Konfigurasi &amp; Rules</span>
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
                Dashboard saat ini menampilkan Data Simulasi Benchmark Monefyi.
              </span>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Kredensial Meta Ads asli belum terpasang atau sedang diverifikasi. Data di bawah adalah simulasi model Scale.co.id.
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

      {/* Analisa Sistem AI: Bentuk Notifikasi Ramping (Bisa di-hide / di-expand) */}
      {!isAnalysisDismissed && auditReport.detectedIssues.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl overflow-hidden shadow-2xs transition-all">
          {/* Bar Notifikasi Ramping Satu Baris */}
          <div className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div className="text-xs truncate">
                <span className="font-black text-amber-900 dark:text-amber-200 mr-2">
                  Notifikasi Monefyi Adspert:
                </span>
                <span className="text-amber-800 dark:text-amber-300 font-medium">
                  Terdeteksi {auditReport.detectedIssues.length} rekomendasi optimasi (Skor Kesiapan: {auditReport.score}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
                className="flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <span>{isAnalysisExpanded ? "Sembunyikan" : "Baca Analisa"}</span>
                {isAnalysisExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsAnalysisDismissed(true)}
                className="p-1 text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 rounded-lg"
                title="Tutup Notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Konten Kartu Analisa yang Terbuka Saat Diklik 'Baca Analisa' */}
          {isAnalysisExpanded && (
            <div className="p-4 pt-1 border-t border-amber-200/60 dark:border-amber-800/40 space-y-3 animate-fade-in">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {auditReport.detectedIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-3.5 rounded-2xl border text-xs space-y-1.5 bg-white dark:bg-slate-900 shadow-2xs",
                      issue.severity === "critical"
                        ? "border-rose-200 dark:border-rose-800/80"
                        : "border-amber-200 dark:border-amber-800/60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "font-bold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                          issue.severity === "critical"
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                            : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                        )}
                      >
                        {issue.agent.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {issue.severity === "critical" ? "Perhatian Khusus" : "Rekomendasi"}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white leading-tight">
                      {issue.title}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                      {issue.diagnosis}
                    </p>
                    <div className="pt-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold border-t border-slate-100 dark:border-slate-800">
                      Solusi: {issue.actionableFix}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          {
            id: "commander" as const,
            label: "Meta Ads Commander",
            icon: BarChart3,
            badge: `${campaigns.length} Kampanye`,
          },
          {
            id: "creative" as const,
            label: "Pabrik Iklan Winning",
            icon: Sparkles,
            badge: "Hook & Copy",
          },
          {
            id: "video_audit" as const,
            label: "Review Video Iklan",
            icon: Video,
            badge: "AI Auditor",
          },
          {
            id: "funnel_aov" as const,
            label: "Funnel & AOV (Scale)",
            icon: ShoppingBag,
            badge: "Order Bump & CAPI",
          },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all border cursor-pointer",
                isActive
                  ? "bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              <t.icon className={cn("w-4 h-4", isActive ? "text-emerald-400 dark:text-white" : "text-slate-500 dark:text-slate-400")} />
              <span>{t.label}</span>
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                )}
              >
                {t.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Konten Tab Aktif (Lebar Penuh 100%, TIDAK tergeser oleh Chat) */}
      <div className="w-full space-y-6">
        {activeTab === "commander" && <MetaAdsCommanderTable />}
        {activeTab === "creative" && <WinningAdCreator />}
        {activeTab === "video_audit" && <VideoAdAuditor />}
        {activeTab === "funnel_aov" && <FunnelAovPanel />}
      </div>

      {/* Monefyi Adspert: POPUP CHAT MENIMPA KONTEN DI KANAN BAWAH (Bukan menggeser layout) */}
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
