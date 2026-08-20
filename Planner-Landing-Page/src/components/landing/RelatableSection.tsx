"use client";
import { useState } from "react";
import { Check, ArrowDown } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { useInView } from "@/lib/hooks/useInView";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { cn } from "@/lib/utils/cn";

export function RelatableSection() {
  const { content } = useContentStore();
  const { relatable } = content;
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [headerRef, headerInView] = useInView<HTMLDivElement>({ threshold: 0.2 });

  const count = checked.size;

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const getCounterMessage = () => {
    const msg = relatable.counterMessages[String(count)];
    return msg ?? relatable.counterMessages["0"] ?? "Klik yang kamu alami di atas";
  };

  const scrollTo = (target: string) => {
    const id = target.replace("#", "");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div
          ref={headerRef}
          className={cn(
            "text-center max-w-2xl mx-auto transition-all duration-500",
            headerInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <p className="text-xs font-semibold text-emerald-600 tracking-[0.2em] uppercase">
            {relatable.label}
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 leading-[1.15] tracking-tight mt-6">
            {relatable.title}
          </h2>
          <p className="text-lg text-slate-500 mt-6 leading-relaxed">{relatable.subtitle}</p>
        </div>

        {/* Problem Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4">
          {relatable.problems.map((problem, i) => {
            const isChecked = checked.has(i);
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={cn(
                  "bg-white border-2 rounded-2xl p-5 cursor-pointer transition-all duration-200 text-left flex items-start gap-4",
                  isChecked
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                )}
                aria-pressed={isChecked}
              >
                {/* Custom checkbox */}
                <div
                  className={cn(
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200",
                    isChecked
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-300 bg-white"
                  )}
                >
                  {isChecked && <Check className="w-4 h-4 text-white" />}
                </div>
                <span
                  className={cn(
                    "font-medium leading-relaxed",
                    isChecked ? "text-emerald-900" : "text-slate-700"
                  )}
                >
                  {problem}
                </span>
              </button>
            );
          })}
        </div>

        {/* Counter */}
        <div className="mt-12 text-center">
          <p className="text-3xl md:text-4xl font-bold text-slate-900">
            <AnimatedCounter target={count} /> dari {relatable.problems.length} Masalah Terpilih
          </p>
          <p className="text-base text-slate-500 mt-3">{getCounterMessage()}</p>

          {/* CTA — muncul kalau >= threshold */}
          {count >= (relatable.ctaThreshold ?? 3) && (
            <div className="mt-8 animate-fadeInUp">
              <button
                onClick={() => scrollTo(relatable.ctaTarget)}
                className="text-slate-900 hover:text-emerald-600 font-semibold inline-flex items-center gap-2 transition-colors"
              >
                {relatable.ctaText}
                <ArrowDown className="w-4 h-4 animate-bounce" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
