"use client";

import { motion } from "framer-motion";
import { Quote, ArrowRight, CheckCircle2 } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";

const FALLBACK_STATS = [
  { value: "1.200+", label: "Users" },
  { value: "4.9★", label: "Rating" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function TestimonialSection() {
  const { content } = useContentStore();
  const { testimonial } = content;
  const { featured } = testimonial;
  const stats = testimonial.stats.length ? testimonial.stats : FALLBACK_STATS;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  return (
    <section id="testimoni" className="section-pad bg-white relative overflow-hidden">
      <Container className="content-max">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-8 md:mb-12"
        >
          <span className="inline-block bg-[var(--surface-soft)] text-[var(--brand-600)] rounded-full px-4 py-1.5 text-[10px] font-black tracking-[0.2em] uppercase mb-4">
            {testimonial.badge}
          </span>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[var(--ink)] tracking-tight leading-[1.15]">
            {testimonial.title}
          </h2>
          <p className="mt-3 text-sm md:text-base text-[var(--muted)] font-medium leading-relaxed italic">
            &ldquo;{testimonial.subtitle}&rdquo;
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-10 border border-[var(--surface-alt)] shadow-sm relative"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-12 relative z-10">
            {/* Profile — kiri di desktop, atas di mobile */}
            <aside className="flex flex-col items-start gap-5 lg:sticky lg:top-24 lg:self-start">
              <div className="relative inline-block">
                <div className="w-28 h-28 md:w-32 md:h-32 bg-[var(--surface-dark)] text-white rounded-[28px] flex items-center justify-center text-3xl md:text-4xl font-black shadow-xl">
                  {getInitials(featured.name) || "HR"}
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-10 h-10 bg-[var(--brand-600)] rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              </div>

              <div>
                <span className="inline-block text-[10px] font-black bg-emerald-50 text-emerald-600 rounded-full px-3 py-1 mb-2 tracking-widest uppercase">
                  {featured.title}
                </span>
                <h3 className="text-xl md:text-2xl font-extrabold text-[var(--ink)] leading-tight mb-1">
                  {featured.name}
                </h3>
                <p className="text-[var(--muted)] font-semibold text-sm">{featured.info}</p>
              </div>

              <div className="w-full pt-5 border-t border-[var(--surface-alt)]">
                <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] mb-3">
                  Monefyi Global Impact
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {stats.slice(0, 2).map((s) => (
                    <div key={s.label}>
                      <p className="text-2xl font-extrabold text-[var(--ink)]">{s.value}</p>
                      <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* Cerita — kanan di desktop */}
            <div className="min-w-0">
              <h4 className="text-lg md:text-2xl font-extrabold text-[var(--ink)] mb-6 leading-snug">
                &ldquo;{featured.storyTitle}&rdquo;
              </h4>

              <div className="mb-8">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-3 block">
                  Masa Lalu
                </span>
                <p className="text-[15px] md:text-base text-[var(--muted)] font-medium leading-relaxed italic bg-rose-50/60 p-4 md:p-5 rounded-2xl border border-rose-100/60">
                  {featured.pastSection}
                </p>
                {featured.pastHighlight ? (
                  <p className="font-extrabold text-[var(--ink)] mt-4 text-base md:text-lg leading-snug">
                    &ldquo;{featured.pastHighlight}&rdquo;
                  </p>
                ) : null}
              </div>

              <div className="mb-8">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-3 block">
                  Titik Balik
                </span>
                <p className="text-[15px] md:text-base text-[var(--ink)]/80 font-semibold leading-relaxed">
                  {featured.turningPoint}
                </p>
                {featured.turningPointAttribution ? (
                  <p className="mt-3 text-sm font-bold text-[var(--muted)]">
                    {featured.turningPointAttribution}
                  </p>
                ) : null}
              </div>

              <div className="mb-12">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-8 block">
                  THE TRANSFORMASI
                </span>
                <div className="relative space-y-10 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {featured.milestones.map((m, i) => (
                    <div key={`${m.period}-${i}`} className="relative pl-12 group">
                      <div className="absolute left-0 top-0 w-8 h-8 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center z-10 group-hover:border-emerald-500 group-hover:bg-emerald-50 transition-all">
                        <div className="w-2 h-2 bg-slate-300 rounded-full group-hover:bg-emerald-500 transition-all" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="text-[10px] bg-emerald-500 text-white rounded-full px-3 py-0.5 font-black uppercase tracking-widest">
                            {m.period}
                          </span>
                          <span className="font-black text-slate-900 text-lg">{m.title}</span>
                        </div>
                        <p className="text-slate-500 font-bold leading-relaxed">{m.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-3 block">
                  Hidup Baru
                </span>
                <p className="text-sm md:text-[15px] text-[var(--ink)]/80 font-semibold leading-relaxed">
                  {featured.newLife}
                </p>
              </div>

              <div className="bg-[var(--surface-dark)] text-white rounded-2xl p-5 md:p-6">
                <Quote className="w-7 h-7 text-[var(--brand-400)] mb-3 opacity-60" />
                <p className="text-base md:text-lg font-extrabold leading-snug mb-3">
                  &ldquo;{featured.bigQuote}&rdquo;
                </p>
                <p className="text-[var(--brand-400)] font-bold uppercase text-[10px] tracking-widest">
                  — {featured.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => scrollTo("harga")}
                className="mt-6 group flex w-full items-center justify-center gap-2 btn-brand rounded-xl text-sm min-h-[48px]"
              >
                {featured.ctaText}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
