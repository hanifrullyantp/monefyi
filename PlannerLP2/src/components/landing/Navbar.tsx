"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { Menu, X, ArrowRight, LogIn, LayoutDashboard, Edit3, Save } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useContentStore } from "@/lib/store/contentStore";
import { useLandingCta } from "@/lib/hooks/useLandingCta";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
import { useFinishInlineEdit } from "@/lib/hooks/useFinishInlineEdit";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";
import { plannerAppPath } from "@/lib/config/plannerApp";
import { canClaimBonusApps, isEstimatorOnlyUser } from "@/lib/permissions";
import { getActiveHeroCopy } from "@/lib/content/heroCopy";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

const LoginModal = dynamic(() => import("./LoginModal").then((m) => m.LoginModal), {
  ssr: false,
});

const DESKTOP_NAV_HREFS = new Set(["#tiga-step", "#fitur", "#harga", "#faq"]);

export function Navbar() {
  const { isAdmin, setEditMode, setAdmin } = useLandingAdmin();
  const { isEditMode, toggleEditMode, saving: editSaving } = useFinishInlineEdit();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoginModalOpen = useUIStore((s) => s.isLoginModalOpen);
  const hideNavbarForEstimatorCustomer =
    hydrated && isAuthenticated && !isAdmin && isEstimatorOnlyUser(user);
  const { content } = useContentStore();
  const { navbar } = content;
  const { openLogin } = useLandingCta();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 8);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const scrollTo = (href: string) => {
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 72,
        behavior: "smooth",
      });
    }
    setIsMobileOpen(false);
  };

  const handleAdminLogout = async () => {
    await logout();
    setAdmin(false);
    setEditMode(false);
  };

  const showAdminLink = Boolean(hydrated && isAuthenticated && isAdmin);
  const showBonusLink = Boolean(hydrated && isAuthenticated && canClaimBonusApps(user));
  const desktopNav = navbar.menuItems.filter((item) => DESKTOP_NAV_HREFS.has(item.href));
  const heroCopy = getActiveHeroCopy();
  const showCobaGratis = !(hydrated && isAuthenticated);

  const cobaGratis = () => {
    scrollTo("#harga");
  };

  if (hideNavbarForEstimatorCustomer) {
    return (
      <>
        <div className="lp-bleed sticky top-0 z-50 border-b border-emerald-100 bg-white/95 backdrop-blur-md">
          <div className="lp-container flex h-[var(--header-h-mobile)] items-center justify-between gap-3 lg:h-[var(--header-h-desktop)]">
            <button type="button" onClick={() => scrollTo("#hero")} className="flex min-h-[44px] items-center gap-2" aria-label="Estimator — beranda">
              <BrandLogo variant="mark" size={32} />
              <span className="text-[18px] font-bold tracking-tight text-[var(--ink)]">Estimator</span>
            </button>
            <div className="flex items-center gap-2">
              <a href={plannerAppPath("/app")} className="lp-btn-nav inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700">
                Masuk ke Aplikasi
              </a>
              {showBonusLink && (
                <Link href="/bonus" className="lp-btn-nav inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 font-bold text-slate-950 hover:bg-amber-300">
                  Klaim Bonus <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
        {isLoginModalOpen && (
          <Suspense fallback={null}>
            <LoginModal />
          </Suspense>
        )}
      </>
    );
  }

  return (
    <>
      <header className="lp-bleed sticky top-0 z-50 bg-[var(--bg)]/95 backdrop-blur-md border-b border-transparent transition-colors">
        <div
          className={cn(
            "lp-container flex items-center justify-between gap-4",
            "h-[var(--header-h-mobile)] lg:h-[var(--header-h-desktop)]",
            isScrolled && "border-[var(--surface-alt)]",
          )}
        >
          <button
            type="button"
            onClick={() => scrollTo("#hero")}
            className="flex items-center gap-2 min-h-[44px] shrink-0"
            aria-label="Estimator — beranda"
          >
            <BrandLogo variant="mark" size={32} />
            <span className="text-[18px] font-bold text-[var(--ink)] tracking-tight">Estimator</span>
          </button>

          <nav className="hidden lg:flex items-center gap-6 flex-1 justify-center min-w-0">
            {desktopNav.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => scrollTo(item.href)}
                className="text-[15px] font-semibold text-[var(--muted)] hover:text-[var(--brand-600)] transition-colors whitespace-nowrap"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {showCobaGratis && (
              <button
                type="button"
                onClick={cobaGratis}
                className="lp-btn-nav btn-brand lg:hidden"
              >
                {heroCopy.ctaPrimary}
              </button>
            )}

            <div className="hidden lg:flex items-center gap-2">
              {hydrated && isAuthenticated ? (
                <a href={plannerAppPath("/app")} className="lp-btn-nav lp-btn-ghost">
                  Masuk ke Aplikasi
                </a>
              ) : (
                <button type="button" onClick={openLogin} className="lp-btn-nav lp-btn-ghost">
                  Masuk
                </button>
              )}
              {showBonusLink && (
                <Link href="/bonus" className="lp-btn-nav bg-amber-400 text-slate-950 hover:bg-amber-300">
                  Klaim Bonus
                </Link>
              )}
              {showCobaGratis && (
                <button type="button" onClick={cobaGratis} className="lp-btn-nav btn-brand">
                  {heroCopy.ctaPrimary}
                </button>
              )}
              {showAdminLink ? (
                <>
                  <button
                    type="button"
                    disabled={editSaving}
                    onClick={() => void toggleEditMode()}
                    className={cn(
                      "lp-btn-nav inline-flex items-center gap-2",
                      isEditMode ? "bg-emerald-600 text-white" : "lp-btn-ghost text-emerald-700",
                      editSaving && "opacity-70",
                    )}
                  >
                    {isEditMode ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    {editSaving ? "Menyimpan…" : isEditMode ? "Selesai" : "Inline Edit"}
                  </button>
                  <Link
                    href="/admin"
                    className="lp-btn-nav bg-slate-800 text-white hover:bg-slate-700"
                  >
                    Admin
                  </Link>
                </>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
              aria-label="Menu"
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {isLoginModalOpen && (
        <Suspense fallback={null}>
          <LoginModal />
        </Suspense>
      )}

      {isMobileOpen && (
        <div
          className="fixed inset-y-0 right-0 z-40 w-full max-w-xs bg-white shadow-2xl flex flex-col lg:hidden transition-transform duration-200 ease-out"
        >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <span className="font-bold text-slate-900">Menu</span>
              <button type="button" onClick={() => setIsMobileOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col p-4 gap-1 flex-1 overflow-y-auto">
              {navbar.menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => scrollTo(item.href)}
                  className="text-left px-4 py-3 rounded-xl text-slate-700 hover:bg-emerald-50 font-medium"
                >
                  {item.label}
                </button>
              ))}
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileOpen(false);
                    openLogin();
                  }}
                  className="text-left px-4 py-3 rounded-xl text-slate-700 hover:bg-emerald-50 font-medium flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Masuk
                </button>
              )}
              {hydrated && isAuthenticated && (
                <>
                  {showBonusLink && (
                    <Link
                      href="/bonus"
                      onClick={() => setIsMobileOpen(false)}
                      className="text-left px-4 py-3 rounded-xl font-bold flex items-center gap-2 bg-amber-100 text-amber-900"
                    >
                      <ArrowRight className="w-4 h-4" /> Klaim Bonus
                    </Link>
                  )}
                  <a
                    href={plannerAppPath("/app")}
                    onClick={() => setIsMobileOpen(false)}
                    className="text-left px-4 py-3 rounded-xl font-bold flex items-center gap-2 lp-btn-ghost"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Masuk ke Aplikasi
                  </a>
                  {showAdminLink && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          void toggleEditMode();
                          setIsMobileOpen(false);
                        }}
                        className={cn(
                          "text-left px-4 py-3 rounded-xl font-bold flex items-center gap-2",
                          isEditMode ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-50",
                        )}
                      >
                        {isEditMode ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                        {isEditMode ? "Selesai Inline Edit" : "Inline Edit"}
                      </button>
                      <Link
                        href="/admin"
                        onClick={() => setIsMobileOpen(false)}
                        className="text-left px-4 py-3 rounded-xl text-emerald-700 font-bold"
                      >
                        Admin Panel
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileOpen(false);
                          void handleAdminLogout();
                        }}
                        className="text-left px-4 py-3 rounded-xl text-red-600"
                      >
                        Logout
                      </button>
                    </>
                  )}
                </>
              )}
            </nav>
            {showCobaGratis && (
              <div className="p-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileOpen(false);
                    cobaGratis();
                  }}
                  className="w-full flex items-center justify-center gap-2 btn-brand lp-btn-hero"
                >
                  {heroCopy.ctaPrimary}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
        </div>
      )}

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
