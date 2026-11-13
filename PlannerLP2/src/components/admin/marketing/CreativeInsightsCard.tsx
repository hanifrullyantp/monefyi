"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/auth/authedFetch";
import { cn } from "@/lib/utils/cn";

interface AdRow {
  id: string; name: string; effectiveStatus: string; spend: number; impressions: number; linkCtr: number;
  hookRatePct: number | null; holdRatePct: number | null; frequency: number; purchases: number; cpa: number | null;
  verdict: { kind: string; reason: string }; flags: string[]; notes: string[];
}
interface Critique {
  adId: string; adName: string; scores: { hook: number; clarity: number; proof: number; mobile: number } | null;
  strengths: string[]; issues: string[]; improvements: string[]; headlineVariants: string[]; primaryTextVariants: string[]; error?: string;
}
interface Action { adId: string; adName: string; type?: string; adsetId?: string; copiedAdsetId?: string; status: string; note: string }
interface Report {
  created_at: string; trigger: string;
  summary: { adsTotal: number; adsActive: number; winners: number; fatigued: number; pauseCandidates: number; paused: number; benchmarks: { medianHookRatePct: number | null; medianLinkCtr: number | null; peers: number } };
  ads: AdRow[]; actions: Action[]; critiques: Critique[]; warnings: string[];
}

const FLAG_LABEL: Record<string, string> = { LOW_HOOK: "Hook lemah", LOW_CTR: "CTR rendah", LOW_HOLD: "Hold rendah", FATIGUE: "Fatigue" };
const VERDICT_LABEL: Record<string, string> = { winner: "Menang", profitable: "Layak", losing: "Merugi", learning: "Learning", insufficient: "Data kurang" };
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

