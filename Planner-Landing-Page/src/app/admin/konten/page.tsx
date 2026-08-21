"use client";
import { useState } from "react";
import Link from "next/link";
import { useContentStore } from "@/lib/store/contentStore";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { cn } from "@/lib/utils/cn";
import { useAdminContentSave, type SaveStatus } from "@/lib/hooks/useAdminContentSave";

const TABS = ["Hero", "Navbar", "Final CTA", "Visibilitas Section"] as const;

export default function KontenPage() {
  const { content } = useContentStore();
  const { persistSection } = useAdminContentSave();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Hero");
  const [hero, setHero] = useState(content.hero);
  const [navbar, setNavbar] = useState(content.navbar);
  const [finalCta, setFinalCta] = useState(content.finalCta);
  const [visibility, setVisibility] = useState(content.sectionVisibility);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    if (tab === "Hero") persistSection("hero", hero, setSaveStatus);
    else if (tab === "Navbar") persistSection("navbar", navbar, setSaveStatus);
    else if (tab === "Final CTA") persistSection("finalCta", finalCta, setSaveStatus);
    else persistSection("sectionVisibility", visibility, setSaveStatus);
  };

  return (
    <div className="max-w-4xl pb-20">
      <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Konten Landing Page</h2>
      <p className="text-sm text-slate-500 mb-6">
        Edit section yang tampil di landing. Untuk section lain gunakan{" "}
        <Link href="/admin/pricing" className="text-emerald-600 font-semibold hover:underline">Pricing</Link>,{" "}
        <Link href="/admin/testimonial" className="text-emerald-600 font-semibold hover:underline">Testimonial</Link>, atau{" "}
        <Link href="/admin/konten-json" className="text-emerald-600 font-semibold hover:underline">JSON Editor</Link>.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
              tab === t ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={handleSave} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold">
          Simpan
        </button>
        <SaveIndicator status={saveStatus} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-5">
        {tab === "Hero" && (
          <>
            {(
              [
                ["badge", "Badge"],
                ["headline", "Headline"],
                ["subheadline", "Subheadline"],
                ["painParagraph", "Paragraf pain point"],
                ["ctaText", "Teks CTA"],
                ["ctaTarget", "Target CTA (anchor)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-sm font-bold text-slate-700">{label}</span>
                <input
                  value={hero[key]}
                  onChange={(e) => setHero({ ...hero, [key]: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200"
                />
              </label>
            ))}
          </>
        )}

        {tab === "Navbar" && (
          <>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Logo teks</span>
              <input
                value={navbar.logo}
                onChange={(e) => setNavbar({ ...navbar, logo: e.target.value })}
                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">CTA label</span>
              <input
                value={navbar.cta.label}
                onChange={(e) => setNavbar({ ...navbar, cta: { ...navbar.cta, label: e.target.value } })}
                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200"
              />
            </label>
          </>
        )}

        {tab === "Final CTA" && (
          <>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Judul</span>
              <textarea
                value={finalCta.title}
                onChange={(e) => setFinalCta({ ...finalCta, title: e.target.value })}
                rows={2}
                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Deskripsi</span>
              <textarea
                value={finalCta.description}
                onChange={(e) => setFinalCta({ ...finalCta, description: e.target.value })}
                rows={3}
                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200"
              />
            </label>
          </>
        )}

        {tab === "Visibilitas Section" && (
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(visibility).map(([key, on]) => (
              <label key={key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => setVisibility({ ...visibility, [key]: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-slate-700">{key}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
