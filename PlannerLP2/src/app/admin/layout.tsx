"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Edit3, PanelLeftOpen, LayoutDashboard, Users, Megaphone, MoreHorizontal } from "lucide-react";
import { Sidebar } from "@/components/admin/Sidebar";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { ContentHydrator } from "@/components/landing/ContentHydrator";
import { AuthHydrator } from "@/components/landing/AuthHydrator";
import { INLINE_EDIT_LANDING_PATH } from "@/lib/hooks/useLandingAdmin";
import { useUIStore } from "@/lib/store/uiStore";
import { AdminPwaInstallPrompt } from "@/components/admin/AdminPwaInstallPrompt";
import { cn } from "@/lib/utils/cn";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isAdminSidebarOpen = useUIStore((s) => s.isAdminSidebarOpen);
  const setAdminSidebarOpen = useUIStore((s) => s.setAdminSidebarOpen);

  useEffect(() => {
    setMounted(true);

    // Pastikan manifest admin terpasang dinamis untuk PWA di HP
    try {
      let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      if (!manifestLink) {
        manifestLink = document.createElement("link");
        manifestLink.rel = "manifest";
        document.head.appendChild(manifestLink);
      }
      manifestLink.href = "/admin-manifest.webmanifest";
    } catch {
      // toleran pada SSR
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <AdminAuthGuard>
      <AuthHydrator />
      <ContentHydrator />
      <div className="min-h-screen bg-slate-50 flex flex-col relative">
        {/* PWA Install Prompt Banner */}
        <AdminPwaInstallPrompt />

        <div className="flex-1 flex relative">
          {/* Desktop Sidebar (Collapsible) */}
          <div
            className={cn(
              "hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out",
              isAdminSidebarOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
            )}
          >
            <Sidebar />
          </div>

          {/* Floating Toggle Button when Sidebar is Hidden on Desktop */}
          {!isAdminSidebarOpen && (
            <button
              type="button"
              onClick={() => setAdminSidebarOpen(true)}
              className="hidden lg:flex fixed top-4 left-4 z-40 items-center gap-2 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-900 text-white rounded-xl shadow-xl shadow-slate-950/20 text-xs font-bold transition-all active:scale-95 border border-slate-700/80 backdrop-blur-md cursor-pointer group"
              title="Tampilkan Menu Sidebar"
            >
              <PanelLeftOpen className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Tampilkan Menu</span>
            </button>
          )}

          {/* Mobile Drawer */}
          {mobileSidebarOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
                <Sidebar onClose={() => setMobileSidebarOpen(false)} />
              </div>
            </>
          )}

          {/* Main Content Area */}
          <div
            className={cn(
              "flex-1 transition-all duration-300 ease-in-out min-w-0 pb-24 lg:pb-8",
              isAdminSidebarOpen ? "lg:ml-64" : "lg:ml-0"
            )}
          >
            {/* Top Bar Mobile */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-2 lg:hidden">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 flex-shrink-0"
                  aria-label="Buka menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="truncate">
                  <p className="font-extrabold text-slate-900 text-sm leading-tight truncate">Monefyi Admin</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">CRM Active</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={INLINE_EDIT_LANDING_PATH}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Edit Site</span>
                </Link>
              </div>
            </div>

            <main className="min-h-screen">{children}</main>
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar (Native App Style) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 py-1.5 shadow-lg safe-bottom">
          <div className="grid grid-cols-4 gap-1">
            <Link
              href="/admin"
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all",
                pathname === "/admin"
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/admin/crm"
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all relative",
                pathname.startsWith("/admin/crm")
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Users className="w-5 h-5 mb-0.5" />
              <span>CRM Leads</span>
            </Link>

            <Link
              href="/admin/marketing"
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all",
                pathname.startsWith("/admin/marketing")
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Megaphone className="w-5 h-5 mb-0.5" />
              <span>Marketing</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5" />
              <span>Menu</span>
            </button>
          </div>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
