import React, { useState } from 'react';
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
  ExternalLink,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { AdminInput } from './form/AdminInput';
import { AdminTextarea } from './form/AdminTextarea';
import { AdminToggle } from './form/AdminToggle';
import { AdminRepeater } from './form/AdminRepeater';
import { SaveButton } from './SaveButton';
import { SectionCard } from './SectionCard';

export default function AdminDashboardPage() {
  const { isAuth, logout } = useAdminAuth();
  const { settings, setSettings } = useSiteSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [activePage, setActivePage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (isAuth === false) return null; // Guard handled by layout usually

  const handleSave = () => {
    setSettings(localSettings);
    alert('Perubahan berhasil disimpan!');
  };

  const navItems = [
    { section: 'OVERVIEW', items: [
      { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    ]},
    { section: 'KONFIGURASI', items: [
      { id: 'global', label: 'Global & Merek', icon: Globe },
      { id: 'contact', label: 'Kontak & Sosial', icon: Phone },
      { id: 'seo', label: 'SEO & Tracking', icon: Search },
      { id: 'notifications', label: 'Notifikasi Toast', icon: Bell },
    ]},
    { section: 'KONTEN LANDING', items: [
      { id: 'hero', label: 'Hero Section', icon: Sparkles },
      { id: 'sections', label: 'Section Lainnya', icon: Layers },
      { id: 'features', label: 'Fitur & Showcase', icon: Zap },
      { id: 'testimonials', label: 'Testimonial', icon: MessageSquare },
      { id: 'pricing', label: 'Pricing', icon: CreditCard },
      { id: 'bonus', label: 'Bonus & Ebook', icon: Gift },
      { id: 'faq', label: 'FAQ', icon: HelpCircle },
      { id: 'footer', label: 'Footer & Privasi', icon: FileText },
    ]},
    { section: 'KOMPONEN KHUSUS', items: [
      { id: 'phone-mockup', label: 'Media & Demo', icon: Smartphone },
      { id: 'floating', label: 'Floating Elements', icon: MessageCircle },
    ]},
    { section: 'ADVANCED', items: [
      { id: 'json-editor', label: 'JSON Editor', icon: Code },
    ]},
    { section: 'CRM', items: [
      { id: 'leads', label: 'Leads', icon: Users },
    ]}
  ];

  return (
    <div className="flex min-h-screen bg-slate-900 text-white font-sans">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[220px] bg-slate-950 border-r border-slate-800 transition-transform duration-300 md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center text-black font-black text-xs">M</div>
             <span className="font-bold tracking-tighter text-lg">Monefyi</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Admin Panel</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-6 pb-20">
          {navItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <h5 className="px-3 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">{group.section}</h5>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActivePage(item.id); setIsSidebarOpen(false); }}
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

        <div className="absolute bottom-0 left-0 right-0 p-3 bg-slate-950 border-t border-slate-800">
           <button 
             onClick={logout}
             className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all font-bold"
           >
             <LogOut size={18} /> Keluar
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-[220px] min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-400">
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                 <span>Admin</span>
                 <ChevronRight size={12} />
                 <span className="text-white capitalize">{activePage.replace('-', ' ')}</span>
              </div>
           </div>
           <a 
             href="/" 
             target="_blank" 
             className="flex items-center gap-2 text-xs font-bold text-green-400 hover:text-green-300 transition-colors bg-green-400/5 px-4 py-2 rounded-full border border-green-400/10"
           >
             Lihat Landing <ExternalLink size={14} />
           </a>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 md:p-10 max-w-4xl">
           <div className="flex justify-between items-end mb-10">
              <div>
                 <h1 className="text-3xl font-black text-white capitalize">{activePage.replace('-', ' ')}</h1>
                 <p className="text-slate-500 text-sm mt-1">Kelola data {activePage} tanpa edit kode.</p>
              </div>
           </div>

           <div className="space-y-10 pb-32">
              {/* Dynamic Page Rendering based on activePage */}
              {activePage === 'dashboard' && <DashboardTab leads={localSettings.leads} />}
              {activePage === 'global' && <GlobalTab data={localSettings.general} branding={localSettings.branding} onChange={setLocalSettings} />}
              {/* Add more tabs here */}
              
              <div className="fixed bottom-8 right-8 z-50">
                 <SaveButton onSave={handleSave} hasChanges={JSON.stringify(localSettings) !== JSON.stringify(settings)} />
              </div>
           </div>
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

function DashboardTab({ leads }: any) {
  return (
    <div className="space-y-8">
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Leads</p>
             <h4 className="text-2xl font-black text-white">{leads?.length || 0}</h4>
          </div>
          {/* Repeat stats */}
       </div>
       
       <SectionCard title="Leads Terbaru">
          <div className="overflow-x-auto -mx-6">
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-900/50 text-slate-500 uppercase text-[10px] font-black">
                   <tr>
                      <th className="px-6 py-4">Nama</th>
                      <th className="px-6 py-4">WA</th>
                      <th className="px-6 py-4">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                   {leads?.slice(0, 5).map((l: any) => (
                     <tr key={l.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-bold">{l.name}</td>
                        <td className="px-6 py-4 text-slate-400">{l.whatsapp}</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold uppercase">{l.status}</span></td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </SectionCard>
    </div>
  );
}

function GlobalTab({ data, branding, onChange }: any) {
  return (
    <div className="space-y-8">
       <SectionCard title="Identitas Situs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <AdminInput label="Nama Situs" value={data.siteName} onChange={(v) => onChange((p:any)=>({...p, general: {...p.general, siteName: v}}))} />
             <AdminInput label="Domain" value={data.domain} onChange={(v) => onChange((p:any)=>({...p, general: {...p.general, domain: v}}))} />
          </div>
       </SectionCard>
    </div>
  );
}
