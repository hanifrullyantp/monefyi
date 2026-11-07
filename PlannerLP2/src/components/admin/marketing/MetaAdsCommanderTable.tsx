"use client";

import { useState } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { MetaCampaign, AdHealthStatus } from "@/lib/types/marketing";
import {
  Play,
  Pause,
  TrendingUp,
  ShieldAlert,
  Edit2,
  Check,
  X,
  Target,
  DollarSign,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  Calendar,
  Building2,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function MetaAdsCommanderTable() {
  const {
    campaigns,
    isLiveMeta,
    datePreset,
    setDatePreset,
    discoveredAccounts,
    apiConfig,
    selectAdAccount,
    toggleCampaignStatus,
    updateCampaignDailyBudget,
    autoKillBleedingCampaigns,
    autoScaleWinningCampaigns,
    rules,
  } = useMarketingStore();

  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [tempBudget, setTempBudget] = useState<number>(0);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Ringkasan KPI Murni dari Data Kampanye Riil (Tanpa Angka Asumsi/Mockup)
  const totalSpend = campaigns.reduce((acc, c) => acc + Number(c.spend || 0), 0);
  const totalResults = campaigns.reduce((acc, c) => acc + Number(c.results || 0), 0);
  const totalPurchases = campaigns.reduce((acc, c) => acc + Number(c.purchases || 0), 0);
  const totalLeads = campaigns.reduce((acc, c) => acc + Number(c.leads || 0), 0);
  const totalThruPlays = campaigns.reduce(
    (acc, c) => acc + Number(c.videoThruPlays15s || 0),
    0
  );
  const totalRevenue = campaigns.reduce(
    (acc, c) => acc + Number(c.purchasesConversionValue || 0),
    0
  );
  const avgCostPerResult = totalResults > 0 ? Math.round(totalSpend / totalResults) : 0;
  const weightedRoas =
    totalSpend > 0 && totalRevenue > 0 ? (totalRevenue / totalSpend).toFixed(2) : "0.00";
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
      const ok = await updateCampaignDailyBudget(campId, tempBudget, "human");
      setActionNotice(
        ok
          ? `Budget kampanye berhasil diperbarui menjadi Rp ${tempBudget.toLocaleString("id-ID")}/hari di Meta Ads.`
          : "Gagal mengubah budget di Meta Graph API."
      );
      setTimeout(() => setActionNotice(null), 4000);
    }
    setEditingBudgetId(null);
  };

  const handleQuickScaleRow = async (camp: MetaCampaign) => {
    const pct = rules?.scaleBudgetPercentage || 20;
    const base = camp.dailyBudget > 0 ? camp.dailyBudget : 100000;
    const nextBudget = Math.round(base * (1 + pct / 100));
    const ok = await updateCampaignDailyBudget(camp.id, nextBudget, "human");
    setActionNotice(
      ok
        ? `Scale Up +${pct}% berhasil! Budget "${camp.name}" naik menjadi Rp ${nextBudget.toLocaleString("id-ID")}/hari.`
        : `Gagal menaikkan budget "${camp.name}".`
    );
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleAutoKill = async () => {
    const killed = await autoKillBleedingCampaigns();
    setActionNotice(
      killed > 0
        ? `AI Media Buyer berhasil menonaktifkan ${killed} kampanye boncos di Meta Ads.`
        : "Tidak ada kampanye aktif yang melewati ambang batas boncos saat ini."
    );
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleAutoScale = async () => {
    const scaled = await autoScaleWinningCampaigns();
    setActionNotice(
      scaled > 0
        ? `AI Media Buyer berhasil menaikkan budget +${rules?.scaleBudgetPercentage || 20}% pada ${scaled} kampanye potensial.`
        : "Belum ada kampanye aktif yang memenuhi syarat scale up otomatis."
    );
    setTimeout(() => setActionNotice(null), 4000);
  };

  const getHealthBadge = (status: AdHealthStatus) => {
    switch (status) {
      case "scale_ready":
        return {
          label: "Scale Ready",
          Icon: TrendingUp,
          className:
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        };
      case "winning":
        return {
          label: "Winning",
          Icon: CheckCircle2,
          className:
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        };
      case "bleeding":
        return {
          label: "Bleeding (Boncos)",
          Icon: XCircle,
          className:
            "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse",
        };
      case "fatigued":
        return {
          label: "Fatigue",
          Icon: AlertTriangle,
          className:
            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        };
      case "learning":
        return {
          label: "Learning",
          Icon: Clock,
          className:
            "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        };
      default:
        return {
          label: "Active / Monitor",
          Icon: Search,
          className:
            "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
        };
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter === "ACTIVE" && c.status !== "ACTIVE") return false;
    if (statusFilter === "PAUSED" && c.status !== "PAUSED") return false;
    if (
      statusFilter === "WINNING" &&
      c.healthStatus !== "winning" &&
      c.healthStatus !== "scale_ready"
    )
      return false;
    if (statusFilter === "BLEEDING" && c.healthStatus !== "bleeding") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) || c.targetAudience.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Metric Cards Header (100% Data Riil) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Total Amount Spent
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
            Rp {totalSpend.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Conversion Value: Rp {totalRevenue.toLocaleString("id-ID")}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Total Results &amp; CPA
            </span>
            <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
            {totalResults.toLocaleString("id-ID")} Results
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Cost / Result: Rp {avgCostPerResult.toLocaleString("id-ID")} ({totalPurchases} Purchase, {totalLeads} Lead)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              15s ThruPlays &amp; ROAS
            </span>
            <Video className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {totalThruPlays.toLocaleString("id-ID")} ThruPlay
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Blended ROAS: {weightedRoas}x (Target &ge; {rules.minRoasScaleThreshold}x)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Status Kampanye Live
            </span>
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
            Total {campaigns.length} Kampanye di Akun Ini
          </div>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 shadow-sm">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Control Toolbar: Filter Status, Pemilih Akun Iklan, Rentang Tanggal & Tombol AI */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl transition-colors">
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "ACTIVE", "WINNING", "BLEEDING", "PAUSED"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                statusFilter === tab
                  ? "bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              )}
            >
              {tab === "ALL" && `Semua (${campaigns.length})`}
              {tab === "ACTIVE" && "Aktif"}
              {tab === "WINNING" && "Winning / Scale"}
              {tab === "BLEEDING" && "Boncos"}
              {tab === "PAUSED" && "Off"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pemilih Ad Account jika ditemukan lebih dari 1 akun di Business Portfolio */}
          {discoveredAccounts.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <select
                value={apiConfig.adAccountId || ""}
                onChange={(e) => selectAdAccount(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                title="Pilih Akun Iklan dari Business Portfolio Anda"
              >
                {discoveredAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.id}) {acc.account_status === 1 ? "[Aktif]" : "[Nonaktif]"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Pemilih Rentang Waktu (Date Preset) */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              title="Rentang Waktu Meta Insights"
            >
              <option value="data_maximum">Semua Waktu (Lifetime)</option>
              <option value="last_90d">90 Hari Terakhir</option>
              <option value="last_30d">30 Hari Terakhir</option>
              <option value="last_7d">7 Hari Terakhir</option>
              <option value="today">Hari Ini</option>
            </select>
          </div>

          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kampanye..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={handleAutoKill}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
            title="AI otomatis mematikan kampanye boncos di Meta Ads"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span className="hidden md:inline">Kill Boncos</span>
          </button>

          <button
            type="button"
            onClick={handleAutoScale}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
            title="AI otomatis menaikkan budget kampanye winning di Meta Ads"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">Scale Winning (+{rules.scaleBudgetPercentage}%)</span>
          </button>
        </div>
      </div>

      {/* Main Table: 26 Kolom Standar Agency & Scale Model (100% Data Riil Meta Graph API) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors">
        {filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Target className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
              {isLiveMeta
                ? "Belum Ada Kampanye pada Filter / Akun Iklan Ini"
                : "Belum Terhubung ke Akun Live Meta Ads"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {isLiveMeta
                ? "Akun Meta Ads Anda sudah terhubung secara riil (0% data mockup). Jika kampanye berada di akun iklan lain pada Business Portfolio Anda, pilih akun iklan pada dropdown di atas atau buat kampanye baru melalui tab Ads Insight."
                : "Klik tombol Konfigurasi & Rules di kanan atas, tempel Meta Access Token Anda, lalu klik Tes Koneksi Meta Sekarang untuk memuat data kampanye riil Anda."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                  <th className="p-3.5 sticky left-0 z-20 bg-slate-100 dark:bg-slate-950 min-w-[260px] shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                    Campaign
                  </th>
                  <th className="p-3.5 min-w-[130px]">Delivery</th>
                  <th className="p-3.5 min-w-[145px]">Actions (Human / AI)</th>
                  <th className="p-3.5 min-w-[140px]">Budget</th>
                  <th className="p-3.5 min-w-[120px]">Amount spent</th>
                  <th className="p-3.5 min-w-[100px]">Results</th>
                  <th className="p-3.5 min-w-[140px]">Purchases conversion value</th>
                  <th className="p-3.5 min-w-[110px]">Cost per result</th>
                  <th className="p-3.5 min-w-[100px]">Reach</th>
                  <th className="p-3.5 min-w-[100px]">Link clicks</th>
                  <th className="p-3.5 min-w-[130px]">Website landing page views</th>
                  <th className="p-3.5 min-w-[100px]">Adds to cart</th>
                  <th className="p-3.5 min-w-[120px]">Checkouts initiated</th>
                  <th className="p-3.5 min-w-[100px]">Purchases</th>
                  <th className="p-3.5 min-w-[130px]">Cost per landing page view</th>
                  <th className="p-3.5 min-w-[120px]">Cost per add to cart</th>
                  <th className="p-3.5 min-w-[130px]">Cost per checkout initiated</th>
                  <th className="p-3.5 min-w-[120px]">Cost per purchase</th>
                  <th className="p-3.5 min-w-[100px] bg-slate-200/50 dark:bg-slate-800/40 font-extrabold text-emerald-700 dark:text-emerald-400">
                    1. OCLP
                  </th>
                  <th className="p-3.5 min-w-[100px] bg-slate-200/50 dark:bg-slate-800/40 font-extrabold text-emerald-700 dark:text-emerald-400">
                    2. LP-ATC
                  </th>
                  <th className="p-3.5 min-w-[100px] bg-slate-200/50 dark:bg-slate-800/40 font-extrabold text-emerald-700 dark:text-emerald-400">
                    3. ATC-IC
                  </th>
                  <th className="p-3.5 min-w-[110px] bg-slate-200/50 dark:bg-slate-800/40 font-extrabold text-emerald-700 dark:text-emerald-400">
                    4. IC-Purchase
                  </th>
                  <th className="p-3.5 min-w-[100px]">CPM (cost per 1,000 imp)</th>
                  <th className="p-3.5 min-w-[100px]">CTR (link click-through)</th>
                  <th className="p-3.5 min-w-[90px]">CTR (all)</th>
                  <th className="p-3.5 min-w-[100px]">CPC (cost per link)</th>
                  <th className="p-3.5 min-w-[90px]">CPC (all)</th>
                  <th className="p-3.5 min-w-[130px]">15-second ThruPlays</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                {filteredCampaigns.map((camp) => {
                  const health = getHealthBadge(camp.healthStatus);
                  const isEditingThisBudget = editingBudgetId === camp.id;
                  const isOff = camp.status === "PAUSED";
                  const HealthIcon = health.Icon;

                  const lpv = Number(camp.landingPageViews ?? 0);
                  const atc = Number(camp.addsToCart ?? 0);
                  const ic = Number(camp.checkoutsInitiated ?? 0);
                  const pur = Number(camp.purchases ?? 0);

                  return (
                    <tr
                      key={camp.id}
                      className={cn(
                        "hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors",
                        isOff && "opacity-60 bg-slate-50/40 dark:bg-slate-950/30"
                      )}
                    >
                      {/* 1. Campaign */}
                      <td className="p-3.5 sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.04)] font-medium">
                        <div className="max-w-[280px]">
                          <div
                            className="font-bold text-slate-900 dark:text-white truncate"
                            title={camp.name}
                          >
                            {camp.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            ID: {camp.id} • {camp.targetAudience}
                          </div>
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
                                camp.status === "ACTIVE"
                                  ? "bg-emerald-500 animate-pulse"
                                  : "bg-slate-400"
                              )}
                            />
                            {camp.deliveryStatus || (camp.status === "ACTIVE" ? "Active" : "Off")}
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

                      {/* 3. Actions (Pause/Play, Edit Budget, 1-Click Scale +20%) */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleCampaignStatus(camp.id, "human")}
                            className={cn(
                              "p-1.5 rounded-xl border transition-colors cursor-pointer",
                              camp.status === "ACTIVE"
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                            )}
                            title={
                              camp.status === "ACTIVE"
                                ? "Jeda Kampanye di Meta Ads"
                                : "Aktifkan Kampanye di Meta Ads"
                            }
                          >
                            {camp.status === "ACTIVE" ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEditBudget(camp)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Ubah Budget Harian"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickScaleRow(camp)}
                            className="px-2 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] font-black transition-colors cursor-pointer"
                            title={`Scale Up Budget +${rules.scaleBudgetPercentage}% langsung ke Meta Ads`}
                          >
                            +{rules.scaleBudgetPercentage}%
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
                              className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 cursor-pointer"
                              title="Simpan ke Meta Ads"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBudgetId(null)}
                              className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg cursor-pointer"
                              title="Batal"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {camp.dailyBudget > 0
                              ? `Rp ${camp.dailyBudget.toLocaleString("id-ID")}/hr`
                              : "AdSet / Lifetime"}
                          </div>
                        )}
                      </td>

                      {/* 5. Amount spent */}
                      <td className="p-3.5 font-mono font-semibold">
                        Rp {Number(camp.spend || 0).toLocaleString("id-ID")}
                      </td>

                      {/* 6. Results */}
                      <td className="p-3.5 font-mono font-bold">
                        {Number(camp.results ?? 0).toLocaleString("id-ID")}
                      </td>

                      {/* 7. Purchases conversion value */}
                      <td className="p-3.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        Rp {Number(camp.purchasesConversionValue ?? 0).toLocaleString("id-ID")}
                      </td>

                      {/* 8. Cost per result */}
                      <td className="p-3.5 font-mono">
                        {Number(camp.costPerResult || 0) > 0
                          ? `Rp ${Number(camp.costPerResult).toLocaleString("id-ID")}`
                          : "-"}
                      </td>

                      {/* 9. Reach */}
                      <td className="p-3.5 font-mono">
                        {Number(camp.reach ?? 0).toLocaleString("id-ID")}
                      </td>

                      {/* 10. Link clicks */}
                      <td className="p-3.5 font-mono font-medium">
                        {Number(camp.linkClicks ?? 0).toLocaleString("id-ID")}
                      </td>

                      {/* 11. Website landing page views */}
                      <td className="p-3.5 font-mono">{lpv.toLocaleString("id-ID")}</td>

                      {/* 12. Adds to cart */}
                      <td className="p-3.5 font-mono">{atc.toLocaleString("id-ID")}</td>

                      {/* 13. Checkouts initiated */}
                      <td className="p-3.5 font-mono">{ic.toLocaleString("id-ID")}</td>

                      {/* 14. Purchases */}
                      <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {pur.toLocaleString("id-ID")}
                      </td>

                      {/* 15. Cost per landing page view */}
                      <td className="p-3.5 font-mono">
                        {lpv > 0 && Number(camp.costPerLpView || 0) > 0
                          ? `Rp ${Number(camp.costPerLpView).toLocaleString("id-ID")}`
                          : "-"}
                      </td>

                      {/* 16. Cost per add to cart */}
                      <td className="p-3.5 font-mono">
                        {atc > 0 && Number(camp.costPerAddToCart || 0) > 0
                          ? `Rp ${Number(camp.costPerAddToCart).toLocaleString("id-ID")}`
                          : "-"}
                      </td>

                      {/* 17. Cost per checkout initiated */}
                      <td className="p-3.5 font-mono">
                        {ic > 0 && Number(camp.costPerCheckoutInitiated || 0) > 0
                          ? `Rp ${Number(camp.costPerCheckoutInitiated).toLocaleString("id-ID")}`
                          : "-"}
                      </td>

                      {/* 18. Cost per purchase */}
                      <td className="p-3.5 font-mono font-bold">
                        {pur > 0 && Number(camp.costPerPurchase || 0) > 0
                          ? `Rp ${Number(camp.costPerPurchase).toLocaleString("id-ID")}`
                          : "-"}
                      </td>

                      {/* 19. 1. OCLP */}
                      <td className="p-3.5 bg-slate-50 dark:bg-slate-850/50 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        {Number(camp.oclpRate ?? 0)}%
                      </td>

                      {/* 20. 2. LP-ATC */}
                      <td className="p-3.5 bg-slate-50 dark:bg-slate-850/50 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        {Number(camp.lpToAtcRate ?? 0)}%
                      </td>

                      {/* 21. 3. ATC-IC */}
                      <td className="p-3.5 bg-slate-50 dark:bg-slate-850/50 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        {Number(camp.atcToIcRate ?? 0)}%
                      </td>

                      {/* 22. 4. IC-Purchase */}
                      <td className="p-3.5 bg-slate-50 dark:bg-slate-850/50 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        {Number(camp.icToPurchaseRate ?? 0)}%
                      </td>

                      {/* 23. CPM */}
                      <td className="p-3.5 font-mono">
                        Rp {Number(camp.cpm ?? 0).toLocaleString("id-ID")}
                      </td>

                      {/* 24. CTR (link) */}
                      <td className="p-3.5 font-mono font-bold">
                        {Number(camp.ctrLink ?? 0)}%
                      </td>

                      {/* 25. CTR (all) */}
                      <td className="p-3.5 font-mono">{Number(camp.ctrAll ?? 0)}%</td>

                      {/* 26. CPC (link) */}
                      <td className="p-3.5 font-mono font-bold">
                        Rp {Number(camp.cpcLink ?? 0).toLocaleString("id-ID")}
                      </td>

                      {/* 27. CPC (all) */}
                      <td className="p-3.5 font-mono">
                        Rp {Number(camp.cpcAll ?? 0).toLocaleString("id-ID")}
                      </td>

                      {/* 28. 15-second ThruPlays */}
                      <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {Number(camp.videoThruPlays15s ?? 0).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
