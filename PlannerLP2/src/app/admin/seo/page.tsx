"use client";
import { useState } from "react";
import { Save } from "lucide-react";

export default function SEOPage() {
  const [seo, setSeo] = useState({
    metaTitle: "Monefyi Estimator — Sistem Closing & Proyek untuk Jasa Proyek",
    metaDescription: "Saring lead WA, closing di tempat saat survei, dan kelola proyek sampai selesai.",
    gaId: "",
    fbPixel: "",
    gtmId: "",
    customHead: "",
  });
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem("monefyi-seo", JSON.stringify(seo));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">SEO & Tracking</h1>
        <button onClick={save} className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700">
          <Save className="w-4 h-4" /> {saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-bold text-slate-900">SEO Meta Tags</h2>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Meta Title</label>
            <input value={seo.metaTitle} onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
            <p className="text-xs text-slate-400 mt-1">{seo.metaTitle.length}/60 karakter</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Meta Description</label>
            <textarea rows={3} value={seo.metaDescription} onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
            <p className="text-xs text-slate-400 mt-1">{seo.metaDescription.length}/160 karakter</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-bold text-slate-900">Analytics & Tracking</h2>
          {[
            { key: "gaId", label: "Google Analytics ID (G-XXXXXXXXXX)" },
            { key: "fbPixel", label: "Facebook Pixel ID" },
            { key: "gtmId", label: "Google Tag Manager ID (GTM-XXXXXX)" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">{label}</label>
              <input value={(seo as Record<string, string>)[key] || ""} onChange={(e) => setSeo({ ...seo, [key]: e.target.value })} placeholder="Kosongkan jika tidak digunakan" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
