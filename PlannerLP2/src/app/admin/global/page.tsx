"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { Save } from "lucide-react";

export default function GlobalPage() {
  const { content, updateSection, markSaved } = useContentStore();
  const [navbar, setNavbar] = useState(content.navbar);
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateSection("navbar", navbar);
    markSaved();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Global & Merek</h1>
        <button onClick={save} className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700">
          <Save className="w-4 h-4" /> {saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nama Brand / Logo Text</label>
          <input
            value={navbar.logo}
            onChange={(e) => setNavbar({ ...navbar, logo: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Teks Tombol CTA Navbar</label>
          <input
            value={navbar.ctaText}
            onChange={(e) => setNavbar({ ...navbar, ctaText: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-3">Menu Navigasi</label>
          <div className="space-y-2">
            {navbar.menuItems.map((item, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input
                  value={item.label}
                  onChange={(e) => {
                    const newItems = [...navbar.menuItems];
                    newItems[i] = { ...item, label: e.target.value };
                    setNavbar({ ...navbar, menuItems: newItems });
                  }}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  placeholder="Label"
                />
                <input
                  value={item.href}
                  onChange={(e) => {
                    const newItems = [...navbar.menuItems];
                    newItems[i] = { ...item, href: e.target.value };
                    setNavbar({ ...navbar, menuItems: newItems });
                  }}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  placeholder="#id-section"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
