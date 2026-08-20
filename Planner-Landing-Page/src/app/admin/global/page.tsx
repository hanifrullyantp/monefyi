"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save } from "lucide-react";

export default function GlobalPage() {
  const { content, updateSection, save } = useContentStore();
  const [global, setGlobal] = useState(content.global);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    updateSection("global", global);
    setTimeout(() => {
      save();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 300);
  };

  const updateColor = (key: keyof typeof global.colors, val: string) => {
    setGlobal({ ...global, colors: { ...global.colors, [key]: val } });
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900">Global & merek</h2>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleSave}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg"
        >
          Simpan perubahan
        </button>
        <button className="text-slate-400 hover:text-slate-600 text-sm underline decoration-slate-200">
          tutup pesan
        </button>
        <SaveIndicator status={saveStatus} className="ml-auto" />
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-sm space-y-8">
        {/* Nama Situs */}
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Nama situs</label>
          <input
            type="text"
            value={global.siteName}
            onChange={(e) => setGlobal({ ...global, siteName: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-medium"
          />
        </div>

        {/* Domain */}
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Domain (untuk referensi / canonical)</label>
          <input
            type="text"
            value={global.domain}
            onChange={(e) => setGlobal({ ...global, domain: e.target.value })}
            placeholder="https://..."
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-medium"
          />
        </div>

        {/* Colors Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">Primary (brand)</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={global.colors.primary}
                onChange={(e) => updateColor("primary", e.target.value)}
                className="w-full h-12 rounded-lg border-2 border-slate-200 cursor-pointer p-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">Navy</label>
            <input
              type="color"
              value={global.colors.navy}
              onChange={(e) => updateColor("navy", e.target.value)}
              className="w-full h-12 rounded-lg border-2 border-slate-200 cursor-pointer p-1"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">Navy deep</label>
            <input
              type="color"
              value={global.colors.navyDeep}
              onChange={(e) => updateColor("navyDeep", e.target.value)}
              className="w-full h-12 rounded-lg border-2 border-slate-200 cursor-pointer p-1"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">Gold</label>
            <input
              type="color"
              value={global.colors.gold}
              onChange={(e) => updateColor("gold", e.target.value)}
              className="w-full h-12 rounded-lg border-2 border-slate-200 cursor-pointer p-1"
            />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-bold text-slate-700 block mb-2">Gold light</label>
            <input
              type="color"
              value={global.colors.goldLight}
              onChange={(e) => updateColor("goldLight", e.target.value)}
              className="w-full h-12 rounded-lg border-2 border-slate-200 cursor-pointer p-1"
            />
          </div>
        </div>

        {/* Font */}
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Font Google (opsional, nama saja, mis. Inter)</label>
          <input
            type="text"
            value={global.googleFont}
            onChange={(e) => setGlobal({ ...global, googleFont: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-medium"
          />
        </div>

        {/* Logo & Favicon */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-2 uppercase">Logo — URL saat ini: {global.logoUrl.substring(0, 50)}...</label>
            <input type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
            <p className="text-xs text-slate-400 mt-1">Pilih File Tidak ada file yang dipilih</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-2 uppercase">Favicon — URL: {global.faviconUrl.substring(0, 50)}...</label>
            <input type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
            <p className="text-xs text-slate-400 mt-1">Pilih File Tidak ada file yang dipilih</p>
          </div>
        </div>

        {/* Navbar CTA */}
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Navbar — label CTA</label>
          <input
            type="text"
            value={global.navbarCta}
            onChange={(e) => setGlobal({ ...global, navbarCta: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-medium"
          />
        </div>

        {/* Navbar Links */}
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Navbar — tautan (satu baris: label|href, pisahkan baris)</label>
          <textarea
            value={global.navbarLinksRaw}
            onChange={(e) => setGlobal({ ...global, navbarLinksRaw: e.target.value })}
            rows={5}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-mono text-sm leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
