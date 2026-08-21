"use client";
import Link from "next/link";
import { Bell, Menu, ExternalLink, LayoutGrid } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { plannerAppPath } from "@/lib/config/plannerApp";

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

      <div className="flex items-center gap-2 sm:gap-3">
        {isDirty ? (
          <span className="hidden sm:inline text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded-lg">
            Belum disimpan
          </span>
        ) : lastSaved ? (
          <span className="hidden sm:inline text-xs text-emerald-600 font-medium px-2 py-1 bg-emerald-50 rounded-lg">
            Tersimpan
          </span>
        ) : null}

        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Landing Page</span>
          <span className="sm:hidden">Landing</span>
        </Link>

        <a
          href={plannerAppPath("/app")}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Masuk Aplikasi</span>
          <span className="sm:hidden">App</span>
        </a>

        <button
          type="button"
          className="hidden md:flex p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Notifikasi"
        >
          <Bell className="w-5 h-5" />
        </button>

        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
          A
        </div>
      </div>
    </header>
  );
}
