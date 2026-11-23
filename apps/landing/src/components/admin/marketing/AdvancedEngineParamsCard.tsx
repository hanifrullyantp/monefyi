"use client";

import { useState } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";

interface FieldSpec {
  key:
    | "analysisWindowDays"
    | "minPurchasesToScale"
    | "scaleCooldownHours"
    | "learningMinAgeDays"
    | "learningMinOptimizationEvents"
    | "learningHardStopSpend"
    | "minLinkClicksToJudge"
    | "breakEvenCpa"
    | "contributionMarginPct"
    | "killMaxMultipleOfTarget"
    | "winProbabilityToScale"
    | "lossProbabilityToPause"
    | "priorStrengthClicks";
  label: string;
  step: number;
  min: number;
  max: number;
}

const FIELDS: FieldSpec[] = [
  { key: "analysisWindowDays", label: "Jendela analisa (hari)", step: 1, min: 3, max: 90 },
  { key: "minPurchasesToScale", label: "Min. beli sebelum scale", step: 1, min: 1, max: 50 },
  { key: "scaleCooldownHours", label: "Cooldown scale (jam)", step: 6, min: 6, max: 168 },
  { key: "learningMinAgeDays", label: "Umur learning phase (hari)", step: 1, min: 1, max: 30 },
  { key: "learningMinOptimizationEvents", label: "Event keluar learning", step: 5, min: 5, max: 200 },
  { key: "learningHardStopSpend", label: "Hard stop spend learning (Rp)", step: 15000, min: 30000, max: 5000000 },
  { key: "minLinkClicksToJudge", label: "Min. klik link untuk menilai", step: 10, min: 20, max: 2000 },
  { key: "breakEvenCpa", label: "Break-even CPA (Rp, 0=otomatis)", step: 5000, min: 0, max: 5000000 },
  { key: "contributionMarginPct", label: "Margin kontribusi (%)", step: 5, min: 10, max: 100 },
  { key: "killMaxMultipleOfTarget", label: "Batas maks garis rugi (x target)", step: 0.1, min: 1.2, max: 10 },
  { key: "winProbabilityToScale", label: "Probabilitas winner min (0-1)", step: 0.05, min: 0.5, max: 0.99 },
  { key: "lossProbabilityToPause", label: "Probabilitas pause min (0-1)", step: 0.05, min: 0.5, max: 0.99 },
  { key: "priorStrengthClicks", label: "Kekuatan prior klik", step: 5, min: 5, max: 500 },
];

/** Pengaturan parameter probabilitas & learning engine (tersimpan di Supabase). */
export function AdvancedEngineParamsCard() {
  const { winningEngineConfig, updateWinningEngineConfig } = useMarketingStore();
  const [open, setOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-900 dark:text-white"
        onClick={() => setOpen(!open)}
      >
        <span>Parameter probabilitas &amp; jendela analisa (lanjutan)</span>
        <span className="text-xs text-slate-500">
          {winningEngineConfig.analysisWindowDays}h | min {winningEngineConfig.minPurchasesToScale} beli | {open ? "Tutup" : "Buka"}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-500">
            Mengatur ambang statistik Bayesian, batas learning phase, dan jendela analisa yang dipakai cron maupun dashboard. Perubahan langsung disimpan ke database.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="block text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{f.label}</span>
                <input
                  type="number"
                  step={f.step}
                  min={f.min}
                  max={f.max}
                  value={Number(winningEngineConfig[f.key] ?? 0)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!Number.isFinite(val)) return;
                    updateWinningEngineConfig({ [f.key]: val });
                    setSavedNotice("Parameter tersimpan otomatis ke server.");
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white"
                />
              </label>
            ))}
          </div>
          {savedNotice && <p className="text-xs text-emerald-600 dark:text-emerald-400">{savedNotice}</p>}
        </div>
      )}
    </section>
  );
}

