"use client";

import { motion } from "framer-motion";
import { Check, Clock3, Gift, Sparkles } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";
import { EditableText } from "@/components/shared/EditableText";
import { scrollToPricingSection } from "@/lib/hooks/useLandingCta";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";

export function UrgencySection() {
  const { content } = useContentStore();
  const { urgency } = content;
  const { isAdmin, isEditMode } = useLandingAdmin();

  const claimOffer = () => {
    if (isAdmin && isEditMode) return;
    scrollToPricingSection();
  };

  return (
    <section id="promo-launch" className="bg-slate-50 py-12 md:py-20">
      <Container className="content-max">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] border-4 border-emerald-300 bg-white px-5 py-10 text-center shadow-[0_0_32px_rgba(16,185,129,0.18)] md:px-12 md:py-16"
        >
          <span className="inline-flex rounded-full bg-emerald-100 px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
            <EditableText section="urgency" field="badge" value={urgency.badge} />
          </span>
          <h2 className="mx-auto mt-7 max-w-3xl text-4xl font-black uppercase leading-tight tracking-tight text-slate-900 md:text-6xl">
            <EditableText section="urgency" field="title" value={urgency.title} />
          </h2>
          <p className="mt-5 text-base font-semibold leading-relaxed text-slate-600 md:text-lg">
            <EditableText section="urgency" field="narrative" value={urgency.narrative} multiline />
          </p>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-emerald-700 md:text-sm">
            <EditableText section="urgency" field="subtitle" value={urgency.subtitle} multiline />
          </p>

          {(isAdmin && isEditMode) ? (
            <div className="mx-auto mt-10 max-w-3xl rounded-[30px] border-2 border-dashed border-slate-400 bg-slate-900 p-6 text-left text-white shadow-xl">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-emerald-300">Konten promo — edit semua field</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-300">Harga coret<EditableText section="urgency" field="normalPrice" value={urgency.normalPrice} className="mt-1 block text-base" /></label>
                <label className="text-xs font-semibold text-slate-300">Harga Standard<EditableText section="urgency" field="launchPrice" value={urgency.launchPrice} className="mt-1 block text-base" /></label>
                <label className="text-xs font-semibold text-slate-300">Nama paket<EditableText section="urgency" field="productTitle" value={urgency.productTitle} className="mt-1 block text-base" /></label>
                <label className="text-xs font-semibold text-slate-300">Badge<EditableText section="urgency" field="badge" value={urgency.badge} className="mt-1 block text-base" /></label>
                <label className="text-xs font-semibold text-slate-300">Judul<EditableText section="urgency" field="title" value={urgency.title} className="mt-1 block text-base" /></label>
                <label className="text-xs font-semibold text-slate-300">Subjudul<EditableText section="urgency" field="subtitle" value={urgency.subtitle} className="mt-1 block text-base" multiline /></label>
                <label className="text-xs font-semibold text-slate-300">Narasi<EditableText section="urgency" field="narrative" value={urgency.narrative} className="mt-1 block text-base" multiline /></label>
                <label className="text-xs font-semibold text-slate-300">Ringkasan paket<EditableText section="urgency" field="productSummary" value={urgency.productSummary} className="mt-1 block text-base" multiline /></label>
                <label className="text-xs font-semibold text-slate-300">Bonus / benefit<EditableText section="urgency" field="bonusText" value={urgency.bonusText} className="mt-1 block text-base" multiline /></label>
                <label className="text-xs font-semibold text-slate-300">Teks tombol<EditableText section="urgency" field="ctaText" value={urgency.ctaText} className="mt-1 block text-base" /></label>
                <label className="text-xs font-semibold text-slate-300">Label akses<EditableText section="urgency" field="accessText" value={urgency.accessText} className="mt-1 block text-base" /></label>
                <label className="text-xs font-semibold text-slate-300">Label bonus<EditableText section="urgency" field="bonusAccessText" value={urgency.bonusAccessText} className="mt-1 block text-base" /></label>
                <label className="text-xs font-semibold text-slate-300">Label promo<EditableText section="urgency" field="limitedBadge" value={urgency.limitedBadge} className="mt-1 block text-base" multiline /></label>
              </div>
            </div>
          ) : (
          <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-[30px] bg-slate-900 text-white shadow-xl">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-500" />
            <div className="px-6 py-8 md:px-12 md:py-10">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">
                <EditableText section="urgency" field="productTitle" value={urgency.productTitle} />
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
                <EditableText section="urgency" field="productSummary" value={urgency.productSummary} multiline />
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-5">
                <span className="text-xl font-bold text-slate-400 line-through">
                  <EditableText section="urgency" field="normalPrice" value={urgency.normalPrice} />
                </span>
                <span className="text-4xl font-black text-emerald-400 md:text-5xl">
                  <EditableText section="urgency" field="launchPrice" value={urgency.launchPrice} />
                </span>
              </div>
              <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-300">
                <Gift className="h-4 w-4 shrink-0" />
                <EditableText section="urgency" field="bonusText" value={urgency.bonusText} multiline />
              </div>
              <button
                type="button"
                onClick={claimOffer}
                className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 px-6 py-4 text-base font-black text-white shadow-lg shadow-emerald-600/25 transition hover:brightness-110 sm:w-auto sm:min-w-72"
              >
                <Sparkles className="h-5 w-5 shrink-0" />
                <EditableText section="urgency" field="ctaText" value={urgency.ctaText} />
              </button>
              <p className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                <Clock3 className="h-4 w-4 shrink-0" />
                <EditableText section="urgency" field="limitedBadge" value={urgency.limitedBadge} multiline />
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <EditableText section="urgency" field="accessText" value={urgency.accessText} />
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <EditableText section="urgency" field="bonusAccessText" value={urgency.bonusAccessText} />
                </span>
              </div>
            </div>
          </div>
          )}
        </motion.div>
      </Container>
    </section>
  );
}
