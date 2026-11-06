"use client";

import { useState } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { MarketingWarRoom } from "@/components/admin/marketing/MarketingWarRoom";
import { MetaAdsCommanderTable } from "@/components/admin/marketing/MetaAdsCommanderTable";
import { WinningAdCreator } from "@/components/admin/marketing/WinningAdCreator";
import { VideoAdAuditor } from "@/components/admin/marketing/VideoAdAuditor";
import { FunnelAovPanel } from "@/components/admin/marketing/FunnelAovPanel";
import { MarketingConfigModal } from "@/components/admin/marketing/MarketingConfigModal";
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
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ActiveTab = "war_room" | "commander" | "creative" | "video_audit" | "funnel_aov";

export default function MarketingAdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("war_room");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { apiConfig, campaigns } = useMarketingStore();

  const isLiveMeta = Boolean(apiConfig.metaAccessToken && apiConfig.adAccountId);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30">
              <Bot className="w-5 h-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Marketing AI &amp; Meta Ads Commander
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tim Agentic Full Marketing: Membaca, Mengendalikan &amp; Memproduksi Iklan Winning (Model Funnel Scale.co.id).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5",
              isLiveMeta
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-700 border-slate-200"
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                isLiveMeta ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              )}
            />
            {isLiveMeta ? "Meta API Live Connected" : "Autonomous Simulator Mode"}
          </div>

          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            Konfigurasi &amp; Rules
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          {
            id: "war_room" as const,
            label: "War Room Tim Marketing",
            icon: MessageSquare,
            badge: "4 Agen",
          },
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
            label: "Funnel & AOV (Scale.co.id)",
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
                  ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              <t.icon className={cn("w-4 h-4", isActive ? "text-emerald-400" : "text-slate-500")} />
              {t.label}
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold",
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                {t.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === "war_room" && <MarketingWarRoom />}
      {activeTab === "commander" && <MetaAdsCommanderTable />}
      {activeTab === "creative" && <WinningAdCreator />}
      {activeTab === "video_audit" && <VideoAdAuditor />}
      {activeTab === "funnel_aov" && <FunnelAovPanel />}

      {/* Config Modal */}
      <MarketingConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}

