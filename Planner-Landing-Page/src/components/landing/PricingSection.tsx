"use client";
import { Check, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { useInView } from "@/lib/hooks/useInView";
import { cn } from "@/lib/utils/cn";
import { useLandingCta } from "@/lib/hooks/useLandingCta";

export function PricingSection() {
  const { content } = useContentStore();
  const { pricing } = content;
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.1 });
  const { label, handleCtaClick } = useLandingCta();

  return (
    <section id="harga" className="py-24 md:py-32 bg-slate-50">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-emerald-600 tracking-[0.2em] uppercase">
            {pricing.label}
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 leading-[1.15] tracking-tight mt-6 whitespace-pre-line">
            {pricing.title}
          </h2>
          <p className="text-lg text-slate-500 mt-6 leading-relaxed">{pricing.subtitle}</p>
        </div>

        {/* Cards */}
        <div
          ref={ref}
          className={cn(
            "mt-16 grid md:grid-cols-2 gap-6 transition-all duration-500",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {pricing.plans.map((plan) => {
            const isDark = plan.theme === "dark";
            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-3xl p-8 md:p-10 relative transition-all duration-300",
                  isDark
                    ? "bg-slate-900 text-white border border-slate-800"
                    : "bg-white border border-slate-200 hover:border-slate-300"
                )}
              >
                {/* Recommended badge */}
                {plan.recommended && plan.badgeText && (
                  <div className="absolute -top-3 left-8">
                    <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      {plan.badgeText}
                    </span>
                  </div>
                )}

                {/* Label */}
                <p className={cn(
                  "text-xs font-bold tracking-[0.2em] uppercase",
                  isDark ? "text-emerald-400" : "text-slate-500"
                )}>
                  {plan.label}
                </p>

                {/* Name */}
                <h3 className={cn("text-2xl font-bold mt-3", isDark ? "text-white" : "text-slate-900")}>
                  {plan.name}
                </h3>
                <p className={cn("text-sm mt-2", isDark ? "text-slate-400" : "text-slate-500")}>
                  {plan.description}
                </p>

                {/* Divider */}
                <div className={cn("mt-8 pt-8 border-t", isDark ? "border-slate-800" : "border-slate-100")} />

                {/* Price */}
                <div className="space-y-1">
                  {plan.priceOriginalDisplay && (
                    <p className={cn("text-base line-through", isDark ? "text-slate-500" : "text-slate-400")}>
                      {plan.priceOriginalDisplay}
                    </p>
                  )}
                  <p className={cn("text-4xl font-bold", isDark ? "text-white" : "text-slate-900")}>
                    {plan.priceDisplay}
                  </p>
                  <p className={cn("text-sm mt-2", isDark ? "text-slate-400" : "text-slate-500")}>
                    {plan.priceSubtitle}
                  </p>
                </div>

                {/* Divider */}
                <div className={cn("mt-8 pt-8 border-t", isDark ? "border-slate-800" : "border-slate-100")} />

                {/* Features */}
                <div className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className={cn("w-5 h-5 mt-0.5 flex-shrink-0", isDark ? "text-emerald-400" : "text-emerald-600")} />
                      <span className={cn("text-sm leading-relaxed", isDark ? "text-slate-300" : "text-slate-700")}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <div className="mt-10">
                  <button
                    type="button"
                    onClick={handleCtaClick}
                    className={cn(
                      "block w-full text-center rounded-xl py-4 font-semibold transition-all duration-200",
                      plan.cta.variant === "primary"
                        ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30"
                        : "bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white",
                    )}
                  >
                    {label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust line */}
        <div className="mt-10 text-center flex items-center justify-center gap-2 text-sm text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          {pricing.trustLine}
        </div>

        {/* Enterprise */}
        <div className="mt-16 pt-12 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">{pricing.enterprise.text}</p>
          <a
            href={pricing.enterprise.linkTarget}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold text-sm transition-colors"
          >
            {pricing.enterprise.linkText}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
