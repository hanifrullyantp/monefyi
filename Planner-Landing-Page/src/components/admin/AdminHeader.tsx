"use client";
import { Bell, Menu } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";

interface AdminHeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export function AdminHeader({ title, onMenuClick }: AdminHeaderProps) {
  const { isDirty, lastSaved } = useContentStore();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Save indicator */}
        {isDirty ? (
          <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded-lg">
            Belum disimpan
          </span>
        ) : lastSaved ? (
          <span className="text-xs text-emerald-600 font-medium px-2 py-1 bg-emerald-50 rounded-lg">
            Tersimpan
          </span>
        ) : null}

        <button
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Notifikasi"
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* Admin badge */}
        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
          A
        </div>
      </div>
    </header>
  );
}
