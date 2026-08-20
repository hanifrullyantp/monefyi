"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save, Plus, Trash2 } from "lucide-react";
import type { PricingPlan } from "@/lib/types/content";

export default function PricingPage() {
  const { content, updateSection, save } = useContentStore();
  const [pricing, setPricing] = useState(content.pricing);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    updateSection("pricing", pricing);
    setTimeout(() => {
      save();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 300);
  };

  const updatePlan = (i: number, key: keyof PricingPlan, val: unknown) => {
    const plans = [...pricing.plans];
    plans[i] = { ...plans[i], [key]: val };
    setPricing({ ...pricing, plans });
  };

  const updatePlanFeature = (planI: number, featI: number, val: string) => {
    const plans = [...pricing.plans];
    const features = [...plans[planI].features];
    features[featI] = val;
    plans[planI] = { ...plans[planI], features };
    setPricing({ ...pricing, plans });
  };

  const addFeature = (planI: number) => {
    const plans = [...pricing.plans];
    plans[planI] = { ...plans[planI], features: [...plans[planI].features, "Fitur baru"] };
    setPricing({ ...pricing, plans });
  };

  const removeFeature = (planI: number, featI: number) => {
    const plans = [...pricing.plans];
    plans[planI] = { ...plans[planI], features: plans[planI].features.filter((_, i) => i !== featI) };
    setPricing({ ...pricing, plans });
  };

  return (
    <div>
      <PageHeader
        title="Pricing Editor"
        description="Edit paket harga dan fitur"
        actions={
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
              <Save className="w-4 h-4" />Simpan
            </button>
          </div>
        }
      />

      {/* Header fields */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 space-y-4">
        <h3 className="font-bold text-slate-900">Header Section</h3>
        {[
          { label: "Label", key: "label" },
          { label: "Judul", key: "title" },
          { label: "Subtitle", key: "subtitle" },
          { label: "Trust Line", key: "trustLine" },
        ].map(({ label, key }) => (
          <div key={key}>
            <label className="text-sm font-semibold text-slate-700 block mb-1">{label}</label>
            <input
              type="text"
              value={(pricing as unknown as Record<string, unknown>)[key] as string}
              onChange={(e) => setPricing({ ...pricing, [key]: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        ))}
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-2 gap-6">
        {pricing.plans.map((plan, pi) => (
          <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-900">{plan.name}</h3>
            {[
              { label: "Label", key: "label" },
              { label: "Nama", key: "name" },
              { label: "Deskripsi", key: "description" },
              { label: "Harga Display", key: "priceDisplay" },
              { label: "Harga Asli Display (opsional)", key: "priceOriginalDisplay" },
              { label: "Sub Harga", key: "priceSubtitle" },
              { label: "CTA Text", key: "cta.text" },
              { label: "Badge Text", key: "badgeText" },
            ].map(({ label, key }) => {
              const val = key === "cta.text" ? plan.cta.text : (plan as unknown as Record<string, unknown>)[key] as string;
              return (
                <div key={key}>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">{label}</label>
                  <input
                    type="text"
                    value={val ?? ""}
                    onChange={(e) => {
                      if (key === "cta.text") {
                        updatePlan(pi, "cta", { ...plan.cta, text: e.target.value });
                      } else {
                        updatePlan(pi, key as keyof PricingPlan, e.target.value);
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              );
            })}

            {/* Features */}
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Fitur</label>
              <div className="space-y-2">
                {plan.features.map((feat, fi) => (
                  <div key={fi} className="flex gap-2">
                    <input
                      type="text"
                      value={feat}
                      onChange={(e) => updatePlanFeature(pi, fi, e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button onClick={() => removeFeature(pi, fi)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => addFeature(pi)} className="w-full py-2 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors inline-flex items-center justify-center gap-2">
                  <Plus className="w-3 h-3" />
                  Tambah Fitur
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
