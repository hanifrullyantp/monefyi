"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Edit3, PanelLeftOpen } from "lucide-react";
import { Sidebar } from "@/components/admin/Sidebar";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { ContentHydrator } from "@/components/landing/ContentHydrator";
import { AuthHydrator } from "@/components/landing/AuthHydrator";
import { INLINE_EDIT_LANDING_PATH } from "@/lib/hooks/useLandingAdmin";
import { useUIStore } from "@/lib/store/uiStore";
import { cn } from "@/lib/utils/cn";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isAdminSidebarOpen = useUIStore((s) => s.isAdminSidebarOpen);
  const setAdminSidebarOpen = useUIStore((s) => s.setAdminSidebarOpen);

  useEffect(() => {
    setMounted(true);
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
      <div className="min-h-screen bg-slate-50 flex relative">
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
            "flex-1 transition-all duration-300 ease-in-out min-w-0",
            isAdminSidebarOpen ? "lg:ml-64" : "lg:ml-0"
          )}
        >
          <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 flex-shrink-0"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <p className="font-bold text-slate-900 flex-1 truncate">Admin Panel</p>
            <Link
              href={INLINE_EDIT_LANDING_PATH}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wide flex-shrink-0 touch-manipulation"
            >
              <Edit3 className="w-4 h-4" />
              Inline Edit
            </Link>
          </div>

          <main className="min-h-screen">{children}</main>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
