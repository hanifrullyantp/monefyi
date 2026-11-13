"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { authedFetch } from "@/lib/auth/authedFetch";
import { buildEngineStatus, type ActivityItem } from "@/lib/engine/engineStatus";
import type { ExpertState, ExpertStatus } from "@/lib/engine/expertStatus";
import type { PillarHealthScore } from "@/lib/engine/winningEngine";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  Activity,
  ClipboardList,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";

interface Snapshot {
  expert: ExpertStatus | null;
  trackedLabel: string;
  adsActive: number | null;
  winners: number | null;
  pauseCandidates: number | null;
  activity: ActivityItem[];
}

const EMPTY_SNAPSHOT: Snapshot = {
  expert: null,
  trackedLabel: "Memuat...",
  adsActive: null,
  winners: null,
  pauseCandidates: null,
  activity: [],
};

function wib(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreLabel(score: number, hasPillars: boolean) {
  if (!hasPillars) return "Belum dianalisa";
  if (score >= 80) return "Sehat";
  if (score >= 65) return "Perlu optimasi";
  return "Butuh perbaikan";
}

function scoreClass(score: number, hasPillars: boolean) {
  if (!hasPillars) return "text-slate-900 dark:text-white";
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 65) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

const EXPERT_DOT: Record<ExpertState, string> = {
  working: "bg-blue-500",
  monitoring: "bg-emerald-500",
  waiting_user: "bg-amber-500",
  blocked: "bg-rose-500",
  inactive: "bg-slate-400",
};

function pillarScoreClass(pillar: PillarHealthScore) {
  if (pillar.status === "winning" || pillar.score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pillar.status === "perlu_optimasi" || pillar.score >= 65) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function MetricCard({
  label,
  value,
  hint,
  valueClass,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  hint: string;
  valueClass?: string;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
          {label}
        </span>
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", iconClass)}>
          {icon}
        </div>
      </div>
      <div className={cn("font-black leading-tight line-clamp-2", valueClass || "text-xl sm:text-2xl text-slate-900 dark:text-white")}>
        {value}
      </div>
      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{hint}</p>
    </div>
  );
}

/**
 * Ringkasan lebar di atas Winning Engine. Hanya membaca store dan endpoint yang sudah ada.
 */
export function WinningEngineOverview() {
  const {
    winningOverallScore,
    winningPillars,
    winningPlans,
    winningEngineConfig,
    winningExecutiveBrief,
    winningDataAudit,
  } = useMarketingStore();
  const [snap, setSnap] = useState<Snapshot>(EMPTY_SNAPSHOT);

  useEffect(() => {
    let cancelled = false;

    const applyStatus = async () => {
      try {
        const statusRes = await authedFetch("/api/engine/status");
        const statusJson = await statusRes.json().catch(() => ({}));
        if (cancelled) return;
        setSnap((prev) => ({
          ...prev,
          expert: statusRes.ok && statusJson.ok ? statusJson.status : prev.expert,
        }));
      } catch {
        /* status tetap yang terakhir berhasil */
      }
    };

    const load = async () => {
      try {
        const [trackedRes, creativeRes, activityRes] = await Promise.all([
          authedFetch("/api/engine/tracked"),
          authedFetch("/api/engine/creatives"),
          authedFetch("/api/engine/activity?limit=40"),
        ]);
        const trackedJson = await trackedRes.json().catch(() => ({}));
        const creativeJson = await creativeRes.json().catch(() => ({}));
        const activityJson = await activityRes.json().catch(() => ({}));
        if (cancelled) return;

        const selected = trackedJson.selected as string[] | null | undefined;
        const campaignCount = Array.isArray(trackedJson.campaigns) ? trackedJson.campaigns.length : 0;
        const summary = creativeJson.report?.summary;

        setSnap((prev) => ({
          ...prev,
          trackedLabel: !trackedRes.ok || !trackedJson.ok
            ? "Gagal memuat"
            : selected
              ? `${selected.length} dipilih`
              : campaignCount > 0
                ? `Semua (${campaignCount})`
                : "Semua kampanye",
          adsActive: summary ? Number(summary.adsActive) : null,
          winners: summary ? Number(summary.winners) : null,
          pauseCandidates: summary ? Number(summary.pauseCandidates) : null,
          activity: activityRes.ok && activityJson.ok ? activityJson.items || [] : prev.activity,
        }));
      } catch {
        if (!cancelled) {
          setSnap((prev) => ({ ...prev, trackedLabel: prev.trackedLabel === "Memuat..." ? "Gagal memuat" : prev.trackedLabel }));
        }
      }
    };

    load();
    applyStatus();
    const timer = setInterval(applyStatus, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const hasPillars = winningPillars.length > 0;
  const pending = winningPlans.filter((p) => p.status === "pending").length;
  const executed = winningPlans.filter((p) => p.status === "executed").length;
  const engine = buildEngineStatus({
    dataAudit: winningDataAudit || [],
    plans: winningPlans || [],
    activity: snap.activity,
  });
  const briefLine = winningExecutiveBrief
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  const modeLabel = winningEngineConfig.mode === "cuan" ? "Mode Cuan" : "Mode Advance";

  return (
    <section className="space-y-3" aria-label="Ringkasan Winning Engine">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard
          label="Skor 5 Pilar"
          value={hasPillars ? `${winningOverallScore}` : "-"}
          hint={scoreLabel(winningOverallScore, hasPillars)}
          valueClass={cn("text-xl sm:text-2xl", scoreClass(winningOverallScore, hasPillars))}
          icon={<Target className="w-4 h-4" />}
          iconClass="bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
        />
        <MetricCard
          label="Status Expert"
          value={snap.expert ? snap.expert.headline : "Memuat..."}
          hint={
            snap.expert
              ? `Terakhir ${wib(snap.expert.lastTickAt)} · Berikutnya ${wib(snap.expert.nextRunAt)}`
              : "Menunggu denyut scheduler"
          }
          valueClass="text-base sm:text-lg text-slate-900 dark:text-white"
          icon={
            <span className="relative flex h-2.5 w-2.5">
              <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", snap.expert ? EXPERT_DOT[snap.expert.state] : "bg-slate-300")} />
            </span>
          }
          iconClass="bg-blue-50 dark:bg-blue-950"
        />
        <MetricCard
          label="Rencana"
          value={String(pending)}
          hint={`${pending} menunggu · ${executed} dijalankan`}
          valueClass={pending > 0 ? "text-xl sm:text-2xl text-amber-600 dark:text-amber-400" : "text-xl sm:text-2xl text-slate-900 dark:text-white"}
          icon={<ClipboardList className="w-4 h-4" />}
          iconClass="bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
        />
        <MetricCard
          label="Anggaran"
          value={formatCurrency(winningEngineConfig.maxDailyBudget)}
          hint={`${modeLabel} · ${formatCurrency(winningEngineConfig.minDailyBudget)}–${formatCurrency(winningEngineConfig.maxDailyBudget)}/hr · CPA ${formatCurrency(winningEngineConfig.targetCpa)}${winningEngineConfig.killSwitch ? " · Kill-switch aktif" : ""}`}
          icon={<Wallet className="w-4 h-4" />}
          iconClass={
            winningEngineConfig.killSwitch
              ? "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
              : "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
          }
        />
        <MetricCard
          label="Kampanye"
          value={snap.trackedLabel}
          hint="Yang dibaca dan dikelola Expert"
          valueClass="text-base sm:text-lg text-slate-900 dark:text-white"
          icon={<Megaphone className="w-4 h-4" />}
          iconClass="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
        />
        <MetricCard
          label="Kreatif"
          value={snap.adsActive === null ? "-" : String(snap.adsActive)}
          hint={
            snap.adsActive === null
              ? "Belum ada laporan"
              : `${snap.winners ?? 0} menang · ${snap.pauseCandidates ?? 0} kandidat pause`
          }
          icon={<Sparkles className="w-4 h-4" />}
          iconClass="bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400"
        />
      </div>

      <div
        className={cn(
          "rounded-2xl border px-4 py-3 flex items-start gap-3",
          engine.tone === "ok" && "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
          engine.tone === "warn" && "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
          engine.tone === "idle" && "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        )}
      >
        <div
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            engine.tone === "warn"
              ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
              : "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
          )}
        >
          {engine.tone === "warn" ? <Activity className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Status engine
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{engine.headline}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(hasPillars ? winningPillars : PLACEHOLDER_PILLARS).map((pillar) => (
          <div
            key={pillar.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs min-w-0"
          >
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">{pillar.label}</p>
            <p className={cn("text-xl font-black mt-0.5", hasPillars ? pillarScoreClass(pillar) : "text-slate-300 dark:text-slate-600")}>
              {hasPillars ? `${pillar.score}%` : "-"}
            </p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              {hasPillars ? pillar.headlineMetric : "Menunggu analisa"}
            </p>
          </div>
        ))}
      </div>

      {briefLine && (
        <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Arahan strategis</p>
          <p className="text-xs text-slate-200 leading-relaxed mt-1 line-clamp-2">{briefLine}</p>
        </div>
      )}
    </section>
  );
}

const PLACEHOLDER_PILLARS: PillarHealthScore[] = [
  { id: "offer", label: "Offer", score: 0, status: "perlu_data", headlineMetric: "", honestDiagnosis: "", keyRecommendation: "" },
  { id: "landing_page", label: "Landing Page", score: 0, status: "perlu_data", headlineMetric: "", honestDiagnosis: "", keyRecommendation: "" },
  { id: "checkout", label: "Checkout", score: 0, status: "perlu_data", headlineMetric: "", honestDiagnosis: "", keyRecommendation: "" },
  { id: "ads_testing", label: "Ads Testing", score: 0, status: "perlu_data", headlineMetric: "", honestDiagnosis: "", keyRecommendation: "" },
  { id: "tracking", label: "Tracking", score: 0, status: "perlu_data", headlineMetric: "", honestDiagnosis: "", keyRecommendation: "" },
];
