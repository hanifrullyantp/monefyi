"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, CircleMinus } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { cn } from "@/lib/utils/cn";
import {
  COMPARISON_ROWS,
  COMPARISON_SECTION,
  getPrimaryComparisonRows,
  getSecondaryComparisonRows,
  type ComparisonBenefitRow,
} from "@/lib/content/comparison.config";
import { trackEvent } from "@/lib/analytics/events";
import { getActiveHeroCopy } from "@/lib/content/heroCopy";
import { FREE_PLAN_ENABLED } from "@/lib/content/heroCopy";
import { useAuthStore } from "@/lib/store/authStore";
import { navigateToPlannerApp, plannerAppPath } from "@/lib/config/plannerApp";

function variantId(): string {
  try {
    return getActiveHeroCopy().id;
  } catch {
    return "default";
  }
}

function SoonBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-amber-700/30 bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-950">
      Segera
    </span>
  );
}

function EstimatorCell({ row }: { row: ComparisonBenefitRow }) {
  if (row.status === "soon") {
    return (
      <div className="flex flex-wrap items-start gap-2 text-left">
        <SoonBadge />
        <p className="text-[15px] md:text-base font-semibold text-[var(--ink)] leading-snug min-w-0 flex-1">
          {row.new}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 text-left">
      <Check
        className="w-4 h-4 shrink-0 mt-0.5 text-[var(--brand-600)]"
        aria-hidden
      />
      <p className="text-[15px] md:text-base font-semibold text-[var(--ink)] leading-snug">
        {row.new}
      </p>
    </div>
  );
}

function OldCell({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-left">
      <CircleMinus
        className={cn(
          "shrink-0 text-slate-400",
          compact ? "w-3.5 h-3.5 mt-1" : "w-4 h-4 mt-0.5",
        )}
        aria-hidden
      />
      <p
        className={cn(
          "text-[var(--muted)] leading-relaxed",
          compact ? "text-[15px] font-medium" : "text-[15px] md:text-base font-medium",
        )}
      >
        {text}
      </p>
    </div>
  );
}

function ComparisonCard({
  row,
  index,
  reducedMotion,
}: {
  row: ComparisonBenefitRow;
  index: number;
  reducedMotion: boolean;
}) {
  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: reducedMotion ? 0 : index * 0.06 }}
      className="rounded-2xl border border-[var(--surface-alt)] bg-white p-4 shadow-sm"
    >
      <h3 className="text-base font-extrabold text-[var(--ink)] mb-4 leading-snug">
        {row.situation}
      </h3>
      <div className="space-y-4">
        <div className="min-h-[44px]">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
            {COMPARISON_SECTION.mobileLabels.old}
          </p>
          <OldCell text={row.old} compact />
        </div>
        <div className="min-h-[44px] rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-600)] mb-1.5">
            {COMPARISON_SECTION.mobileLabels.new}
          </p>
          <EstimatorCell row={row} />
        </div>
      </div>
    </motion.article>
  );
}

