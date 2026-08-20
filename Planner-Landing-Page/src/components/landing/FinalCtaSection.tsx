"use client";
import { ArrowRight } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { useInView } from "@/lib/hooks/useInView";
import { cn } from "@/lib/utils/cn";

export function FinalCtaSection() {
  const { content } = useContentStore();
  const { finalCta } = content;
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.2 });

  const scrollTo = (target: string) => {
    const id = target.replace("#", "");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-32 md:py-40 bg-white">
      <div
        ref={ref}
        className={cn(
          "max-w-3xl mx-auto px-6 text-center transition-all duration-600",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
      >
        <h2 className="text-4xl md:text-6xl font-bold text-slate-900 leading-[1.1] tracking-tight whitespace-pre-line">
          {finalCta.title}
        </h2>

        <p className="text-lg md:text-xl text-slate-500 mt-8 leading-relaxed max-w-xl mx-auto whitespace-pre-line">
          {finalCta.description}
        </p>

        {/* CTA Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => scrollTo(finalCta.ctaPrimary.target)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-semibold text-base shadow-xl shadow-slate-900/20 transition-all duration-200"
          >
            {finalCta.ctaPrimary.text}
          </button>
          <button
            onClick={() => scrollTo(finalCta.ctaSecondary.target)}
            className="text-slate-700 hover:text-emerald-600 font-medium px-8 py-4 inline-flex items-center gap-1 transition-colors"
          >
            {finalCta.ctaSecondary.text}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Trust line */}
        <div className="mt-12">
          <p className="text-sm text-slate-400">{finalCta.trustLine}</p>
        </div>
      </div>
    </section>
  );
}
