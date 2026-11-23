"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { Plus, Trash2, Save, GripVertical, Edit } from "lucide-react";
import type { FAQItem } from "@/lib/types/content";

export default function FAQAdminPage() {
  const { content, updateSection, publishContent } = useContentStore();
  const [items, setItems] = useState<FAQItem[]>(content.faq.items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    updateSection("faq", { ...content.faq, items });
    await publishContent();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addItem = () => {
    const newItem: FAQItem = {
      id: Date.now().toString(),
      category: "Umum",
      question: "Pertanyaan baru",
      answer: "Jawaban di sini...",
    };
    setItems([...items, newItem]);
    setEditingId(newItem.id);
  };

  const updateItem = (id: string, updates: Partial<FAQItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const deleteItem = (id: string) => {
    if (confirm("Hapus pertanyaan ini?")) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const CATEGORIES = content.faq.categories;

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">FAQ Editor</h1>
          <p className="text-slate-500 text-sm mt-1">{items.length} pertanyaan</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" /> Tambah FAQ
          </button>
          <button
            onClick={save}
            className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700"
          >
            <Save className="w-4 h-4" />
            {saved ? "Tersimpan!" : "Simpan"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            {editingId === item.id ? (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Kategori</label>
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(item.id, { category: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    >
                      {CATEGORIES.filter((c) => c !== "Semua").map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Pertanyaan</label>
                  <input
                    value={item.question}
                    onChange={(e) => updateItem(item.id, { question: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Jawaban</label>
                  <textarea
                    rows={4}
                    value={item.answer}
                    onChange={(e) => updateItem(item.id, { answer: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex-1 bg-emerald-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-emerald-700"
                  >
                    Selesai
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4">
                <GripVertical className="w-4 h-4 text-slate-300 mt-1 flex-shrink-0 cursor-grab" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-medium">
                      {item.category}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm">{item.question}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.answer}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingId(item.id)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
