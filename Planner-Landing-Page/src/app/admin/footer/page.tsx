"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save } from "lucide-react";

export default function FooterPage() {
  const { content, updateSection, save } = useContentStore();
  const [footer, setFooter] = useState({
    tagline: "Spesialis pembuatan kitchen set waterproof & anti rayap kualitas premium dengan material terbaik untuk investasi jangka panjang hunian Anda.",
    workingHours: "Senin–Sabtu 08:00–17:00 WIB",
    copyright: "Intero / Wocensa. All rights reserved.",
    termsUrl: "#",
    privacyPath: "/privacy",
    menuRaw: "Beranda|#\nSolusi|#solusi\nGaleri Proyek|#proyek\nPromo & Bonus|#bonus",
    privacyHtml: "<h1>Kebijakan Privasi</h1><p>Kami menghormati data pribadi Anda. Informasi yang dikirim melalui formulir digunakan hanya untuk menghubungi Anda terkait layanan Intero.</p>",
  });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    // Mock save
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 500);
  };

  return (
    <div className="max-w-4xl pb-20">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900">Footer & privasi</h2>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <button onClick={handleSave} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg">Simpan perubahan</button>
        <button className="text-slate-400 hover:text-slate-600 text-sm underline decoration-slate-200">tutup pesan</button>
        <SaveIndicator status={saveStatus} className="ml-auto" />
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-sm space-y-8">
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Tagline / deskripsi singkat</label>
          <textarea
            value={footer.tagline}
            onChange={(e) => setFooter({ ...footer, tagline: e.target.value })}
            rows={3}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none font-medium leading-relaxed"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Jam kerja (teks)</label>
          <input
            type="text"
            value={footer.workingHours}
            onChange={(e) => setFooter({ ...footer, workingHours: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Baris copyright</label>
          <input
            type="text"
            value={footer.copyright}
            onChange={(e) => setFooter({ ...footer, copyright: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">URL Syarat & Ketentuan</label>
          <input
            type="text"
            value={footer.termsUrl}
            onChange={(e) => setFooter({ ...footer, termsUrl: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Path halaman privasi (SPA route)</label>
          <input
            type="text"
            value={footer.privacyPath}
            onChange={(e) => setFooter({ ...footer, privacyPath: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Menu footer — label|href per baris</label>
          <textarea
            value={footer.menuRaw}
            onChange={(e) => setFooter({ ...footer, menuRaw: e.target.value })}
            rows={5}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none font-mono text-sm leading-relaxed"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">HTML halaman Kebijakan Privasi</label>
          <textarea
            value={footer.privacyHtml}
            onChange={(e) => setFooter({ ...footer, privacyHtml: e.target.value })}
            rows={6}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none font-mono text-sm leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
