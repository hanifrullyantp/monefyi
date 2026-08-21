"use client";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";

export function FinalCTASection() {
  const { content } = useContentStore();
  const { finalCta } = content;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  return (
    <section className="py-24 md:py-32 bg-slate-900 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 pointer-events-none" />
      <div className="absolute inset-0 dot-pattern pointer-events-none opacity-5" />

      <Container className="relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
            {finalCta.title}
          </h2>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-10 max-w-3xl mx-auto">
            {finalCta.subtitle}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => scrollTo("harga")}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-8 py-4 font-bold text-lg shadow-xl shadow-emerald-600/30 transition-all"
            >
              {finalCta.ctaPrimary}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollTo("harga")}
              className="flex items-center justify-center gap-2 bg-transparent hover:bg-white/10 text-white border border-white/30 rounded-xl px-8 py-4 font-medium text-base transition-all"
            >
              {finalCta.ctaSecondary}
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6">
            {finalCta.trustItems.map((item) => (
              <span key={item} className="flex items-center gap-2 text-slate-300 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
