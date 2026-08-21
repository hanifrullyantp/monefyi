"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { Save } from "lucide-react";

export default function FooterAdminPage() {
  const { content, updateSection, markSaved } = useContentStore();
  const [footer, setFooter] = useState(content.footer);
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateSection("footer", footer);
    markSaved();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Footer & Privasi</h1>
        <button onClick={save} className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700">
          <Save className="w-4 h-4" /> {saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        {[
          { key: "tagline", label: "Tagline / About Text", textarea: true },
          { key: "copyright", label: "Teks Copyright" },
          { key: "disclaimer", label: "Disclaimer", textarea: true },
          { key: "madeWith", label: "Made With Text" },
        ].map(({ key, label, textarea }) => (
          <div key={key}>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">{label}</label>
            {textarea ? (
              <textarea
                rows={3}
                value={(footer as unknown as Record<string, string>)[key] || ""}
                onChange={(e) => setFooter({ ...footer, [key]: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none"
              />
            ) : (
              <input
                value={(footer as unknown as Record<string, string>)[key] || ""}
                onChange={(e) => setFooter({ ...footer, [key]: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
