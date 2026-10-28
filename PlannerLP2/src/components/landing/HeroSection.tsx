"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowDown, PlayCircle, LayoutDashboard } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { HeroEstimatorDemo } from "@/components/landing/HeroEstimatorDemo";
import { useAuthStore } from "@/lib/store/authStore";
import { navigateToPlannerApp, plannerAppPath } from "@/lib/config/plannerApp";
import { trackEvent } from "@/lib/analytics/events";

const HEADLINE = "Kirim Penawaran Sebelum Kamu Pulang Survei";
const SUB =
  "Saring calon klien lewat WA, hitung harga langsung di HP, kirim PDF penawaran berlogo kamu sebelum klien sempat pindah ke vendor lain.";

export function HeroSection() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    trackEvent("view_hero");
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  const primary = () => {
    if (hydrated && isAuthenticated) {
      navigateToPlannerApp("/app/estimator");
      return;
    }
    trackEvent("free_signup", { source: "hero" });
    window.location.href = plannerAppPath("/app/estimator?plan=free");
  };

  return (
    <section id="hero" className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 opacity-[0.04]" style={{ background: "var(--brand-gradient)" }} />
      <Container className="content-max relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12 xl:gap-16 pt-6 pb-10 lg:pt-10 lg:pb-14">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left w-full lg:flex-1">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-[1.75rem] md:text-4xl lg:text-[2.5rem] font-extrabold text-[var(--ink)] leading-[1.15] tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              {HEADLINE}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-base md:text-lg text-[var(--muted)] max-w-xl"
            >
              {SUB}
            </motion.p>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-5 space-y-2 text-sm text-[var(--ink)] text-left w-full max-w-md"
            >
              {[
                "Balas WA hanya yang budgetnya cocok",
                "Hitung di lokasi — bukan 2 hari kemudian",
                "PDF penawaran keluar sebelum kamu pulang",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-[var(--brand-600)] font-bold">✓</span>
                  {t}
                </li>
              ))}
            </motion.ul>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
            >
              <button type="button" onClick={primary} className="btn-brand inline-flex items-center justify-center gap-2 w-full sm:w-auto">
                {hydrated && isAuthenticated ? (
                  <>
                    <LayoutDashboard className="w-4 h-4" /> Masuk ke Estimator
                  </>
                ) : (
                  <>Coba Gratis Sekarang</>
                )}
              </button>
              <button
                type="button"
                onClick={() => scrollTo("tiga-step")}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 rounded-xl font-bold border-2 border-[var(--surface-alt)] text-[var(--ink)] hover:border-[var(--brand-600)] w-full sm:w-auto"
              >
                <PlayCircle className="w-4 h-4 text-[var(--brand-600)]" />
                Lihat Demo 1 Menit
              </button>
            </motion.div>
            <p className="mt-3 text-xs text-[var(--muted)]">Tanpa kartu. 3 estimasi gratis.</p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Untuk kontraktor · interior · kitchen set · kanopi · furniture custom
            </p>
            <p className="mt-4 text-[11px] font-semibold text-[var(--brand-600)] lg:hidden">
              ↑ Coba scroll & tambah rincian di demo HP
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="w-full lg:flex-1 flex flex-col items-center mt-8 lg:mt-0"
          >
            <p className="hidden lg:block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-4">
              Demo langsung — scroll & tambah rincian
            </p>
            <HeroEstimatorDemo />
            <button
              type="button"
              onClick={() => scrollTo("tiga-step")}
              className="mt-6 flex items-center gap-1 text-xs font-bold text-[var(--brand-600)]"
            >
              <ArrowDown className="w-4 h-4" /> Cara kerjanya
            </button>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
