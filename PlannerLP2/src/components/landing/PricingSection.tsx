"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Star, Plus, Trash2 } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { EditableText } from "@/components/shared/EditableText";
import { useContentStore } from "@/lib/store/contentStore";
import { cn } from "@/lib/utils/cn";
import { useLandingCta } from "@/lib/hooks/useLandingCta";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
import { trackEvent } from "@/lib/analytics/events";
import { plannerAppPath } from "@/lib/config/plannerApp";
import { resolvePaymentProvider } from "@/lib/checkout/paymentProvider";
import type { PricingCard } from "@/lib/types/content";

function useMdUp() {
  const [mdUp, setMdUp] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setMdUp(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mdUp;
}

export function PricingSection() {
  const { content, updateField, publishContent } = useContentStore();
  const { pricing } = content;
  const { startCheckout } = useLandingCta();
  const { isAdmin, isEditMode } = useLandingAdmin();
  const isMdUp = useMdUp();
  const [desktopFeaturesOpen, setDesktopFeaturesOpen] = useState(false);

  const activeProvider = resolvePaymentProvider(pricing.plannerPaymentProvider);

  const onCta = (planId: string) => {
    if (isAdmin && isEditMode) return;
    if (planId === "free") {
      trackEvent("free_signup", { source: "pricing_free" });
      window.location.href = "/checkout?plan=free";
      return;
    }
    if (planId === "estimator-standard" || planId === "estimator-pro") {
      void startCheckout(planId);
    }
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
            <EditableText section="pricing" field="badge" value={pricing.badge} />
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            <EditableText section="pricing" field="title" value={pricing.title} />
          </h2>
          <p className="text-[var(--brand-400)] text-base md:text-lg">
            <EditableText section="pricing" field="subtitle" value={pricing.subtitle} multiline />
          </p>
        </motion.div>

        {/* Admin Switcher: Lynk vs Mayar */}
        {isAdmin && (
          <div className="mb-8 p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10 max-w-md mx-auto text-center space-y-2.5 shadow-lg">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Admin: Pilih Payment Provider Halaman Ini</span>
            </div>
            <div className="inline-flex p-1 bg-black/40 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  updateField("pricing", "plannerPaymentProvider", "lynk");
                  void publishContent();
                }}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  activeProvider === "lynk"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-white/60 hover:text-white"
                )}
              >
                Lynk.id (Lama)
              </button>
              <button
                type="button"
                onClick={() => {
                  updateField("pricing", "plannerPaymentProvider", "mayar");
                  void publishContent();
                }}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  activeProvider === "mayar"
                    ? "bg-[#065f46] text-white shadow-sm ring-1 ring-emerald-400/50"
                    : "text-white/60 hover:text-white"
                )}
              >
                <span>Mayar (Checkout Baru)</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
              </button>
            </div>
            <p className="text-[11px] text-white/50">
              Aktif: <strong className="text-white">{activeProvider === "mayar" ? "Mayar (/checkout interaktif)" : "Lynk.id"}</strong>. Pengunjung yang mengklik tombol harga akan dialihkan ke provider ini.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-6 items-stretch mb-8">
          {pricing.cards.map((card, index) => (
            <PricingPlanCard
              key={card.id}
              card={card}
              index={index}
              onCta={onCta}
              syncFeaturesOnDesktop={isMdUp}
              desktopFeaturesOpen={desktopFeaturesOpen}
              onDesktopFeaturesToggle={() => setDesktopFeaturesOpen((open) => !open)}
            />
          ))}
        </div>

        <p className="text-center text-xs text-white/50 max-w-xl mx-auto">
          <EditableText section="pricing" field="footnote" value={pricing.footnote} multiline />
        </p>
      </Container>
    </section>
  );
}

