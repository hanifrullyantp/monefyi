"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, Zap, LogIn, LayoutDashboard, Edit3, Save } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useLandingCta } from "@/lib/hooks/useLandingCta";
import { clearSession } from "@/lib/utils/auth";
import { plannerAppPath } from "@/lib/config/plannerApp";
import { cn } from "@/lib/utils/cn";
import { LoginModal } from "./LoginModal";
import Link from "next/link";

export function Navbar() {
  const { isAdmin, isEditMode, setEditMode, setAdmin } = useUIStore();
  const { content } = useContentStore();
  const { navbar } = content;
  const { isAuthenticated, label, handleCtaClick, openLogin } = useLandingCta();
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

  const handleAdminLogout = () => {
    clearSession();
    setAdmin(false);
    setEditMode(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: isHidden && !isMobileOpen ? -100 : 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-500",
          isScrolled ? "glass shadow-premium border-b border-white/20" : "bg-transparent",
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <button
              onClick={() => scrollTo("#hero")}
              className="flex items-center gap-2 font-extrabold text-lg text-slate-900 tracking-tight"
            >
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span>
                Monefyi <span className="text-emerald-600">Estimator</span>
              </span>
            </button>

            <div className="hidden md:flex items-center gap-1">
              {navbar.menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => scrollTo(item.href)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative group",
                    activeSection === item.href.replace("#", "")
                      ? "text-emerald-700"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  {item.label}
                  {activeSection === item.href.replace("#", "") && (
                    <motion.div
                      layoutId="navIndicator"
                      className="absolute inset-0 bg-emerald-50 rounded-xl -z-10"
                      transition={{ type: "spring", duration: 0.5 }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {isAdmin ? (
                <div className="flex items-center gap-2 bg-slate-900 rounded-2xl p-1.5 shadow-2xl">
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-all border border-white/5"
                  >
                    <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                    ADMIN PANEL
                  </Link>
                  <button
                    onClick={() => setEditMode(!isEditMode)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                      isEditMode
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-glow"
                        : "bg-slate-800 text-slate-300 border-white/5 hover:text-white",
                    )}
                  >
                    {isEditMode ? (
                      <>
                        <Save className="w-4 h-4 animate-pulse" />
                        EXIT EDIT MODE
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4 text-emerald-400" />
                        INLINE EDIT
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleAdminLogout}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  {isAuthenticated ? (
                    <a
                      href={plannerAppPath("/app")}
                      className="flex items-center gap-2 px-5 py-2.5 text-slate-600 hover:text-slate-900 font-bold text-sm transition-all"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </a>
                  ) : (
                    <button
                      onClick={openLogin}
                      className="flex items-center gap-2 px-5 py-2.5 text-slate-600 hover:text-slate-900 font-bold text-sm transition-all"
                    >
                      <LogIn className="w-4 h-4" />
                      {label}
                    </button>
                  )}
                  <button
                    onClick={() => (isAuthenticated ? handleCtaClick() : scrollTo(navbar.ctaHref))}
                    className="group relative overflow-hidden flex items-center gap-2 gradient-premium text-white rounded-xl px-6 py-2.5 font-bold text-sm shadow-premium hover:shadow-glow transition-all duration-300 btn-premium"
                  >
                    <span className="relative z-10">{navbar.ctaText}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                  </button>
                </>
              )}
            </div>

            <LoginModal />

            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

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
              {!isAdmin && !isAuthenticated && (
                <button
                  onClick={() => {
                    setIsMobileOpen(false);
                    openLogin();
                  }}
                  className="text-left px-4 py-3 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium transition-all"
                >
                  Login
                </button>
              )}
            </nav>
            <div className="p-4 border-t border-slate-100 space-y-2">
              <button
                onClick={() => scrollTo(navbar.ctaHref)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl px-6 py-3.5 font-semibold shadow-lg"
              >
                {navbar.ctaText}
                <ArrowRight className="w-4 h-4" />
              </button>
              {!isAdmin && (
                <Link
                  href="/admin/login"
                  className="block w-full text-center text-xs text-slate-400 hover:text-emerald-600 py-2"
                >
                  Admin CMS
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