export function ComparisonSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const viewedRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const reducedMotion = useReducedMotion();
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const primary = getPrimaryComparisonRows();
  const secondary = getSecondaryComparisonRows();
  const visibleRows = expanded ? COMPARISON_ROWS : primary;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || viewedRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          viewedRef.current = true;
          trackEvent("comparison_view", { variant_id: variantId() });
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      if (next) {
        trackEvent("comparison_expand", { variant_id: variantId() });
      }
      return next;
    });
  }, []);

  const handleCta = useCallback(() => {
    trackEvent("comparison_cta_click", { variant_id: variantId() });
    if (hydrated && isAuthenticated) {
      navigateToPlannerApp("/app/estimator");
      return;
    }
    if (FREE_PLAN_ENABLED) {
      trackEvent("free_signup", { source: "comparison", variant_id: variantId() });
      window.location.href = plannerAppPath("/app/estimator?plan=free");
      return;
    }
    const pricing = document.getElementById("harga");
    pricing?.scrollIntoView({ behavior: "smooth" });
  }, [hydrated, isAuthenticated]);

  const rowMotion = (i: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-20px" },
          transition: { duration: 0.3, delay: i * 0.05 },
        };

  return (
    <section
      id="perbandingan"
      ref={sectionRef}
      className="section-pad bg-white"
      aria-labelledby="comparison-heading"
    >
      <Container className="content-max">
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
          <span className="inline-block bg-[var(--surface-soft)] text-[var(--brand-600)] rounded-full px-4 py-1.5 text-[10px] font-black tracking-[0.2em] uppercase mb-4">
            {COMPARISON_SECTION.badge}
          </span>
          <h2
            id="comparison-heading"
            className="text-2xl md:text-4xl font-extrabold text-[var(--ink)] tracking-tight leading-[1.15] mb-3"
          >
            {COMPARISON_SECTION.title}
          </h2>
          <p className="text-[15px] md:text-lg text-[var(--muted)] font-medium leading-relaxed">
            {COMPARISON_SECTION.subtitle}
          </p>
        </div>

        {/* Desktop table — md+ only (no horizontal scroll) */}
        <div className="hidden md:block rounded-2xl border border-[var(--surface-alt)] shadow-sm overflow-hidden">
          <div className="max-h-[min(70vh,640px)] overflow-y-auto overscroll-contain">
            <table className="w-full table-fixed border-collapse bg-white">
              <caption className="sr-only">
                Perbandingan situasi kerja: cara lama versus Monefyi Estimator
              </caption>
              <colgroup>
                <col style={{ width: "24%" }} />
                <col style={{ width: "38%" }} />
                <col style={{ width: "38%" }} />
              </colgroup>
              <thead className="sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                <tr>
                  <th
                    scope="col"
                    className="py-4 px-5 text-left text-sm font-bold text-white bg-slate-800"
                  >
                    {COMPARISON_SECTION.columnHeaders.situation}
                  </th>
                  <th
                    scope="col"
                    className="py-4 px-5 text-left text-sm font-bold text-slate-800 bg-slate-100 border-b border-slate-200"
                  >
                    {COMPARISON_SECTION.columnHeaders.old}
                  </th>
                  <th
                    scope="col"
                    className="py-4 px-5 text-left text-sm font-bold text-white bg-[var(--brand-600)] border-t-2 border-x-2 border-[var(--brand-600)]"
                  >
                    {COMPARISON_SECTION.columnHeaders.new}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    {...rowMotion(i)}
                    className="border-b border-slate-100 last:border-b-0 align-top"
                  >
                    <th
                      scope="row"
                      className="py-4 px-5 text-[15px] font-bold text-[var(--ink)] text-left bg-white"
                    >
                      {row.situation}
                    </th>
                    <td className="py-4 px-5 bg-slate-50/30">
                      <OldCell text={row.old} />
                    </td>
                    <td className="py-4 px-5 bg-emerald-50/50 border-x-2 border-[var(--brand-600)]/25">
                      <EstimatorCell row={row} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4">
          {visibleRows.map((row, i) => (
            <ComparisonCard
              key={row.id}
              row={row}
              index={i}
              reducedMotion={Boolean(reducedMotion)}
            />
          ))}
        </div>

        {secondary.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={toggleExpand}
              aria-expanded={expanded}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[var(--surface-alt)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--brand-600)] shadow-sm touch-manipulation hover:bg-[var(--surface-soft)] transition-colors"
            >
              {expanded ? COMPARISON_SECTION.collapseLabel : COMPARISON_SECTION.expandLabel}
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-300",
                  expanded && "rotate-180",
                  reducedMotion && "transition-none",
                )}
              />
            </button>
          </div>
        )}

        <div className="mt-10 md:mt-12 text-center max-w-xl mx-auto">
          <p className="text-[15px] md:text-base text-[var(--muted)] font-medium leading-relaxed mb-6">
            {COMPARISON_SECTION.closingLine}
          </p>
          <button
            type="button"
            onClick={handleCta}
            className="btn-brand inline-flex min-h-[48px] min-w-[200px] items-center justify-center rounded-full px-8 text-base font-bold touch-manipulation shadow-lg shadow-[var(--brand-600)]/25"
          >
            {COMPARISON_SECTION.ctaLabel}
          </button>
        </div>
      </Container>
    </section>
  );
}
