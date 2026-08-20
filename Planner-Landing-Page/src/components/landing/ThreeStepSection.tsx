"use client";
import { AlertCircle, CheckCircle2, Lightbulb, MessageCircle, MapPin, Hammer } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { useInView } from "@/lib/hooks/useInView";
import { cn } from "@/lib/utils/cn";
import type { Step } from "@/lib/types/content";
import { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  MessageCircle,
  MapPin,
  Hammer,
};

const badgeColorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
};

function StepCard({ step, index }: { step: Step; index: number }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.1 });
  const Icon = iconMap[step.badge.icon] ?? MessageCircle;

  return (
    <div
      ref={ref}
      className={cn(
        "bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-8 md:p-12",
        "grid md:grid-cols-[200px_1fr] gap-8",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        "transition-all duration-500"
      )}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Left — Number + Badge */}
      <div>
        <p className="text-7xl md:text-8xl font-extrabold text-emerald-100 leading-none tracking-tighter select-none">
          {step.number}
        </p>
        <div className="mt-4 inline-flex items-center gap-2">
          <span className={cn("text-xs font-bold tracking-[0.15em] uppercase px-3 py-1.5 rounded-full inline-flex items-center gap-1.5", badgeColorMap[step.badge.color])}>
            <Icon className="w-3 h-3" />
            {step.badge.label}
          </span>
        </div>
      </div>

      {/* Right — Content */}
      <div>
        <h3 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
          {step.title}
        </h3>

        {/* Masalah */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
              MASALAH YANG SERING TERJADI
            </span>
          </div>
          <p className="text-base text-slate-600 leading-relaxed">{step.problem}</p>
        </div>

        {/* Solusi */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-600 tracking-[0.15em] uppercase">
              YANG SEHARUSNYA DILAKUKAN
            </span>
          </div>
          <p className="text-base text-slate-600 leading-relaxed">{step.solution}</p>
        </div>

        {/* Contoh (Step 01) */}
        {step.example && (
          <div className="mt-6 bg-slate-50 border-l-4 border-emerald-500 rounded-r-xl p-5">
            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
              {step.example.label}
            </p>
            <pre className="font-mono text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {step.example.content}
            </pre>
          </div>
        )}

        {/* Kenapa Penting (Step 02) */}
        {step.whyImportant && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-900 mb-3">{step.whyImportant.label}</p>
            <p className="text-sm text-slate-600 mb-4">{step.whyImportant.intro}</p>
            <div className="space-y-2">
              {step.whyImportant.points.map((point, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hasilnya */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-emerald-700 tracking-[0.15em] uppercase">
              HASILNYA
            </span>
          </div>
          <div className="space-y-2">
            {step.results.map((result, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">{result}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Intinya */}
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-emerald-900 leading-relaxed">
              <span className="font-bold">Intinya:</span>{" "}
              <em>{step.intinya}</em>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThreeStepSection() {
  const { content } = useContentStore();
  const { threeStep } = content;

  return (
    <section id="tiga-step" className="py-24 md:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-emerald-600 tracking-[0.2em] uppercase">
            {threeStep.label}
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 leading-[1.15] tracking-tight mt-6">
            {threeStep.title}
          </h2>
          <p className="text-lg text-slate-500 mt-6 leading-relaxed">{threeStep.subtitle}</p>
        </div>

        {/* Steps */}
        <div className="mt-16 md:mt-20 space-y-8">
          {threeStep.steps.map((step, index) => (
            <StepCard key={step.number} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
