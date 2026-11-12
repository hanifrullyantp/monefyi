"use client";

import { useState, useMemo, useEffect } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { MetaCampaign, MetaAdSet, MetaAd, AdHealthStatus } from "@/lib/types/marketing";
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
  ChevronDown,
  ChevronRight,
  Pin,
  PinOff,
  Filter,
  Layers,
  Image as ImageIcon,
  Sparkles,
  BarChart3,
  Settings,
  Eye,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface MetaAdsCommanderTableProps {
  onOpenWinningEngine?: () => void;
  onOpenInsights?: () => void;
  onOpenCreative?: () => void;
  onOpenConfig?: () => void;
}

export function MetaAdsCommanderTable({
  onOpenWinningEngine,
  onOpenInsights,
  onOpenCreative,
  onOpenConfig,
}: MetaAdsCommanderTableProps) {
  const {
    campaigns,
    isLiveMeta,
    datePreset,
    setDatePreset,
    discoveredAccounts,
    apiConfig,
    selectAdAccount,
    toggleCampaignStatus,
    toggleAdStatus,
    updateCampaignDailyBudget,
    autoKillBleedingCampaigns,
    autoScaleWinningCampaigns,
    rules,
  } = useMarketingStore();

  // 2. Default: HARI INI (today) dan YANG AKTIF SAJA (ACTIVE)
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [tempBudget, setTempBudget] = useState<number>(0);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // 8. Freeze / Pin Kolom Toggle (Bisa digeser atau di-freeze)
  const [isColumnPinned, setIsColumnPinned] = useState<boolean>(false);
  // Tabel desktop 26 metrik disembunyikan secara default. Ringkasan di atas tetap tampil.
  const [showFullTable, setShowFullTable] = useState<boolean>(false);

  // 11. Accordion Drilldown Ad Sets & Ads
  const [expandedCampaignIds, setExpandedCampaignIds] = useState<Set<string>>(new Set());

  // 5. Pengaturan Kata Kunci Campaign (Hanya kampanye berkatakunci yang dianalisa)
  const [campaignKeywords, setCampaignKeywords] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("monefyi_campaign_keywords") || "monefyi, estimator, rab";
    }
    return "monefyi, estimator, rab";
  });
  const [isKeywordFilterActive, setIsKeywordFilterActive] = useState<boolean>(true);
  const [showKeywordModal, setShowKeywordModal] = useState<boolean>(false);
  const [tempKeywords, setTempKeywords] = useState<string>(campaignKeywords);

  // Set default datePreset ke 'today' jika belum diset
  useEffect(() => {
    if (datePreset !== "today" && datePreset === "data_maximum") {
      setDatePreset("today");
    }
  }, []);

  const toggleExpand = (cid: string) => {
    setExpandedCampaignIds((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  };

  const handleSaveKeywords = () => {
    setCampaignKeywords(tempKeywords);
    if (typeof window !== "undefined") {
      localStorage.setItem("monefyi_campaign_keywords", tempKeywords);
    }
    setShowKeywordModal(false);
  };

  // Filter Kampanye berdasarkan Kata Kunci
  const keywordFilteredCampaigns = useMemo(() => {
    if (!isKeywordFilterActive) return campaigns;
    const keywordsList = campaignKeywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    if (keywordsList.length === 0) return campaigns;

    return campaigns.filter((c) => {
      const campName = (c.name || "").toLowerCase();
      return keywordsList.some((kw) => campName.includes(kw));
    });
  }, [campaigns, campaignKeywords, isKeywordFilterActive]);

  // 3. Ringkasan KPI Murni Berdasarkan Kampanye yang Lolos Filter Kata Kunci
  const totalSpend = keywordFilteredCampaigns.reduce((acc, c) => acc + Number(c.spend || 0), 0);
  // 10. Di Meta hasilnya adalah PURCHASING riil
  const totalPurchases = keywordFilteredCampaigns.reduce((acc, c) => acc + Number(c.purchases || 0), 0);
  const totalResults = totalPurchases;
  const totalLeads = keywordFilteredCampaigns.reduce((acc, c) => acc + Number(c.leads || 0), 0);
  const totalThruPlays = keywordFilteredCampaigns.reduce(
    (acc, c) => acc + Number(c.videoThruPlays15s || 0),
    0
  );
  const totalRevenue = keywordFilteredCampaigns.reduce(
    (acc, c) => acc + Number(c.purchasesConversionValue || 0),
    0
  );
  const avgCostPerResult = totalResults > 0 ? Math.round(totalSpend / totalResults) : 0;
  const weightedRoas =
    totalSpend > 0 && totalRevenue > 0 ? (totalRevenue / totalSpend).toFixed(2) : "0.00";
  const winningCount = keywordFilteredCampaigns.filter(
    (c) => c.healthStatus === "winning" || c.healthStatus === "scale_ready"
  ).length;
  const bleedingCount = keywordFilteredCampaigns.filter((c) => c.healthStatus === "bleeding").length;

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

  const [updatingAdId, setUpdatingAdId] = useState<string | null>(null);

  const handleToggleAdStatus = async (adId: string, campaignId: string, currentStatus: string, adName?: string) => {
    setUpdatingAdId(adId);
    try {
      const ok = await toggleAdStatus(adId, campaignId, "human");
      const nextStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
      setActionNotice(
        ok
          ? `Status iklan "${adName || adId}" berhasil diubah menjadi ${nextStatus} di Meta Ads.`
          : `Gagal mengubah status iklan "${adName || adId}".`
      );
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setUpdatingAdId(null);
    }
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

  const finalFilteredCampaigns = keywordFilteredCampaigns.filter((c) => {
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
      return c.name.toLowerCase().includes(q) || c.targetAudience.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-3">
      {/* 3. PERTAHANKAN DASHBOARD CARD SEKARANG (TOTAL AMOUNT SPENT, RESULTS & CPA, THRUPLAYS & ROAS, STATUS KAMPANYE) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {/* Card 1: TOTAL AMOUNT SPENT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">
              TOTAL AMOUNT SPENT
            </span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
            Rp {totalSpend.toLocaleString("id-ID")}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Conversion Value: Rp {totalRevenue.toLocaleString("id-ID")}
          </div>
        </div>

        {/* Card 2: TOTAL RESULTS & CPA (PURCHASES) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">
              TOTAL RESULTS &amp; CPA
            </span>
            <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
            {totalResults.toLocaleString("id-ID")} Results
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Cost / Result: Rp {avgCostPerResult.toLocaleString("id-ID")} ({totalPurchases} Purchase, {totalLeads} Lead)
          </div>
        </div>

        {/* Card 3: 15S THRUPLAYS & ROAS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">
              15S THRUPLAYS &amp; ROAS
            </span>
            <Video className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
            {totalThruPlays.toLocaleString("id-ID")} ThruPlay
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Blended ROAS: {weightedRoas}x (Target &ge; {rules.minRoasScaleThreshold}x)
          </div>
        </div>

        {/* Card 4: STATUS KAMPANYE LIVE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">
              STATUS KAMPANYE LIVE
            </span>
            <Activity className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
              {winningCount} Winning
            </span>
            {bleedingCount > 0 && (
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.2 rounded-full border border-rose-200 dark:border-rose-800">
                {bleedingCount} Boncos
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Total {keywordFilteredCampaigns.length} Kampanye di Analisa Ini
          </div>
        </div>
      </div>

      {/* 4. TOMBOL DI BAWAH CARD UNTUK MASUK KE WINNING ENGINE, INSIGHT, CREATIVE & PENGATURAN */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={onOpenWinningEngine}
          className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Winning Engine</span>
        </button>

        <button
          type="button"
          onClick={onOpenInsights}
          className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700"
        >
          <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
          <span>Ads Insight &amp; Demografi</span>
        </button>

        <button
          type="button"
          onClick={onOpenCreative}
          className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700"
        >
          <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
          <span>Pabrik Iklan Creative</span>
        </button>

        <button
          type="button"
          onClick={onOpenConfig}
          className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700"
        >
          <Settings className="w-3.5 h-3.5 text-slate-500" />
          <span>Konfigurasi &amp; Rules</span>
        </button>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="py-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 shadow-2xs">
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 6. FILTER DIJADIKAN SATU BARIS (1 SINGLE COMPACT LINE) */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl transition-colors overflow-x-auto scrollbar-none whitespace-nowrap">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 shrink-0">
          {[
            { id: "ALL", label: `Semua (${campaigns.length})` },
            { id: "ACTIVE", label: "Aktif" },
            { id: "WINNING", label: "Winning" },
            { id: "BLEEDING", label: "Boncos" },
            { id: "PAUSED", label: "Off" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer",
                statusFilter === tab.id
                  ? "bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-2xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Kanan: Akun, Preset, Search, Kata Kunci, Freeze, Kill & Scale */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 5. Tombol Pengaturan Kata Kunci Campaign */}
          <button
            type="button"
            onClick={() => {
              setTempKeywords(campaignKeywords);
              setShowKeywordModal(true);
            }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer",
              isKeywordFilterActive
                ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
            )}
            title={`Filter Kata Kunci Campaign: ${campaignKeywords}`}
          >
            <Filter className="w-3 h-3 text-purple-600" />
            <span className="hidden md:inline">Kata Kunci:</span>
            <span className="max-w-[100px] truncate font-mono text-[10px]">
              {campaignKeywords || "Semua"}
            </span>
          </button>

          {/* Ad Account Dropdown */}
          {discoveredAccounts.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 max-w-[150px]">
              <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
              <select
                value={apiConfig.adAccountId || ""}
                onChange={(e) => selectAdAccount(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer truncate w-full"
                title="Pilih Akun Iklan"
              >
                {discoveredAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Preset (Default Hari Ini) */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
            <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              title="Rentang Waktu"
            >
              <option value="today">Hari Ini (Default)</option>
              <option value="yesterday">Kemarin</option>
              <option value="last_7d">7 Hari</option>
              <option value="last_30d">30 Hari</option>
              <option value="data_maximum">Semua</option>
            </select>
          </div>

          {/* 8. Tombol Freeze Kolom Toggle (Pin / Tidak Pin Kolom Nama) */}
          <button
            type="button"
            onClick={() => setIsColumnPinned(!isColumnPinned)}
            className={cn(
              "hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer",
              isColumnPinned
                ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
            )}
            title={
              isColumnPinned
                ? "Kolom Nama Sedang Dipin (Freeze). Klik untuk geser semua."
                : "Kolom Bebas Digeser. Klik untuk freeze kolom nama."
            }
          >
            {isColumnPinned ? (
              <>
                <Pin className="w-3 h-3 text-indigo-600" />
                <span>Pinned</span>
              </>
            ) : (
              <>
                <PinOff className="w-3 h-3 text-slate-500" />
                <span>Geser Semua</span>
              </>
            )}
          </button>

          {/* Search Input */}
          <div className="relative w-24 sm:w-32">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari..."
              className="w-full pl-6 pr-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Kill Boncos */}
          <button
            type="button"
            onClick={handleAutoKill}
            className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-2xs"
            title="Matikan kampanye boncos"
          >
            <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
            <span className="hidden sm:inline">Kill Boncos</span>
          </button>

          {/* Scale Winning */}
          <button
            type="button"
            onClick={handleAutoScale}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-2xs"
            title="Scale budget kampanye winning"
          >
            <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Scale Winning (+{rules.scaleBudgetPercentage}%)</span>
          </button>
        </div>
      </div>

      {/* 9. TAMPILAN MOBILE: DATA BERBENTUK CARD BERBARIS KE BAWAH (SCROLL VERTICAL, MAKSIMAL 2-3 KOLOM) */}
      <div className="sm:hidden space-y-3">
        {finalFilteredCampaigns.map((camp) => {
          const isExpanded = expandedCampaignIds.has(camp.id);
          const health = getHealthBadge(camp.healthStatus);
          const HealthIcon = health.Icon;
          const isOff = camp.status === "PAUSED";
          const totalChildAds =
            camp.adsets?.reduce((acc, as) => acc + (as.ads?.length || 0), 0) || 0;

          return (
            <div
              key={`mob_${camp.id}`}
              className={cn(
                "p-3.5 rounded-2xl border transition-all bg-white dark:bg-slate-900 shadow-xs space-y-3",
                isOff
                  ? "border-slate-200 dark:border-slate-800 opacity-75"
                  : "border-slate-200 dark:border-slate-800 hover:border-emerald-500/50"
              )}
            >
              {/* Header Card: Nama, Delivery, & Aksi Cepat */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">
                    {camp.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border",
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
                      {camp.deliveryStatus || (camp.status === "ACTIVE" ? "Active" : "Off")}
                    </span>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border",
                        health.className
                      )}
                    >
                      <HealthIcon className="w-2.5 h-2.5" />
                      {health.label}
                    </span>
                  </div>
                </div>

                {/* Tombol Aksi: Scale & Play/Pause */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuickScaleRow(camp)}
                    className="p-1.5 rounded-lg border text-[10px] font-black bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                    title={`Scale budget +${rules?.scaleBudgetPercentage || 20}%`}
                  >
                    +{rules?.scaleBudgetPercentage || 20}%
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCampaignStatus(camp.id)}
                    className={cn(
                      "p-1.5 rounded-lg border text-xs font-bold transition-all shrink-0",
                      isOff
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                        : "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                    )}
                    title={isOff ? "Nyalakan Kampanye" : "Matikan Kampanye"}
                  >
                    {isOff ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Grid Metrik Desktop ke Mobile (Maksimal 3 Kolom Baca ke Bawah) */}
              {/* Blok 1: Anggaran, Biaya & ROAS */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-850/60 p-2.5 rounded-xl text-center text-xs border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Budget</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px]">
                    Rp {Number(camp.dailyBudget || 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Amount Spent</span>
                  <span className="font-black text-slate-900 dark:text-white text-[11px]">
                    Rp {Number(camp.spend || 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">ROAS</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 text-[11px]">
                    {camp.roas ? `${camp.roas}x` : "-"}
                  </span>
                </div>
              </div>

              {/* Blok 2: Konversi Penjualan & Biaya Hasil */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-850/60 p-2.5 rounded-xl text-center text-xs border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Results (Purchases)</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                    {camp.purchases || 0}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Conv. Value</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px]">
                    Rp {Number(camp.purchasesConversionValue || 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Cost / Result</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px]">
                    Rp {Number(camp.costPerResult || 0).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Blok 3: Jangkauan & Traffic Clicks */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-850/60 p-2.5 rounded-xl text-center text-xs border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Reach</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                    {Number(camp.reach || 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Link Clicks</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                    {Number(camp.linkClicks || 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">15s ThruPlays</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                    {Number(camp.videoThruPlays15s || 0).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Blok 4: Efisiensi Biaya CPM, CTR & CPC Link */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-850/60 p-2.5 rounded-xl text-center text-xs border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">CPM</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                    Rp {Number(camp.cpm || 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">CTR (Link)</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                    {camp.ctrLink ? `${camp.ctrLink}%` : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">CPC (Link)</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                    Rp {Number(camp.cpcLink || 0).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Blok 5: Funnel Konversi Scale Model (2 Kolom Ramping) */}
              <div className="grid grid-cols-2 gap-2 bg-emerald-50/40 dark:bg-emerald-950/20 p-2.5 rounded-xl text-xs border border-emerald-100 dark:border-emerald-900/40">
                <div>
                  <span className="text-[9px] text-emerald-800 dark:text-emerald-300 font-bold block">
                    LP Views (OCLP)
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-[11px]">
                    {Number(camp.landingPageViews || 0).toLocaleString("id-ID")}{" "}
                    <span className="text-[9px] text-emerald-600 font-bold">({camp.oclpRate || 0}%)</span>
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-emerald-800 dark:text-emerald-300 font-bold block">
                    Adds to Cart
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-[11px]">
                    {camp.addsToCart || 0}{" "}
                    <span className="text-[9px] text-emerald-600 font-bold">({camp.lpToAtcRate || 0}%)</span>
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-emerald-800 dark:text-emerald-300 font-bold block">
                    Checkouts
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-[11px]">
                    {camp.checkoutsInitiated || 0}{" "}
                    <span className="text-[9px] text-emerald-600 font-bold">({camp.atcToIcRate || 0}%)</span>
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-emerald-800 dark:text-emerald-300 font-bold block">
                    Conv. Rate (IC-Buy)
                  </span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    {camp.icToPurchaseRate || 0}%
                  </span>
                </div>
              </div>

              {/* 11. Accordion Drilldown Ad Sets & Ads di Mobile */}
              <button
                type="button"
                onClick={() => toggleExpand(camp.id)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>
                    Ad Sets ({camp.adsets?.length || 0}) &amp; Ads ({totalChildAds})
                  </span>
                </span>
                <ChevronDown
                  className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180 text-emerald-500")}
                />
              </button>

              {/* Tampilan Drilldown Ad Sets & Ads Lengkap dengan Metrik di Mobile */}
              {isExpanded && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {camp.adsets && camp.adsets.length > 0 ? (
                    camp.adsets.map((adset) => (
                      <div
                        key={adset.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 space-y-2.5"
                      >
                        {/* Header AdSet */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">AdSet</span>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate block">
                              {adset.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                            {adset.status}
                          </span>
                        </div>

                        {/* Metrik AdSet (3 Kolom Baca ke Bawah) */}
                        <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <div>
                            <span className="text-[8px] text-slate-400 font-bold uppercase block">Budget</span>
                            <span className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200">
                              Rp {Number(adset.dailyBudget || 0).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-400 font-bold uppercase block">Spent</span>
                            <span className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200">
                              Rp {Number(adset.spend || 0).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-400 font-bold uppercase block">Purchases</span>
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                              {adset.purchases || 0}
                            </span>
                          </div>
                        </div>

                        {/* Child Ads dengan Metrik Riil & Kontrol On/Off */}
                        {adset.ads && adset.ads.length > 0 ? (
                          <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-750">
                            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                              Daftar Iklan ({adset.ads.length} Ads)
                            </span>
                            {adset.ads.map((ad) => {
                              const isAdOff = ad.status === "PAUSED";
                              const isThisAdUpdating = updatingAdId === ad.id;

                              return (
                                <div
                                  key={ad.id}
                                  className={cn(
                                    "p-2.5 rounded-xl border bg-white dark:bg-slate-900 space-y-2 transition-all shadow-2xs",
                                    isAdOff
                                      ? "border-slate-200 dark:border-slate-800 opacity-70"
                                      : "border-slate-200 dark:border-slate-750"
                                  )}
                                >
                                  {/* Header Ad: Thumbnail, Nama & Switch Play/Pause */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {ad.creativeThumbnail ? (
                                        <img
                                          src={ad.creativeThumbnail}
                                          alt={ad.name}
                                          className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                                        />
                                      ) : (
                                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                          <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="font-extrabold text-[11px] text-slate-900 dark:text-white truncate">
                                          {ad.name}
                                        </p>
                                        <p className="text-[9px] text-slate-400 truncate">ID: {ad.id}</p>
                                      </div>
                                    </div>

                                    {/* Tombol Play/Pause Ad Individu */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span
                                        className={cn(
                                          "text-[9px] font-black px-1.5 py-0.5 rounded",
                                          isAdOff
                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            : "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                                        )}
                                      >
                                        {isAdOff ? "OFF" : "ON"}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={isThisAdUpdating}
                                        onClick={() => handleToggleAdStatus(ad.id, camp.id, ad.status, ad.name)}
                                        className={cn(
                                          "p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer",
                                          isAdOff
                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                                            : "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                                        )}
                                        title={isAdOff ? "Nyalakan Iklan Ini" : "Matikan Iklan Ini"}
                                      >
                                        {isThisAdUpdating ? (
                                          <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                                        ) : isAdOff ? (
                                          <Play className="w-3 h-3" />
                                        ) : (
                                          <Pause className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Metrik Ad Lengkap (3 Kolom Baca ke Bawah) */}
                                  <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-center">
                                    <div>
                                      <span className="text-[8px] text-slate-400 font-bold uppercase block">
                                        Spent
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                        Rp {Number(ad.spend || 0).toLocaleString("id-ID")}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] text-slate-400 font-bold uppercase block">
                                        Purchases
                                      </span>
                                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                        {ad.purchases || 0}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] text-slate-400 font-bold uppercase block">
                                        CPA
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                        Rp {Number(ad.cpa || 0).toLocaleString("id-ID")}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] text-slate-400 font-bold uppercase block">
                                        ROAS
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                        {ad.roas ? `${ad.roas}x` : "-"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] text-slate-400 font-bold uppercase block">
                                        CTR (Link)
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                        {ad.ctr ? `${ad.ctr}%` : "-"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] text-slate-400 font-bold uppercase block">
                                        Link Clicks
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                        {Number(ad.clicks || 0).toLocaleString("id-ID")}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic text-center py-1">
                            Tidak ada ads di AdSet ini.
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400 text-center py-2">
                      Belum ada data AdSet/Ad di kampanye ini.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* TAMPILAN DESKTOP & TABLET: TABEL KAMPANYE DENGAN TOGGLE FREEZE & ACCORDION DRILLDOWN (DEFAULT TERSEMBUNYI) */}
      <div className="hidden sm:flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ringkasan di atas sudah cukup untuk keputusan harian. Detail kampanye ada di balik tombol ini.
        </p>
        <button
          type="button"
          onClick={() => setShowFullTable((v) => !v)}
          aria-expanded={showFullTable}
          className="shrink-0 min-h-[36px] px-3 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {showFullTable ? "Sembunyikan detail" : "Tampilkan detail 26 metrik"}
        </button>
      </div>
      <div
        className={cn(
          "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors",
          showFullTable ? "hidden sm:block" : "hidden"
        )}
      >
        {finalFilteredCampaigns.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Target className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
              Tidak Ada Kampanye yang Cocok dengan Filter
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Periksa filter kata kunci atau ubah filter status &amp; rentang waktu ke "Semua".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                  {/* Kolom Expand */}
                  <th className="p-3 w-8 text-center"></th>

                  {/* 8. Kolom Campaign: Bisa Freeze (Sticky) atau Geser Bersama Kolom Lain */}
                  <th
                    className={cn(
                      "p-3.5 min-w-[240px] transition-all",
                      isColumnPinned &&
                        "sticky left-0 z-20 bg-slate-100 dark:bg-slate-950 shadow-[2px_0_5px_rgba(0,0,0,0.06)]"
                    )}
                  >
                    Campaign
                  </th>
                  <th className="p-3.5 min-w-[120px]">Delivery</th>
                  <th className="p-3.5 min-w-[130px]">Aksi</th>
                  <th className="p-3.5 min-w-[130px]">Budget</th>
                  <th className="p-3.5 min-w-[110px]">Amount spent</th>
                  <th className="p-3.5 min-w-[100px] text-emerald-600 dark:text-emerald-400 font-black">
                    Results (Purchases)
                  </th>
                  <th className="p-3.5 min-w-[120px]">Conv. Value</th>
                  <th className="p-3.5 min-w-[100px]">Cost / Result</th>
                  <th className="p-3.5 min-w-[80px]">ROAS</th>
                  <th className="p-3.5 min-w-[90px]">Reach</th>
                  <th className="p-3.5 min-w-[90px]">Link Clicks</th>
                  <th className="p-3.5 min-w-[100px]">LP Views</th>
                  <th className="p-3.5 min-w-[90px]">Adds to Cart</th>
                  <th className="p-3.5 min-w-[100px]">Checkouts</th>
                  <th className="p-3.5 min-w-[90px]">Purchases</th>
                  <th className="p-3.5 min-w-[90px]">CPM</th>
                  <th className="p-3.5 min-w-[90px]">CTR (Link)</th>
                  <th className="p-3.5 min-w-[90px]">CPC (Link)</th>
                  <th className="p-3.5 min-w-[110px]">15s ThruPlays</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                {finalFilteredCampaigns.map((camp) => {
                  const health = getHealthBadge(camp.healthStatus);
                  const HealthIcon = health.Icon;
                  const isOff = camp.status === "PAUSED";
                  const isExpanded = expandedCampaignIds.has(camp.id);
                  const isEditingThisBudget = editingBudgetId === camp.id;

                  return (
                    <>
                      <tr
                        key={camp.id}
                        className={cn(
                          "hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors",
                          isOff && "opacity-60 bg-slate-50/40 dark:bg-slate-950/30"
                        )}
                      >
                        {/* 11. Tombol Chevron Accordion Drilldown */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(camp.id)}
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                            title="Buka detail AdSets & Ads"
                          >
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 transition-transform",
                                isExpanded && "rotate-180 text-emerald-600"
                              )}
                            />
                          </button>
                        </td>

                        {/* 7. Campaign Name (Bersih, Ramping, Tanpa ID) */}
                        <td
                          className={cn(
                            "p-3.5 font-medium transition-all",
                            isColumnPinned &&
                              "sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.06)]"
                          )}
                        >
                          <div className="max-w-[260px]">
                            <span
                              className="font-bold text-xs text-slate-900 dark:text-white truncate block"
                              title={camp.name}
                            >
                              {camp.name}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                              {camp.targetAudience}
                            </span>
                          </div>
                        </td>

                        {/* Delivery */}
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
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold border",
                                health.className
                              )}
                            >
                              <HealthIcon className="w-2.5 h-2.5" />
                              {health.label}
                            </span>
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleCampaignStatus(camp.id)}
                              className={cn(
                                "p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer",
                                isOff
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                                  : "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                              )}
                              title={isOff ? "Nyalakan Kampanye" : "Matikan Kampanye"}
                            >
                              {isOff ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickScaleRow(camp)}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-black transition-all cursor-pointer"
                              title="Scale +20% Budget"
                            >
                              +20%
                            </button>
                          </div>
                        </td>

                        {/* Budget */}
                        <td className="p-3.5 font-bold">
                          {isEditingThisBudget ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={tempBudget}
                                onChange={(e) => setTempBudget(Number(e.target.value))}
                                className="w-20 px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-emerald-500 rounded text-xs text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveBudget(camp.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span>Rp {Number(camp.dailyBudget || 0).toLocaleString("id-ID")}</span>
                              <button
                                type="button"
                                onClick={() => handleStartEditBudget(camp)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Spent */}
                        <td className="p-3.5 font-bold">
                          Rp {Number(camp.spend || 0).toLocaleString("id-ID")}
                        </td>

                        {/* 10. Results (Purchases Riil) */}
                        <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {camp.purchases || camp.results || 0}
                        </td>

                        {/* Conv Value */}
                        <td className="p-3.5">
                          Rp {Number(camp.purchasesConversionValue || 0).toLocaleString("id-ID")}
                        </td>

                        {/* Cost per Result */}
                        <td className="p-3.5">
                          Rp {Number(camp.costPerResult || 0).toLocaleString("id-ID")}
                        </td>

                        {/* ROAS */}
                        <td className="p-3.5 font-black">
                          {camp.roas ? `${camp.roas}x` : "-"}
                        </td>

                        {/* Reach */}
                        <td className="p-3.5">
                          {Number(camp.reach || 0).toLocaleString("id-ID")}
                        </td>

                        {/* Link Clicks */}
                        <td className="p-3.5">
                          {Number(camp.linkClicks || 0).toLocaleString("id-ID")}
                        </td>

                        {/* LP Views */}
                        <td className="p-3.5">
                          {Number(camp.landingPageViews || 0).toLocaleString("id-ID")}
                        </td>

                        {/* Adds to Cart */}
                        <td className="p-3.5">{camp.addsToCart || 0}</td>

                        {/* Checkouts */}
                        <td className="p-3.5">{camp.checkoutsInitiated || 0}</td>

                        {/* Purchases */}
                        <td className="p-3.5 font-bold">{camp.purchases || 0}</td>

                        {/* CPM */}
                        <td className="p-3.5">
                          Rp {Number(camp.cpm || 0).toLocaleString("id-ID")}
                        </td>

                        {/* CTR */}
                        <td className="p-3.5">{camp.ctrLink ? `${camp.ctrLink}%` : "-"}</td>

                        {/* CPC */}
                        <td className="p-3.5">
                          Rp {Number(camp.cpcLink || 0).toLocaleString("id-ID")}
                        </td>

                        {/* ThruPlays */}
                        <td className="p-3.5">{camp.videoThruPlays15s || 0}</td>
                      </tr>

                      {/* 11. ACCORDION ROW UNTUK MENAMPILKAN AD SETS & ADS DI SAMPING/BAWAH KAMPANYE */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-slate-950/80 border-y-2 border-emerald-500/30">
                          <td colSpan={20} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-emerald-500" />
                                  <span>Daftar Ad Sets &amp; Ads untuk "{camp.name}"</span>
                                </h5>
                                <span className="text-[10px] text-slate-500 font-bold">
                                  Total {camp.adsets?.length || 0} Ad Sets
                                </span>
                              </div>

                              {camp.adsets && camp.adsets.length > 0 ? (
                                <div className="space-y-3">
                                  {camp.adsets.map((adset) => (
                                    <div
                                      key={adset.id}
                                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3"
                                    >
                                      {/* Header AdSet & Ringkasan Metrik AdSet */}
                                      <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-extrabold text-slate-900 dark:text-white">
                                            AdSet: {adset.name}
                                          </span>
                                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            {adset.status}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                                          <span>Budget: Rp {Number(adset.dailyBudget || 0).toLocaleString("id-ID")}/hari</span>
                                          <span>Spent: Rp {Number(adset.spend || 0).toLocaleString("id-ID")}</span>
                                          <span className="text-emerald-600 font-bold">Purchases: {adset.purchases || 0}</span>
                                          <span>CPA: Rp {Number(adset.cpa || 0).toLocaleString("id-ID")}</span>
                                        </div>
                                      </div>

                                      {/* Child Ads dengan Metrik Riil & Kontrol On/Off */}
                                      {adset.ads && adset.ads.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                          {adset.ads.map((ad) => {
                                            const isAdOff = ad.status === "PAUSED";
                                            const isThisAdUpdating = updatingAdId === ad.id;

                                            return (
                                              <div
                                                key={ad.id}
                                                className={cn(
                                                  "p-3 rounded-xl border bg-slate-50/70 dark:bg-slate-800/40 space-y-2 transition-all",
                                                  isAdOff
                                                    ? "border-slate-200 dark:border-slate-800 opacity-65"
                                                    : "border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/40"
                                                )}
                                              >
                                                {/* Header Ad: Thumbnail, Nama, & Tombol Switch */}
                                                <div className="flex items-center justify-between gap-2">
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    {ad.creativeThumbnail ? (
                                                      <img
                                                        src={ad.creativeThumbnail}
                                                        alt={ad.name}
                                                        className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                                                      />
                                                    ) : (
                                                      <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                        <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                                                      </div>
                                                    )}
                                                    <div className="min-w-0">
                                                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                                                        {ad.name}
                                                      </p>
                                                      <p className="text-[10px] text-slate-400 truncate">
                                                        ID: {ad.id}
                                                      </p>
                                                    </div>
                                                  </div>

                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    <span
                                                      className={cn(
                                                        "text-[9px] font-black px-1.5 py-0.5 rounded",
                                                        isAdOff
                                                          ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                          : "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                                                      )}
                                                    >
                                                      {isAdOff ? "OFF" : "ON"}
                                                    </span>
                                                    <button
                                                      type="button"
                                                      disabled={isThisAdUpdating}
                                                      onClick={() => handleToggleAdStatus(ad.id, camp.id, ad.status, ad.name)}
                                                      className={cn(
                                                        "p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer",
                                                        isAdOff
                                                          ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                                                          : "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                                                      )}
                                                      title={isAdOff ? "Nyalakan Iklan Ini" : "Matikan Iklan Ini"}
                                                    >
                                                      {isThisAdUpdating ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                                                      ) : isAdOff ? (
                                                        <Play className="w-3.5 h-3.5" />
                                                      ) : (
                                                        <Pause className="w-3.5 h-3.5" />
                                                      )}
                                                    </button>
                                                  </div>
                                                </div>

                                                {/* Metrik Lengkap Ad */}
                                                <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-center text-[10px]">
                                                  <div>
                                                    <span className="text-[8px] text-slate-400 uppercase font-bold block">
                                                      Spent
                                                    </span>
                                                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                                      Rp {Number(ad.spend || 0).toLocaleString("id-ID")}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-[8px] text-slate-400 uppercase font-bold block">
                                                      Purchases
                                                    </span>
                                                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                                                      {ad.purchases || 0}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-[8px] text-slate-400 uppercase font-bold block">
                                                      CPA
                                                    </span>
                                                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                                      Rp {Number(ad.cpa || 0).toLocaleString("id-ID")}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-[8px] text-slate-400 uppercase font-bold block">
                                                      ROAS
                                                    </span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                                      {ad.roas ? `${ad.roas}x` : "-"}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-[8px] text-slate-400 uppercase font-bold block">
                                                      CTR (Link)
                                                    </span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                                      {ad.ctr ? `${ad.ctr}%` : "-"}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-[8px] text-slate-400 uppercase font-bold block">
                                                      Link Clicks
                                                    </span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                                      {Number(ad.clicks || 0).toLocaleString("id-ID")}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p className="text-[11px] text-slate-400 italic">
                                          Tidak ada ads di AdSet ini.
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 py-3 text-center">
                                  Belum ada AdSet riil terdeteksi di level kampanye ini.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. MODAL PENGATURAN KATA KUNCI CAMPAIGN */}
      {showKeywordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-purple-600" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Pengaturan Kata Kunci Campaign
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKeywordModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tentukan kata kunci kampanye iklan Anda. Hanya kampanye yang mengandung salah satu kata kunci berikut yang akan dimasukkan ke dalam perhitungan KPI dashboard dan tabel (kampanye lain akan otomatis disaring).
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Kata Kunci (Pisahkan dengan koma):
              </label>
              <textarea
                value={tempKeywords}
                onChange={(e) => setTempKeywords(e.target.value)}
                placeholder="monefyi, estimator, rab"
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-purple-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isKeywordFilterActive}
                  onChange={(e) => setIsKeywordFilterActive(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Aktifkan Filter Kata Kunci</span>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeywordModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveKeywords}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-sm"
                >
                  Simpan Kata Kunci
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
