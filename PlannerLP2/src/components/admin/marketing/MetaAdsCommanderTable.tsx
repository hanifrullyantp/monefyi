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
  ArrowUpRight,
  SlidersHorizontal,
  ChevronRight,
  Eye,
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
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
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Totals & KPI
  const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
  const totalPurchases = campaigns.reduce((acc, c) => acc + c.purchases, 0);
  const totalLeads = campaigns.reduce((acc, c) => acc + c.leads, 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + (c.purchasesConversionValue || c.purchases * 299000), 0);
  const avgCpa = totalPurchases > 0 ? Math.round(totalSpend / totalPurchases) : 0;
  const weightedRoas =
    totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : "0.00";
  const winningCount = campaigns.filter(
    (c) => c.healthStatus === "winning" || c.healthStatus === "scale_ready"
  ).length;
  const bleedingCount = campaigns.filter((c) => c.healthStatus === "bleeding").length;

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
        ? `Berhasil menonaktifkan ${killed} kampanye yang melebihi batas CPA boncos.`
        : "Tidak ada kampanye yang melebihi batas CPA boncos."
    );
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleAutoScale = async () => {
    const scaled = await autoScaleWinningCampaigns();
    setActionNotice(
      scaled > 0
        ? `Berhasil menaikkan anggaran +20% pada ${scaled} kampanye winning.`
        : "Belum ada kampanye yang memenuhi kriteria scale up."
    );
    setTimeout(() => setActionNotice(null), 4000);
  };

  const getHealthBadge = (status: AdHealthStatus) => {
    switch (status) {
      case "scale_ready":
        return {
          label: "Scale Ready",
          Icon: TrendingUp,
          className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        };
      case "winning":
        return {
          label: "Winning",
          Icon: CheckCircle2,
          className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        };
      case "bleeding":
        return {
          label: "Bleeding (Boncos)",
          Icon: XCircle,
          className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse",
        };
      case "fatigued":
        return {
          label: "Fatigue",
          Icon: AlertTriangle,
          className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        };
      case "learning":
        return {
          label: "Learning",
          Icon: Clock,
          className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        };
      default:
        return {
          label: "Review",
          Icon: Search,
          className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
        };
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter === "ACTIVE" && c.status !== "ACTIVE") return false;
    if (statusFilter === "PAUSED" && c.status !== "PAUSED") return false;
    if (statusFilter === "WINNING" && c.healthStatus !== "winning" && c.healthStatus !== "scale_ready") return false;
    if (statusFilter === "BLEEDING" && c.healthStatus !== "bleeding") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.targetAudience.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Metric Cards Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Belanja Iklan</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
            Rp {totalSpend.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Pendapatan: Rp {totalRevenue.toLocaleString("id-ID")}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Rata-rata ROAS</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {weightedRoas}x
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Target aman scale: &ge; 3.0x
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Hasil &amp; CPA</span>
            <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
            {totalPurchases} Pembelian
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            CPA Rata-rata: Rp {avgCpa.toLocaleString("id-ID")}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Kesehatan Kampanye</span>
            <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {winningCount} Winning
            </span>
            {bleedingCount > 0 && (
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                {bleedingCount} Boncos
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Total {campaigns.length} Kampanye Aktif
          </div>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 shadow-sm animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl transition-colors">
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "ACTIVE", "WINNING", "BLEEDING", "PAUSED"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                statusFilter === tab
                  ? "bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750"
              )}
            >
              {tab === "ALL" && "Semua Kampanye"}
              {tab === "ACTIVE" && "Aktif"}
              {tab === "WINNING" && "Winning / Scale"}
              {tab === "BLEEDING" && "Boncos"}
              {tab === "PAUSED" && "Mati (Off)"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama kampanye / audiens..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={handleAutoKill}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold rounded-xl transition-all"
            title="Matikan semua kampanye yang CPA-nya melebihi batas batas toleransi"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span className="hidden md:inline">Matikan Boncos</span>
          </button>

          <button
            type="button"
            onClick={handleAutoScale}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold rounded-xl transition-all"
            title="Naikkan budget 20% pada semua kampanye winning"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">Scale Winning</span>
          </button>
        </div>
      </div>

      {/* Main Table: 26 Kolom Standar Agency & Scale Model */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                {/* 1. Campaign (Sticky Left) */}
                <th className="p-3.5 sticky left-0 z-20 bg-slate-100 dark:bg-slate-950 min-w-[260px] shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                  Campaign
                </th>
                {/* 2. Delivery */}
                <th className="p-3.5 min-w-[130px]">Delivery</th>
                {/* 3. Actions */}
                <th className="p-3.5 min-w-[120px]">Actions</th>
                {/* 4. Budget */}
                <th className="p-3.5 min-w-[140px]">Budget</th>
                {/* 5. Amount spent */}
                <th className="p-3.5 min-w-[120px]">Amount spent</th>
                {/* 6. Results */}
                <th className="p-3.5 min-w-[100px]">Results</th>
                {/* 7. Purchases conversion value */}
                <th className="p-3.5 min-w-[140px]">Purchases conversion value</th>
                {/* 8. Cost per result */}
                <th className="p-3.5 min-w-[110px]">Cost per result</th>
                {/* 9. Reach */}
                <th className="p-3.5 min-w-[100px]">Reach</th>
                {/* 10. Link clicks */}
                <th className="p-3.5 min-w-[100px]">Link clicks</th>
                {/* 11. Website landing page views */}
                <th className="p-3.5 min-w-[130px]">Website landing page views</th>
                {/* 12. Adds to cart */}
                <th className="p-3.5 min-w-[100px]">Adds to cart</th>
                {/* 13. Checkouts initiated */}
                <th className="p-3.5 min-w-[120px]">Checkouts initiated</th>
                {/* 14. Purchases */}
                <th className="p-3.5 min-w-[100px]">Purchases</th>
                {/* 15. Cost per landing page view */}
                <th className="p-3.5 min-w-[130px]">Cost per landing page view</th>
                {/* 16. Cost per add to cart */}
                <th className="p-3.5 min-w-[120px]">Cost per add to cart</th>
                {/* 17. Cost per checkout initiated */}
                <th className="p-3.5 min-w-[130px]">Cost per checkout initiated</th>
                {/* 18. Cost per purchase */}
                <th className="p-3.5 min-w-[120px]">Cost per purchase</th>
                {/* 19. 1. OCLP */}
                <th className="p-3.5 min-w-[100px] bg-slate-200/50 dark:bg-slate-800/40 font-extrabold text-emerald-700 dark:text-emerald-400">
                  1. OCLP
                </th>
                {/* 20. 2. LP-ATC */}
                <th className="p-3.5 min-w-[100px] bg-slate-200/50 dark:bg-slate-800/40 font-extrabold text-emerald-700 dark:text-emerald-400">
                  2. LP-ATC
                </th>
                {/* 21. 3. ATC-IC */}
                <th className="p-3.5 min-w-[100px] bg-slate-200/50 dark:bg-slate-800/40 font-extrabold text-emerald-700 dark:text-emerald-400">
                  3. ATC-IC
                </th>
                {/* 22. 4. IC-Purchase */}
                <th className="p-3.5 min-w-[110px] bg-slate-200/50 dark:bg-slate-800/40 font-extrabold text-emerald-700 dark:text-emerald-400">
                  4. IC-Purchase
                </th>
                {/* 23. CPM */}
                <th className="p-3.5 min-w-[100px]">CPM (cost per 1,000 imp)</th>
                {/* 24. CTR (link) */}
                <th className="p-3.5 min-w-[100px]">CTR (link click-through)</th>
                {/* 25. CTR (all) */}
                <th className="p-3.5 min-w-[90px]">CTR (all)</th>
                {/* 26. CPC (link) */}
                <th className="p-3.5 min-w-[100px]">CPC (cost per link)</th>
                {/* 27. CPC (all) */}
                <th className="p-3.5 min-w-[90px]">CPC (all)</th>
                {/* 28. 15-second ThruPlays */}
                <th className="p-3.5 min-w-[130px]">15-second ThruPlays</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap">
              {filteredCampaigns.map((camp) => {
                const health = getHealthBadge(camp.healthStatus);
                const isEditingThisBudget = editingBudgetId === camp.id;
                const isOff = camp.status === "PAUSED";
                const HealthIcon = health.Icon;

                return (
                  <tr
                    key={camp.id}
                    className={cn(
                      "hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors",
                      isOff && "opacity-60 bg-slate-50/40 dark:bg-slate-950/30"
                    )}
                  >
                    {/* 1. Campaign (Sticky Left) */}
                    <td className="p-3.5 sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.04)] font-medium">
                      <div className="max-w-[280px]">
                        <div className="font-bold text-slate-900 dark:text-white truncate" title={camp.name}>
                          {camp.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          Target: {camp.targetAudience}
                        </div>
                        {camp.creativeHook && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 truncate">
                            Hook: {camp.creativeHook}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 2. Delivery */}
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            camp.status === "ACTIVE"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              camp.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            )}
                          />
                          {camp.status === "ACTIVE" ? "Active" : "Off"}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border",
                            health.className
                          )}
                        >
                          <HealthIcon className="w-3 h-3 shrink-0" />
                          {health.label}
                        </span>
                      </div>
                    </td>

                    {/* 3. Actions */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleCampaignStatus(camp.id)}
                          className={cn(
                            "p-1.5 rounded-xl border transition-colors",
                            camp.status === "ACTIVE"
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                          )}
                          title={camp.status === "ACTIVE" ? "Jeda Kampanye" : "Aktifkan Kampanye"}
                        >
                          {camp.status === "ACTIVE" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEditBudget(camp)}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Ubah Anggaran Harian"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* 4. Budget */}
                    <td className="p-3.5">
                      {isEditingThisBudget ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={tempBudget}
                            onChange={(e) => setTempBudget(Number(e.target.value))}
                            className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-emerald-500 rounded-lg text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveBudget(camp.id)}
                            className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
                            title="Simpan"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingBudgetId(null)}
                            className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          Rp {camp.dailyBudget.toLocaleString("id-ID")}/hr
                        </div>
                      )}
                    </td>

                    {/* 5. Amount spent */}
                    <td className="p-3.5 font-mono font-semibold">
                      Rp {camp.spend.toLocaleString("id-ID")}
                    </td>

                    {/* 6. Results */}
                    <td className="p-3.5 font-bold">
                      {camp.results ?? (camp.objective === "OUTCOME_LEADS" ? camp.leads : camp.purchases)}
                    </td>

                    {/* 7. Purchases conversion value */}
                    <td className="p-3.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      Rp {(camp.purchasesConversionValue || camp.purchases * 299000).toLocaleString("id-ID")}
                    </td>

                    {/* 8. Cost per result */}
                    <td className="p-3.5 font-mono">
                      Rp {(camp.costPerResult || camp.cpa).toLocaleString("id-ID")}
                    </td>

                    {/* 9. Reach */}
                    <td className="p-3.5 font-mono">
                      {(camp.reach || Math.round(camp.impressions * 0.72)).toLocaleString("id-ID")}
                    </td>

                    {/* 10. Link clicks */}
                    <td className="p-3.5 font-mono font-medium">
                      {camp.linkClicks.toLocaleString("id-ID")}
                    </td>

                    {/* 11. Website landing page views */}
                    <td className="p-3.5 font-mono">
                      {(camp.landingPageViews || Math.round(camp.linkClicks * 0.82)).toLocaleString("id-ID")}
                    </td>

                    {/* 12. Adds to cart */}
                    <td className="p-3.5 font-mono">
                      {(camp.addsToCart || Math.round((camp.landingPageViews || camp.linkClicks * 0.8) * 0.28)).toLocaleString("id-ID")}
                    </td>

                    {/* 13. Checkouts initiated */}
                    <td className="p-3.5 font-mono">
                      {(camp.checkoutsInitiated || Math.round((camp.addsToCart || 50) * 0.55)).toLocaleString("id-ID")}
                    </td>

                    {/* 14. Purchases */}
                    <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {camp.purchases}
                    </td>

                    {/* 15. Cost per landing page view */}
                    <td className="p-3.5 font-mono">
                      Rp {(camp.costPerLpView || Math.round(camp.spend / (camp.landingPageViews || 1))).toLocaleString("id-ID")}
                    </td>

                    {/* 16. Cost per add to cart */}
                    <td className="p-3.5 font-mono">
                      Rp {(camp.costPerAddToCart || Math.round(camp.spend / (camp.addsToCart || 1))).toLocaleString("id-ID")}
                    </td>

                    {/* 17. Cost per checkout initiated */}
                    <td className="p-3.5 font-mono">
                      Rp {(camp.costPerCheckoutInitiated || Math.round(camp.spend / (camp.checkoutsInitiated || 1))).toLocaleString("id-ID")}
                    </td>

                    {/* 18. Cost per purchase */}
                    <td className="p-3.5 font-mono font-bold">
                      Rp {(camp.costPerPurchase || camp.cpa).toLocaleString("id-ID")}
                    </td>

                    {/* 19. 1. OCLP */}
                    <td className="p-3.5 bg-slate-50 dark:bg-slate-850/50 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      {camp.oclpRate ?? 82.5}%
                    </td>

                    {/* 20. 2. LP-ATC */}
                    <td className="p-3.5 bg-slate-50 dark:bg-slate-850/50 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      {camp.lpToAtcRate ?? 28.2}%
                    </td>

                    {/* 21. 3. ATC-IC */}
                    <td className="p-3.5 bg-slate-50 dark:bg-slate-850/50 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      {camp.atcToIcRate ?? 52.4}%
                    </td>

                    {/* 22. 4. IC-Purchase */}
                    <td className="p-3.5 bg-slate-50 dark:bg-slate-850/50 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      {camp.icToPurchaseRate ?? 46.8}%
                    </td>

                    {/* 23. CPM */}
                    <td className="p-3.5 font-mono">
                      Rp {(camp.cpm || Math.round((camp.spend / camp.impressions) * 1000)).toLocaleString("id-ID")}
                    </td>

                    {/* 24. CTR (link) */}
                    <td className="p-3.5 font-mono font-bold">
                      {camp.ctrLink || camp.ctr}%
                    </td>

                    {/* 25. CTR (all) */}
                    <td className="p-3.5 font-mono">
                      {camp.ctrAll || Number(((camp.clicks / camp.impressions) * 100).toFixed(2))}%
                    </td>

                    {/* 26. CPC (link) */}
                    <td className="p-3.5 font-mono font-bold">
                      Rp {(camp.cpcLink || camp.cpc).toLocaleString("id-ID")}
                    </td>

                    {/* 27. CPC (all) */}
                    <td className="p-3.5 font-mono">
                      Rp {(camp.cpcAll || Math.round(camp.spend / camp.clicks)).toLocaleString("id-ID")}
                    </td>

                    {/* 28. 15-second ThruPlays */}
                    <td className="p-3.5 font-mono">
                      {(camp.videoThruPlays15s || Math.round(camp.impressions * 0.24)).toLocaleString("id-ID")}
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
