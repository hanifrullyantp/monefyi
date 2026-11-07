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
  PanelLeftClose,
  Code,
  Image,
  Users,
  MessageSquare,
  Star,
  DollarSign,
  Sparkles,
  BarChart3,
  Settings,
  X,
  LogOut,
  Edit3,
  Megaphone,
  Sun,
  Moon,
} from "lucide-react";
import { EstimatorLogo } from "@/components/brand/EstimatorLogo";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useContentStore } from "@/lib/store/contentStore";
import { INLINE_EDIT_LANDING_PATH } from "@/lib/hooks/useLandingAdmin";
import { SaveIndicator } from "./SaveIndicator";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard CRM" },
  { href: "/admin/crm", icon: Users, label: "CRM & Leads" },
  { href: "/admin/marketing", icon: Megaphone, label: "Marketing AI & Meta Ads" },
  { href: "/admin/whatsapp", icon: MessageSquare, label: "Bot WhatsApp CS & Tim" },
  { href: "/admin/crm-template", icon: MessageSquare, label: "Template WA" },
  { href: "/admin/pricing", icon: DollarSign, label: "Pricing & Paket" },
  { href: "/admin/konten", icon: PanelLeftOpen, label: "Konten Visual" },
  { href: "/admin/konten-json", icon: Code, label: "Konten JSON" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/global", icon: Globe, label: "Global & Merek" },
  { href: "/admin/kontak", icon: Phone, label: "Kontak & Sosial" },
  { href: "/admin/seo", icon: Search, label: "SEO & Tracking" },
  { href: "/admin/toast", icon: Bell, label: "Toast Notifikasi" },
  { href: "/admin/relink-popup", icon: Sparkles, label: "Popup Relink" },
  { href: "/admin/faq", icon: HelpCircle, label: "FAQ Editor" },
  { href: "/admin/testimonial", icon: Star, label: "Testimonial" },
  { href: "/admin/features", icon: Sparkles, label: "Fitur" },
  { href: "/admin/media", icon: Image, label: "Media Library" },
  { href: "/admin/footer", icon: FileText, label: "Footer & Privasi" },
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
  const setAdminSidebarOpen = useUIStore((s) => s.setAdminSidebarOpen);
  const { isDirty, lastSaved, isSaving, publishContent, publishError, dbSynced } = useContentStore();
  const adminTheme = useUIStore((s) => s.adminTheme);
  const toggleAdminTheme = useUIStore((s) => s.toggleAdminTheme);

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
            <EstimatorLogo className="w-8 h-8 rounded-lg" />
            <div>
              <p className="text-sm font-extrabold leading-tight">Monefyi</p>
              <p className="text-[10px] text-slate-400 leading-tight">Admin Panel</p>
            </div>
          </Link>
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
                onClick={() => setAdminSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Sembunyikan Menu Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
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
      <div className="p-4 border-t border-slate-800 space-y-1">
        <button
          type="button"
          onClick={toggleAdminTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {adminTheme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
            <span>Tema: {adminTheme === "dark" ? "Dark Mode" : "Light Mode"}</span>
          </span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
            {adminTheme === "dark" ? "Gelap" : "Terang"}
          </span>
        </button>
        <Link
          href={INLINE_EDIT_LANDING_PATH}
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/40 transition-all"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Inline Edit Landing
        </Link>
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
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
