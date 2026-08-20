"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save, Plus, Trash2, GripVertical } from "lucide-react";

export default function FaqPage() {
  const { content, updateSection, save } = useContentStore();
  const [faqs, setFaqs] = useState(content.guaranteeFaq.faqs);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    updateSection("guaranteeFaq", { ...content.guaranteeFaq, faqs });
    setTimeout(() => {
      save();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 300);
  };

  const updateFaq = (i: number, key: "question" | "answer", val: string) => {
    const next = [...faqs];
    next[i] = { ...next[i], [key]: val };
    setFaqs(next);
  };

  const addFaq = () => {
    setFaqs([...faqs, { question: "Pertanyaan baru?", answer: "Jawaban di sini." }]);
  };

  const removeFaq = (i: number) => {
    setFaqs(faqs.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <PageHeader
        title="FAQ Editor"
        description="Kelola pertanyaan yang sering ditanyakan"
        actions={
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <button onClick={addFaq} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              <Plus className="w-4 h-4" />Tambah FAQ
            </button>
            <button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
              <Save className="w-4 h-4" />Simpan
            </button>
          </div>
        }
      />

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start gap-3">
              <GripVertical className="w-5 h-5 text-slate-300 mt-2.5 flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Pertanyaan</label>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => updateFaq(i, "question", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Jawaban</label>
                  <textarea
                    value={faq.answer}
                    onChange={(e) => updateFaq(i, "answer", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                  />
                </div>
              </div>
              <button onClick={() => removeFaq(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
