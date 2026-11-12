"use client";

import { useState, useEffect } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { EngineStatusPanel } from "./EngineStatusPanel";
import { ExpertStatusCard } from "./ExpertStatusCard";
import { CreativeInsightsCard } from "./CreativeInsightsCard";
import { WinningPillarId, WinningActionPlan } from "@/lib/engine/winningEngine";
import {
  ShieldCheck,
  Zap,
  Target,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Sliders,
  Layers,
  FileText,
  ShoppingBag,
  BarChart3,
  Activity,
  Cpu,
  PowerOff,
  Check,
  X,
  ArrowRight,
  Clock,
  BookOpen,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function WinningEngineCommandCenter({
  onOpenConfigModal,
}: {
  onOpenConfigModal?: () => void;
}) {
  const {
    winningEngineConfig,
    updateWinningEngineConfig,
    winningOverallScore,
    winningPillars,
    winningPlans,
    winningLearnings,
    winningExecutiveBrief,
    winningLlmInfo,
    isRunningEngineTick,
    executingPlanId,
    batchAnalysisStatus,
    batchJobId,
    batchStartedAt,
    batchCompletedAt,
    batchProgressMessage,
    pollBatchStatus,
    runWinningEngineTick,
    approveAndExecutePlan,
    rejectPlan,
    actionLogs,
  } = useMarketingStore();

  const [selectedPillarFilter, setSelectedPillarFilter] = useState<WinningPillarId | "all">("all");
  const [feedbackBanner, setFeedbackBanner] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Timer & Polling untuk Sonnet 5.5 Batch Processing
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPollingBatch, setIsPollingBatch] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (batchAnalysisStatus === "processing") {
      const startMs = batchStartedAt ? new Date(batchStartedAt).getTime() : Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));

      interval = setInterval(() => {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [batchAnalysisStatus, batchStartedAt]);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    if (batchAnalysisStatus === "processing") {
      pollInterval = setInterval(async () => {
        setIsPollingBatch(true);
        try {
          await pollBatchStatus();
        } finally {
          setIsPollingBatch(false);
        }
      }, 6000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [batchAnalysisStatus, pollBatchStatus]);

  const handleManualCheckBatch = async () => {
    setIsPollingBatch(true);
    try {
      const res = await pollBatchStatus();
      if (res.message) {
        setFeedbackBanner({ ok: res.isReady, message: res.message });
      }
    } finally {
      setIsPollingBatch(false);
    }
  };

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // State edit cepat per plan sebelum user klik Setujui
  const [customEdits, setCustomEdits] = useState<Record<string, Record<string, any>>>({});

  const setPlanFieldEdit = (planId: string, field: string, value: any) => {
    setCustomEdits((prev) => ({
      ...prev,
      [planId]: {
        ...(prev[planId] || {}),
        [field]: value,
      },
    }));
  };

  const handleRunTick = async (sendNotif: boolean) => {
    setFeedbackBanner(null);
    const res = await runWinningEngineTick(sendNotif);
    if (res.message) {
      setFeedbackBanner({ ok: res.ok, message: res.message });
    }
  };

  const handleApprovePlan = async (plan: WinningActionPlan) => {
    setFeedbackBanner(null);
    const overrides = customEdits[plan.id] || undefined;
    const res = await approveAndExecutePlan(plan.id, overrides);
    setFeedbackBanner({ ok: res.ok, message: res.message });
  };

  const filteredPlans = winningPlans.filter((p) =>
    selectedPillarFilter === "all" ? true : p.pillar === selectedPillarFilter
  );
  const pendingPlansCount = winningPlans.filter((p) => p.status === "pending").length;
  const executedPlansCount = winningPlans.filter((p) => p.status === "executed").length;

  const getPillarIcon = (id: WinningPillarId) => {
    switch (id) {
      case "offer":
        return Sparkles;
      case "landing_page":
        return FileText;
      case "checkout":
        return ShoppingBag;
      case "ads_testing":
        return BarChart3;
      case "tracking":
        return Activity;
    }
  };

  return (
    <div className="space-y-5">
      <ExpertStatusCard />
      <CreativeInsightsCard />
      <EngineStatusPanel />

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          className={cn(
            "p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 transition-all",
            feedbackBanner.ok
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          )}
        >
          <div className="flex items-center gap-2">
            {feedbackBanner.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          PANEL 1: MODE KERJA (MODE CUAN VS MODE ADVANCE) & SABUK PENGAMAN BUDGET
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                10-Year Meta Ads &amp; Growth Expert Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                Scheduler: Supabase pg_cron (Tiap 30 Menit)
              </span>
              <button
                type="button"
                onClick={onOpenConfigModal}
                className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer flex items-center gap-1"
              >
                <Cpu className="w-3 h-3" />
                <span>
                  OpenRouter: Sonnet 3.5 (Strategi) | Luna 6 Pro | Gemini
                </span>
              </button>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Pusat Komando Holistic Winning Engine (5 Pilar)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mesin cerdas di belakang layar yang mengaudit dan mengoptimalkan Produk &amp; Offer, Landing Page, Checkout, Iklan Meta, serta Tracking CAPI tanpa membuat Anda pusing.
            </p>
          </div>

          {/* Tombol Aksi Utama */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleRunTick(false)}
              disabled={isRunningEngineTick}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRunningEngineTick && "animate-spin")} />
              <span>
                {isRunningEngineTick
                  ? "Menganalisa 5 Pilar..."
                  : "Analisa 5 Pilar & Susun Rencana"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleRunTick(true)}
              disabled={isRunningEngineTick}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
              title="Kirim ringkasan 5 pilar & rencana saat ini ke WhatsApp dan Telegram Anda"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kirim ke WA &amp; Telegram</span>
            </button>

            <button
              type="button"
              onClick={() =>
                updateWinningEngineConfig({
                  killSwitch: !winningEngineConfig.killSwitch,
                })
              }
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                winningEngineConfig.killSwitch
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100"
              )}
              title="Hentikan seluruh eksekusi otomatis seketika"
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>
                {winningEngineConfig.killSwitch ? "Kill-Switch: AKTIF (Berhenti)" : "Kill-Switch"}
              </span>
            </button>
          </div>
        </div>

        {/* Pemilih Mode: Mode Cuan vs Mode Advance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {/* Kartu Mode Cuan */}
          <button
            type="button"
            onClick={() => updateWinningEngineConfig({ mode: "cuan" })}
            className={cn(
              "text-left p-4 rounded-2xl border-2 transition-all cursor-pointer",
              winningEngineConfig.mode === "cuan"
                ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30"
                : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 hover:border-slate-300"
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className={cn(
                    "w-4 h-4",
                    winningEngineConfig.mode === "cuan"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-400"
                  )}
                />
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  MODE CUAN (Winning Tanpa Ugal-Ugalan)
                </span>
              </div>
              <span
                className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                  winningEngineConfig.mode === "cuan"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                {winningEngineConfig.mode === "cuan" ? "Mode Aktif" : "Pilih Mode"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Cocok untuk menjaga profitabilitas harian dengan anggaran terkendali. AI menganalisa 5 pilar, menyusun rencana perbaikan tertulis beserta bukti angka, dan <strong>wajib menunggu persetujuan Anda</strong> sebelum mengeksekusi perubahan apa pun.
            </p>
          </button>

          {/* Kartu Mode Advance */}
          <button
            type="button"
            onClick={() => updateWinningEngineConfig({ mode: "advance" })}
            className={cn(
              "text-left p-4 rounded-2xl border-2 transition-all cursor-pointer",
              winningEngineConfig.mode === "advance"
                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
                : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 hover:border-slate-300"
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Zap
                  className={cn(
                    "w-4 h-4",
                    winningEngineConfig.mode === "advance"
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-400"
                  )}
                />
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  MODE ADVANCE (Otonomi Skala Miliaran)
                </span>
              </div>
              <span
                className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                  winningEngineConfig.mode === "advance"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                {winningEngineConfig.mode === "advance" ? "Mode Aktif" : "Pilih Mode"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Setelah Master Plan awal Anda setujui, AI otomatis mematikan iklan boncos, menaikkan budget pemenang (+20%/48 jam), dan mengoptimalkan kecepatan/tracking setiap 30 menit. <strong>Kenaikan plafon budget tetap wajib persetujuan ulang Anda.</strong>
            </p>
          </button>
        </div>

        {/* Pengatur Rentang Budget & Target (Start dari berapa sampai berapa) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Budget Harian Mulai Dari (Min IDR)
            </label>
            <input
              type="number"
              step={25000}
              value={winningEngineConfig.minDailyBudget}
              onChange={(e) =>
                updateWinningEngineConfig({
                  minDailyBudget: Math.max(20000, Number(e.target.value || 0)),
                })
              }
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Sampai Dengan / Plafon Harian (Max IDR)
            </label>
            <input
              type="number"
              step={50000}
              value={winningEngineConfig.maxDailyBudget}
              onChange={(e) => {
                const val = Math.max(winningEngineConfig.minDailyBudget, Number(e.target.value || 0));
                updateWinningEngineConfig({
                  maxDailyBudget: val,
                  approvedDailyCeiling: val,
                });
              }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Target CPA Maksimal (IDR)
            </label>
            <input
              type="number"
              step={5000}
              value={winningEngineConfig.targetCpa}
              onChange={(e) =>
                updateWinningEngineConfig({
                  targetCpa: Math.max(5000, Number(e.target.value || 0)),
                })
              }
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Plafon Spend Bulanan (IDR)
            </label>
            <input
              type="number"
              step={1000000}
              value={winningEngineConfig.monthlySpendCap}
              onChange={(e) =>
                updateWinningEngineConfig({
                  monthlySpendCap: Math.max(500000, Number(e.target.value || 0)),
                })
              }
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            {winningEngineConfig.mode === "advance" ? (
              <button
                type="button"
                onClick={() =>
                  updateWinningEngineConfig({
                    advanceMasterPlanApproved: !winningEngineConfig.advanceMasterPlanApproved,
                  })
                }
                className={cn(
                  "w-full px-3 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  winningEngineConfig.advanceMasterPlanApproved
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-500"
                )}
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {winningEngineConfig.advanceMasterPlanApproved
                    ? "Master Plan Advance: AKTIF"
                    : "Setujui Master Plan Advance"}
                </span>
              </button>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 text-center">
                Rentang Aman: Rp {(winningEngineConfig.minDailyBudget / 1000).toFixed(0)}rb - Rp{" "}
                {(winningEngineConfig.maxDailyBudget / 1000).toFixed(0)}rb/hr
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          SONNET 5.5 BATCH STATUS TRACKER (PROCESSING / READY)
          ===================================================================== */}
      {batchAnalysisStatus === "processing" && (
        <div className="bg-amber-50/80 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 transition-all animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 dark:border-amber-800/60 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-amber-950 dark:text-amber-100">
                    Analisa Strategis Sonnet 5.5 Batch Sedang Diproses
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Sedang Dalam Proses
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                  Model: <span className="font-mono font-bold">{winningEngineConfig.llmRouting.strategist.model}</span> (Antrean Batch Asinkron)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-200 text-xs font-mono font-bold border border-amber-300/80 dark:border-amber-700">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Waktu Berjalan: {formatElapsed(elapsedSeconds)}</span>
              </div>
              <button
                type="button"
                onClick={handleManualCheckBatch}
                disabled={isPollingBatch}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                title="Cek status terkini antrean batch"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isPollingBatch && "animate-spin")} />
                <span>{isPollingBatch ? "Mengecek..." : "Cek Status"}</span>
              </button>
            </div>
          </div>

          {/* Tahapan Eksekusi Batch */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-800/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  1. Ekstraksi Metrik Data
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Data kampanye Meta, rasio OCLP LP, dan checkout telah dihitung.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-800/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  2. Diagnosa Awal 5 Pilar
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Pilar Offer, LP, Checkout, Ads, dan Tracking siap diselaraskan.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-100/70 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-amber-900 dark:text-amber-200">
                  3. Analisa Strategis Sonnet
                </span>
                <Loader2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
              </div>
              <p className="text-[10px] text-amber-800 dark:text-amber-300">
                Anthropic sedang menyusun ringkasan eksekutif &amp; rencana aksi.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-[11px] text-amber-800 dark:text-amber-300 font-medium pt-1">
            <p>
              Proses batch bekerja di server latar belakang. Anda dapat tetap menggunakan aplikasi atau berpindah menu. Halaman ini akan <strong>otomatis menampilkan data dan kartu persetujuan</strong> begitu proses siap.
            </p>
            <span className="shrink-0 text-[10px] font-mono opacity-75">
              Auto-check tiap 6 dtk
            </span>
          </div>
        </div>
      )}

      {batchAnalysisStatus === "ready" && batchCompletedAt && (
        <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-100">
                  Analisa Sonnet 5.5 Batch Siap (Ready)
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase">
                  Data Terkini
                </span>
              </div>
              <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 mt-0.5">
                Model: <span className="font-mono font-bold">{winningEngineConfig.llmRouting.strategist.model}</span> | Selesai diproses pada {new Date(batchCompletedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} WIB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleRunTick(false)}
            disabled={isRunningEngineTick}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRunningEngineTick && "animate-spin")} />
            <span>Jalankan Analisa Baru</span>
          </button>
        </div>
      )}

      {/* =====================================================================
          PANEL 2: RADAR KESEHATAN 5 PILAR WINNING (KLIK UNTUK FILTER)
          ===================================================================== */}
      {winningPillars.length === 0 ? (
        batchAnalysisStatus === "processing" ? (
          <div className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-xs">
            <div className="w-10 h-10 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Menunggu Antrean Sonnet 5.5 Batch...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Radar skor 5 pilar dan kotak persetujuan rencana aksi akan otomatis tertampil secara utuh begitu hasil analisa strategis Anthropic Sonnet 5.5 diterima.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Belum Ada Analisa 5 Pilar Aktif
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Monefyi Winning Engine siap menganalisa data riil kampanye Meta Ads untuk <strong>Monefyi Estimator (estimator.monefyi.com)</strong>. Klik tombol di bawah untuk meminta AI Strategist ({winningEngineConfig.llmRouting.strategist.provider.toUpperCase()} {winningEngineConfig.llmRouting.strategist.model}) membuat evaluasi dan rencana winning.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleRunTick(false)}
                disabled={isRunningEngineTick}
                className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-950/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", isRunningEngineTick && "animate-spin")} />
                <span>
                  {isRunningEngineTick
                    ? "AI Sedang Menganalisa 5 Pilar..."
                    : "Mulai Planning & Generate Analisa 5 Pilar Sekarang"}
                </span>
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Radar Audit 5 Pilar Winning (Skor Total: {winningOverallScore}/100)
              </h3>
            </div>
            {selectedPillarFilter !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedPillarFilter("all")}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Tampilkan Semua Pilar ({winningPlans.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {winningPillars.map((pillar) => {
              const Icon = getPillarIcon(pillar.id);
              const isSelected = selectedPillarFilter === pillar.id;
              const pillarPlanCount = winningPlans.filter(
                (p) => p.pillar === pillar.id && p.status === "pending"
              ).length;

              return (
                <button
                  key={pillar.id}
                  type="button"
                  onClick={() =>
                    setSelectedPillarFilter(isSelected ? "all" : pillar.id)
                  }
                  className={cn(
                    "text-left p-4 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 cursor-pointer",
                    isSelected
                      ? "bg-slate-900 dark:bg-emerald-950/60 text-white border-slate-900 dark:border-emerald-500 shadow-md"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "p-2 rounded-xl",
                          isSelected
                            ? "bg-white/15 text-white"
                            : pillar.status === "winning"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                            : pillar.status === "perlu_optimasi"
                            ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                            : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </span>

                      <div className="text-right">
                        <span
                          className={cn(
                            "text-base font-black",
                            isSelected
                              ? "text-white"
                              : pillar.score >= 80
                              ? "text-emerald-600 dark:text-emerald-400"
                              : pillar.score >= 65
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {pillar.score}%
                        </span>
                        <p
                          className={cn(
                            "text-[9px] font-bold uppercase",
                            isSelected ? "text-slate-300" : "text-slate-400"
                          )}
                        >
                          {pillar.status === "winning"
                            ? "Sehat / Winning"
                            : pillar.status === "perlu_optimasi"
                            ? "Perlu Optimasi"
                            : "Butuh Perbaikan"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4
                        className={cn(
                          "text-xs font-extrabold leading-snug",
                          isSelected ? "text-white" : "text-slate-900 dark:text-white"
                        )}
                      >
                        {pillar.label}
                      </h4>
                      <p
                        className={cn(
                          "text-[11px] font-mono font-bold mt-0.5",
                          isSelected
                            ? "text-emerald-300"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {pillar.headlineMetric}
                      </p>
                    </div>

                    <p
                      className={cn(
                        "text-[11px] leading-relaxed line-clamp-3",
                        isSelected
                          ? "text-slate-200"
                          : "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {pillar.honestDiagnosis}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-bold">
                    <span
                      className={cn(
                        isSelected ? "text-emerald-300" : "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {pillarPlanCount > 0
                        ? `${pillarPlanCount} Rencana Siap Disetujui`
                        : "Sudah Optimal"}
                    </span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ringkasan Strategis AI Strategist (Gemini Pro / Claude) */}
      {winningExecutiveBrief && (
        <div className="bg-slate-900 dark:bg-slate-900/95 text-white border border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400">
                Evaluasi &amp; Arahan Strategis 10-Tahun Expert ({winningLlmInfo.strategistProvider})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Model Strategist: {winningLlmInfo.strategistModel} | Model Teknis: {winningLlmInfo.technicalModel}
            </span>
          </div>
          <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
            {winningExecutiveBrief}
          </div>
        </div>
      )}

      {/* =====================================================================
          PANEL 3: KOTAK PERSETUJUAN RENCANA AI (APPROVAL INBOX) & MEMORI BELAJAR AI
          ===================================================================== */}
      {winningPlans.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Kiri (2 Kolom): Daftar Rencana Tindakan yang Menunggu Persetujuan / Sudah Dieksekusi */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Daftar Rencana Tindakan AI ({filteredPlans.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {pendingPlansCount} menunggu persetujuan Anda, {executedPlansCount} telah dijalankan. Anda dapat meninjau atau mengubah angka sebelum menyetujui.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {filteredPlans.map((plan) => {
                const isExecuting = executingPlanId === plan.id;
                const edits = customEdits[plan.id] || {};

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3 transition-all",
                      plan.status === "executed"
                        ? "border-emerald-200 dark:border-emerald-900/60 opacity-90"
                        : plan.status === "rejected"
                        ? "border-slate-200 dark:border-slate-800 opacity-60"
                        : plan.priority === "critical"
                        ? "border-rose-300 dark:border-rose-800 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 shadow-xs"
                    )}
                  >
                    {/* Header Kartu Plan */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                            plan.priority === "critical"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : plan.priority === "high"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          )}
                        >
                          {plan.pillarLabel}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          Confidence: {plan.confidence}%
                        </span>
                        {plan.requiresCeilingReapproval && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            Butuh Persetujuan Kenaikan Plafon Budget
                          </span>
                        )}
                      </div>

                      <span
                        className={cn(
                          "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full",
                          plan.status === "executed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : plan.status === "rejected"
                            ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        )}
                      >
                        {plan.status === "executed"
                          ? "Sudah Dijalankan"
                          : plan.status === "rejected"
                          ? "Dilewati"
                          : "Menunggu Persetujuan Anda"}
                      </span>
                    </div>

                    {/* Judul & Penjelasan Bahasa Manusia */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {plan.title}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">
                            Apa Yang Akan Dilakukan AI
                          </p>
                          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                            {plan.whatToDo}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">
                            Kenapa Dilakukan (Bukti Data)
                          </p>
                          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                            {plan.whyEvidence}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50">
                          <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 mb-0.5">
                            Estimasi Dampak Winning
                          </p>
                          <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                            {plan.expectedImpact}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Pratinjau & Editor Cepat Sesuai Pilar Sebelum Disetujui */}
                    {plan.status === "pending" && plan.actionType === "update_lp_copy" && (
                      <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 space-y-2 text-xs">
                        <p className="font-extrabold text-indigo-900 dark:text-indigo-300">
                          Pratinjau Copywriting Landing Page estimator.monefyi.com (Bisa Anda Sesuaikan Sebelum Klik Setujui):
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                              Headline Utama Baru (PAS Hook Kontraktor):
                            </label>
                            <input
                              type="text"
                              value={
                                edits.afterHeroTitle ?? plan.actionPayload.afterHeroTitle ?? ""
                              }
                              onChange={(e) =>
                                setPlanFieldEdit(plan.id, "afterHeroTitle", e.target.value)
                              }
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                              Subheadline Penjelas Solusi:
                            </label>
                            <input
                              type="text"
                              value={
                                edits.afterHeroSubtitle ??
                                plan.actionPayload.afterHeroSubtitle ??
                                ""
                              }
                              onChange={(e) =>
                                setPlanFieldEdit(plan.id, "afterHeroSubtitle", e.target.value)
                              }
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {plan.status === "pending" && plan.actionType === "update_offer_pricing" && (
                      <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 space-y-2 text-xs">
                        <p className="font-extrabold text-amber-900 dark:text-amber-300">
                          Rekomendasi Penyesuaian Harga &amp; Value Stack Monefyi Estimator:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                              Harga Paket Standard
                            </label>
                            <input
                              type="text"
                              value={
                                edits.recommendedEntryPrice ??
                                plan.actionPayload.recommendedEntryPrice ??
                                "Rp 93.000"
                              }
                              onChange={(e) =>
                                setPlanFieldEdit(
                                  plan.id,
                                  "recommendedEntryPrice",
                                  e.target.value
                                )
                              }
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                              Harga Paket Pro (Winning)
                            </label>
                            <input
                              type="text"
                              value={
                                edits.recommendedProPrice ??
                                plan.actionPayload.recommendedProPrice ??
                                "Rp 199.000"
                              }
                              onChange={(e) =>
                                setPlanFieldEdit(plan.id, "recommendedProPrice", e.target.value)
                              }
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                              Harga Normal (Anchor Value)
                            </label>
                            <input
                              type="text"
                              value={
                                edits.anchorOriginalPrice ??
                                plan.actionPayload.anchorOriginalPrice ??
                                "Rp 499.000"
                              }
                              onChange={(e) =>
                                setPlanFieldEdit(plan.id, "anchorOriginalPrice", e.target.value)
                              }
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {plan.status === "pending" &&
                      (plan.actionType === "scale_campaign_budget" ||
                        plan.actionType === "create_rapid_test_campaign") && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Anggaran Harian yang Akan Diterapkan (IDR):
                          </span>
                          <input
                            type="number"
                            step={25000}
                            value={
                              edits.newBudget ??
                              edits.dailyBudget ??
                              plan.actionPayload.newBudget ??
                              plan.actionPayload.dailyBudget ??
                              winningEngineConfig.minDailyBudget
                            }
                            onChange={(e) => {
                              const val = Number(e.target.value || 0);
                              setPlanFieldEdit(plan.id, "newBudget", val);
                              setPlanFieldEdit(plan.id, "dailyBudget", val);
                            }}
                            className="w-full sm:w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                      )}

                    {/* Catatan Eksekusi Jika Sudah Dijalankan */}
                    {plan.executionNote && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{plan.executionNote}</span>
                      </div>
                    )}

                    {/* Tombol Persetujuan User */}
                    {plan.status === "pending" && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => rejectPlan(plan.id)}
                          disabled={isExecuting}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Lewati
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApprovePlan(plan)}
                          disabled={isExecuting}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {isExecuting
                              ? "Menjalankan..."
                              : plan.requiresCeilingReapproval
                              ? "Setujui Kenaikan Plafon & Jalankan"
                              : "Setujui & Jalankan Sekarang"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kanan (1 Kolom): Memori Pembelajaran AI & Riwayat Audit Eksekusi */}
          <div className="space-y-4">
            {/* Memori Pembelajaran AI */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Hasil Belajar AI (Winning Memory)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pola offer, demografi, dan iklan yang terbukti menghasilkan konversi.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {winningLearnings.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Akurasi {item.confidence}%
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                      {item.finding}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      {item.evidenceMetric}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Log Eksekusi Terbaru */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Riwayat Eksekusi &amp; Guardrail Log
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Semua perubahan tercatat transparan.
                  </p>
                </div>
              </div>

              {actionLogs.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                  Belum ada aksi yang dieksekusi. Setujui salah satu rencana di sebelah kiri untuk memulai.
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {actionLogs.slice(0, 12).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black text-emerald-700 dark:text-emerald-400">
                          {log.actorLabel}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium leading-snug">
                        {log.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

