"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Menu, X, LogIn, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useContentStore } from "@/lib/store/contentStore";
import { useScrollSpy } from "@/lib/hooks/useScrollSpy";
import { useUiStore } from "@/lib/store/uiStore";
import { useLandingCta } from "@/lib/hooks/useLandingCta";
import { useAuthStore } from "@/lib/store/authStore";

const sectionIds = ["hero", "tiga-step", "bagaimana", "cerita", "harga", "faq"];

export function Navbar() {
  const { content } = useContentStore();
  const { navbar } = content;
  const { isAdmin } = useUiStore();
  const { label, handleCtaClick, openLogin, isAuthenticated } = useLandingCta();
  const user = useAuthStore((s) => s.user);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeSection = useScrollSpy(sectionIds);

  const handleScroll = useCallback(() => {
    const y = window.scrollY;
    setScrolled(y > 20);
    if (y > lastScrollY && y > 100) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    setLastScrollY(y);
  }, [lastScrollY]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const id = href.replace("#", "");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const getMenuActive = (href: string) => {
    const id = href.replace("#", "");
    const mapped: Record<string, string> = {
      hero: "hero",
      "tiga-step": "tiga-step",
      bagaimana: "bagaimana",
      cerita: "cerita",
      harga: "harga",
      faq: "faq",
    };
    return activeSection === (mapped[id] || id);
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-white/95 backdrop-blur-lg shadow-sm border-b border-slate-100"
            : "bg-transparent",
          hidden && !mobileOpen ? "-translate-y-full" : "translate-y-0",
        )}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="font-bold text-lg text-slate-900 hover:text-emerald-600 transition-colors"
            >
              {navbar.logo}
            </button>

            <nav className="hidden md:flex items-center gap-8" aria-label="Menu utama">
              {navbar.menu.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => scrollTo(item.href)}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    getMenuActive(item.href)
                      ? "text-emerald-600 font-semibold"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 max-w-[8rem] truncate">
                    {user.name}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openLogin}
                  className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
                  aria-label="Login"
                >
                  <LogIn className="w-5 h-5" />
                </button>
              )}

              {!isAdmin && (
                <Link
                  href="/admin/login"
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Admin CMS"
                  title="Admin CMS"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              )}

              <button
                type="button"
                onClick={handleCtaClick}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200"
              >
                {label}
              </button>
            </div>

            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-xs bg-white shadow-2xl flex flex-col p-8">
            <div className="flex items-center justify-between mb-10">
              <span className="font-bold text-lg text-slate-900">{navbar.logo}</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Tutup menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex flex-col space-y-6 flex-1" aria-label="Menu mobile">
              {navbar.menu.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => scrollTo(item.href)}
                  className={cn(
                    "text-2xl font-medium text-left transition-colors",
                    getMenuActive(item.href)
                      ? "text-emerald-600"
                      : "text-slate-700 hover:text-slate-900",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="pt-8 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  handleCtaClick();
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 py-4 font-semibold transition-all duration-200"
              >
                {label}
              </button>
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    openLogin();
                  }}
                  className="w-full text-slate-600 text-sm font-medium py-2"
                >
                  Sudah punya akun? Login
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
