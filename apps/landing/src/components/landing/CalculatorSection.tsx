"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, TrendingUp, Clock, DollarSign, Target } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { useContentStore } from "@/lib/store/contentStore";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import { trackEvent } from "@/lib/analytics/events";

export function CalculatorSection() {
  const { content } = useContentStore();
  const { calculator } = content;

  const [waPerMonth, setWaPerMonth] = useState(50);
  const [surveiCount, setSurveiCount] = useState(20);
  const [dealCount, setDealCount] = useState(4);
  const [nilaiProyek, setNilaiProyek] = useState(15_000_000);
  const [jamPerSurvei, setJamPerSurvei] = useState(3);

  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started) trackEvent("calc_start");
  }, [started]);

  const results = useMemo(() => {
    const closingRate = waPerMonth > 0 ? (dealCount / waPerMonth) * 100 : 0;
    const surveiSiaSia = Math.max(0, surveiCount - dealCount);
    const waktuTerbuang = surveiSiaSia * jamPerSurvei;
    const potentialLost = Math.max(0, waPerMonth - surveiCount);
    const revenueLostMin = Math.round(potentialLost * 0.15 * nilaiProyek);
    const revenueLostMax = Math.round(potentialLost * 0.25 * nilaiProyek);
    const jamHemat = Math.round(surveiSiaSia * jamPerSurvei * 0.6);
    const revenueExtra = Math.round(dealCount * 2 * nilaiProyek * 0.3);

    return {
      closingRate: closingRate.toFixed(1),
      closingRateNum: closingRate,
      waktuTerbuang,
      hariTerbuang: (waktuTerbuang / 8).toFixed(1),
      revenueLostMin,
      revenueLostMax,
      jamHemat,
      revenueExtra,
    };
  }, [waPerMonth, surveiCount, dealCount, nilaiProyek, jamPerSurvei]);

  const closingColor =
    results.closingRateNum < 10
      ? "text-red-300"
      : results.closingRateNum < 20
        ? "text-[var(--accent-warm)]"
        : "text-[var(--brand-400)]";

  const scrollToHarga = () => {
    const el = document.getElementById("harga");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  return (
    <section id="kalkulator" className="section-pad bg-[var(--surface-soft)]">
      <Container className="content-max">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-block bg-[var(--surface-alt)] text-[var(--brand-600)] rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase mb-3">
            {calculator.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--ink)] tracking-tight mb-3">
            {calculator.title}
          </h2>
          <p className="text-[var(--muted)]">{calculator.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[var(--surface-alt)]">
            <h3 className="text-lg font-bold text-[var(--ink)] mb-5">Data kamu</h3>
            <div className="space-y-5" onFocus={() => setStarted(true)}>
              {[
                { label: "WA masuk / bulan", value: waPerMonth, set: setWaPerMonth, min: 10, max: 500, unit: "chat" },
                { label: "Yang jadi survei", value: surveiCount, set: setSurveiCount, min: 0, max: waPerMonth, unit: "lokasi" },
                { label: "Yang deal", value: dealCount, set: setDealCount, min: 0, max: surveiCount, unit: "deal" },
                { label: "Jam per survei", value: jamPerSurvei, set: setJamPerSurvei, min: 1, max: 8, unit: "jam" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-sm font-semibold text-[var(--ink)] mb-2">{f.label}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={f.min}
                      max={f.max}
                      value={f.value}
                      onChange={(e) => f.set(Number(e.target.value))}
                      className="flex-1 accent-[var(--brand-600)]"
                    />
                    <span className="text-sm font-bold w-20 text-right">
                      {f.value} {f.unit}
                    </span>
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-[var(--ink)] mb-2">Nilai rata-rata proyek (Rp)</label>
                <input
                  type="number"
                  value={nilaiProyek}
                  onChange={(e) => setNilaiProyek(Number(e.target.value) || 0)}
                  className="w-full border border-[var(--surface-alt)] rounded-xl px-4 py-3 text-sm min-h-[44px]"
                />
                <p className="text-xs text-[var(--muted)] mt-1">= {formatCurrency(nilaiProyek)}</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-dark)] text-white rounded-2xl p-6 md:p-8">
            <h3 className="text-lg font-bold text-[var(--brand-400)] mb-5">Hasil analisis</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Closing rate
                </div>
                <p className={cn("text-2xl font-extrabold", closingColor)}>{results.closingRate}%</p>
                <p className="text-[10px] text-white/40 mt-1">
                  {results.closingRateNum < 10
                    ? "Perlu ditingkatkan"
                    : results.closingRateNum < 20
                      ? "Cukup baik"
                      : "Sangat baik"}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
                  <Clock className="w-3.5 h-3.5" /> Waktu sia-sia
                </div>
                <p className="text-2xl font-extrabold text-[var(--accent-warm)]">{results.waktuTerbuang}j</p>
                <p className="text-[10px] text-white/40">≈ {results.hariTerbuang} hari kerja</p>
              </div>
            </div>

            <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-1.5 text-xs text-red-300 mb-1">
                <DollarSign className="w-3.5 h-3.5" /> Potensi revenue hilang
              </div>
              <p className="text-lg font-extrabold text-red-200">
                {formatCurrency(results.revenueLostMin)} – {formatCurrency(results.revenueLostMax)}/bulan
              </p>
              <p className="text-[10px] text-white/40 mt-1">dari lead yang belum tersaring baik</p>
            </div>

            <div className="bg-emerald-900/25 border border-emerald-800/40 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-1.5 text-xs text-[var(--brand-400)] mb-3 font-bold uppercase tracking-wider">
                <Target className="w-3.5 h-3.5" /> Rekomendasi
              </div>
              <ul className="text-sm text-white/80 space-y-2">
                <li>→ Saring lead di WA — hemat sekitar {results.jamHemat} jam/bulan</li>
                <li>→ Closing saat survei — naikkan closing rate 2–3×</li>
                <li>→ Potensi tambahan: {formatCurrency(results.revenueExtra)}/bulan</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={scrollToHarga}
              className="w-full btn-brand inline-flex items-center justify-center gap-2"
            >
              {calculator.ctaText}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}
