"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Edit3 } from "lucide-react";
import { Sidebar } from "@/components/admin/Sidebar";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { ContentHydrator } from "@/components/landing/ContentHydrator";
import { AuthHydrator } from "@/components/landing/AuthHydrator";
import { INLINE_EDIT_LANDING_PATH } from "@/lib/hooks/useLandingAdmin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
      <div className="min-h-screen bg-slate-50 flex">
        <div className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30">
          <Sidebar />
        </div>

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

        <div className="flex-1 lg:ml-64">
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
