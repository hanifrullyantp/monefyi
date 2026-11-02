"use client";

import { motion } from "framer-motion";
import { Check, Clock3, Gift, Sparkles, Users } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";
import { EditableText } from "@/components/shared/EditableText";
import { useLandingCta } from "@/lib/hooks/useLandingCta";

export function UrgencySection() {
  const { content } = useContentStore();
  const { urgency } = content;
  const { isAuthenticated, startCheckout } = useLandingCta();
  const slots = Math.max(0, Math.min(urgency.totalSlots, urgency.usedSlots));
  const progress = urgency.totalSlots > 0 ? (slots / urgency.totalSlots) * 100 : 0;

  const claimOffer = () => {
    if (isAuthenticated) {
      void startCheckout("estimator-standard");
      return;
    }
    document.getElementById("harga")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="promo-launch" className="bg-slate-50 py-12 md:py-20">
      <Container className="content-max">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] border-4 border-rose-300 bg-white px-5 py-10 text-center shadow-[0_0_32px_rgba(244,63,94,0.18)] md:px-12 md:py-16"
        >
          <span className="inline-flex rounded-full bg-rose-100 px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">
            <EditableText section="urgency" field="badge" value={urgency.badge} />
          </span>
          <h2 className="mx-auto mt-7 max-w-3xl text-4xl font-black uppercase leading-tight tracking-tight text-slate-900 md:text-6xl">
            <EditableText section="urgency" field="title" value={urgency.title} />
          </h2>
          <p className="mt-5 text-lg font-black uppercase tracking-wide text-rose-600 md:text-2xl">
            TIDAK KEBAGIAN YA..
          </p>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-slate-500 md:text-sm">
            <Users className="h-4 w-4" />
            <EditableText section="urgency" field="subtitle" value={urgency.subtitle} />
          </p>

          <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-[30px] bg-slate-900 text-white shadow-xl">
            <div className="h-1.5 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-rose-500" />
            <div className="px-6 py-8 md:px-12 md:py-10">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-rose-500">TERSISA</p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <span className="text-6xl font-black md:text-8xl">{urgency.totalSlots - slots}</span>
                <span className="text-left text-sm font-bold uppercase tracking-wider text-slate-300">dari<br />{urgency.totalSlots} slot</span>
              </div>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-700" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Slot promo terpakai">
                <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-3 text-xs font-bold text-slate-400">{slots} dari {urgency.totalSlots} slot sudah terpakai</p>

              <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-5">
                <span className="text-xl font-bold text-slate-400 line-through">{urgency.normalPrice}</span>
                <span className="text-4xl font-black text-emerald-400 md:text-5xl">{urgency.launchPrice}</span>
              </div>
              <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-300">
                <Gift className="h-4 w-4" /> {urgency.bonusText}
              </div>
              <button type="button" onClick={claimOffer} className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-4 text-base font-black text-white shadow-lg transition hover:brightness-110 sm:w-auto sm:min-w-72">
                <Sparkles className="h-5 w-5" /> Amankan Harga Launch
              </button>
              <p className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                <Clock3 className="h-4 w-4" /> {urgency.limitedBadge}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-300">
                <span className="inline-flex items-center gap-1"><Check className="h-4 w-4 text-emerald-400" /> Akses langsung setelah pembayaran</span>
                <span className="inline-flex items-center gap-1"><Check className="h-4 w-4 text-emerald-400" /> Bonus aplikasi untuk pembeli</span>
              </div>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
