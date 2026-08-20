"use client";
import { Check, Zap, Clock, RefreshCw } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { useInView } from "@/lib/hooks/useInView";
import { cn } from "@/lib/utils/cn";
import { WhatsAppMockup } from "./mockups/WhatsAppMockup";
import { EstimatorMockup } from "./mockups/EstimatorMockup";
import { DashboardMockup } from "./mockups/DashboardMockup";
import type { LucideIcon } from "lucide-react";

const badgeIconMap: Record<string, LucideIcon> = { Zap, Clock, RefreshCw };

function FloatingBadge({
  icon,
  text,
  position,
}: {
  icon: string;
  text: string;
  position: string;
}) {
  const Icon = badgeIconMap[icon] ?? Zap;
  return (
    <div
      className={cn(
        "absolute bg-white shadow-lg rounded-full px-4 py-2 border border-slate-100 flex items-center gap-2 animate-float z-10",
        position
      )}
    >
      <Icon className="w-4 h-4 text-emerald-600" />
      <span className="text-xs font-semibold text-slate-700">{text}</span>
    </div>
  );
}

function MomentContent({
  number,
  label,
  title,
  description,
  points,
}: {
  number: string;
  label: string;
  title: string;
  description: string;
  points: string[];
}) {
  return (
    <div>
      {/* Label */}
      <div className="inline-flex items-center gap-3">
        <span className="text-xs font-bold text-emerald-600 tracking-[0.2em] uppercase">
          {number} — {label}
        </span>
        <div className="w-8 h-px bg-emerald-600" />
      </div>

      {/* Title */}
      <h3 className="text-2xl md:text-4xl font-bold text-slate-900 leading-[1.15] tracking-tight mt-4 whitespace-pre-line">
        {title}
      </h3>

      {/* Description */}
      <p className="text-base md:text-lg text-slate-600 leading-relaxed mt-6">{description}</p>

      {/* Points */}
      <div className="mt-8 space-y-3">
        {points.map((point, i) => (
          <div key={i} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span className="text-sm md:text-base text-slate-700">{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductShowcaseSection() {
  const { content } = useContentStore();
  const { productShowcase } = content;
  const [ref1, inView1] = useInView<HTMLDivElement>({ threshold: 0.1 });
  const [ref2, inView2] = useInView<HTMLDivElement>({ threshold: 0.1 });
  const [ref3, inView3] = useInView<HTMLDivElement>({ threshold: 0.1 });

  const moment0 = productShowcase.moments[0];
  const moment1 = productShowcase.moments[1];
  const moment2 = productShowcase.moments[2];

  return (
    <section id="bagaimana" className="py-24 md:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-emerald-600 tracking-[0.2em] uppercase">
            {productShowcase.label}
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 leading-[1.15] tracking-tight mt-6 whitespace-pre-line">
            {productShowcase.title}
          </h2>
          <p className="text-lg text-slate-500 mt-6 leading-relaxed">{productShowcase.subtitle}</p>
        </div>

        {/* Moments */}
        <div className="mt-20 md:mt-24 space-y-24 md:space-y-32">
          {/* Moment 01 — Text left, Visual right */}
          {moment0 && (
            <div
              ref={ref1}
              className={cn(
                "grid md:grid-cols-2 gap-12 lg:gap-20 items-center transition-all duration-600",
                inView1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
            >
              <MomentContent
                number={moment0.number}
                label={moment0.label}
                title={moment0.title}
                description={moment0.description}
                points={moment0.points}
              />
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-white rounded-3xl -m-6 -z-10" />
                <WhatsAppMockup />
                <FloatingBadge
                  icon={moment0.floatingBadge.icon}
                  text={moment0.floatingBadge.text}
                  position="-top-4 -right-4"
                />
              </div>
            </div>
          )}

          {/* Moment 02 — Visual left, Text right */}
          {moment1 && (
            <div
              ref={ref2}
              className={cn(
                "grid md:grid-cols-2 gap-12 lg:gap-20 items-center transition-all duration-600",
                inView2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
            >
              <div className="relative order-2 md:order-1">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white rounded-3xl -m-6 -z-10" />
                <EstimatorMockup />
                <FloatingBadge
                  icon={moment1.floatingBadge.icon}
                  text={moment1.floatingBadge.text}
                  position="-bottom-4 -left-4"
                />
              </div>
              <div className="order-1 md:order-2">
                <MomentContent
                  number={moment1.number}
                  label={moment1.label}
                  title={moment1.title}
                  description={moment1.description}
                  points={moment1.points}
                />
              </div>
            </div>
          )}

          {/* Moment 03 — Text left, Visual right */}
          {moment2 && (
            <div
              ref={ref3}
              className={cn(
                "grid md:grid-cols-2 gap-12 lg:gap-20 items-center transition-all duration-600",
                inView3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
            >
              <MomentContent
                number={moment2.number}
                label={moment2.label}
                title={moment2.title}
                description={moment2.description}
                points={moment2.points}
              />
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-white rounded-3xl -m-6 -z-10" />
                <DashboardMockup />
                <FloatingBadge
                  icon={moment2.floatingBadge.icon}
                  text={moment2.floatingBadge.text}
                  position="top-4 -right-4"
                />
              </div>
            </div>
          )}
        </div>

        {/* Closing Statement */}
        <div className="mt-24 md:mt-32 text-center max-w-2xl mx-auto">
          <p className="text-lg text-slate-500 italic leading-relaxed">
            {productShowcase.closingStatement}
          </p>
        </div>
      </div>
    </section>
  );
}
