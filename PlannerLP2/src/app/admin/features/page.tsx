"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { Save, Edit, Star } from "lucide-react";
import type { FeatureItem } from "@/lib/types/content";

export default function FeaturesAdminPage() {
  const { content, updateSection, markSaved } = useContentStore();
  const [features, setFeatures] = useState<FeatureItem[]>(content.features.features);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateSection("features", { ...content.features, features });
    markSaved();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateFeature = (idx: number, updates: Partial<FeatureItem>) => {
    setFeatures((prev) => prev.map((f, i) => (i === idx ? { ...f, ...updates } : f)));
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Fitur Editor</h1>
        <button onClick={save} className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700">
          <Save className="w-4 h-4" /> {saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feat, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900 text-sm">{feat.title}</p>
                {feat.featured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
              </div>
              <button onClick={() => setEditingIdx(editingIdx === idx ? null : idx)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                <Edit className="w-4 h-4" />
              </button>
            </div>
            {editingIdx === idx ? (
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Judul</label>
                  <input value={feat.title} onChange={(e) => updateFeature(idx, { title: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Deskripsi</label>
                  <textarea rows={2} value={feat.description} onChange={(e) => updateFeature(idx, { description: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-500">Featured</label>
                  <button onClick={() => updateFeature(idx, { featured: !feat.featured })} className={`px-3 py-1 rounded-lg text-xs font-semibold ${feat.featured ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                    {feat.featured ? "Ya" : "Tidak"}
                  </button>
                </div>
                <button onClick={() => setEditingIdx(null)} className="w-full bg-emerald-600 text-white rounded-xl py-2 text-sm font-semibold">Selesai</button>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-xs text-slate-500">{feat.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
