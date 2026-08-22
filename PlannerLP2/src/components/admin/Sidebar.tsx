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
  Sparkles,
  BarChart3,
  Settings,
  Zap,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useContentStore } from "@/lib/store/contentStore";
import { SaveIndicator } from "./SaveIndicator";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/global", icon: Globe, label: "Global & Merek" },
  { href: "/admin/kontak", icon: Phone, label: "Kontak & Sosial" },
  { href: "/admin/seo", icon: Search, label: "SEO & Tracking" },
  { href: "/admin/toast", icon: Bell, label: "Toast Notifikasi" },
  { href: "/admin/faq", icon: HelpCircle, label: "FAQ Editor" },
  { href: "/admin/footer", icon: FileText, label: "Footer & Privasi" },
  { href: "/admin/konten", icon: PanelLeftOpen, label: "Konten Visual" },
  { href: "/admin/konten-json", icon: Code, label: "Konten JSON" },
  { href: "/admin/media", icon: Image, label: "Media Library" },
  { href: "/admin/crm", icon: Users, label: "CRM & Leads" },
  { href: "/admin/crm-template", icon: MessageSquare, label: "Template WA" },
  { href: "/admin/testimonial", icon: Star, label: "Testimonial" },
  { href: "/admin/pricing", icon: DollarSign, label: "Pricing" },
  { href: "/admin/features", icon: Sparkles, label: "Fitur" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const setAdmin = useUIStore((s) => s.setAdmin);
  const { isDirty, lastSaved, isSaving, publishContent, publishError, dbSynced } = useContentStore();

  const handleLogout = async () => {
    await logout();
    setAdmin(false);
    router.push("/");
  };

  return (
    <aside className="flex flex-col h-full bg-slate-900 text-white w-64">
      {/* Header */}
      <div className="flex flex-col p-4 border-b border-slate-800 gap-4">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-glow">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <p className="text-sm font-extrabold leading-tight">Monefyi</p>
              <p className="text-[10px] text-slate-400 leading-tight">Admin Panel</p>
            </div>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <SaveIndicator isDirty={isDirty} lastSaved={lastSaved} isSaving={isSaving} dbSynced={dbSynced} />
        {publishError && (
          <p className="text-[10px] text-red-400 leading-snug">{publishError}</p>
        )}
        {isDirty && (
          <button
            type="button"
            onClick={() => void publishContent()}
            disabled={isSaving}
            className="w-full text-xs font-bold py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSaving ? "Menyimpan ke DB…" : "Publish ke Database"}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-all mb-2"
        >
          <Globe className="w-3.5 h-3.5" />
          Lihat Landing Page
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
