"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/auth/authedFetch";

interface Camp { id: string; name: string; status: string; dailyBudget: number; spend14d: number }
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

/** Checklist kampanye yang relevan. Expert hanya membaca dan mengelola yang dicentang. */
export function TrackedCampaignsCard() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [saved, setSaved] = useState<string[] | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    const res = await authedFetch("/api/engine/tracked");
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) { setMsg(json.error || "Gagal memuat kampanye."); return; }
    setCamps(json.campaigns);
    setSaved(json.selected);
    setDraft(new Set(json.selected ?? json.campaigns.filter((c: Camp) => c.status === "ACTIVE").map((c: Camp) => c.id)));
    setLoaded(true);
  }, []);
  useEffect(() => { if (open && !loaded) load(); }, [open, loaded, load]);

  const visible = useMemo(() => camps.filter((c) => showInactive || c.status === "ACTIVE" || c.spend14d > 0 || draft.has(c.id)), [camps, showInactive, draft]);
  const toggle = (id: string) => setDraft((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const save = async (ids: string[] | null) => {
    setMsg(null);
    const res = await authedFetch("/api/engine/tracked", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    const json = await res.json().catch(() => ({}));
    setMsg(res.ok && json.ok ? (ids ? `Tersimpan: ${ids.length} kampanye dikelola Expert.` : "Tersimpan: semua kampanye dibaca.") : json.error || "Gagal menyimpan.");
    if (res.ok && json.ok) setSaved(json.selected);
  };

  return (
    <section className="rounded-xl border p-4">
      <button className="flex w-full items-center justify-between text-left text-sm font-semibold" onClick={() => setOpen(!open)}>
        <span>Kampanye yang dikelola Expert</span>
        <span className="text-xs text-slate-500">{saved ? `${saved.length} dipilih` : "semua kampanye (belum difilter)"} | {open ? "Tutup" : "Buka"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-500">Hanya kampanye yang dicentang yang dianalisa, di-pause, di-scale, dan dinilai kreatifnya. Kampanye lain diabaikan sepenuhnya.</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <button className="rounded-md border px-2 py-1" onClick={() => setDraft(new Set(camps.filter((c) => c.status === "ACTIVE").map((c) => c.id)))}>Pilih semua yang aktif</button>
            <button className="rounded-md border px-2 py-1" onClick={() => setDraft(new Set())}>Kosongkan</button>
            <label className="flex items-center gap-1"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Tampilkan yang tidak aktif</label>
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
            {visible.map((c) => (
              <li key={c.id}>
                <label className="flex items-start gap-2 rounded-md p-1 hover:bg-slate-50 dark:hover:bg-slate-900">
                  <input type="checkbox" className="mt-1" checked={draft.has(c.id)} onChange={() => toggle(c.id)} />
                  <span className="min-w-0">
                    <span className="font-medium">{c.name}</span>
                    <span className="block text-xs text-slate-500">{c.status} | belanja 14 hari {rp(c.spend14d)}{c.dailyBudget ? ` | budget ${rp(c.dailyBudget)}/hari` : ""}</span>
                  </span>
                </label>
              </li>
            ))}
            {loaded && visible.length === 0 && <li className="text-slate-500">Tidak ada kampanye aktif. Centang "Tampilkan yang tidak aktif".</li>}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-slate-900" onClick={() => save([...draft])}>Simpan pilihan ({draft.size})</button>
            <button className="rounded-md border px-3 py-1.5 text-sm" onClick={() => save(null)}>Baca semua kampanye</button>
          </div>
          {msg && <p className="text-sm text-slate-600 dark:text-slate-300">{msg}</p>}
        </div>
      )}
    </section>
  );
}

