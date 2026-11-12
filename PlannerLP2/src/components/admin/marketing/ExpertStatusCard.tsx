"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/auth/authedFetch";
import { cn } from "@/lib/utils/cn";
import type { ExpertStatus } from "@/lib/engine/expertStatus";
import type { AutonomyLevel, AutonomyPolicy, PolicyAction } from "@/lib/engine/autonomyPolicy";

interface StatusPayload {
  status: ExpertStatus;
  intervalMin: number;
  policy: AutonomyPolicy;
  policyLabels: Record<PolicyAction, { title: string; detail: string; implemented: boolean }>;
  autonomous: boolean;
  killSwitch: boolean;
  pushConfigured: boolean;
  vapidPublicKey: string | null;
  preflight: { checks: { id: string; label: string; status: "pass" | "warn" | "fail"; message: string; fix?: string }[]; ready: boolean };
  supervisor?: { latest: { created_at: string; score: number | null; grade: string; findings: { code: string; severity: string; message: string }[]; metrics: Record<string, number | null>; suggestions: string[]; kill_switch_engaged: boolean } | null; history: { at: string; score: number | null; grade: string }[] };
  runs: { id: number; started_at: string; trigger: string; outcome: string | null; phase: string | null; duration_ms: number | null; stats: Record<string, number> }[];
}

