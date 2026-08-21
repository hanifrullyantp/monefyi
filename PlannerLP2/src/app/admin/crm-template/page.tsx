"use client";
import { useState } from "react";
import { MessageSquare, Copy, Plus, Trash2, Edit, Save } from "lucide-react";

interface WATemplate {
  id: string;
  name: string;
  category: string;
  message: string;
}

const defaultTemplates: WATemplate[] = [
  {
    id: "1",
    name: "Saring Lead Baru",
    category: "Screening",
    message: "Halo [Nama], terima kasih sudah menghubungi kami!\n\nUntuk [Jenis Proyek] dengan luas [Ukuran], budget kami mulai dari Rp [Harga].\n\nApakah budget Bapak/Ibu di kisaran tersebut?\nKalau iya, saya bisa jadwalkan survei akhir pekan ini. 🙏",
  },
  {
    id: "2",
    name: "Follow-up Penawaran",
    category: "Follow-up",
    message: "Halo [Nama], saya ingin follow up penawaran yang sudah saya kirimkan pada [Tanggal].\n\nApakah ada pertanyaan atau hal yang ingin didiskusikan lebih lanjut?\n\nKami siap bantu dari detail desain sampai estimasi biaya. 😊",
  },
  {
    id: "3",
    name: "Konfirmasi Survei",
    category: "Survei",
    message: "Halo [Nama]! 👋\n\nKonfirmasi jadwal survei:\n📅 [Tanggal]\n🕐 [Jam]\n📍 [Alamat]\n\nSaya akan datang tepat waktu. Apakah ada yang perlu disiapkan sebelumnya?",
  },
  {
    id: "4",
    name: "Setelah Survei",
    category: "Closing",
    message: "Halo [Nama], terima kasih sudah menerima kunjungan kami hari ini!\n\nSesuai diskusi tadi, penawaran lengkap sudah saya kirim via email/WA.\n\nAda pertanyaan? Saya siap dihubungi kapan saja. 🏗️",
  },
  {
    id: "5",
    name: "Ucapan Deal",
    category: "Deal",
    message: "Halo [Nama]! 🎉\n\nTerima kasih sudah mempercayakan proyek [Jenis Proyek] kepada kami!\n\nTim kami akan segera menghubungi untuk detail selanjutnya. Mari kita wujudkan rumah impian Bapak/Ibu bersama! 💪",
  },
];

export default function CRMTemplatePage() {
  const [templates, setTemplates] = useState<WATemplate[]>(defaultTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyTemplate = (template: WATemplate) => {
    navigator.clipboard.writeText(template.message);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const updateTemplate = (id: string, updates: Partial<WATemplate>) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const addTemplate = () => {
    const newT: WATemplate = {
      id: Date.now().toString(),
      name: "Template Baru",
      category: "Umum",
      message: "Isi pesan template di sini...",
    };
    setTemplates([...templates, newT]);
    setEditingId(newT.id);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Template WA</h1>
          <p className="text-slate-500 text-sm mt-1">{templates.length} template</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addTemplate} className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-50">
            <Plus className="w-4 h-4" /> Tambah
          </button>
          <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700">
            <Save className="w-4 h-4" /> {saved ? "Tersimpan!" : "Simpan"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="font-bold text-slate-900 text-sm">{template.name}</p>
                  <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{template.category}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => copyTemplate(template)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Copy">
                  {copiedId === template.id ? <Save className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditingId(editingId === template.id ? null : template.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => setTemplates((prev) => prev.filter((t) => t.id !== template.id))} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {editingId === template.id ? (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Nama Template</label>
                    <input value={template.name} onChange={(e) => updateTemplate(template.id, { name: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Kategori</label>
                    <input value={template.category} onChange={(e) => updateTemplate(template.id, { category: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Pesan (gunakan [Nama], [Tanggal] sebagai variabel)</label>
                  <textarea rows={6} value={template.message} onChange={(e) => updateTemplate(template.id, { message: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none font-mono" />
                </div>
                <button onClick={() => setEditingId(null)} className="w-full bg-emerald-600 text-white rounded-xl py-2 text-sm font-semibold">Selesai</button>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-sm text-slate-600 whitespace-pre-line line-clamp-3">{template.message}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
