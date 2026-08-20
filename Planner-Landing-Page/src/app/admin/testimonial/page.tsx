"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save } from "lucide-react";

export default function TestimonialPage() {
  const { content, updateSection, save } = useContentStore();
  const [testimonial, setTestimonial] = useState(content.testimonial);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    updateSection("testimonial", testimonial);
    setTimeout(() => {
      save();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 300);
  };

  const updateStory = (key: string, val: unknown) => {
    setTestimonial((prev) => ({ ...prev, story: { ...prev.story, [key]: val } }));
  };

  const updateAuthor = (key: string, val: string) => {
    setTestimonial((prev) => ({ ...prev, author: { ...prev.author, [key]: val } }));
  };

  const updateResult = (i: number, val: string) => {
    const results = [...testimonial.story.results];
    results[i] = val;
    updateStory("results", results);
  };

  return (
    <div>
      <PageHeader
        title="Testimonial Editor"
        description="Edit cerita dan data testimonial utama"
        actions={
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
              <Save className="w-4 h-4" />Simpan
            </button>
          </div>
        }
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900">Header & Attribution</h3>
            {[
              { label: "Label", key: "label" },
              { label: "Big Quote", key: "bigQuote" },
              { label: "Attribution", key: "attribution" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-sm font-semibold text-slate-700 block mb-1">{label}</label>
                <textarea
                  value={(testimonial as unknown as Record<string, unknown>)[key] as string}
                  onChange={(e) => setTestimonial((prev) => ({ ...prev, [key]: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900">Data Author</h3>
            {[
              { label: "Initial", key: "initial" },
              { label: "Nama", key: "name" },
              { label: "Jabatan", key: "title" },
              { label: "Durasi", key: "duration" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-sm font-semibold text-slate-700 block mb-1">{label}</label>
                <input
                  type="text"
                  value={(testimonial.author as unknown as Record<string, string>)[key]}
                  onChange={(e) => updateAuthor(key, e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900">Social Proof</h3>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Rating (0-5)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={testimonial.socialProof.rating}
                onChange={(e) => setTestimonial((prev) => ({ ...prev, socialProof: { ...prev.socialProof, rating: parseFloat(e.target.value) } }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Jumlah Review</label>
              <input
                type="number"
                value={testimonial.socialProof.reviewCount}
                onChange={(e) => setTestimonial((prev) => ({ ...prev, socialProof: { ...prev.socialProof, reviewCount: parseInt(e.target.value) } }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900">Cerita</h3>
            {[
              { label: "Opening", key: "opening" },
              { label: "Turning Point", key: "turningPoint" },
              { label: "Transformasi", key: "transformation" },
              { label: "Big Quote (dalam cerita)", key: "bigQuote" },
              { label: "Penutup", key: "closing" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-sm font-semibold text-slate-700 block mb-1">{label}</label>
                <textarea
                  value={(testimonial.story as unknown as Record<string, string>)[key]}
                  onChange={(e) => updateStory(key, e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900">Hasil (Angka)</h3>
            {testimonial.story.results.map((result, i) => (
              <div key={i}>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Hasil {i + 1}</label>
                <input
                  type="text"
                  value={result}
                  onChange={(e) => updateResult(i, e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