const STATE_STYLE: Record<ExpertStatus["state"], { dot: string; box: string; pulse: boolean }> = {
  working: { dot: "bg-blue-500", box: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100", pulse: true },
  monitoring: { dot: "bg-emerald-500", box: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100", pulse: true },
  waiting_user: { dot: "bg-amber-500", box: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100", pulse: false },
  blocked: { dot: "bg-red-500", box: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100", pulse: false },
  inactive: { dot: "bg-slate-400", box: "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200", pulse: false },
};

const LEVEL_LABEL: Record<AutonomyLevel, string> = {
  auto: "Otomatis",
  approve: "Minta persetujuan",
  recommend: "Rekomendasi saja",
};

const GRADE_LABEL: Record<string, string> = { baik: "Baik", perlu_perhatian: "Perlu perhatian", buruk: "Buruk", belum_cukup_data: "Data belum cukup" };
const GRADE_STYLE: Record<string, string> = {
  baik: "bg-emerald-100 text-emerald-800",
  perlu_perhatian: "bg-amber-100 text-amber-800",
  buruk: "bg-red-100 text-red-800",
  belum_cukup_data: "bg-slate-100 text-slate-700",
};

function wib(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Kartu status hidup Expert. Membaca /api/engine/status tiap 30 detik (heartbeat server),
 * jadi "Memantau" hanya muncul bila scheduler benar-benar berdenyut.
 */
export function ExpertStatusCard() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [policyDraft, setPolicyDraft] = useState<AutonomyPolicy | null>(null);
  const [intervalDraft, setIntervalDraft] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch("/api/engine/status");
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setData(json);
        setError(null);
      } else setError(json.error || "Gagal memuat status Expert.");
    } catch {
      setError("Gagal memuat status Expert.");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (data && !policyDraft) setPolicyDraft(data.policy);
    if (data && intervalDraft === null) setIntervalDraft(data.intervalMin);
  }, [data, policyDraft, intervalDraft]);

  const save = async (extra: Record<string, unknown> = {}) => {
    setMsg(null);
    const res = await authedFetch("/api/engine/autonomy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policy: policyDraft, tickIntervalMinutes: intervalDraft, ...extra }),
    });
    const json = await res.json().catch(() => ({}));
    setMsg(res.ok && json.ok ? "Pengaturan tersimpan." : json.error || "Gagal menyimpan.");
    await load();
  };

  const enablePush = async () => {
    setMsg(null);
    try {
      if (!data?.vapidPublicKey) return setMsg("Server belum punya kunci VAPID. Lihat checklist.");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setMsg("Browser ini tidak mendukung push. Di iPhone, pasang dulu PWA ke layar utama.");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setMsg("Izin notifikasi ditolak.");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey),
      });
      const res = await authedFetch("/api/engine/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) return setMsg(json.error || "Gagal mendaftarkan perangkat.");
      await authedFetch("/api/engine/push", { method: "PUT" });
      setMsg("Perangkat terdaftar. Notifikasi uji dikirim.");
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Gagal mengaktifkan notifikasi.");
    }
  };

  if (error && !data) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>;
  if (!data) return <div className="rounded-xl border p-4 text-sm text-slate-500">Memuat status Expert...</div>;

  const s = data.status;
  const style = STATE_STYLE[s.state];

  return (
    <section className="space-y-3">
      <div className={cn("rounded-xl border p-4", style.box)}>
        <div className="flex items-start gap-3">
          <span className="relative mt-1.5 flex h-3 w-3 shrink-0">
            {style.pulse && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", style.dot)} />}
            <span className={cn("relative inline-flex h-3 w-3 rounded-full", style.dot)} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold">{s.headline}</p>
            <p className="text-sm opacity-90">{s.detail}</p>
            <p className="mt-1 text-xs opacity-70">
              Siklus terakhir: {wib(s.lastTickAt)} | Berikutnya: {wib(s.nextRunAt)} | Interval {data.intervalMin} menit
            </p>
          </div>
        </div>
        {s.blockers.length > 0 && (
          <ul className="mt-3 space-y-2">
            {s.blockers.map((b) => (
              <li key={b.code} className="rounded-lg bg-white/60 p-2 text-sm dark:bg-black/20">
                <p className="font-medium">{b.message}</p>
                {b.fix && <p className="text-xs opacity-80">Cara memperbaiki: {b.fix}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {data.supervisor?.latest ? (
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Penilaian pengawas</p>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", GRADE_STYLE[data.supervisor.latest.grade] || GRADE_STYLE.belum_cukup_data)}>
              {GRADE_LABEL[data.supervisor.latest.grade] || data.supervisor.latest.grade}
              {data.supervisor.latest.score !== null ? ` | ${data.supervisor.latest.score}/100` : ""}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Dinilai {wib(data.supervisor.latest.created_at)}.
            {data.supervisor.latest.metrics?.hitRatePct != null ? ` Keputusan membaik atau stabil: ${data.supervisor.latest.metrics.hitRatePct}% dari ${data.supervisor.latest.metrics.reviewed} aksi.` : ""}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {data.supervisor.latest.findings.map((f) => (
              <li key={f.code} className="flex gap-2">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", f.severity === "critical" ? "bg-red-500" : f.severity === "warn" ? "bg-amber-500" : "bg-slate-400")} />
                {f.message}
              </li>
            ))}
            {data.supervisor.latest.findings.length === 0 && <li className="text-slate-500">Tidak ada temuan.</li>}
          </ul>
          {data.supervisor.latest.suggestions.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-slate-600 dark:text-slate-300">
              {data.supervisor.latest.suggestions.map((t) => <li key={t}>{t}</li>)}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-xl border p-4 text-sm text-slate-500">Pengawas belum menilai. Penilaian pertama muncul setelah job pengawas berjalan.</div>
      )}

      <div className="rounded-xl border p-4">
        <button className="flex w-full items-center justify-between text-left text-sm font-semibold" onClick={() => setOpen(!open)}>
          <span>Rencana kerja dan pengaturan otonomi</span>
          <span className="text-xs text-slate-500">{open ? "Tutup" : "Buka"}</span>
        </button>
        {open && policyDraft && (
          <div className="mt-3 space-y-4">
            <div className="space-y-2">
              {(Object.keys(data.policyLabels) as PolicyAction[]).map((key) => {
                const info = data.policyLabels[key];
                return (
                  <div key={key} className="flex flex-col gap-1 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{info.title}</p>
                      <p className="text-xs text-slate-500">{info.detail}</p>
                    </div>
                    <select
                      className="rounded-md border bg-transparent px-2 py-1 text-sm"
                      value={policyDraft[key]}
                      disabled={!info.implemented && false}
                      onChange={(e) => setPolicyDraft({ ...policyDraft, [key]: e.target.value as AutonomyLevel })}
                    >
                      {(["auto", "approve", "recommend"] as AutonomyLevel[])
                        .filter((l) => !(key === "change_offer" && l === "auto"))
                        .map((l) => (
                          <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
                        ))}
                    </select>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                Interval cek (menit)
                <input type="number" min={15} max={1440} className="w-20 rounded-md border bg-transparent px-2 py-1" value={intervalDraft ?? 30} onChange={(e) => setIntervalDraft(Number(e.target.value))} />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={data.autonomous} onChange={(e) => save({ autonomous: e.target.checked })} />
                Mode otonom aktif
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-slate-900" onClick={() => save()}>Simpan pengaturan</button>
              <button className="rounded-md border px-3 py-1.5 text-sm" onClick={enablePush}>Aktifkan notifikasi HP</button>
            </div>
            {msg && <p className="text-sm text-slate-600 dark:text-slate-300">{msg}</p>}

            <div>
              <p className="mb-1 text-sm font-semibold">Kesiapan sistem</p>
              <ul className="space-y-1 text-sm">
                {data.preflight.checks.map((c) => (
                  <li key={c.id} className="flex gap-2">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", c.status === "pass" ? "bg-emerald-500" : c.status === "warn" ? "bg-amber-500" : "bg-red-500")} />
                    <span>
                      <span className="font-medium">{c.label}:</span> {c.message}
                      {c.status !== "pass" && c.fix && <span className="block text-xs text-slate-500">{c.fix}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold">Riwayat siklus</p>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {data.runs.slice(0, 8).map((r) => (
                  <li key={r.id}>
                    {wib(r.started_at)} | {r.trigger} | {r.outcome || "-"}
                    {r.duration_ms ? ` | ${Math.round(r.duration_ms / 1000)} dtk` : ""}
                    {r.stats?.analyzed !== undefined ? ` | ${r.stats.analyzed} kampanye, ${r.stats.autoExecuted || 0} aksi, ${r.stats.pendingApproval || 0} menunggu` : ""}
                  </li>
                ))}
                {data.runs.length === 0 && <li>Belum ada siklus.</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

