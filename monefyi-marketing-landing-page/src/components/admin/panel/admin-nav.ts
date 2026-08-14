import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Globe,
  Phone,
  Search,
  Bell,
  Sparkles,
  Layers,
  Zap,
  MessageSquare,
  CreditCard,
  Gift,
  HelpCircle,
  FileText,
  Smartphone,
  MessageCircle,
  Code,
  Users,
} from 'lucide-react';

export type AdminPanelTab =
  | 'dashboard'
  | 'global'
  | 'contact'
  | 'seo'
  | 'notifications'
  | 'hero'
  | 'sections'
  | 'features'
  | 'testimonials'
  | 'pricing'
  | 'bonus'
  | 'faq'
  | 'footer'
  | 'phone-mockup'
  | 'floating'
  | 'json-editor'
  | 'leads';

export interface AdminNavGroup {
  section: string;
  items: { id: AdminPanelTab; label: string; icon: LucideIcon }[];
}

/** 17 management sections */
export const ADMIN_PANEL_NAV: AdminNavGroup[] = [
  {
    section: 'OVERVIEW',
    items: [{ id: 'dashboard', label: 'Beranda', icon: LayoutDashboard }],
  },
  {
    section: 'KONFIGURASI',
    items: [
      { id: 'global', label: 'Global & Merek', icon: Globe },
      { id: 'contact', label: 'Kontak & Sosial', icon: Phone },
      { id: 'seo', label: 'SEO & Tracking', icon: Search },
      { id: 'notifications', label: 'Notifikasi & Banner', icon: Bell },
    ],
  },
  {
    section: 'KONTEN LANDING',
    items: [
      { id: 'hero', label: 'Hero Section', icon: Sparkles },
      { id: 'sections', label: 'Section & Header', icon: Layers },
      { id: 'features', label: 'Fitur Showcase', icon: Zap },
      { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
      { id: 'pricing', label: 'Pricing', icon: CreditCard },
      { id: 'bonus', label: 'Bonus Apps', icon: Gift },
      { id: 'faq', label: 'FAQ', icon: HelpCircle },
      { id: 'footer', label: 'Footer & Legal', icon: FileText },
    ],
  },
  {
    section: 'KOMPONEN',
    items: [
      { id: 'phone-mockup', label: 'Media & Demo', icon: Smartphone },
      { id: 'floating', label: 'Floating Elements', icon: MessageCircle },
    ],
  },
  {
    section: 'ADVANCED',
    items: [{ id: 'json-editor', label: 'JSON Editor', icon: Code }],
  },
  {
    section: 'CRM',
    items: [{ id: 'leads', label: 'Leads', icon: Users }],
  },
];

export const ADMIN_TAB_COUNT = ADMIN_PANEL_NAV.reduce((n, g) => n + g.items.length, 0);
