"use client";
import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save } from "lucide-react";
import { getStorage, setStorage } from "@/lib/utils/storage";

const SEO_KEY = "monefyi_seo";
const defaultSeo = {
  title: "Monefyi Planner — Sistem Closing & Project untuk Jasa Proyek",
  description: "Sistem all-in-one untuk pelaku jasa proyek. Saring lead WA, closing di tempat saat survei, kelola proyek sampai selesai.",
  keywords: "sistem closing proyek, manajemen proyek, kontraktor, interior designer, kitchen set",
  ogImage: "",
  googleAnalyticsId: "",
  fbPixelId: "",
  gtmId: "",
};

export default function SeoPage() {
  const [seo, setSeo] = useState(() => getStorage(SEO_KEY, defaultSeo));
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    setTimeout(() => {
      setStorage(SEO_KEY, seo);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 300);
  };

  const update = (key: string, val: string) => setSeo((prev: typeof defaultSeo) => ({ ...prev, [key]: val }));

  const fields = [
    { key: "title", label: "Meta Title", type: "text", hint: "Optimal 50-60 karakter" },
    { key: "description", label: "Meta Description", type: "textarea", hint: "Optimal 150-160 karakter" },
    { key: "keywords", label: "Meta Keywords", type: "text", hint: "Pisahkan dengan koma" },
    { key: "ogImage", label: "OG Image URL", type: "text", hint: "URL gambar untuk social share (1200x630px)" },
    { key: "googleAnalyticsId", label: "Google Analytics ID", type: "text", hint: "Format: G-XXXXXXXXXX" },
    { key: "fbPixelId", label: "Facebook Pixel ID", type: "text", hint: "Format: 123456789012345" },
    { key: "gtmId", label: "Google Tag Manager ID", type: "text", hint: "Format: GTM-XXXXXXX" },
  ];

  return (
    <div>
      <PageHeader
        title="SEO & Tracking"
        description="Kelola meta tags dan kode analitik"
        actions={
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
              <Save className="w-4 h-4" />Simpan
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        {fields.map(({ key, label, type, hint }) => (
          <div key={key}>
            <label className="text-sm font-semibold text-slate-700 block mb-1">{label}</label>
            {hint && <p className="text-xs text-slate-400 mb-2">{hint}</p>}
            {type === "textarea" ? (
              <textarea
                value={(seo as Record<string, string>)[key] ?? ""}
                onChange={(e) => update(key, e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
              />
            ) : (
              <input
                type="text"
                value={(seo as Record<string, string>)[key] ?? ""}
                onChange={(e) => update(key, e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
