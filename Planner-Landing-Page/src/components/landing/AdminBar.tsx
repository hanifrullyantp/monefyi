"use client";
import { useUiStore } from "@/lib/store/uiStore";
import { Edit3, LayoutDashboard, LogOut, Check } from "lucide-react";
import Link from "next/link";
import { clearSession } from "@/lib/utils/auth";
import { cn } from "@/lib/utils/cn";

export function AdminBar() {
  const { isAdmin, setIsAdmin, inlineEditMode, setInlineEditMode } = useUiStore();

  if (!isAdmin) return null;

  const handleLogout = () => {
    clearSession();
    setIsAdmin(false);
    setInlineEditMode(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-slate-900 text-white h-12 flex items-center px-6 shadow-xl border-b border-slate-800">
      <div className="flex items-center gap-2 mr-6 border-r border-slate-700 pr-6">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider">Estimator Admin</span>
      </div>

      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={() => setInlineEditMode(!inlineEditMode)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
            inlineEditMode 
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          <Edit3 className="w-3.5 h-3.5" />
          {inlineEditMode ? "Inline Edit: ON" : "Inline Edit: OFF"}
        </button>

        <Link
          href="/admin"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Admin Panel
        </Link>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all"
      >
        <LogOut className="w-3.5 h-3.5" />
        Logout
      </button>
    </div>
  );
}
