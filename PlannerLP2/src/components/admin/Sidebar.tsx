"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Sparkles,
  BarChart3,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { EstimatorLogo } from "@/components/brand/EstimatorLogo";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";

// Urutan Menu Utama sesuai Instruksi User:
// 1. Logo
// 2. Dashboard
// 3. Ads Manager (pengaturan admin masukkan disini)
// 4. CRM
// 5. Page Analytic
// 6. Page Setup (Pusat seluruh hal lainnya)
const mainNavItems = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    label: "Dashboard",
    exact: true,
  },
  {
    href: "/admin/marketing",
    icon: Megaphone,
    label: "Ads Manager",
    hasSettings: true,
  },
  {
    href: "/admin/winning-engine",
    icon: Sparkles,
    label: "Winning Engine",
  },
  {
    href: "/admin/crm",
    icon: Users,
    label: "CRM",
  },
  {
    href: "/admin/analytics",
    icon: BarChart3,
    label: "Page Analytic",
  },
  {
    href: "/admin/settings",
    icon: Settings,
    label: "Page Setup",
  },
];

interface SidebarProps {
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

export function Sidebar({ onClose, isMobileDrawer = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const setAdmin = useUIStore((s) => s.setAdmin);
  const isAdminSidebarOpen = useUIStore((s) => s.isAdminSidebarOpen);
  const toggleAdminSidebar = useUIStore((s) => s.toggleAdminSidebar);
  const adminTheme = useUIStore((s) => s.adminTheme);
  const toggleAdminTheme = useUIStore((s) => s.toggleAdminTheme);

  // Jika di mobile drawer, selalu tampil penuh (expanded). Jika di desktop, ikuti state isAdminSidebarOpen
  const isExpanded = isMobileDrawer || isAdminSidebarOpen;

  const handleLogout = async () => {
    await logout();
    setAdmin(false);
    router.push("/");
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-slate-900 text-white transition-all duration-300 ease-in-out border-r border-slate-800 select-none z-30",
        isExpanded ? "w-64" : "w-16"
      )}
    >
      {/* 1. LOGO */}
      <div
        className={cn(
          "flex items-center border-b border-slate-800 transition-all",
          isExpanded ? "justify-between p-4" : "justify-center py-4 px-2"
        )}
      >
        <Link
          href="/admin"
          onClick={onClose}
          className="flex items-center gap-3 font-bold group"
          title="Monefyi Estimator Dashboard"
        >
          <EstimatorLogo className="w-8 h-8 rounded-xl shadow-md group-hover:scale-105 transition-transform flex-shrink-0" />
          {isExpanded && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-sm font-extrabold text-white leading-tight tracking-tight">
                Monefyi
              </p>
              <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
                Admin Panel
              </p>
            </div>
          )}
        </Link>

        {isExpanded && (
          <div className="flex items-center gap-1">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Tutup Menu"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleAdminSidebar}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Sembunyikan Menu Sidebar (Hanya Icon)"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. DAFTAR MENU UTAMA */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1.5">
        {mainNavItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center rounded-xl transition-all cursor-pointer",
                  isExpanded
                    ? "justify-between px-3 py-2.5 text-sm font-semibold"
                    : "justify-center p-2.5 text-xs",
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                )}
                title={!isExpanded ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                    )}
                  />
                  {isExpanded && <span>{item.label}</span>}
                </div>

                {isExpanded && item.hasSettings && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                    Meta
                  </span>
                )}
              </Link>

              {/* Tooltip Float saat mode icon-only (w-16) */}
              {!isExpanded && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 3. FOOTER & KELUAR */}
      <div className="p-2 border-t border-slate-800 space-y-1">
        {/* Toggle Theme */}
        <button
          type="button"
          onClick={toggleAdminTheme}
          className={cn(
            "w-full flex items-center rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer group",
            isExpanded ? "justify-between px-3 py-2" : "justify-center p-2.5"
          )}
          title={`Ganti ke mode ${adminTheme === "dark" ? "Terang" : "Gelap"}`}
        >
          <div className="flex items-center gap-3">
            {adminTheme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400 flex-shrink-0 group-hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400 flex-shrink-0 group-hover:-rotate-12 transition-transform" />
            )}
            {isExpanded && <span>Mode: {adminTheme === "dark" ? "Dark" : "Light"}</span>}
          </div>
        </button>

        {/* Toggle Expand / Collapse saat di Desktop */}
        {!isMobileDrawer && (
          <button
            type="button"
            onClick={toggleAdminSidebar}
            className={cn(
              "hidden lg:flex w-full items-center rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer",
              isExpanded ? "justify-between px-3 py-2" : "justify-center p-2.5"
            )}
            title={isExpanded ? "Perkecil Menu (Icon Saja)" : "Buka Menu Penuh"}
          >
            <div className="flex items-center gap-3">
              {isExpanded ? (
                <PanelLeftClose className="w-4 h-4 flex-shrink-0" />
              ) : (
                <PanelLeftOpen className="w-4 h-4 flex-shrink-0" />
              )}
              {isExpanded && <span>Perkecil Menu</span>}
            </div>
          </button>
        )}

        {/* 3. KELUAR */}
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer group",
            isExpanded ? "justify-start gap-3 px-3 py-2.5" : "justify-center p-2.5"
          )}
          title="Keluar dari Admin Monefyi"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" />
          {isExpanded && <span>Keluar</span>}
        </button>
      </div>
    </aside>
  );
}
