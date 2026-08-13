import React, { useState } from 'react';
import { Edit, Download, RotateCcw, X, Settings } from 'lucide-react';
import { useAdminMode } from '../../hooks/useAdminMode';
import { useAdminAuthContext } from '../../context/AdminAuthContext';
import { AdminPanel } from './AdminPanel';

export function AdminBar(): React.ReactElement | null {
  const [panelOpen, setPanelOpen] = useState(false);
  const isAdmin = useAdminMode();
  const { user, exitEditMode } = useAdminAuthContext();
  if (!isAdmin) return null;

  const handleExport = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('monefyi_lp_')) {
        const value = localStorage.getItem(key);
        if (value) data[key] = value;
      }
    }
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      alert('Data exported to clipboard!');
    });
  };

  const handleReset = () => {
    if (confirm('Reset semua perubahan? Ini tidak bisa dibatalkan.')) {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('monefyi_lp_')) keys.push(key);
      }
      keys.forEach(k => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  const handleExit = () => {
    exitEditMode();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-10 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-between px-4 text-sm font-medium text-amber-950">
      <div className="flex items-center gap-2">
        <Edit size={14} />
        <span className="font-bold">ADMIN EDIT MODE</span>
        <span className="hidden sm:inline text-amber-900 text-xs">
          — {user?.email || 'Admin'} · klik teks untuk edit
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-1 bg-amber-950/20 hover:bg-amber-950/30 px-3 py-1 rounded-lg transition-colors text-xs font-bold"
        >
          <Settings size={12} /> Command Center
        </button>
        <button onClick={handleExport} className="hidden md:flex items-center gap-1 bg-amber-950/20 hover:bg-amber-950/30 px-3 py-1 rounded-lg transition-colors text-xs">
          <Download size={12} /> Export
        </button>
        <button onClick={handleReset} className="hidden md:flex items-center gap-1 bg-amber-950/20 hover:bg-amber-950/30 px-3 py-1 rounded-lg transition-colors text-xs">
          <RotateCcw size={12} /> Reset
        </button>
        <button onClick={handleExit} className="flex items-center gap-1 bg-amber-950/30 hover:bg-amber-950/40 px-3 py-1 rounded-lg transition-colors text-xs font-bold">
          <X size={12} /> Exit
        </button>
      </div>

      <AdminPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  );
}
