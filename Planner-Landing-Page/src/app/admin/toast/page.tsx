"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save, Plus, Trash2 } from "lucide-react";
import type { ToastNotification } from "@/lib/types/content";

export default function ToastPage() {
  const { content, updateSection, save } = useContentStore();
  const [config, setConfig] = useState({
    active: true,
    muteDefault: true,
    minInterval: 25,
    maxInterval: 45,
    timezone: "Asia/Jakarta",
    startTime: "09:00",
    endTime: "21:00",
    maxPerSession: 12,
    template: "{{name}} {{action}} {{product}}",
    names: "Bu Rivy\nPak Apo\nCece Susanti\nPak Santo",
    actions: "melakukan pemesanan",
    products: "kitchen set anti air\nWOCENSA premium\nkitchen set waterproof",
  });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 500);
  };

  return (
    <div className="max-w-4xl pb-20">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900">Notifikasi toast</h2>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <button onClick={handleSave} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg">Simpan perubahan</button>
        <button className="text-slate-400 hover:text-slate-600 text-sm underline decoration-slate-200">tutup pesan</button>
        <SaveIndicator status={saveStatus} className="ml-auto" />
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-sm space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={config.active} onChange={e => setConfig({...config, active: e.target.checked})} className="w-5 h-5 rounded border-2 border-slate-200 text-blue-600 focus:ring-0" />
            <label className="text-sm font-bold text-slate-700">Aktifkan toast</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={config.muteDefault} onChange={e => setConfig({...config, muteDefault: e.target.checked})} className="w-5 h-5 rounded border-2 border-slate-200 text-blue-600 focus:ring-0" />
            <label className="text-sm font-bold text-slate-700">Default pengunjung: bisu</label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">Interval min (detik)</label>
            <input type="number" value={config.minInterval} onChange={e => setConfig({...config, minInterval: parseInt(e.target.value)})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200" />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">Interval max (detik)</label>
            <input type="number" value={config.maxInterval} onChange={e => setConfig({...config, maxInterval: parseInt(e.target.value)})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200" />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Timezone (IANA)</label>
          <input type="text" value={config.timezone} onChange={e => setConfig({...config, timezone: e.target.value})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">Jam mulai (HH:MM)</label>
            <input type="text" value={config.startTime} onChange={e => setConfig({...config, startTime: e.target.value})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200" />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">Jam akhir (HH:MM)</label>
            <input type="text" value={config.endTime} onChange={e => setConfig({...config, endTime: e.target.value})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200" />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Maks. toast per sesi</label>
          <input type="number" value={config.maxPerSession} onChange={e => setConfig({...config, maxPerSession: parseInt(e.target.value)})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200" />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Template (placeholder: {"{{name}} {{action}} {{product}} {{city}}"})</label>
          <textarea value={config.template} onChange={e => setConfig({...config, template: e.target.value})} rows={3} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-mono text-sm" />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Daftar nama</label>
          <textarea value={config.names} onChange={e => setConfig({...config, names: e.target.value})} rows={4} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200" />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Daftar aksi / kalimat</label>
          <textarea value={config.actions} onChange={e => setConfig({...config, actions: e.target.value})} rows={3} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200" />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Daftar produk</label>
          <textarea value={config.products} onChange={e => setConfig({...config, products: e.target.value})} rows={4} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200" />
        </div>
      </div>
    </div>
  );
}