function PricingPlanCard({
  card,
  index,
  onCta,
  syncFeaturesOnDesktop,
  desktopFeaturesOpen,
  onDesktopFeaturesToggle,
}: {
  card: PricingCard;
  index: number;
  onCta: (planId: string) => void;
  syncFeaturesOnDesktop: boolean;
  desktopFeaturesOpen: boolean;
  onDesktopFeaturesToggle: () => void;
}) {
  const { isAdmin, isEditMode } = useLandingAdmin();
  const cardPath = `cards.${index}`;
  const isFree = card.id === "free";
  const highlighted = card.highlighted;
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const featuresOpen = syncFeaturesOnDesktop ? desktopFeaturesOpen : mobileFeaturesOpen;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className={cn(
        "rounded-2xl p-6 md:p-8 flex flex-col relative",
        highlighted
          ? "bg-white text-[var(--ink)] border-2 border-[var(--brand-600)] shadow-2xl md:-translate-y-2"
          : "bg-white/5 border border-white/10 text-white",
      )}
    >
      {isAdmin && isEditMode && (
        <div
          className={cn(
            "mb-4 rounded-xl border border-dashed p-3 text-xs",
            highlighted
              ? "border-emerald-500 bg-slate-50 text-slate-800"
              : "border-emerald-400 bg-slate-900/80 text-slate-100",
          )}
        >
          <p className={cn("mb-2 font-bold uppercase tracking-wide", highlighted ? "text-emerald-700" : "text-emerald-300")}>
            Edit paket
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label>Badge<EditableText section="pricing" field={`${cardPath}.badge`} value={card.badge} className="mt-1 block text-sm" /></label>
            <label>Judul<EditableText section="pricing" field={`${cardPath}.title`} value={card.title} className="mt-1 block text-sm" /></label>
            <label className="sm:col-span-2">Deskripsi<EditableText section="pricing" field={`${cardPath}.subtitle`} value={card.subtitle} className="mt-1 block text-sm" multiline /></label>
            <label>Harga coret<EditableText section="pricing" field={`${cardPath}.originalPrice`} value={card.originalPrice ?? ""} className="mt-1 block text-sm" /></label>
            <label>Harga jual<EditableText section="pricing" field={`${cardPath}.price`} value={card.price} className="mt-1 block text-sm" /></label>
            <label>Periode<EditableText section="pricing" field={`${cardPath}.pricePeriod`} value={card.pricePeriod} className="mt-1 block text-sm" /></label>
            <label>Catatan harga<EditableText section="pricing" field={`${cardPath}.priceNote`} value={card.priceNote ?? ""} className="mt-1 block text-sm" /></label>
            <label className="sm:col-span-2">Badge hemat<EditableText section="pricing" field={`${cardPath}.savingsBadge`} value={card.savingsBadge ?? ""} className="mt-1 block text-sm" /></label>
                <label className="sm:col-span-2">Teks tombol<EditableText section="pricing" field={`${cardPath}.ctaText`} value={card.ctaText} className="mt-1 block text-sm" /></label>
                <label>Badge populer
                  <button type="button" onClick={() => useContentStore.getState().updateField("pricing", `${cardPath}.highlighted`, !card.highlighted)} className="mt-1 block rounded-md bg-white/10 px-2 py-1 text-sm">{card.highlighted ? "Ya" : "Tidak"}</button>
                </label>
          </div>
        </div>
      )}
      {card.badge && (
        <div className={cn(
          "inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-bold shadow w-fit mb-4",
          highlighted ? "bg-[var(--accent-warm)] text-[var(--ink)]" : "bg-white/10 text-[var(--brand-400)]",
        )}>
          {highlighted && <Star className="w-3.5 h-3.5 fill-current" />}
          <EditableText section="pricing" field={`${cardPath}.badge`} value={card.badge} />
        </div>
      )}

      <h3 className="text-xl font-extrabold mb-1">
        <EditableText section="pricing" field={`${cardPath}.title`} value={card.title} />
      </h3>
      <p className={cn("text-sm mb-4", highlighted ? "text-[var(--muted)]" : "text-white/70")}>
        <EditableText section="pricing" field={`${cardPath}.subtitle`} value={card.subtitle} multiline />
      </p>

      <div className="mb-2">
        {card.originalPrice && (
          <p className={cn("text-sm font-semibold line-through", highlighted ? "text-slate-400" : "text-white/50")}>
            <EditableText section="pricing" field={`${cardPath}.originalPrice`} value={card.originalPrice} />
          </p>
        )}
        <span className="text-3xl md:text-4xl font-black tracking-tight">
          <EditableText section="pricing" field={`${cardPath}.price`} value={card.price} />
        </span>
        <span className={cn("block text-xs mt-1 font-semibold", highlighted ? "text-[var(--muted)]" : "text-white/50")}>
          <EditableText section="pricing" field={`${cardPath}.pricePeriod`} value={card.pricePeriod} />
          {card.priceNote && <> · <EditableText section="pricing" field={`${cardPath}.priceNote`} value={card.priceNote} /></>}
        </span>
        {card.savingsBadge && (
          <span className="inline-block mt-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            <EditableText section="pricing" field={`${cardPath}.savingsBadge`} value={card.savingsBadge} />
          </span>
        )}
      </div>

      <ul className="space-y-2 my-6 flex-1">
        {card.whyChoose.map((item, itemIndex) => (
          <li key={`${card.id}-why-${itemIndex}`} className="flex items-start gap-2 text-sm font-medium">
            <Check className={cn("w-4 h-4 mt-0.5 shrink-0", highlighted ? "text-[var(--brand-600)]" : "text-[var(--brand-400)]")} />
            <EditableText section="pricing" field={`${cardPath}.whyChoose.${itemIndex}`} value={item} multiline />
          </li>
        ))}
        {isAdmin && isEditMode && card.features.map((feature, featureIndex) => (
          <li key={`${card.id}-edit-feature-${featureIndex}`} className="flex items-start gap-2 text-xs text-white/80">
            <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-300" />
            <span className="min-w-0 flex-1"><EditableText section="pricing" field={`${cardPath}.features.${featureIndex}.text`} value={feature.text} multiline /></span>
            <button
              type="button"
              aria-label={`Hapus fitur ${feature.text}`}
              onClick={() => {
                const features = card.features.filter((_, currentIndex) => currentIndex !== featureIndex);
                useContentStore.getState().updateField("pricing", `${cardPath}.features`, features);
              }}
              className="ml-auto shrink-0 rounded p-1 text-rose-300 hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {isAdmin && isEditMode && (
          <li>
            <button
              type="button"
              onClick={() => useContentStore.getState().updateField("pricing", `${cardPath}.features`, [...card.features, { text: "Fitur baru", included: true }])}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-emerald-400/60 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Fitur
            </button>
          </li>
        )}
      </ul>

      <details
        open={featuresOpen}
        onToggle={(e) => {
          if (syncFeaturesOnDesktop) return;
          setMobileFeaturesOpen(e.currentTarget.open);
        }}
        className={cn("mb-4 text-sm", highlighted ? "text-[var(--muted)]" : "text-white/60")}
      >
        <summary
          className="cursor-pointer font-semibold list-none underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden"
          onClick={(e) => {
            if (!syncFeaturesOnDesktop) return;
            e.preventDefault();
            onDesktopFeaturesToggle();
          }}
        >
          Lihat semua fitur
        </summary>
        <ul className="mt-3 space-y-2">
          {card.features.map((feature, featureIndex) => (
            <li key={`${card.id}-feature-${featureIndex}`} className="flex items-start gap-2">
              {feature.included ? (
                <Check className="w-4 h-4 mt-0.5 text-[var(--brand-600)] shrink-0" />
              ) : (
                <X className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
              )}
              <span className={cn(!feature.included && "line-through opacity-60")}>
                <EditableText section="pricing" field={`${cardPath}.features.${featureIndex}.text`} value={feature.text} multiline />
              </span>
            </li>
          ))}
        </ul>
      </details>

      <button
        type="button"
        onClick={() => onCta(isFree ? "free" : card.id)}
        className={cn(
          "w-full min-h-[48px] rounded-xl font-bold text-sm md:text-base transition-colors",
          highlighted ? "btn-brand" : "bg-white/10 hover:bg-white/20 text-white border border-white/20",
        )}
      >
        {isAdmin && isEditMode ? card.ctaText : (
          <EditableText section="pricing" field={`${cardPath}.ctaText`} value={card.ctaText} />
        )}
      </button>
    </motion.div>
  );
}
