"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { authedFetch } from "@/lib/auth/authedFetch";
import { ACTION_LABEL, buildEngineStatus, type ActivityItem } from "@/lib/engine/engineStatus";
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
  X,
} from "lucide-react";

interface ReasonLine {
  title: string;
  detail?: string;
}

interface Snapshot {
  expert: ExpertStatus | null;
  trackedLabel: string;
  trackedLead: string;
  trackedLines: ReasonLine[];
  adsActive: number | null;
  winners: number | null;
  pauseCandidates: number | null;
  creativeLead: string;
  creativeLines: ReasonLine[];
  activity: ActivityItem[];
}

const EMPTY_SNAPSHOT: Snapshot = {
  expert: null,
  trackedLabel: "Memuat...",
  trackedLead: "Memuat daftar kampanye yang dibaca Expert.",
  trackedLines: [],
  adsActive: null,
  winners: null,
  pauseCandidates: null,
  creativeLead: "Belum ada laporan kreatif.",
  creativeLines: [],
  activity: [],
};

const VERDICT_LABEL: Record<string, string> = {
  winner: "Menang",
  profitable: "Layak",
  losing: "Merugi",
  learning: "Learning",
  insufficient: "Data kurang",
};

const PILLAR_STATUS: Record<string, string> = {
  winning: "Sehat",
  perlu_optimasi: "Perlu optimasi",
  kritis: "Butuh perbaikan",
  perlu_data: "Data belum cukup",
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

function rp(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

function ReasonPanel({
  title,
  lead,
  items,
  onClose,
}: {
  title: string;
  lead: string;
  items: ReasonLine[];
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Alasan data</p>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Tutup alasan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {lead && (
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
          {lead}
        </p>
      )}
      {items.length > 0 && (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((item) => (
            <li key={`${item.title}-${item.detail || ""}`} className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 px-3 py-2">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.title}</p>
              {item.detail && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.detail}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  valueClass,
  icon,
  iconClass,
  open,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  valueClass?: string;
  icon: ReactNode;
  iconClass: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        "text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs min-w-0 cursor-pointer transition-colors hover:border-emerald-400",
        open && "ring-2 ring-emerald-500 border-emerald-400"
      )}
    >
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
    </button>
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
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

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

        const campaigns = Array.isArray(trackedJson.campaigns) ? trackedJson.campaigns : [];
        const selected = trackedJson.selected as string[] | null | undefined;
        const chosen = selected
          ? campaigns.filter((c: { id: string }) => selected.includes(c.id))
          : campaigns.filter((c: { status: string; spend14d: number }) => c.status === "ACTIVE" || c.spend14d > 0);
        const trackedLines: ReasonLine[] = chosen.slice(0, 12).map((c: { name: string; status: string; spend14d: number; dailyBudget: number }) => ({
          title: c.name,
          detail: `${c.status} · belanja 14 hari ${rp(c.spend14d)}${c.dailyBudget ? ` · budget ${rp(c.dailyBudget)}/hari` : ""}`,
        }));

        const report = creativeJson.report;
        const summary = report?.summary;
        const ads = Array.isArray(report?.ads) ? report.ads : [];
        const notable = ads
          .filter((a: { verdict?: { kind?: string }; flags?: string[] }) => a.verdict?.kind === "winner" || a.verdict?.kind === "losing" || (a.flags || []).length > 0)
          .slice(0, 8);
        const creativeLines: ReasonLine[] = notable.map((a: { name: string; verdict?: { kind?: string; reason?: string }; flags?: string[] }) => ({
          title: a.name,
          detail: [VERDICT_LABEL[a.verdict?.kind || ""] || a.verdict?.kind, a.verdict?.reason, (a.flags || []).join(", ")].filter(Boolean).join(" · "),
        }));

        setSnap((prev) => ({
          ...prev,
          trackedLabel: !trackedRes.ok || !trackedJson.ok
            ? "Gagal memuat"
            : selected
              ? `${selected.length} dipilih`
              : campaigns.length > 0
                ? `Semua (${campaigns.length})`
                : "Semua kampanye",
          trackedLead: !trackedRes.ok || !trackedJson.ok
            ? trackedJson.error || "Daftar kampanye gagal dimuat."
            : selected
              ? "Expert hanya membaca kampanye yang dicentang. Kampanye lain tidak dianalisa, tidak di-pause, dan tidak di-scale."
              : "Belum ada filter. Expert membaca semua kampanye di akun iklan.",
          trackedLines,
          adsActive: summary ? Number(summary.adsActive) : null,
          winners: summary ? Number(summary.winners) : null,
          pauseCandidates: summary ? Number(summary.pauseCandidates) : null,
          creativeLead: !report
            ? "Belum ada laporan. Jalankan analisa metrik di bagian fungsi kreatif."
            : `Laporan ${wib(report.created_at)}. ${summary?.winners ?? 0} iklan menang, ${summary?.fatigued ?? 0} fatigue, ${summary?.pauseCandidates ?? 0} kandidat pause dari ${summary?.adsActive ?? 0} iklan aktif.`,
          creativeLines,
          activity: activityRes.ok && activityJson.ok ? activityJson.items || [] : prev.activity,
        }));
      } catch {
        if (!cancelled) {
          setSnap((prev) => ({
            ...prev,
            trackedLabel: prev.trackedLabel === "Memuat..." ? "Gagal memuat" : prev.trackedLabel,
            trackedLead: "Daftar kampanye gagal dimuat.",
          }));
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
  const pendingPlans = winningPlans.filter((p) => p.status === "pending");
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
  const cfg = winningEngineConfig;

  const reason = ((): { title: string; lead: string; items: ReasonLine[] } | null => {
    if (openId === "score") {
      return {
        title: "Skor 5 pilar",
        lead: hasPillars
          ? `Skor ${winningOverallScore}/100 merangkum lima pilar. 80 ke atas sehat, 65–79 perlu optimasi, di bawah 65 butuh perbaikan.`
          : "Belum ada analisa. Skor terisi setelah engine menyelesaikan evaluasi 5 pilar.",
        items: winningPillars.map((p) => ({
          title: `${p.label} · ${p.score}% · ${PILLAR_STATUS[p.status] || p.status}`,
          detail: p.honestDiagnosis || p.headlineMetric,
        })),
      };
    }
    if (openId === "expert") {
      return {
        title: "Status Expert",
        lead: snap.expert
          ? `${snap.expert.detail} Siklus terakhir ${wib(snap.expert.lastTickAt)}, berikutnya ${wib(snap.expert.nextRunAt)}.`
          : "Status Expert belum terbaca. Kartu ini menunggu denyut scheduler.",
        items: (snap.expert?.blockers || []).map((b) => ({ title: b.message, detail: b.fix })),
      };
    }
    if (openId === "plans") {
      return {
        title: "Rencana",
        lead: pendingPlans.length
          ? `${pendingPlans.length} rencana menunggu persetujuan sebelum dijalankan. ${executed} sudah dijalankan.`
          : `Tidak ada rencana yang menunggu. ${executed} rencana sudah dijalankan.`,
        items: pendingPlans.slice(0, 8).map((p) => ({
          title: `${p.pillarLabel}: ${p.title}`,
          detail: p.whyEvidence,
        })),
      };
    }
    if (openId === "budget") {
      return {
        title: "Anggaran",
        lead: cfg.mode === "cuan"
          ? "Mode Cuan menjaga belanja di dalam rentang ini. AI menyusun rencana, lalu menunggu persetujuan sebelum mengubah iklan."
          : "Mode Advance boleh mengeksekusi di dalam plafon setelah master plan disetujui. Kenaikan plafon tetap butuh persetujuan ulang.",
        items: [
          { title: "Rentang harian", detail: `${formatCurrency(cfg.minDailyBudget)} sampai ${formatCurrency(cfg.maxDailyBudget)} per hari.` },
          { title: "Target CPA", detail: `Maksimal ${formatCurrency(cfg.targetCpa)}. Di atas angka ini kampanye dianggap belum efisien.` },
          { title: "Plafon bulanan", detail: formatCurrency(cfg.monthlySpendCap) },
          {
            title: cfg.killSwitch ? "Kill-switch aktif" : "Kill-switch mati",
            detail: cfg.killSwitch ? "Seluruh eksekusi otomatis ditahan." : "Eksekusi yang lolos guardrail boleh jalan sesuai mode.",
          },
        ],
      };
    }
    if (openId === "campaigns") {
      return { title: "Kampanye yang dikelola", lead: snap.trackedLead, items: snap.trackedLines };
    }
    if (openId === "creative") {
      return { title: "Kreatif", lead: snap.creativeLead, items: snap.creativeLines };
    }
    if (openId === "engine") {
      const held = (winningDataAudit || []).filter((a) => a.decision !== "included").slice(0, 6);
      const failed = snap.activity.filter((a) => !a.ok).slice(0, 4);
      return {
        title: "Status engine",
        lead: engine.headline,
        items: [
          { title: `${engine.counts.learning} kampanye belajar`, detail: "Masih dalam fase belajar, jadi tidak di-scale." },
          { title: `${engine.counts.held} ditahan`, detail: "Tidak masuk keputusan karena jendela data atau guardrail." },
          { title: `${engine.counts.scaled24h} di-scale · ${engine.counts.paused24h} di-pause`, detail: "Aksi yang benar-benar terkirim ke Meta dalam 24 jam terakhir." },
          { title: `${engine.counts.pendingPlans} menunggu · ${engine.counts.failed24h} gagal`, detail: "Menunggu butuh persetujuan. Gagal adalah aksi yang tidak berhasil dijalankan." },
          ...held.map((a) => ({ title: a.name, detail: a.reason })),
          ...failed.map((a) => ({ title: ACTION_LABEL[a.actionType] || a.actionType, detail: a.summary || a.campaignName })),
        ],
      };
    }
    if (openId?.startsWith("pillar:")) {
      const pillar = winningPillars.find((p) => p.id === openId.slice(7));
      if (!pillar) {
        return { title: "Pilar", lead: "Pilar ini belum punya hasil analisa.", items: [] };
      }
      return {
        title: pillar.label,
        lead: pillar.honestDiagnosis || "Belum ada diagnosa untuk pilar ini.",
        items: [
          { title: pillar.headlineMetric || "Metrik", detail: `${pillar.score}% · ${PILLAR_STATUS[pillar.status] || pillar.status}` },
          ...(pillar.keyRecommendation ? [{ title: "Saran", detail: pillar.keyRecommendation }] : []),
        ],
      };
    }
    if (openId === "brief") {
      return { title: "Arahan strategis", lead: winningExecutiveBrief, items: [] };
    }
    return null;
  })();

  const metricOpen = ["score", "expert", "plans", "budget", "campaigns", "creative"].includes(openId || "");

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
          open={openId === "score"}
          onClick={() => toggle("score")}
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
          open={openId === "expert"}
          onClick={() => toggle("expert")}
        />
        <MetricCard
          label="Rencana"
          value={String(pendingPlans.length)}
          hint={`${pendingPlans.length} menunggu · ${executed} dijalankan`}
          valueClass={pendingPlans.length > 0 ? "text-xl sm:text-2xl text-amber-600 dark:text-amber-400" : "text-xl sm:text-2xl text-slate-900 dark:text-white"}
          icon={<ClipboardList className="w-4 h-4" />}
          iconClass="bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
          open={openId === "plans"}
          onClick={() => toggle("plans")}
        />
        <MetricCard
          label="Anggaran"
          value={formatCurrency(cfg.maxDailyBudget)}
          hint={`${modeLabel} · ${formatCurrency(cfg.minDailyBudget)}–${formatCurrency(cfg.maxDailyBudget)}/hr · CPA ${formatCurrency(cfg.targetCpa)}${cfg.killSwitch ? " · Kill-switch aktif" : ""}`}
          icon={<Wallet className="w-4 h-4" />}
          iconClass={
            cfg.killSwitch
              ? "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
              : "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
          }
          open={openId === "budget"}
          onClick={() => toggle("budget")}
        />
        <MetricCard
          label="Kampanye"
          value={snap.trackedLabel}
          hint="Yang dibaca dan dikelola Expert"
          valueClass="text-base sm:text-lg text-slate-900 dark:text-white"
          icon={<Megaphone className="w-4 h-4" />}
          iconClass="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
          open={openId === "campaigns"}
          onClick={() => toggle("campaigns")}
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
          open={openId === "creative"}
          onClick={() => toggle("creative")}
        />
      </div>
      {metricOpen && reason && <ReasonPanel title={reason.title} lead={reason.lead} items={reason.items} onClose={() => setOpenId(null)} />}

      <button
        type="button"
        onClick={() => toggle("engine")}
        aria-expanded={openId === "engine"}
        className={cn(
          "w-full text-left rounded-2xl border px-4 py-3 flex items-start gap-3 cursor-pointer",
          engine.tone === "ok" && "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
          engine.tone === "warn" && "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
          engine.tone === "idle" && "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
          openId === "engine" && "ring-2 ring-emerald-500"
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
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status engine</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{engine.headline}</p>
        </div>
      </button>
      {openId === "engine" && reason && <ReasonPanel title={reason.title} lead={reason.lead} items={reason.items} onClose={() => setOpenId(null)} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(hasPillars ? winningPillars : PLACEHOLDER_PILLARS).map((pillar) => {
          const id = `pillar:${pillar.id}`;
          return (
            <button
              key={pillar.id}
              type="button"
              onClick={() => toggle(id)}
              aria-expanded={openId === id}
              disabled={!hasPillars}
              className={cn(
                "text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs min-w-0",
                hasPillars && "cursor-pointer hover:border-emerald-400",
                openId === id && "ring-2 ring-emerald-500 border-emerald-400"
              )}
            >
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">{pillar.label}</p>
              <p className={cn("text-xl font-black mt-0.5", hasPillars ? pillarScoreClass(pillar) : "text-slate-300 dark:text-slate-600")}>
                {hasPillars ? `${pillar.score}%` : "-"}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {hasPillars ? pillar.headlineMetric : "Menunggu analisa"}
              </p>
            </button>
          );
        })}
      </div>
      {openId?.startsWith("pillar:") && reason && <ReasonPanel title={reason.title} lead={reason.lead} items={reason.items} onClose={() => setOpenId(null)} />}

      {briefLine && (
        <button
          type="button"
          onClick={() => toggle("brief")}
          aria-expanded={openId === "brief"}
          className={cn(
            "w-full text-left bg-slate-900 text-white border border-slate-800 rounded-2xl px-4 py-3 cursor-pointer",
            openId === "brief" && "ring-2 ring-emerald-400"
          )}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Arahan strategis</p>
          <p className="text-xs text-slate-200 leading-relaxed mt-1 line-clamp-2">{briefLine}</p>
        </button>
      )}
      {openId === "brief" && reason && <ReasonPanel title={reason.title} lead={reason.lead} items={reason.items} onClose={() => setOpenId(null)} />}
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