/** Analisa kreatif: metrik per iklan, rekomendasi pause, dan kritik vision (opsional, berbiaya). */
export function CreativeInsightsCard() {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await authedFetch("/api/engine/creatives");
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok) setReport(json.report);
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (critique: boolean) => {
    setBusy(true); setMsg(null);
    try {
      const res = await authedFetch("/api/engine/creatives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ critique }) });
      const json = await res.json().catch(() => ({}));
      setMsg(res.ok && json.ok ? (json.critiqueNote || (critique ? `Analisa selesai. ${json.critiques?.length ?? 0} iklan dikritik oleh AI.` : "Analisa selesai.")) : json.error || "Analisa gagal.");
      await load();
    } finally { setBusy(false); }
  };

  const post = async (payload: Record<string, unknown>, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    const res = await authedFetch("/api/engine/creatives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));
    setMsg(json.summary || json.error || "Selesai.");
    await load();
  };

  const approve = async (a: Action) => {
    if (!window.confirm(`Pause iklan "${a.adName}"?`)) return;
    const res = await authedFetch("/api/engine/creatives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pauseAdId: a.adId }) });
    const json = await res.json().catch(() => ({}));
    setMsg(json.summary || json.error || "Selesai.");
    await load();
  };

  const recommended = (report?.actions || []).filter((a) => a.status === "recommended");

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
      <button className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-900 dark:text-white" onClick={() => setOpen(!open)}>
        <span>Analisa kreatif dan copy iklan</span>
        <span className="text-xs text-slate-500">
          {report ? `${report.summary.adsActive} aktif, ${recommended.length} rekomendasi pause` : "belum ada laporan"} | {open ? "Tutup" : "Buka"}
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50" onClick={() => run(false)}>Analisa metrik</button>
            <button disabled={busy} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50" onClick={() => run(true)}>Analisa + kritik visual (berbiaya)</button>
          </div>
          {msg && <p className="text-sm text-slate-600 dark:text-slate-300">{msg}</p>}
          {report?.warnings?.map((w) => <p key={w} className="text-xs text-amber-700">{w}</p>)}

          {!report && <p className="text-sm text-slate-500">Belum ada laporan. Jalankan analisa.</p>}
          {report && (
            <>
              <p className="text-xs text-slate-500">
                Laporan {new Date(report.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} ({report.trigger}). Median akun: CTR link {report.summary.benchmarks.medianLinkCtr?.toFixed(2) ?? "-"}%, hook rate {report.summary.benchmarks.medianHookRatePct ?? "-"}%
                {report.summary.benchmarks.peers < 3 ? " (iklan belum cukup untuk patokan)" : ""}.
              </p>

              {report.actions.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-semibold">Aksi iklan</p>
                  <ul className="space-y-2">
                    {report.actions.map((a) => (
                      <li key={a.adId + a.status} className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 text-sm">
                        <p className="font-medium">{a.adName} <span className="text-xs text-slate-500">({a.status})</span></p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{a.note}</p>
                        {a.status === "recommended" && a.type !== "duplicate_winner" && <button className="mt-1 rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-bold" onClick={() => approve(a)}>Setujui pause</button>}
                        {a.status === "recommended" && a.type === "duplicate_winner" && a.adsetId && <button className="mt-1 rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-bold" onClick={() => post({ duplicateAdsetId: a.adsetId }, `Buat salinan PAUSED dari ad set "${a.adName}"?`)}>Setujui duplikasi (dibuat PAUSED)</button>}
                        {a.status === "executed" && a.type === "duplicate_winner" && a.copiedAdsetId && <button className="mt-1 rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-bold" onClick={() => post({ activateCopyId: a.copiedAdsetId }, "Aktifkan salinan ini? Total belanja harian akan bertambah sebesar budget ad set tersebut.")}>Aktifkan salinan</button>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead><tr className="border-b text-slate-500"><th className="py-1 pr-2">Iklan</th><th className="pr-2">Vonis</th><th className="pr-2">Spend</th><th className="pr-2">CTR</th><th className="pr-2">Hook</th><th className="pr-2">Beli</th><th>Penanda</th></tr></thead>
                  <tbody>
                    {[...report.ads].sort((a, b) => b.spend - a.spend).slice(0, 20).map((a) => (
                      <tr key={a.id} className="border-b align-top">
                        <td className="py-1 pr-2 font-medium">{a.name}</td>
                        <td className="pr-2">{VERDICT_LABEL[a.verdict.kind] || a.verdict.kind}</td>
                        <td className="pr-2">{rp(a.spend)}</td>
                        <td className="pr-2">{a.linkCtr.toFixed(2)}%</td>
                        <td className="pr-2">{a.hookRatePct ?? "-"}{a.hookRatePct !== null ? "%" : ""}</td>
                        <td className="pr-2">{a.purchases}</td>
                        <td className={cn(a.flags.length ? "text-amber-700" : "text-slate-400")}>{a.flags.map((f) => FLAG_LABEL[f] || f).join(", ") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {report.critiques.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Kritik visual dan copy <span className="text-xs font-normal text-slate-500">(hipotesis AI, bukan dasar eksekusi)</span></p>
                  {report.critiques.map((c) => (
                    <div key={c.adId} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-sm">
                      <p className="font-medium">{c.adName}</p>
                      {c.error ? <p className="text-xs text-red-700">{c.error}</p> : (
                        <>
                          {c.scores && <p className="text-xs text-slate-500">Hook {c.scores.hook}/10 | Kejelasan {c.scores.clarity}/10 | Bukti {c.scores.proof}/10 | Mobile {c.scores.mobile}/10</p>}
                          {c.issues.length > 0 && <ul className="mt-1 list-disc pl-5 text-xs">{c.issues.map((t) => <li key={t}>{t}</li>)}</ul>}
                          {c.improvements.length > 0 && <><p className="mt-1 text-xs font-semibold">Perbaikan</p><ul className="list-disc pl-5 text-xs">{c.improvements.map((t) => <li key={t}>{t}</li>)}</ul></>}
                          {c.headlineVariants.length > 0 && <><p className="mt-1 text-xs font-semibold">Usulan headline</p><ul className="list-disc pl-5 text-xs">{c.headlineVariants.map((t) => <li key={t}>{t}</li>)}</ul></>}
                          {c.primaryTextVariants.length > 0 && <><p className="mt-1 text-xs font-semibold">Usulan teks utama</p><ul className="list-disc pl-5 text-xs">{c.primaryTextVariants.map((t) => <li key={t}>{t}</li>)}</ul></>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

