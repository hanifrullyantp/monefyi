"use client";
import { useState } from "react";
import { Save } from "lucide-react";
import { defaultSettings } from "@/lib/types/settings";

import { useSettingsStore } from "@/lib/store/settingsStore";

export default function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore();
  const [tempSettings, setTempSettings] = useState(settings);
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateSettings(tempSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fields = [
    { key: "siteName", label: "Nama Site", type: "text" },
    { key: "siteUrl", label: "URL Site", type: "text" },
    { key: "waNumber", label: "No. WA (format: 628xxx)", type: "text" },
    { key: "metaTitle", label: "Meta Title (SEO)", type: "text" },
    { key: "metaDescription", label: "Meta Description", type: "textarea" },
    { key: "googleAnalyticsId", label: "Google Analytics ID", type: "text" },
    { key: "fbPixelId", label: "Facebook Pixel ID", type: "text" },
    { key: "gtmId", label: "GTM ID", type: "text" },
  ] as const;

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
        <button
          onClick={save}
          className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700"
        >
          <Save className="w-4 h-4" /> {saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        {fields.map(({ key, label, type }) => (
          <div key={key}>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">{label}</label>
            {type === "textarea" ? (
              <textarea
                rows={3}
                value={tempSettings[key] || ""}
                onChange={(e) => setTempSettings((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none"
              />
            ) : (
              <input
                value={tempSettings[key] || ""}
                onChange={(e) => setTempSettings((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
              />
            )}
          </div>
        ))}

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 min-w-[140px]">
              Chat pojok kanan
            </label>
            <button
              type="button"
              onClick={() => setTempSettings((p) => ({ ...p, liveChatEnabled: !p.liveChatEnabled }))}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${tempSettings.liveChatEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
            >
              {tempSettings.liveChatEnabled ? "Aktif" : "Nonaktif"}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 min-w-[140px]">
              Tombol WA kiri bawah
            </label>
            <button
              type="button"
              onClick={() => setTempSettings((p) => ({ ...p, waFloatEnabled: !p.waFloatEnabled }))}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${tempSettings.waFloatEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
            >
              {tempSettings.waFloatEnabled ? "Aktif" : "Nonaktif"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
