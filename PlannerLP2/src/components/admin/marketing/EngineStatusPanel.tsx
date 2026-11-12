"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { authedFetch } from "@/lib/auth/authedFetch";
import { buildEngineStatus, ACTION_LABEL, type ActivityItem } from "@/lib/engine/engineStatus";
import { cn } from "@/lib/utils/cn";

const TONE_CLASS = {
  ok: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100",
  warn: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100",
  idle: "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300",
} as const;

function formatWib(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Ringkasan satu baris + timeline: dianalisa, ditahan, dieksekusi, hasil 48 jam.
 * Hanya membaca store dan /api/engine/activity. Undo lewat /api/engine/undo dengan konfirmasi.
 */
export function EngineStatusPanel() {
  const { winningPlans, winningDataAudit, isRunningEngineTick } = useMarketingStore();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadActivity = useCallback(async () => {
    try {
      const res = await authedFetch("/api/engine/activity?limit=40");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setActivity(data.items || []);
        setLoadError(null);
      } else {
        setLoadError(data.error || "Gagal memuat riwayat aksi.");
      }
    } catch {
      setLoadError("Gagal memuat riwayat aksi.");
    }
  }, []);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  // Muat ulang setelah analisa baru selesai
  useEffect(() => {
    if (!isRunningEngineTick) loadActivity();
  }, [winningDataAudit, winningPlans, isRunningEngineTick, loadActivity]);

  const status = useMemo(
    () => buildEngineStatus({ dataAudit: winningDataAudit || [], plans: winningPlans || [], activity }),
    [winningDataAudit, winningPlans, activity]
  );

  const analyzed = (winningDataAudit || []).filter((a) => a.decision === "included");
  const heldOrExcluded = (winningDataAudit || []).filter((a) => a.decision !== "included");
  const executed = activity.filter((a) => a.liveExecuted);
  const reviewed = activity.filter((a) => a.review);

  const undo = async (item: ActivityItem) => {
    const label = ACTION_LABEL[item.actionType] ?? item.actionType;
    if (!window.confirm(`Batalkan "${label}" untuk "${item.campaignName}"?`)) return;
    setBusyId(item.id);
    setNotice(null);
    try {
      const res = await authedFetch("/api/engine/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId: item.id }),
      });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && Boolean(data.ok);
      setNotice({ ok, text: data.summary || data.error || (ok ? "Aksi dibatalkan." : "Pembatalan gagal.") });
    } catch {
      setNotice({ ok: false, text: "Pembatalan gagal. Periksa koneksi lalu coba lagi." });
    } finally {
      setBusyId(null);
      await loadActivity();
    }
  };

  return (
    <section className="space-y-3" aria-label="Status engine dan timeline">
      <div className={cn("p-4 rounded-2xl border", TONE_CLASS[status.tone])}>
        <p className="text-[11px] uppercase tracking-wider font-bold opacity-70">Status engine</p>
        <p className="mt-1 text-sm sm:text-base font-bold leading-snug">{status.headline}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] opacity-70">Diperbarui otomatis setelah analisa</span>
          <button
            type="button"
            onClick={loadActivity}
            className="text-xs font-semibold underline underline-offset-2 min-h-[36px] px-2"
          >
            Muat ulang
          </button>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={cn(
            "p-3 rounded-xl border text-xs font-semibold",
            notice.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200"
          )}
        >
          {notice.text}
        </div>
      )}

      {loadError && (
        <div className="p-3 rounded-xl border text-xs bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200">
          {loadError}
        </div>
      )}

      <details open className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
        <summary className="cursor-pointer text-sm font-bold min-h-[36px] flex items-center">
          1. Dianalisa ({analyzed.length} kampanye)
        </summary>
        <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          {analyzed.length === 0 && <li>Belum ada kampanye yang masuk jendela analisa.</li>}
          {analyzed.slice(0, 20).map((a) => (
            <li key={a.campaignId} className="truncate">
              {a.name}
            </li>
          ))}
        </ul>
      </details>

      <details open className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
        <summary className="cursor-pointer text-sm font-bold min-h-[36px] flex items-center">
          2. Ditahan dan alasannya ({heldOrExcluded.length})
        </summary>
        <ul className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-400">
          {heldOrExcluded.length === 0 && <li>Tidak ada yang ditahan.</li>}
          {heldOrExcluded.slice(0, 20).map((a) => (
            <li key={a.campaignId}>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{a.name}</span>
              <span className="block">{a.reason}</span>
            </li>
          ))}
        </ul>
      </details>

      <details open className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
        <summary className="cursor-pointer text-sm font-bold min-h-[36px] flex items-center">
          3. Dieksekusi ke Meta ({executed.length})
        </summary>
        <ul className="mt-2 space-y-3">
          {executed.length === 0 && (
            <li className="text-xs text-slate-600 dark:text-slate-400">Belum ada aksi yang dijalankan ke Meta.</li>
          )}
          {executed.slice(0, 15).map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {ACTION_LABEL[item.actionType] ?? item.actionType}
                  {item.undone && <span className="ml-2 text-slate-500">(sudah dibatalkan)</span>}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{item.campaignName}</p>
                <p className="text-[11px] text-slate-500">{formatWib(item.at)} WIB</p>
                {item.summary && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.summary}</p>}
              </div>
              {item.undoable && (
                <button
                  type="button"
                  onClick={() => undo(item)}
                  disabled={busyId === item.id}
                  className="shrink-0 min-h-[40px] px-4 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  {busyId === item.id ? "Membatalkan..." : "Batalkan"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </details>

      <details open className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
        <summary className="cursor-pointer text-sm font-bold min-h-[36px] flex items-center">
          4. Hasil evaluasi ({reviewed.length})
        </summary>
        <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          {reviewed.length === 0 && <li>Belum ada aksi yang sudah melewati 48 jam.</li>}
          {reviewed.slice(0, 15).map((item) => (
            <li key={item.id}>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{item.campaignName}</span>:{" "}
              {item.review}
              {item.rolledBack && " (dikembalikan)"}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
