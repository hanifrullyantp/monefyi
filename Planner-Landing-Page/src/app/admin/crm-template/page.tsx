"use client";
import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { MessageSquare, Save, Plus, Trash2, Copy, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const defaultTemplates = [
  { id: 1, name: "Follow Up Awal", content: "Halo {name}, saya dari {brand}. Mau menindaklanjuti ketertarikan Anda untuk proyek {project}. Kapan ada waktu untuk survei?" },
  { id: 2, name: "Kirim Estimasi", content: "Berikut estimasi rincian biaya untuk {project} Anda: {price}. Apakah budget ini masuk dalam kisaran rencana Anda?" },
  { id: 3, name: "Reminder Survei", content: "Selamat pagi {name}, mengingatkan survei lokasi hari ini pukul {time}. Sampai bertemu!" },
];

export default function TemplatesPage() {
  const [categories, setCategories] = useState("Hot lead\nKitchen set baru\nRenovasi / upgrade\nKonsultasi dulu\nBudget terbatas\nCold / belum respon");
  const [pipeline, setPipeline] = useState("baru|Lead baru|slate\ndihubungi|Dihubungi|blue\nproposal|Proposal / survei|amber\nmenunggu|Menunggu keputusan|purple\ndeal|Deal / SPK|green\ntidak_lanjut|Tidak lanjut|red");
  
  const [waTemplates, setWaTemplates] = useState([
    { key: "W", label: "Sapaan pertama WA", content: "Halo {{name}}, terima kasih sudah mengisi form di website Intero. Saya dari tim konsultasi kitchen set WOCENSA — boleh saya bantu jadwalkan diskusi singkat?" },
    { key: "1", label: "Follow-up hari ke-1", content: "Halo {{name}}, kemarin kami sudah sampaikan info awal. Ada yang ingin ditanyakan soal kitchen set waterproof & anti rayap?" },
    { key: "2", label: "Follow-up materi / promo", content: "Halo {{name}}, kami bisa bantu estimasi kasar berdasarkan kebutuhan: {{need_type}}. Mau kami kirim referensi?" },
  ]);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 500);
  };

  return (
    <div className="max-w-4xl space-y-10 pb-20">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900">CRM — kategori & template WA</h2>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          Atur kategori konsumen, tahap pipeline (kolom Kanban), dan isi pesan untuk tombol follow-up <strong>W / 1-5</strong>. Variabel: <code className="bg-slate-100 px-1 rounded">{"{{name}}"}</code> <code className="bg-slate-100 px-1 rounded">{"{{city}}"}</code> <code className="bg-slate-100 px-1 rounded">{"{{whatsapp}}"}</code> <code className="bg-slate-100 px-1 rounded">{"{{need_type}}"}</code> <code className="bg-slate-100 px-1 rounded">{"{{budget_range}}"}</code> <code className="bg-slate-100 px-1 rounded">{"{{size_estimate}}"}</code> <code className="bg-slate-100 px-1 rounded">{"{{notes}}"}</code>
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleSave} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg">Simpan perubahan</button>
        <button className="text-slate-400 hover:text-slate-600 text-sm underline decoration-slate-200">tutup pesan</button>
        <SaveIndicator status={saveStatus} className="ml-auto" />
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-sm space-y-8">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">KATEGORI KONSUMEN (SATU PER BARIS)</label>
          <textarea
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            rows={6}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-medium leading-relaxed"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">TAHAP PIPELINE — FORMAT PER BARIS: KEY|LABEL TAMPILAN|WARNA</label>
          <p className="text-[10px] text-slate-400 mb-3 uppercase font-bold">Warna: slate, blue, amber, purple, green, red, pink, cyan (untuk badge di list & kartu Kanban).</p>
          <textarea
            value={pipeline}
            onChange={(e) => setPipeline(e.target.value)}
            rows={7}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-slate-900 outline-none transition-all font-mono text-sm leading-relaxed"
          />
        </div>

        <div className="space-y-6">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">TEMPLATE FOLLOW-UP WHATSAPP (TOMBOL BULAT)</label>
          
          {waTemplates.map((t, i) => (
            <div key={t.key} className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 font-extrabold flex items-center justify-center flex-shrink-0 text-sm border border-orange-100 shadow-sm">
                  {t.key.toLowerCase()}
                </div>
                <input
                  type="text"
                  value={t.key}
                  onChange={(e) => {
                    const next = [...waTemplates];
                    next[i].key = e.target.value;
                    setWaTemplates(next);
                  }}
                  className="w-24 px-4 py-2 rounded-xl border-2 border-slate-200 text-sm font-bold"
                />
                <input
                  type="text"
                  value={t.label}
                  onChange={(e) => {
                    const next = [...waTemplates];
                    next[i].label = e.target.value;
                    setWaTemplates(next);
                  }}
                  className="flex-1 px-4 py-2 rounded-xl border-2 border-slate-200 text-sm font-medium"
                  placeholder="Label template"
                />
              </div>
              <textarea
                value={t.content}
                onChange={(e) => {
                  const next = [...waTemplates];
                  next[i].content = e.target.value;
                  setWaTemplates(next);
                }}
                rows={3}
                className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:border-slate-900 outline-none font-medium leading-relaxed"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
