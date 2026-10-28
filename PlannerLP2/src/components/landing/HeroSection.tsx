"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowDown, PlayCircle, LayoutDashboard } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { EditableImage } from "@/components/shared/EditableImage";
import { useAuthStore } from "@/lib/store/authStore";
import { useContentStore } from "@/lib/store/contentStore";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
import { navigateToPlannerApp, plannerAppPath } from "@/lib/config/plannerApp";
import { trackEvent } from "@/lib/analytics/events";

const HEADLINE = "Kirim Penawaran Sebelum Kamu Pulang Survei";
const SUB =
  "Saring calon klien lewat WA, hitung harga langsung di HP, kirim PDF penawaran berlogo kamu sebelum klien sempat pindah ke vendor lain.";

export function HeroSection() {
  const { content } = useContentStore();
  const { hero } = content;
  const { isAdmin, isEditMode } = useLandingAdmin();
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const showHeroImage = Boolean(hero.dashboardImage) || (isAdmin && isEditMode);

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
        <div className="flex flex-col gap-8 items-center pt-6 pb-10">
          <div className="flex flex-col items-center text-center w-full">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-[1.75rem] font-extrabold text-[var(--ink)] leading-[1.15] tracking-tight"
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
          </div>

          {/* Mockup phone — CSS only, no Unsplash */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="w-full max-w-[240px] mx-auto"
          >
            <div className="relative mx-auto w-full">
              <div className="rounded-[2rem] border-[6px] border-[var(--ink)] bg-[var(--surface-dark)] p-3 shadow-2xl">
                <div className="rounded-[1.25rem] bg-white overflow-hidden min-h-[420px]">
                  {showHeroImage ? (
                    <EditableImage
                      section="hero"
                      field="dashboardImage"
                      src={hero.dashboardImage || ""}
                      alt="Preview Estimator di HP"
                      className="w-full min-h-[420px]"
                    />
                  ) : (
                    <>
                      <div className="px-4 py-3 flex items-center gap-2 border-b border-[var(--surface-alt)]">
                        <BrandLogo variant="mark" size={24} />
                        <span className="text-xs font-extrabold text-[var(--ink)] tracking-tight">Estimator</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Estimasi kitchen set</p>
                        <div className="rounded-xl bg-[var(--surface-soft)] p-3 space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-[var(--muted)]">Kabinet bawah</span>
                            <span className="font-bold text-[var(--ink)]">Rp 8.400.000</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-[var(--muted)]">Top table</span>
                            <span className="font-bold text-[var(--ink)]">Rp 3.200.000</span>
                          </div>
                          <div className="flex justify-between text-xs border-t border-[var(--surface-alt)] pt-2">
                            <span className="font-bold">Grand total</span>
                            <span className="font-black text-[var(--brand-600)]">Rp 14.850.000</span>
                          </div>
                        </div>
                        <div className="rounded-xl border border-[var(--brand-600)]/30 bg-[var(--surface-soft)] p-3">
                          <p className="text-[10px] font-bold text-[var(--brand-600)] mb-1">PDF siap kirim</p>
                          <p className="text-xs text-[var(--ink)] font-semibold">Penawaran_Andi_Kitchen.pdf</p>
                          <p className="text-[10px] text-[var(--muted)] mt-1">Logo kamu · rincian item · total</p>
                        </div>
                        <button type="button" className="w-full btn-brand text-xs py-2.5 rounded-lg" disabled>
                          Kirim ke WA klien
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => scrollTo("tiga-step")}
                className="mt-6 mx-auto flex items-center gap-1 text-xs font-bold text-[var(--brand-600)]"
              >
                <ArrowDown className="w-4 h-4" /> Cara kerjanya
              </button>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
