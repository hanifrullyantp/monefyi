"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";

export default function RelinkPopupAdminPage() {
  const { content, updateSection, publishContent, isSaving, publishError, dbSynced } = useContentStore();
  const [config, setConfig] = useState(content.relinkPopup);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    updateSection("relinkPopup", config);
    const didSave = await publishContent();
    if (didSave) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Popup Relink</h1>
          <p className="mt-1 text-sm text-slate-500">Atur pemicu popup coba gratis dan penawaran Estimator Standard.</p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />{saved ? "Tersimpan!" : isSaving ? "Menyimpan…" : "Simpan"}
        </button>
      </div>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900">Aktifkan popup relink</h2>
            <p className="mt-1 text-sm text-slate-500">Muncul saat pengunjung hendak kembali/keluar atau tidak aktif.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${config.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
          >
            {config.enabled ? "Aktif" : "Nonaktif"}
          </button>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Waktu diam (menit)</span>
          <input
            type="number"
            min={1}
            max={120}
            value={config.idleMinutes}
            onChange={(event) => setConfig((prev) => ({ ...prev, idleMinutes: Math.max(1, Number(event.target.value) || 1) }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
          />
        </label>

        {([
          ["title", "Judul popup"],
          ["body", "Deskripsi"],
          ["freeCtaText", "Teks tombol coba gratis"],
          ["purchaseCtaText", "Teks tombol beli (Standard Rp 99.000)"],
        ] as const).map(([field, label]) => (
          <label key={field} className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
            {field === "body" ? (
              <textarea
                rows={4}
                value={config[field]}
                onChange={(event) => setConfig((prev) => ({ ...prev, [field]: event.target.value }))}
                className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
              />
            ) : (
              <input
                value={config[field]}
                onChange={(event) => setConfig((prev) => ({ ...prev, [field]: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
              />
            )}
          </label>
        ))}
        {publishError && <p className="text-sm text-red-600">{publishError}</p>}
        {!dbSynced && <p className="text-xs text-amber-700">Database belum tersambung. Perubahan bisa tersimpan hanya di browser ini.</p>}
      </section>
    </div>
  );
}
