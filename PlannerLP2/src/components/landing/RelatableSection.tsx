"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";
import { cn } from "@/lib/utils/cn";

export function RelatableSection() {
  const { content } = useContentStore();
  const { relatable } = content;
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggleCheck = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const count = checked.size;
  const total = relatable.items.length;

  const getMessage = () => {
    if (count <= 2) return relatable.counterMessages.low;
    if (count <= 5) return relatable.counterMessages.mid;
    return relatable.counterMessages.high;
  };

  const scrollTo = (href: string) => {
    const el = document.getElementById(href.replace("#", ""));
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <section className="py-20 md:py-28 bg-white">
      <Container>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase mb-4">
              {relatable.badge}
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              {relatable.title}
            </h2>
            <p className="text-lg text-slate-600">{relatable.subtitle}</p>
          </motion.div>

          {/* Checklist Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {relatable.items.map((item, i) => {
              const isChecked = checked.has(i);
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => toggleCheck(i)}
                  className={cn(
                    "text-left flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                    isChecked
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all",
                      isChecked
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-slate-300"
                    )}
                  >
                    {isChecked && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isChecked ? "text-emerald-900" : "text-slate-700"
                    )}
                  >
                    {item}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Counter */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-4xl font-extrabold text-emerald-600 mb-2">
              {count} dari {total} Masalah Terpilih
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={getMessage()}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-slate-600 text-lg mb-6"
              >
                {getMessage()}
              </motion.p>
            </AnimatePresence>

            {count >= 3 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => scrollTo("#harga")}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 py-4 font-semibold text-base shadow-lg shadow-emerald-600/25 transition-all duration-200"
              >
                {relatable.ctaText}
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            )}
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
