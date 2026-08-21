"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  Phone,
  Search,
  Bell,
  HelpCircle,
  FileText,
  PanelLeftOpen,
  Code,
  Image,
  Users,
  MessageSquare,
  Star,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  LayoutGrid,
} from "lucide-react";
import { plannerAppPath } from "@/lib/config/plannerApp";
import { cn } from "@/lib/utils/cn";
import { clearSession } from "@/lib/utils/auth";
import { useState } from "react";

const menuItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Beranda" },
  { href: "/admin/global", icon: Globe, label: "Global & Merek" },
  { href: "/admin/kontak", icon: Phone, label: "Kontak & Sosial" },
  { href: "/admin/form", icon: ClipboardList, label: "Form Lead" },
  { href: "/admin/seo", icon: Search, label: "SEO & Tracking" },
  { href: "/admin/toast", icon: Bell, label: "Notifikasi Toast" },
  { href: "/admin/faq", icon: HelpCircle, label: "FAQ" },
  { href: "/admin/footer", icon: FileText, label: "Footer & Privasi" },
  { href: "/admin/konten", icon: PanelLeftOpen, label: "Konten Landing" },
  { href: "/admin/konten-json", icon: Code, label: "Konten (JSON)" },
  { href: "/admin/media", icon: Image, label: "Media & Branding" },
  { href: "/admin/crm", icon: Users, label: "CRM & Leads" },
  { href: "/admin/crm-template", icon: MessageSquare, label: "Template WA" },
  { href: "/admin/testimonial", icon: Star, label: "Testimonial" },
  { href: "/admin/pricing", icon: DollarSign, label: "Pricing" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    clearSession();
    window.location.href = "/admin/login";
  };

  return (
    <aside
      className={cn(
        "admin-sidebar flex flex-col transition-all duration-300 z-30",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800">
        {!collapsed && (
          <Link href="/" className="text-white font-bold text-base truncate">
            Monefyi Planner
          </Link>
        )}
        <button
          onClick={onToggle}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800 flex-shrink-0"
          aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/admin" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group",
                isActive
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-emerald-400")} />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Keluar ke landing / app */}
      <div className="px-2 pb-2 space-y-1 border-t border-slate-800 pt-3">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all",
            collapsed && "justify-center",
          )}
          title={collapsed ? "Landing Page" : undefined}
        >
          <ExternalLink className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Landing Page</span>}
        </Link>
        <a
          href={plannerAppPath("/app")}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-emerald-400/90 hover:text-emerald-300 hover:bg-slate-800 transition-all",
            collapsed && "justify-center",
          )}
          title={collapsed ? "Masuk Aplikasi" : undefined}
        >
          <LayoutGrid className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Masuk Aplikasi</span>}
        </a>
      </div>

      {/* Logout */}
      <div className="px-2 pb-4 border-t border-slate-800 pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all w-full"
          title={collapsed ? "Keluar" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Keluar</span>}
        </button>
      </div>
    </aside>
  );
}
