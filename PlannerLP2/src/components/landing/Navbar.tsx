"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, LogIn, LayoutDashboard, Edit3, Save } from "lucide-react";
import { EstimatorLogo } from "@/components/brand/EstimatorLogo";
import { useContentStore } from "@/lib/store/contentStore";
import { useLandingCta } from "@/lib/hooks/useLandingCta";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
import { useAuthStore } from "@/lib/store/authStore";
import { plannerAppPath } from "@/lib/config/plannerApp";
import { cn } from "@/lib/utils/cn";
import { Suspense } from "react";
import { LoginModal } from "./LoginModal";
import Link from "next/link";

export function Navbar() {
  const { isAdmin, isEditMode, setEditMode, setAdmin } = useLandingAdmin();
  const logout = useAuthStore((s) => s.logout);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { content } = useContentStore();
  const { navbar } = content;
  const { label, openLogin } = useLandingCta();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    setIsScrolled(currentY > 10);
    setIsHidden(currentY > lastScrollY && currentY > 300);
    setLastScrollY(currentY);
  }, [lastScrollY]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const scrollTo = (href: string) => {
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setIsMobileOpen(false);
    setActiveSection(id);
  };

  const handleAdminLogout = async () => {
    await logout();
    setAdmin(false);
    setEditMode(false);
  };

  const showUserNav = hydrated && isAuthenticated;

  const masukAppLink = (
    <a
      href={plannerAppPath("/app")}
      className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all shrink-0"
    >
      <LayoutDashboard className="w-4 h-4 shrink-0" />
      <span>Masuk</span>
    </a>
  );

  const loginButton = (
    <button
      type="button"
      onClick={openLogin}
      className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-5 sm:py-2.5 text-slate-600 hover:text-slate-900 font-bold text-xs sm:text-sm transition-all shrink-0"
    >
      <LogIn className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );

  return (
    <>
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: isHidden && !isMobileOpen ? -100 : 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "sticky top-0 z-50 transition-all duration-500",
          isScrolled ? "glass shadow-premium border-b border-white/20" : "bg-transparent",
        )}
      >
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => scrollTo("#hero")}
              className="flex items-center gap-2 font-extrabold text-lg text-[var(--ink)] tracking-tight min-h-[44px]"
              aria-label="Estimator — beranda"
            >
              <EstimatorLogo variant="lockup-light" size={28} />
            </button>

            <div className="flex items-center gap-1.5 shrink-0 min-w-0">
              {showUserNav ? masukAppLink : loginButton}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center px-2 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 shrink-0"
                aria-label="Toggle menu"
              >
                {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      <Suspense fallback={null}>
        <LoginModal />
      </Suspense>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-40 w-full max-w-xs bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <span className="font-bold text-slate-900">Menu</span>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col p-4 gap-1 flex-1">
              {navbar.menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => scrollTo(item.href)}
                  className="text-left px-4 py-3 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium transition-all"
                >
                  {item.label}
                </button>
              ))}
              {!showUserNav && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileOpen(false);
                    openLogin();
                  }}
                  className="text-left px-4 py-3 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium transition-all flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
              )}
              {showUserNav && (
                <>
                  <a
                    href={plannerAppPath("/app")}
                    onClick={() => setIsMobileOpen(false)}
                    className="text-left px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold transition-all flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Masuk
                  </a>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditMode(!isEditMode);
                          setIsMobileOpen(false);
                        }}
                        className={cn(
                          "text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-2 touch-manipulation",
                          isEditMode
                            ? "bg-emerald-600 text-white"
                            : "text-emerald-700 hover:bg-emerald-50",
                        )}
                      >
                        {isEditMode ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                        {isEditMode ? "Selesai Inline Edit" : "Inline Edit"}
                      </button>
                      <Link
                        href="/admin"
                        onClick={() => setIsMobileOpen(false)}
                        className="text-left px-4 py-3 rounded-xl text-emerald-700 hover:bg-emerald-50 font-bold transition-all flex items-center gap-2"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Admin Panel
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileOpen(false);
                          void handleAdminLogout();
                        }}
                        className="text-left px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 font-medium transition-all"
                      >
                        Logout
                      </button>
                    </>
                  )}
                </>
              )}
            </nav>
            <div className="p-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => scrollTo(navbar.ctaHref)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl px-6 py-3.5 font-semibold shadow-lg"
              >
                {navbar.ctaText}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
