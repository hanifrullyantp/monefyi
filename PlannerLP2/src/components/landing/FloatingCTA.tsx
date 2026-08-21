"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function FloatingCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const hero = document.getElementById("hero");
      const pricing = document.getElementById("harga");
      if (!hero) return;

      const heroBottom = hero.getBoundingClientRect().bottom;
      const pricingTop = pricing?.getBoundingClientRect().top ?? Infinity;

      setShow(heroBottom < 0 && pricingTop > window.innerHeight);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = () => {
    const el = document.getElementById("harga");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden md:block"
        >
          <button
            onClick={scrollTo}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 py-3 font-semibold shadow-2xl shadow-emerald-600/40 transition-all"
          >
            Ambil Estimator Lifetime — Rp 199.000
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
