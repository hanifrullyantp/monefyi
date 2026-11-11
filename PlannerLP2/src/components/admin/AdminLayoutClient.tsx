"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  LayoutDashboard,
  Users,
  Megaphone,
  BarChart3,
  Settings,
} from "lucide-react";
import { Sidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { ContentHydrator } from "@/components/landing/ContentHydrator";
import { AuthHydrator } from "@/components/landing/AuthHydrator";
import { useUIStore } from "@/lib/store/uiStore";
import { AdminPwaInstallPrompt } from "@/components/admin/AdminPwaInstallPrompt";
import { MayarStatusBanner } from "@/components/admin/MayarStatusBanner";
import { MarketingConfigModal } from "@/components/admin/marketing/MarketingConfigModal";
import { cn } from "@/lib/utils/cn";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isGlobalAiConfigOpen, setIsGlobalAiConfigOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isAdminSidebarOpen = useUIStore((s) => s.isAdminSidebarOpen);
  const adminTheme = useUIStore((s) => s.adminTheme);

  useEffect(() => {
    setMounted(true);

    // Register admin-sw.js khusus untuk scope /admin
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/admin-sw.js", { scope: "/admin" })
        .catch((err) => {
          console.warn("[pwa-admin] SW registration:", err);
        });
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (adminTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [adminTheme]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <AdminAuthGuard>
      <AuthHydrator />
      <ContentHydrator />
      <div
        className={cn(
          "min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative transition-colors duration-200",
          adminTheme === "dark" && "dark"
        )}
      >
        {/* PWA Install Prompt Banner */}
        <AdminPwaInstallPrompt />
        {/* Mayar Payment Gateway Status & Alert Banner */}
        <MayarStatusBanner />

        <div className="flex-1 flex relative">
          {/* Desktop Sidebar (Selalu ada: w-64 jika terbuka, w-16 icon-only jika ciut) */}
          <div className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out">
            <Sidebar />
          </div>

          {/* Mobile Drawer */}
          {mobileSidebarOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
                <Sidebar
                  onClose={() => setMobileSidebarOpen(false)}
                  isMobileDrawer={true}
                />
              </div>
            </>
          )}

          {/* Main Content Area */}
          <div
            className={cn(
              "flex-1 transition-all duration-300 ease-in-out min-w-0 pb-24 lg:pb-8",
              isAdminSidebarOpen ? "lg:ml-64" : "lg:ml-16"
            )}
          >
            {/* Top Bar Terpadu: Nama Halaman, Status Koneksi API (Mayar, Meta, WA, AI), Test Koneksi */}
            <AdminTopBar
              onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            />

            <main className="min-h-screen">{children}</main>
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar (5 Tab Utama Sesuai Urutan Baru) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-1.5 py-1 shadow-lg safe-bottom">
          <div className="grid grid-cols-5 gap-1 text-center">
            <Link
              href="/admin"
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[9px] font-extrabold transition-all",
                pathname === "/admin"
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <LayoutDashboard className="w-4 h-4 mb-0.5" />
              <span>Dash</span>
            </Link>

            <Link
              href="/admin/marketing"
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[9px] font-extrabold transition-all",
                pathname.startsWith("/admin/marketing")
                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              <Megaphone className="w-4 h-4 mb-0.5" />
              <span>Ads</span>
            </Link>

            <Link
              href="/admin/crm"
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[9px] font-extrabold transition-all relative",
                pathname.startsWith("/admin/crm")
                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              <Users className="w-4 h-4 mb-0.5" />
              <span>CRM</span>
            </Link>

            <Link
              href="/admin/analytics"
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[9px] font-extrabold transition-all",
                pathname.startsWith("/admin/analytics")
                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              <BarChart3 className="w-4 h-4 mb-0.5" />
              <span>Analytic</span>
            </Link>

            <Link
              href="/admin/settings"
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[9px] font-extrabold transition-all",
                pathname.startsWith("/admin/settings")
                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              <Settings className="w-4 h-4 mb-0.5" />
              <span>Setup</span>
            </Link>
          </div>
        </div>

        {/* Global Super Admin AI & Multi-LLM Config Modal */}
        <MarketingConfigModal
          isOpen={isGlobalAiConfigOpen}
          onClose={() => setIsGlobalAiConfigOpen(false)}
        />
      </div>
    </AdminAuthGuard>
  );
}

