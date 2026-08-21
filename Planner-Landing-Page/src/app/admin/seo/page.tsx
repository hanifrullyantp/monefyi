"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save } from "lucide-react";
import { useAdminContentSave, type SaveStatus } from "@/lib/hooks/useAdminContentSave";

export default function SeoPage() {
  const { content } = useContentStore();
  const { persistSection } = useAdminContentSave();
  const [seo, setSeo] = useState(content.seo);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const handleSave = () => {
    persistSection("seo", seo, setSaveStatus);
  };

  const fields = [
    { key: "title", label: "Meta Title", type: "text", hint: "Optimal 50-60 karakter" },
    { key: "description", label: "Meta Description", type: "textarea", hint: "Optimal 150-160 karakter" },
    { key: "keywords", label: "Meta Keywords", type: "text", hint: "Pisahkan dengan koma" },
    { key: "ogImage", label: "OG Image URL", type: "text", hint: "1200×630px untuk social share" },
    { key: "googleAnalyticsId", label: "Google Analytics ID", type: "text", hint: "G-XXXXXXXXXX" },
    { key: "fbPixelId", label: "Facebook Pixel ID", type: "text", hint: "Opsional" },
    { key: "gtmId", label: "Google Tag Manager ID", type: "text", hint: "GTM-XXXXXXX" },
  ] as const;

  return (
    <div>
      <PageHeader
        title="SEO & Tracking"
        description="Tersimpan di contentStore — langsung dipakai landing page"
        actions={
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold"
            >
              <Save className="w-4 h-4" /> Simpan
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
                value={seo[key]}
                onChange={(e) => setSeo({ ...seo, [key]: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            ) : (
              <input
                type="text"
                value={seo[key]}
                onChange={(e) => setSeo({ ...seo, [key]: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
