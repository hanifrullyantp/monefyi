import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  LogOut,
  X
} from 'lucide-react';
import { cn } from '../../lib/cn';

interface SidebarProps {
  activePage: string;
  onPageChange: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function AdminSidebar({ activePage, onPageChange, isOpen, onClose, onLogout }: SidebarProps) {
  const menuGroups = [
    { 
      label: 'OVERVIEW', 
      items: [
        { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard }
      ] 
    },
    { 
      label: 'KONFIGURASI', 
      items: [
        { id: 'global', label: 'Global & Merek', icon: Globe },
        { id: 'contact', label: 'Kontak & Sosial', icon: Phone },
        { id: 'seo', label: 'SEO & Tracking', icon: Search },
        { id: 'notifications', label: 'Notifikasi Toast', icon: Bell },
      ] 
    },
    { 
      label: 'KONTEN LANDING', 
      items: [
        { id: 'hero', label: 'Hero Section', icon: Sparkles },
        { id: 'sections', label: 'Section Lainnya', icon: Layers },
        { id: 'features', label: 'Fitur & Showcase', icon: Zap },
        { id: 'testimonials', label: 'Testimonial', icon: MessageSquare },
        { id: 'pricing', label: 'Pricing', icon: CreditCard },
        { id: 'bonus', label: 'Bonus & Ebook', icon: Gift },
        { id: 'faq', label: 'FAQ', icon: HelpCircle },
        { id: 'footer', label: 'Footer & Privasi', icon: FileText },
      ] 
    },
    { 
      label: 'KOMPONEN KHUSUS', 
      items: [
        { id: 'phone-mockup', label: 'Phone Mockup', icon: Smartphone },
        { id: 'floating', label: 'Floating Elements', icon: MessageCircle },
      ] 
    },
    { 
      label: 'ADVANCED', 
      items: [
        { id: 'json-editor', label: 'JSON Editor', icon: Code },
      ] 
    },
    { 
      label: 'CRM', 
      items: [
        { id: 'leads', label: 'Leads', icon: Users },
      ] 
    }
  ];

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[220px] bg-slate-950 border-r border-slate-800 transition-transform duration-300 md:translate-x-0 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center text-black font-black text-[10px]">M</div>
            <span className="font-bold tracking-tighter text-lg text-white">Monefyi</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-500">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-6 pb-20 no-scrollbar">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <h5 className="px-3 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">{group.label}</h5>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
                    activePage === item.id 
                      ? "bg-green-500 text-slate-950 font-bold shadow-lg shadow-green-500/20" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  )}
                >
                  <item.icon size={18} className={activePage === item.id ? "" : "group-hover:text-green-400"} />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 bg-slate-950 border-t border-slate-800">
           <button 
             onClick={onLogout}
             className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all font-bold"
           >
             <LogOut size={18} /> Keluar
           </button>
        </div>
      </aside>
    </>
  );
}
