import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Layout, 
  Code, 
  Image as ImageIcon, 
  Eye, 
  EyeOff, 
  MoveUp, 
  MoveDown, 
  Globe, 
  Target, 
  Save, 
  RotateCcw,
  PlayCircle as Youtube,
  Play,
  CheckCircle2,
  PieChart,
  Users,
  MousePointer2,
  Mail,
  Phone,
  Info
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useSiteSettings, INITIAL_SETTINGS } from '../../hooks/useSiteSettings';
import { cn } from '../../lib/cn';
import { SectionCard } from './SectionCard';
import { AdminInput } from './form/AdminInput';
import { AdminTextarea } from './form/AdminTextarea';

type AdminTab = 'overview' | 'general' | 'branding' | 'sections' | 'hero' | 'media' | 'json';

export function AdminPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const { settings, setSettings, save, reset, hasChanges } = useSiteSettings();
  
  const [localJson, setLocalJson] = useState(JSON.stringify(settings, null, 2));

  useEffect(() => {
    if (tab !== 'json') {
      setLocalJson(JSON.stringify(settings, null, 2));
    }
  }, [settings, tab]);

  const handleGlobalSave = () => {
    try {
      if (tab === 'json') {
        setSettings(JSON.parse(localJson));
      }
      save();
      onClose();
    } catch (e) {
      alert('Invalid JSON structure');
    }
  };

  const updatePath = (path: string, value: any) => {
    setSettings((prev: any) => {
      const next = { ...prev };
      const keys = path.split('.');
      let curr = next;
      for (let i = 0; i < keys.length - 1; i++) curr = curr[keys[i]];
      curr[keys[keys.length - 1]] = value;
      return next;
    });
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-6xl" className="!p-0 overflow-hidden">
      <div className="flex flex-col h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-amber-950 shadow-lg">
              <Settings size={24} />
            </div>
            <div className="hidden sm:block">
              <h3 className="text-white font-black text-lg leading-tight uppercase tracking-tighter">Command Center</h3>
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Master Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
               <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-500 text-[10px] font-black uppercase tracking-widest">Unsaved Changes</span>
            )}
            <button onClick={reset} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-white transition-colors">Reset</button>
            <Button size="sm" onClick={handleGlobalSave} className="bg-green-500 text-slate-950 font-black px-8">Save & Publish</Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-slate-950 border-r border-slate-800 p-4 space-y-1 overflow-y-auto no-scrollbar hidden md:block">
             <SidebarTab active={tab === 'overview'} onClick={() => setTab('overview')} icon={PieChart} label="Overview" />
             <SidebarTab active={tab === 'general'} onClick={() => setTab('general')} icon={Info} label="General" />
             <SidebarTab active={tab === 'branding'} onClick={() => setTab('branding')} icon={Globe} label="Branding" />
             <SidebarTab active={tab === 'hero'} onClick={() => setTab('hero')} icon={Play} label="Hero Content" />
             <SidebarTab active={tab === 'sections'} onClick={() => setTab('sections')} icon={Layout} label="Section Order" />
             <SidebarTab active={tab === 'media'} onClick={() => setTab('media')} icon={ImageIcon} label="Media" />
             <div className="pt-4 mt-4 border-t border-slate-900">
                <SidebarTab active={tab === 'json'} onClick={() => setTab('json')} icon={Code} label="Raw JSON" />
             </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-900/30">
             <AnimatePresence mode="wait">
                {tab === 'overview' && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <StatCard icon={Users} label="Total Users" value="3,847" trend="+12% this week" color="blue" />
                         <StatCard icon={MousePointer2} label="CTR Rate" value="14.2%" trend="+2.4% vs last mo" color="green" />
                         <StatCard icon={Layout} label="Active Sections" value={`${settings.sections.filter((s:any) => s.active).length} / ${settings.sections.length}`} color="amber" />
                      </div>
                      <SectionCard title="Active Marketing Pixels">
                         <div className="space-y-4">
                            <AdminInput label="Facebook Pixel ID" value={settings.marketing.fbPixelId} onChange={(v:string) => updatePath('marketing.fbPixelId', v)} placeholder="123456789" icon={Target} />
                            <AdminInput label="Google Analytics ID" value={settings.marketing.googleAnalyticsId} onChange={(v:string) => updatePath('marketing.googleAnalyticsId', v)} placeholder="G-XXXXXXXX" icon={Globe} />
                         </div>
                      </SectionCard>
                   </motion.div>
                )}

                {tab === 'general' && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 max-w-2xl text-left">
                     <SectionCard title="Global Text Configuration">
                        <div className="space-y-6">
                           <AdminInput label="Site Name" value={settings.general.siteName} onChange={(v:string) => updatePath('general.siteName', v)} />
                           <AdminInput label="Tagline" value={settings.general.tagline} onChange={(v:string) => updatePath('general.tagline', v)} />
                           <AdminTextarea label="Meta Description" value={settings.general.description} onChange={(v:string) => updatePath('general.description', v)} />
                        </div>
                     </SectionCard>
                  </motion.div>
                )}

                {tab === 'hero' && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 max-w-2xl text-left">
                     <SectionCard title="Hero headlines">
                        <div className="space-y-6">
                           <AdminInput label="Eyebrow Badge" value={settings.content.hero.eyebrow} onChange={(v:string) => updatePath('content.hero.eyebrow', v)} />
                           <AdminInput label="Headline Line 1" value={settings.content.hero.headline1} onChange={(v:string) => updatePath('content.hero.headline1', v)} />
                           <AdminInput label="Headline Line 2 (Green)" value={settings.content.hero.headline2} onChange={(v:string) => updatePath('content.hero.headline2', v)} />
                           <AdminTextarea label="Sub-headline" value={settings.content.hero.subheadline} onChange={(v:string) => updatePath('content.hero.subheadline', v)} />
                        </div>
                     </SectionCard>
                  </motion.div>
                )}

                {tab === 'sections' && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 max-w-3xl text-left">
                     {settings.sections.sort((a:any, b:any) => a.order - b.order).map((s: any, idx: number) => (
                       <div key={s.id} className={cn("flex items-center gap-6 p-4 rounded-3xl border transition-all", s.active ? "bg-slate-800 border-white/5" : "bg-slate-950 opacity-40")}>
                          <div className="flex flex-col gap-1">
                             <button onClick={() => {
                                const newSections = [...settings.sections];
                                const target = idx - 1;
                                if (target < 0) return;
                                const temp = newSections[idx].order;
                                newSections[idx].order = newSections[target].order;
                                newSections[target].order = temp;
                                updatePath('sections', newSections);
                             }} className="text-slate-600 hover:text-white p-1"><MoveUp size={14}/></button>
                             <button onClick={() => {
                                const newSections = [...settings.sections];
                                const target = idx + 1;
                                if (target >= newSections.length) return;
                                const temp = newSections[idx].order;
                                newSections[idx].order = newSections[target].order;
                                newSections[target].order = temp;
                                updatePath('sections', newSections);
                             }} className="text-slate-600 hover:text-white p-1"><MoveDown size={14}/></button>
                          </div>
                          <div className="flex-grow">
                             <h4 className="text-white font-bold text-sm">{s.label}</h4>
                             <code className="text-[9px] text-slate-600 uppercase tracking-tighter">ID: {s.id}</code>
                          </div>
                          <button 
                            onClick={() => {
                               const newSections = settings.sections.map((sec: any) => sec.id === s.id ? { ...sec, active: !sec.active } : sec);
                               updatePath('sections', newSections);
                            }}
                            className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all", s.active ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400")}
                          >
                             {s.active ? 'Visible' : 'Hidden'}
                          </button>
                       </div>
                     ))}
                  </motion.div>
                )}

                {tab === 'json' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col text-left">
                     <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                           <Code className="text-amber-500" size={20} />
                           <h4 className="text-white font-black uppercase tracking-tighter tracking-widest">Master JSON Configuration</h4>
                        </div>
                     </div>
                     <textarea
                       value={localJson}
                       onChange={(e) => setLocalJson(e.target.value)}
                       className="flex-1 bg-slate-950 border border-white/5 rounded-3xl p-8 text-xs text-green-400 font-mono focus:outline-none focus:border-amber-500/50 resize-none shadow-inner"
                       spellCheck={false}
                     />
                  </motion.div>
                )}
             </AnimatePresence>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SidebarTab({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-300 group", active ? "bg-amber-500 text-amber-950 shadow-xl" : "text-slate-500 hover:text-slate-200 hover:bg-white/5")}>
      <Icon size={20} className={cn("transition-transform duration-300", active ? "scale-110" : "group-hover:scale-110")} />
      <span>{label}</span>
    </button>
  );
}

function StatCard({ icon: Icon, label, value, trend, color }: any) {
  const colors: any = { blue: "text-blue-400 bg-blue-500/10", green: "text-green-400 bg-green-500/10", amber: "text-amber-400 bg-amber-500/10" };
  return (
    <div className="p-6 bg-slate-800/40 border border-white/5 rounded-[2rem] text-left">
       <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-inner", colors[color])}><Icon size={20} /></div>
       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
       <h4 className="text-3xl font-black text-white mt-1 leading-none">{value}</h4>
       {trend && <p className="text-[10px] font-bold text-green-500 mt-2">{trend}</p>}
    </div>
  );
}
