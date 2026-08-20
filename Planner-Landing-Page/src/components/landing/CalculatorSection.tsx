"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { useInView } from "@/lib/hooks/useInView";
import { cn } from "@/lib/utils/cn";

export function CalculatorSection() {
  const { content } = useContentStore();
  const { calculator } = content;
  const [value, setValue] = useState(calculator.defaultValue);
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.15 });

  const { surveiRate, dealRate, idealDealRate } = calculator.formulas;
  const surveiCount = Math.round(value * surveiRate);
  const dealCount = Math.round(value * dealRate);
  const idealDealCount = Math.round(value * idealDealRate);
  const potentialCount = idealDealCount - dealCount;

  const sliderPercent = ((value - calculator.min) / (calculator.max - calculator.min)) * 100;

  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-emerald-600 tracking-[0.2em] uppercase">
            {calculator.label}
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 leading-[1.15] tracking-tight mt-6 whitespace-pre-line">
            {calculator.title}
          </h2>
          <p className="text-lg text-slate-500 mt-6 leading-relaxed">{calculator.subtitle}</p>
        </div>

        {/* Interactive Card */}
        <div ref={ref} className={cn(
          "mt-16 bg-slate-50 rounded-3xl p-8 md:p-12 transition-all duration-500",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <p className="text-sm font-semibold text-slate-700">{calculator.inputLabel}</p>

          {/* Slider + Value */}
          <div className="mt-6 flex items-center gap-8">
            {/* Slider */}
            <div className="flex-1">
              <div className="relative h-2 bg-slate-200 rounded-full">
                <div
                  className="absolute left-0 top-0 h-2 bg-emerald-500 rounded-full transition-all duration-150"
                  style={{ width: `${sliderPercent}%` }}
                />
              </div>
              <input
                type="range"
                min={calculator.min}
                max={calculator.max}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="absolute opacity-0 pointer-events-none"
                aria-label={calculator.inputLabel}
              />
              {/* Custom range using native but styled */}
              <input
                type="range"
                min={calculator.min}
                max={calculator.max}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full mt-[-8px] opacity-0 absolute"
                style={{ height: "24px" }}
                aria-hidden="true"
              />
              {/* Clickable overlay range */}
              <div className="relative -mt-5">
                <input
                  type="range"
                  min={calculator.min}
                  max={calculator.max}
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full cursor-pointer appearance-none bg-transparent h-5"
                  style={{
                    WebkitAppearance: "none",
                    appearance: "none",
                  }}
                  aria-label={calculator.inputLabel}
                />
              </div>

              {/* Ticks */}
              <div className="mt-2 flex justify-between text-xs text-slate-400">
                {calculator.ticks.map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>
            </div>

            {/* Value display */}
            <div className="text-right flex-shrink-0">
              <p className="text-5xl md:text-6xl font-bold text-slate-900">{value}</p>
              <p className="text-sm text-slate-500 uppercase tracking-wide mt-1">WA</p>
            </div>
          </div>

          {/* Results */}
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            {/* Current reality */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <p className="text-xs font-bold text-slate-500 tracking-[0.15em] uppercase mb-4">
                {calculator.resultCards.current.label}
              </p>
              <p className="text-slate-700 mb-3">Dari {value} WA yang masuk:</p>
              <div className="space-y-1 text-slate-700">
                <p>─ <strong>{surveiCount}</strong> lanjut ke survei</p>
                <p>─ <strong>{dealCount}</strong> yang jadi deal</p>
              </div>
              <p className="text-slate-600 italic mt-3">{calculator.resultCards.current.closing}</p>
            </div>

            {/* Potential */}
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
              <p className="text-xs font-bold text-emerald-700 tracking-[0.15em] uppercase mb-4">
                {calculator.resultCards.potential.label}
              </p>
              <p className="text-sm text-slate-600 italic mb-4">
                {calculator.resultCards.potential.sub}
              </p>
              <p className="text-sm text-slate-600 mb-2">
                {calculator.resultCards.potential.potentialLabel}
              </p>
              <p className="text-3xl md:text-4xl font-bold text-emerald-700">
                +{potentialCount > 0 ? potentialCount : 0} proyek/bulan
              </p>
            </div>
          </div>

          {/* Closing statement */}
          <div className="mt-8 text-center max-w-lg mx-auto">
            <p className="text-sm text-slate-500 italic">{calculator.closingStatement}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
