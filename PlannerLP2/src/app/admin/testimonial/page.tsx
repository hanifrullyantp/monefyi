"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { Save, Edit } from "lucide-react";
import type { TestimonialCard } from "@/lib/types/content";

export default function TestimonialAdminPage() {
  const { content, updateSection, markSaved } = useContentStore();
  const [others, setOthers] = useState<TestimonialCard[]>(content.testimonial.others);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateSection("testimonial", { ...content.testimonial, others });
    markSaved();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateCard = (idx: number, updates: Partial<TestimonialCard>) => {
    setOthers((prev) => prev.map((c, i) => (i === idx ? { ...c, ...updates } : c)));
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Testimonial Editor</h1>
        <button
          onClick={save}
          className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700"
        >
          <Save className="w-4 h-4" />
          {saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>

      <div className="space-y-4">
        {others.map((card, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">{card.name}</p>
                <p className="text-xs text-slate-500">{card.type}</p>
              </div>
              <button
                onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
            {editingIdx === idx ? (
              <div className="p-5 space-y-3">
                {[
                  { key: "name", label: "Nama" },
                  { key: "type", label: "Jenis Usaha" },
                  { key: "storyTitle", label: "Judul Cerita" },
                  { key: "quote", label: "Kutipan" },
                  { key: "pain", label: "Masalah Sebelumnya" },
                  { key: "result", label: "Hasil Setelah" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
                    <textarea
                      rows={2}
                      value={(card as unknown as Record<string, string | number>)[key] as string || ""}
                      onChange={(e) => updateCard(idx, { [key]: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Rating (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={card.rating}
                    onChange={(e) => updateCard(idx, { rating: Number(e.target.value) })}
                    className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => setEditingIdx(null)}
                  className="w-full bg-emerald-600 text-white rounded-xl py-2 text-sm font-semibold"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <div className="p-5">
                <p className="text-sm text-slate-700 font-medium mb-2">{card.storyTitle}</p>
                <p className="text-sm text-slate-500 italic">&ldquo;{card.quote}&rdquo;</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
