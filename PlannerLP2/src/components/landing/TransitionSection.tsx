"use client";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";

export function TransitionSection() {
  const { content } = useContentStore();
  const { transition } = content;

  const scrollTo = (href: string) => {
    const el = document.getElementById(href.replace("#", ""));
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <section className="py-10 md:py-16 bg-slate-50">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            {transition.title}
          </h2>
          <div className="space-y-4 text-lg text-slate-600 leading-relaxed">
            <p>{transition.paragraph1}</p>
            <p>
              {transition.paragraph2.split("Monefyi Estimator").map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="text-emerald-600 font-semibold">Monefyi Estimator</span>
                  )}
                </span>
              ))}
            </p>
          </div>
          <button
            onClick={() => scrollTo("#harga")}
            className="mt-8 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 py-4 font-semibold text-base shadow-lg shadow-emerald-600/25 transition-all duration-200"
          >
            <ArrowDown className="w-5 h-5" />
            {transition.ctaText}
          </button>
        </motion.div>
      </Container>
    </section>
  );
}
