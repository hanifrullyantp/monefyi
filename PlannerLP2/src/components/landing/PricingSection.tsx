"use client";

import { motion } from "framer-motion";
import { Check, X, Star } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { cn } from "@/lib/utils/cn";
import { useLandingCta } from "@/lib/hooks/useLandingCta";
import {
  ESTIMATOR_PLANS,
  PRICING_FOOTNOTE,
  formatIdr,
  type EstimatorPlanId,
} from "@/lib/pricing/plans";
import { trackEvent } from "@/lib/analytics/events";
import { plannerAppPath } from "@/lib/config/plannerApp";

export function PricingSection() {
  const { startCheckout } = useLandingCta();

  const onCta = (planId: EstimatorPlanId) => {
    trackEvent("checkout_start", { plan: planId });
    if (planId === "free") {
      window.location.href = plannerAppPath("/app/estimator?plan=free");
      return;
    }
    void startCheckout(planId);
  };

  return (
    <section id="harga" className="section-pad bg-[var(--surface-dark)] text-white">
      <Container className="content-max">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="inline-block bg-[var(--accent-warm)] text-[var(--ink)] rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase mb-4">
            Paket
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Pilih paket yang cocok buat bisnismu
          </h2>
          <p className="text-[var(--brand-400)] text-base md:text-lg">
            Sekali bayar. Tanpa langganan bulanan. Mulai gratis kalau mau coba dulu.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-8">
          {ESTIMATOR_PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "rounded-2xl p-6 md:p-8 flex flex-col relative",
                plan.highlighted
                  ? "bg-white text-[var(--ink)] border-2 border-[var(--brand-600)] shadow-2xl md:-translate-y-2"
                  : "bg-white/5 border border-white/10 text-white",
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-[var(--accent-warm)] text-[var(--ink)] px-4 py-1.5 rounded-full text-xs font-bold shadow">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {plan.badge}
                  </span>
                </div>
              )}

              {!plan.popular && (
                <span
                  className={cn(
                    "inline-block text-[10px] font-bold rounded-full px-3 py-1 mb-3 w-fit",
                    plan.highlighted ? "bg-[var(--surface-alt)] text-[var(--muted)]" : "bg-white/10 text-[var(--brand-400)]",
                  )}
                >
                  {plan.badge}
                </span>
              )}

              {plan.popular && <div className="h-4" />}

              <h3 className="text-xl font-extrabold mb-1">{plan.title}</h3>
              <p className={cn("text-sm mb-4", plan.highlighted ? "text-[var(--muted)]" : "text-white/70")}>
                {plan.fitFor}
              </p>

              <div className="mb-2">
                <span className="text-3xl md:text-4xl font-black tracking-tight">
                  {formatIdr(plan.priceIdr)}
                </span>
                <span className={cn("block text-xs mt-1 font-semibold", plan.highlighted ? "text-[var(--muted)]" : "text-white/50")}>
                  {plan.pricePeriod} · {plan.priceNote}
                </span>
              </div>

              <ul className="space-y-2 my-6 flex-1">
                {plan.whyChoose.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm font-medium">
                    <Check className={cn("w-4 h-4 mt-0.5 shrink-0", plan.highlighted ? "text-[var(--brand-600)]" : "text-[var(--brand-400)]")} />
                    {w}
                  </li>
                ))}
              </ul>

              <details className={cn("mb-4 text-sm", plan.highlighted ? "text-[var(--muted)]" : "text-white/60")}>
                <summary className="cursor-pointer font-semibold list-none underline-offset-2 hover:underline">
                  Lihat semua fitur
                </summary>
                <ul className="mt-3 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2">
                      {f.included ? (
                        <Check className="w-4 h-4 mt-0.5 text-[var(--brand-600)] shrink-0" />
                      ) : (
                        <X className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                      )}
                      <span className={!f.included ? "opacity-50" : ""}>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </details>

              <button
                type="button"
                onClick={() => onCta(plan.id)}
                className={cn(
                  "w-full min-h-[48px] rounded-xl font-bold text-sm md:text-base transition-colors",
                  plan.highlighted
                    ? "btn-brand"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20",
                )}
              >
                {plan.ctaText}
              </button>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-white/50 max-w-xl mx-auto">{PRICING_FOOTNOTE}</p>
      </Container>
    </section>
  );
}
