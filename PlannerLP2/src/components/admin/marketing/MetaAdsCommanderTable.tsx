"use client";

import { useState } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { MetaCampaign, AdHealthStatus } from "@/lib/types/marketing";
import {
  Play,
  Pause,
  TrendingUp,
  ShieldAlert,
  Flame,
  RefreshCw,
  Edit2,
  Check,
  X,
  Target,
  DollarSign,
  Activity,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function MetaAdsCommanderTable() {
  const {
    campaigns,
    isRefreshingCampaigns,
    refreshCampaigns,
    toggleCampaignStatus,
    updateCampaignDailyBudget,
    autoKillBleedingCampaigns,
    autoScaleWinningCampaigns,
  } = useMarketingStore();

  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [tempBudget, setTempBudget] = useState<number>(0);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Totals & KPI
  const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
  const totalPurchases = campaigns.reduce((acc, c) => acc + c.purchases, 0);
  const totalLeads = campaigns.reduce((acc, c) => acc + c.leads, 0);
  const avgCpa = totalPurchases > 0 ? Math.round(totalSpend / totalPurchases) : 0;
  const weightedRoas =
    totalSpend > 0
      ? (campaigns.reduce((acc, c) => acc + c.roas * c.spend, 0) / totalSpend).toFixed(2)
      : "0.00";
  const winningCount = campaigns.filter(
    (c) => c.healthStatus === "winning" || c.healthStatus === "scale_ready"
  ).length;

  const handleStartEditBudget = (camp: MetaCampaign) => {
    setEditingBudgetId(camp.id);
    setTempBudget(camp.dailyBudget);
  };

  const handleSaveBudget = async (campId: string) => {
    if (tempBudget > 0) {
      await updateCampaignDailyBudget(campId, tempBudget);
    }
    setEditingBudgetId(null);
  };

  const handleAutoKill = async () => {
    const killed = await autoKillBleedingCampaigns();
    setActionNotice(
      killed > 0
        ? `Berhasil mematikan ${killed} kampanye yang CPA-nya boncos.`
        : "Tidak ada kampanye yang melebihi batas batas CPA boncos."
    );
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleAutoScale = async () => {
    const scaled = await autoScaleWinningCampaigns();
    setActionNotice(
      scaled > 0
        ? `Berhasil menaikkan budget +20% pada ${scaled} kampanye winning.`
        : "Belum ada kampanye yang memenuhi syarat scale-up."
    );
    setTimeout(() => setActionNotice(null), 4000);
  };

  const getHealthBadge = (status: AdHealthStatus) => {
    switch (status) {
      case "scale_ready":
        return {
          label: "🚀 Scale Ready",
          className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        };
      case "winning":
        return {
          label: "🔥 Winning",
          className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        };
      case "bleeding":
        return {
          label: "🛑 Bleeding (Boncos)",
          className: "bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse",
        };
      case "fatigued":
        return {
          label: "⚠️ Fatigue",
          className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        };
      case "learning":
        return {
          label: "⏳ Learning",
          className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        };
      default:
        return {
          label: "🔎 Review",
          className: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Spend</span>
            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-lg font-black text-white">
            Rp {totalSpend.toLocaleString("id-ID")}
          </div>
          <div className="text-[10px] text-slate-500">7 Hari Terakhir</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Hasil Penjualan</span>
            <Target className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-emerald-400">
            {totalPurchases} Sales{" "}
            <span className="text-xs text-slate-400">({totalLeads} Leads)</span>
          </div>
          <div className="text-[10px] text-slate-500">Konversi Terverifikasi</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Rata-rata CPA</span>
            <Activity className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg font-black text-white">
            Rp {avgCpa.toLocaleString("id-ID")}
          </div>
          <div className="text-[10px] text-emerald-400">Target &lt; Rp 50.000</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Blended ROAS</span>
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-black text-purple-400">{weightedRoas}x</div>
          <div className="text-[10px] text-purple-300">Return on Ad Spend</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Winning Ratio</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-black text-amber-400">
            {winningCount} / {campaigns.length}
          </div>
          <div className="text-[10px] text-slate-500">Iklan Siap Scale</div>
        </div>
      </div>

      {/* Control Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-bold text-white">
            Pengendali Kampanye Meta Ads Live
          </span>
          <span className="text-xs text-slate-400">
            ({campaigns.filter((c) => c.status === "ACTIVE").length} Aktif)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoKill}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800 text-rose-300 text-xs font-bold rounded-xl transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Auto-Kill Iklan Boncos
          </button>

          <button
            onClick={handleAutoScale}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Scale Winning Ads (+20%)
          </button>

          <button
            onClick={refreshCampaigns}
            disabled={isRefreshingCampaigns}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isRefreshingCampaigns && "animate-spin")}
            />
            Sinkronisasi Metrik
          </button>
        </div>
      </div>

      {/* Action Notice Banner */}
      {actionNotice && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-700/60 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          {actionNotice}
        </div>
      )}

      {/* Campaign Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Nama Kampanye & Angle Hook</th>
                <th className="py-3 px-4">Budget Harian</th>
                <th className="py-3 px-4">Spend</th>
                <th className="py-3 px-4">CTR (Link)</th>
                <th className="py-3 px-4">CPA</th>
                <th className="py-3 px-4">ROAS</th>
                <th className="py-3 px-4">Diagnosa AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {campaigns.map((camp) => {
                const badge = getHealthBadge(camp.healthStatus);
                const isActive = camp.status === "ACTIVE";

                return (
                  <tr
                    key={camp.id}
                    className={cn(
                      "hover:bg-slate-800/40 transition-colors",
                      !isActive && "opacity-60 bg-slate-950/30"
                    )}
                  >
                    {/* Status Toggle */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleCampaignStatus(camp.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border",
                          isActive
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40"
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-400"
                        )}
                        title={isActive ? "Klik untuk PAUSE" : "Klik untuk AKTIFKAN"}
                      >
                        {isActive ? (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>ON</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-3 h-3 fill-current" />
                            <span>OFF</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Campaign Info */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-white text-xs sm:text-sm truncate">
                        {camp.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate italic mt-0.5">
                        Hook: {camp.creativeHook}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Audiens: {camp.targetAudience}
                      </div>
                    </td>

                    {/* Daily Budget (Editable) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {editingBudgetId === camp.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={tempBudget}
                            onChange={(e) => setTempBudget(Number(e.target.value))}
                            className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                          />
                          <button
                            onClick={() => handleSaveBudget(camp.id)}
                            className="p-1 bg-emerald-600 rounded-lg text-white hover:bg-emerald-500"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingBudgetId(null)}
                            className="p-1 bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span>Rp {camp.dailyBudget.toLocaleString("id-ID")}</span>
                          <button
                            onClick={() => handleStartEditBudget(camp)}
                            className="p-1 text-slate-500 hover:text-slate-300"
                            title="Edit budget harian"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Spend */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-300">
                      Rp {camp.spend.toLocaleString("id-ID")}
                    </td>

                    {/* CTR & Thumbstop */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs">
                      <span
                        className={cn(
                          "font-bold",
                          camp.ctr >= 2.0 ? "text-emerald-400" : "text-slate-300"
                        )}
                      >
                        {camp.ctr}%
                      </span>
                      <div className="text-[10px] text-slate-500">
                        Hook: {camp.thumbstopRate}%
                      </div>
                    </td>

                    {/* CPA */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs">
                      <span
                        className={cn(
                          "font-bold",
                          camp.cpa > 50000 ? "text-rose-400" : "text-emerald-400"
                        )}
                      >
                        Rp {camp.cpa.toLocaleString("id-ID")}
                      </span>
                      <div className="text-[10px] text-slate-500">
                        {camp.purchases} sales
                      </div>
                    </td>

                    {/* ROAS */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs">
                      <span
                        className={cn(
                          "font-black text-sm",
                          camp.roas >= 3.0 ? "text-purple-400" : "text-slate-300"
                        )}
                      >
                        {camp.roas}x
                      </span>
                    </td>

                    {/* AI Diagnosis Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-bold border",
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

