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
  PanelRightClose,
  PanelRightOpen,
  Wifi,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ActiveTab = "commander" | "creative" | "video_audit" | "funnel_aov";

export default function MarketingAdminPage() {
  // Default tab utama adalah Meta Ads Commander sesuai instruksi
  const [activeTab, setActiveTab] = useState<ActiveTab>("commander");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isWarRoomOpen, setIsWarRoomOpen] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("Baru saja");

  const {
    apiConfig,
    campaigns,
    rules,
    isRefreshingCampaigns,
    refreshCampaigns,
  } = useMarketingStore();

  const isLiveMeta = Boolean(apiConfig.metaAccessToken && apiConfig.adAccountId);

  // Analisa Kesalahan Konfigurasi Komunikatif oleh Tim AI
  const auditReport = analyzeMarketingSystemIntegrations(apiConfig, campaigns, rules);

  useEffect(() => {
    setLastRefreshed(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, []);

  const handleManualRefresh = async () => {
    await refreshCampaigns();
    setLastRefreshed(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  };

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-6">
      {/* Top Header: Judul, Status Koneksi AI & Meta, Refresh Realtime */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-900/20">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Meta Ads Commander &amp; Marketing Intelligence
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pusat Kendali Kampanye Iklan, Otomasi Skala, dan War Room Tim Marketing AI Terpadu.
              </p>
            </div>
          </div>
        </div>

        {/* Status Koneksi AI & Meta + Tombol Refresh Real-Time */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Meta */}
          <div
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2",
              isLiveMeta
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            )}
          >
            <Wifi className={cn("w-3.5 h-3.5", isLiveMeta ? "text-emerald-600 dark:text-emerald-400 animate-pulse" : "text-slate-400")} />
            <span>Meta API: {isLiveMeta ? "Live Terhubung" : "Mode Simulator"}</span>
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            title="Refresh data kampanye real-time dari Meta API"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400", isRefreshingCampaigns && "animate-spin")} />
            <span>{isRefreshingCampaigns ? "Menyinkronkan..." : "Refresh Data"}</span>
            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">({lastRefreshed})</span>
          </button>

          {/* Toggle War Room Kanan */}
          <button
            type="button"
            onClick={() => setIsWarRoomOpen(!isWarRoomOpen)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all",
              isWarRoomOpen
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            )}
            title="Buka / Tutup War Room AI di sisi kanan"
          >
            {isWarRoomOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            <span>War Room AI</span>
          </button>

          {/* Tombol Konfigurasi */}
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Konfigurasi &amp; Rules</span>
          </button>
        </div>
      </div>

      {/* AI Diagnostik & Analisa Kesalahan Konfigurasi (Proaktif & Komunikatif) */}
      {auditReport.detectedIssues.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-4 rounded-3xl space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-300">
                Analisa Sistem &amp; Rekomendasi Tim AI Marketing (Skor Kesiapan: {auditReport.score}%)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1"
            >
              <span>Periksa Konfigurasi</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {auditReport.detectedIssues.map((issue, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-2xl border text-xs space-y-1.5 bg-white dark:bg-slate-900 shadow-2xs",
                  issue.severity === "critical"
                    ? "border-rose-200 dark:border-rose-800/80"
                    : "border-amber-200 dark:border-amber-800/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "font-bold text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded",
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
                <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {issue.title}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                  {issue.diagnosis}
                </p>
                <div className="pt-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold border-t border-slate-100 dark:border-slate-800">
                  Solusi: {issue.actionableFix}
                </div>
              </div>
            ))}
          </div>
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
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all border",
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

      {/* Main Workspace Layout: Kiri Area Konten Utama, Kanan War Room Tim Marketing (Dock Style) */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Konten Tab Aktif */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {activeTab === "commander" && <MetaAdsCommanderTable />}
          {activeTab === "creative" && <WinningAdCreator />}
          {activeTab === "video_audit" && <VideoAdAuditor />}
          {activeTab === "funnel_aov" && <FunnelAovPanel />}
        </div>

        {/* War Room Tim Marketing di Sebelah Kanan (seperti Mbak Esti, dock view) */}
        {isWarRoomOpen && (
          <div className="w-full lg:w-[420px] xl:w-[460px] lg:sticky lg:top-4 shrink-0 transition-all animate-fade-in">
            <MarketingWarRoom
              variant="dock"
              onClose={() => setIsWarRoomOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Config Modal */}
      <MarketingConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}
