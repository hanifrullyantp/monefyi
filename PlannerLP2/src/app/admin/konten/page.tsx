"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { Save, RefreshCw, Eye, Edit3, ChevronRight } from "lucide-react";
import Link from "next/link";

type SectionKey =
  | "hero"
  | "threeStep"
  | "transition"
  | "relatable"
  | "features"
  | "transformation"
  | "testimonial"
  | "pricing"
  | "guarantee"
  | "faq"
  | "finalCta"
  | "footer";

const SECTIONS: { key: SectionKey; label: string; desc: string }[] = [
  { key: "hero", label: "Hero Section", desc: "Headline, subheadline, CTA" },
  { key: "threeStep", label: "3 Step", desc: "Konten 3 langkah closing" },
  { key: "transition", label: "Transisi", desc: "Paragraf penghubung" },
  { key: "relatable", label: "Relatable Checklist", desc: "Daftar masalah" },
  { key: "features", label: "Fitur", desc: "Grid 12 fitur" },
  { key: "transformation", label: "Transformasi", desc: "5 skenario perbandingan" },
  { key: "testimonial", label: "Testimoni", desc: "Cerita & quote" },
  { key: "pricing", label: "Harga", desc: "3 paket pricing" },
  { key: "guarantee", label: "Garansi", desc: "7 hari uang kembali" },
  { key: "faq", label: "FAQ", desc: "Pertanyaan yang sering ditanya" },
  { key: "finalCta", label: "Final CTA", desc: "Section CTA penutup" },
  { key: "footer", label: "Footer", desc: "Link & kontak" },
];

export default function KontenPage() {
  const { content, updateSection, publishContent, isDirty, isSaving } =
    useContentStore();
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saved, setSaved] = useState(false);

  const openSection = (key: SectionKey) => {
    setActiveSection(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEditData(JSON.parse(JSON.stringify((content as any)[key] || {})));
  };

  const saveSection = async () => {
    if (!activeSection) return;
    updateSection(activeSection, editData as never);
    await publishContent();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleVisibility = (key: string) => {
    const updated = {
      ...content.sectionVisibility,
      [key]: !content.sectionVisibility[key],
    };
    updateSection("sectionVisibility", updated);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Konten Visual Editor</h1>
          <p className="text-slate-500 text-sm mt-1">Klik section untuk mengedit konten</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
          >
            <Eye className="w-4 h-4" /> Preview
          </Link>
          <Link
            href="/admin/konten-json"
            className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
          >
            <Edit3 className="w-4 h-4" /> JSON Editor
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section List */}
        <div className="lg:col-span-1 space-y-2">
          {SECTIONS.map(({ key, label, desc }) => (
            <div
              key={key}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                activeSection === key
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => openSection(key)}
                  className="flex-1 text-left"
                >
                  <p className="font-semibold text-slate-900 text-sm">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </button>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => toggleVisibility(key)}
                    className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                      content.sectionVisibility[key] !== false
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {content.sectionVisibility[key] !== false ? "Aktif" : "Sembunyikan"}
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-2">
          {activeSection ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h2 className="font-bold text-slate-900">
                  Edit: {SECTIONS.find((s) => s.key === activeSection)?.label}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditData(JSON.parse(JSON.stringify((content as unknown as Record<string, unknown>)[activeSection] || {})))}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={saveSection}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-emerald-700"
                  >
                    <Save className="w-4 h-4" />
                    {saved ? "Tersimpan!" : "Simpan"}
                  </button>
                </div>
              </div>
              <div className="p-5">
                  <p className="text-sm text-slate-500 mb-4">
                  Edit field-field di bawah. Atau gunakan{" "}
                  <Link href="/admin/konten-json" className="text-emerald-600 hover:underline">
                    JSON Editor
                  </Link>{" "}
                  untuk edit lebih detail.
                </p>
                <div className="space-y-4">
                  {Object.entries(editData).map(([key, value]: [string, unknown]) => {
                    if (Array.isArray(value)) {
                      return (
                        <div key={key}>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            {key} (Array - {(value as unknown[]).length} item)
                          </label>
                          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 font-mono max-h-40 overflow-y-auto">
                            {JSON.stringify(value, null, 2)}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Edit array via JSON Editor untuk hasil terbaik
                          </p>
                        </div>
                      );
                    }
                    if (typeof value === "object" && value !== null) {
                      return (
                        <div key={key}>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            {key} (Object)
                          </label>
                          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 font-mono max-h-40 overflow-y-auto">
                            {JSON.stringify(value, null, 2)}
                          </div>
                        </div>
                      );
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    if (value === null || value === undefined) return null;
                    if (typeof value === "boolean") {
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-slate-700">{key}</label>
                          <button
                            onClick={() =>
                              setEditData((prev) => ({ ...prev, [key]: !prev[key] }))
                            }
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                              value
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {value ? "Aktif" : "Nonaktif"}
                          </button>
                        </div>
                      );
                    }
                    const isLongText = typeof value === "string" && (value as string).length > 80;
                    return (
                      <div key={key}>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          {key}
                        </label>
                        {isLongText ? (
                          <textarea
                            rows={3}
                            value={value as string}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-y focus:outline-none focus:border-emerald-400"
                          />
                        ) : (
                          <input
                            value={value as string}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Edit3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Pilih section di sebelah kiri untuk mulai mengedit</p>
              <p className="text-slate-400 text-sm mt-2">
                Atau gunakan{" "}
                <Link href="/admin/konten-json" className="text-emerald-600 hover:underline">
                  JSON Editor
                </Link>{" "}
                untuk edit seluruh konten sekaligus
              </p>
            </div>
          )}
        </div>
      </div>

      {isDirty && (
        <div className="fixed bottom-6 right-6 bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg">
          Ada perubahan yang belum disimpan
        </div>
      )}
    </div>
  );
}
