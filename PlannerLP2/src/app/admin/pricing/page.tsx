"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { Save, Edit } from "lucide-react";
import type { PricingCard } from "@/lib/types/content";

export default function PricingAdminPage() {
  const { content, updateSection, markSaved } = useContentStore();
  const [cards, setCards] = useState<PricingCard[]>(content.pricing.cards);
  const [lynkUrls, setLynkUrls] = useState(content.pricing.lynkCheckoutUrls ?? {});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateSection("pricing", { ...content.pricing, cards, lynkCheckoutUrls: lynkUrls });
    markSaved();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateCard = (id: string, updates: Partial<PricingCard>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Pricing Editor</h1>
          <p className="text-slate-500 text-sm mt-1">Edit 3 paket harga</p>
        </div>
        <button
          onClick={save}
          className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700"
        >
          <Save className="w-4 h-4" />
          {saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
              card.highlighted ? "border-emerald-500" : "border-slate-200"
            }`}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{card.title}</p>
                <p className="text-xs text-slate-500">{card.badge}</p>
              </div>
              <button
                onClick={() => setEditingId(editingId === card.id ? null : card.id)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>

            {editingId === card.id ? (
              <div className="p-5 space-y-3">
                {[
                  { key: "title", label: "Judul", type: "text" },
                  { key: "subtitle", label: "Subtitle", type: "text" },
                  { key: "price", label: "Harga", type: "text" },
                  { key: "pricePeriod", label: "Periode", type: "text" },
                  { key: "originalPrice", label: "Harga Coret", type: "text" },
                  { key: "savingsBadge", label: "Badge Hemat", type: "text" },
                  { key: "ctaText", label: "Teks CTA", type: "text" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
                    <input
                      value={(card as unknown as Record<string, string | undefined>)[key] || ""}
                      onChange={(e) => updateCard(card.id, { [key]: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500">Highlighted</label>
                  <button
                    onClick={() => updateCard(card.id, { highlighted: !card.highlighted })}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      card.highlighted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {card.highlighted ? "Ya" : "Tidak"}
                  </button>
                </div>
                <button
                  onClick={() => setEditingId(null)}
                  className="w-full bg-emerald-600 text-white rounded-xl py-2 text-sm font-semibold"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <div className="p-5">
                <p className="text-3xl font-extrabold text-slate-900 mb-1">{card.price}</p>
                <p className="text-sm text-slate-500">{card.pricePeriod}</p>
                {card.originalPrice && (
                  <p className="text-sm text-slate-400 line-through">{card.originalPrice}</p>
                )}
                <div className="mt-4 space-y-1.5">
                  {card.features.slice(0, 5).map((feat, i) => (
                    <p key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
                      <span className={feat.included ? "text-emerald-500" : "text-slate-300"}>
                        {feat.included ? "✓" : "×"}
                      </span>
                      {feat.text}
                    </p>
                  ))}
                  {card.features.length > 5 && (
                    <p className="text-xs text-slate-400">+{card.features.length - 5} lagi...</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Lynk Checkout URLs</h2>
        <p className="text-sm text-slate-500">
          Override URL checkout Lynk per produk. Kosongkan untuk pakai env{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">NEXT_PUBLIC_LYNK_*</code>.
        </p>
        {(
          [
            ["estimator_standard", "Estimator Standard (Rp 99k)"],
            ["estimator_pro", "Estimator Pro (Rp 199k)"],
            ["planner_pro", "Planner Pro (Rp 199k/bulan)"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
            <input
              type="url"
              value={lynkUrls[key] ?? ""}
              onChange={(e) => setLynkUrls((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder="https://lynk.id/..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
