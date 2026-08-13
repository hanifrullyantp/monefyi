import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Menu, X, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { cn } from '../../lib/cn';
import { ADMIN_PANEL_NAV, ADMIN_TAB_COUNT, type AdminPanelTab } from './panel/admin-nav';
import { AdminPanelTabContent } from './panel/AdminPanelTabContent';
import type { SiteSettings } from '../../types';

export function AdminPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, setSettings, save, reset, hasChanges, isSaving, saveError } = useSiteSettings();
  const [tab, setTab] = useState<AdminPanelTab>('dashboard');
  const [localJson, setLocalJson] = useState(JSON.stringify(settings, null, 2));
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalJson(JSON.stringify(settings, null, 2));
    }
  }, [open, settings]);

  const handleApplyDraft = (next: SiteSettings) => {
    setSettings(next);
  };

  const handleSave = async () => {
    try {
      if (tab === 'json-editor') {
        const parsed = JSON.parse(localJson) as SiteSettings;
        const result = await save(parsed);
        if (result.ok) {
          onClose();
          return;
        }
        alert(result.error || 'Gagal menyimpan ke Supabase');
        return;
      }
      const result = await save();
      if (result.ok) {
        onClose();
        return;
      }
      alert(result.error || 'Gagal menyimpan ke Supabase');
    } catch {
      alert('JSON tidak valid. Periksa struktur di JSON Editor.');
    }
  };

  const activeLabel = ADMIN_PANEL_NAV.flatMap((g) => g.items).find((i) => i.id === tab)?.label || tab;

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-7xl" className="!p-0 overflow-hidden">
      <div className="flex flex-col h-[92vh]">
        <header className="bg-slate-900 border-b border-slate-800 p-4 md:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" className="md:hidden text-slate-400" onClick={() => setMobileNav(true)}>
              <Menu size={20} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-amber-950 shrink-0">
              <Settings size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-black text-base md:text-lg uppercase tracking-tighter truncate">
                Command Center
              </h3>
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">
                {ADMIN_TAB_COUNT} sections · {activeLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasChanges && (
              <span className="hidden sm:inline text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                Draft lokal
              </span>
            )}
            {saveError && (
              <span className="hidden lg:inline text-[10px] text-red-400 max-w-[160px] truncate">{saveError}</span>
            )}
            <button type="button" onClick={reset} className="hidden sm:block px-3 py-2 text-xs font-bold text-slate-500 hover:text-white">
              Reset
            </button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-500 text-slate-950 font-black px-4 md:px-8 disabled:opacity-60"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
              Simpan ke Supabase
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <aside className="hidden md:flex w-60 lg:w-64 bg-slate-950 border-r border-slate-800 flex-col overflow-y-auto shrink-0">
            <NavList tab={tab} onSelect={setTab} />
          </aside>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-900/40 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AdminPanelTabContent
                  tab={tab}
                  draft={settings}
                  onChange={handleApplyDraft}
                  localJson={localJson}
                  onJsonChange={setLocalJson}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {mobileNav && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileNav(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-950 border-r border-slate-800 p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Menu</span>
              <button type="button" onClick={() => setMobileNav(false)} className="text-slate-400">
                <X size={20} />
              </button>
            </div>
            <NavList
              tab={tab}
              onSelect={(id) => {
                setTab(id);
                setMobileNav(false);
              }}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

function NavList({ tab, onSelect }: { tab: AdminPanelTab; onSelect: (id: AdminPanelTab) => void }) {
  return (
    <nav className="p-3 space-y-6">
      {ADMIN_PANEL_NAV.map((group) => (
        <div key={group.section}>
          <p className="px-3 mb-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">{group.section}</p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all',
                  tab === item.id
                    ? 'bg-amber-500 text-amber-950 shadow-lg'
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon size={18} />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
