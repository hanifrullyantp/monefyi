"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save } from "lucide-react";

export default function KontakPage() {
  const { content, updateSection, save } = useContentStore();
  const [cs, setCs] = useState(content.contactSocial);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    updateSection("contactSocial", cs);
    setTimeout(() => {
      save();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 300);
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900">Kontak & sosial</h2>
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
        <p className="text-xs text-slate-400 italic">WhatsApp: nomor tanpa + (contoh 62812...). Dipakai untuk wa.me setelah form lead.</p>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">WhatsApp (digit)</label>
          <input
            type="text"
            value={cs.whatsapp}
            onChange={(e) => setCs({ ...cs, whatsapp: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Email</label>
          <input
            type="email"
            value={cs.email}
            onChange={(e) => setCs({ ...cs, email: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Alamat lengkap</label>
          <input
            type="text"
            value={cs.address}
            onChange={(e) => setCs({ ...cs, address: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Teks tampilan telepon</label>
          <input
            type="text"
            value={cs.phoneDisplay}
            onChange={(e) => setCs({ ...cs, phoneDisplay: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Instagram / @handle</label>
          <input
            type="text"
            value={cs.instagram}
            onChange={(e) => setCs({ ...cs, instagram: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Sosial — satu baris: Label|URL</label>
          <textarea
            value={cs.socialLinksRaw}
            onChange={(e) => setCs({ ...cs, socialLinksRaw: e.target.value })}
            rows={4}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-mono text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Jenis kebutuhan (form lead) — satu item per baris</label>
          <textarea
            value={cs.needTypesRaw}
            onChange={(e) => setCs({ ...cs, needTypesRaw: e.target.value })}
            rows={5}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Pilihan budget — satu per baris</label>
          <textarea
            value={cs.budgetRangesRaw}
            onChange={(e) => setCs({ ...cs, budgetRangesRaw: e.target.value })}
            rows={5}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Pesan WhatsApp jika form ditutup tanpa kirim</label>
          <p className="text-[10px] text-slate-400 mb-2">Pengguna yang menutup popup konsultasi (X atau di luar form) akan diarahkan ke WA dengan teks ini.</p>
          <textarea
            value={cs.waAbandonmentMsg}
            onChange={(e) => setCs({ ...cs, waAbandonmentMsg: e.target.value })}
            rows={2}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-medium"
          />
        </div>
      </div>
    </div>
  );
}
