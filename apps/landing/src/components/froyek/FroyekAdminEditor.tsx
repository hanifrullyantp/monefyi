"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultFroyekContent } from "@/lib/froyek/defaultContent";
import { froyekContentSchema, type FroyekContent } from "@/lib/froyek/schema";
import { getSupabaseClient } from "@/lib/supabase/client";

export function FroyekAdminEditor() {
  const [published, setPublished] = useState<FroyekContent>(defaultFroyekContent);
  const [draft, setDraft] = useState(JSON.stringify(defaultFroyekContent, null, 2));
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    void fetch("/api/landing/froyek")
      .then((res) => res.json())
      .then((json) => {
        const parsed = froyekContentSchema.safeParse(json.content);
        if (!parsed.success) return;
        setPublished(parsed.data);
        setDraft(JSON.stringify(parsed.data, null, 2));
      })
      .catch(() => undefined);
  }, []);

  const parsed = useMemo(() => froyekContentSchema.safeParse(safeJson(draft)), [draft]);

  function edit(next: string) {
    setHistory((items) => [...items, draft].slice(-30));
    setDraft(next);
    setError("");
  }

  async function publish() {
    if (!parsed.success) {
      setError("Perbaiki JSON sebelum terbit.");
      return;
    }
    const supabase = getSupabaseClient();
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) {
      setError("Masuk sebagai admin.");
      return;
    }
    const res = await fetch("/api/landing/froyek", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: parsed.data }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Gagal menerbitkan");
      return;
    }
    setPublished(parsed.data);
    setInfo("Terbit.");
  }

  const diff = parsed.success
    ? Object.keys(parsed.data).filter(
        (key) => JSON.stringify(parsed.data[key as keyof FroyekContent]) !== JSON.stringify(published[key as keyof FroyekContent]),
      )
    : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Landing Froyek</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Panel ini satu tempat dengan admin Estimator. Konten Estimator tetap di menu yang sudah ada. Halaman ini menyimpan slug froyek.
          Alamat kanonis admin adalah froyek.com/admin.
        </p>
      </div>
      {parsed.success ? (
        <fieldset className="grid gap-2 text-sm">
          <legend className="font-semibold">Section</legend>
          {parsed.data.sectionOrder.map((id) => (
            <label key={id} className="flex gap-2">
              <input
                type="checkbox"
                checked={parsed.data.sectionVisibility[id] !== false}
                onChange={(event) => {
                  const next = {
                    ...parsed.data,
                    sectionVisibility: { ...parsed.data.sectionVisibility, [id]: event.target.checked },
                  };
                  edit(JSON.stringify(next, null, 2));
                }}
              />
              {id}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="text-sm text-rose-700">JSON belum valid.</p>
      )}
      <label className="block text-sm font-semibold text-slate-800">JSON
        <textarea className="mt-2 h-96 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" value={draft} onChange={(event) => edit(event.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border px-3 py-2" onClick={() => { const prev = history.at(-1); if (!prev) return; setHistory((items) => items.slice(0, -1)); setDraft(prev); }}>Urungkan</button>
        <button type="button" className="rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white" onClick={publish}>Terbitkan</button>
        <a className="rounded-lg border px-3 py-2" href="/admin/froyek/pesanan">Pesanan</a>
        <a className="rounded-lg border px-3 py-2" href="/admin/konten">Konten Estimator</a>
      </div>
      {diff.length > 0 ? <p className="text-sm text-slate-600">Berbeda dari yang terbit: {diff.join(", ")}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {info ? <p className="text-sm text-emerald-800">{info}</p> : null}
    </div>
  );
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
