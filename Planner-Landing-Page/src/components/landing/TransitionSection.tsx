"use client";
import { ArrowDown } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { useInView } from "@/lib/hooks/useInView";
import { cn } from "@/lib/utils/cn";

export function TransitionSection() {
  const { content } = useContentStore();
  const { transition } = content;
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.2 });

  const scrollTo = (target: string) => {
    const id = target.replace("#", "");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight) return text;
    const parts = text.split(highlight);
    return parts.map((part, i) =>
      i < parts.length - 1 ? (
        <span key={i}>
          {part}
          <span className="text-emerald-600 font-semibold">{highlight}</span>
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <section className="py-20 md:py-24 bg-slate-50">
      <div
        ref={ref}
        className={cn(
          "max-w-3xl mx-auto px-6 text-center transition-all duration-500",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight tracking-tight">
          {transition.title}
        </h2>

        <div className="mt-8 space-y-4">
          {transition.paragraphs.map((para, i) => (
            <p key={i} className="text-lg text-slate-600 leading-[1.7]">
              {highlightText(para, transition.highlightedText)}
            </p>
          ))}
        </div>

        <div className="mt-10">
          <button
            onClick={() => scrollTo(transition.ctaTarget)}
            className="text-slate-700 hover:text-emerald-600 font-medium inline-flex items-center gap-2 transition-colors"
          >
            {transition.ctaText}
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
}
