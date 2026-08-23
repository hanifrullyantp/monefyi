"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Edit3, LayoutDashboard, LogOut, Save, CloudUpload } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { usePublishContent } from "@/lib/hooks/usePublishContent";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
import { cn } from "@/lib/utils/cn";

/** Toolbar admin + inline edit — hanya mobile (< md), di landing page. */
export function MobileAdminToolbar() {
  const { isAdmin, isEditMode, setEditMode, setAdmin } = useLandingAdmin();
  const hydrated = useAuthStore((s) => s.hydrated);
  const logout = useAuthStore((s) => s.logout);
  const { publish, isDirty, isSaving } = usePublishContent();

  useEffect(() => {
    if (!isAdmin) {
      document.body.style.paddingBottom = "";
      return;
    }
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      if (!mq.matches) {
        document.body.style.paddingBottom = "";
        return;
      }
      document.body.style.paddingBottom = isEditMode ? "7.25rem" : "4.5rem";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.body.style.paddingBottom = "";
    };
  }, [isAdmin, isEditMode]);

  if (!hydrated || !isAdmin) return null;

  const handleLogout = async () => {
    await logout();
    setAdmin(false);
    setEditMode(false);
  };

  return (
    <div
      className="md:hidden fixed inset-x-0 bottom-0 z-[100] border-t border-slate-800 bg-slate-900 text-white shadow-[0_-8px_30px_rgba(0,0,0,0.35)] pb-[env(safe-area-inset-bottom)]"
      aria-label="Admin toolbar"
    >
      {isEditMode && (
        <p className="px-4 py-2 text-[11px] font-semibold text-emerald-300 bg-emerald-950/50 border-b border-emerald-900/40 text-center">
          Ketuk teks atau gambar yang berbingkai hijau untuk mengedit
        </p>
      )}

      <div className="flex items-center gap-1.5 p-2">
        <button
          type="button"
          onClick={() => setEditMode(!isEditMode)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 min-h-[48px] rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all touch-manipulation",
            isEditMode
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
              : "bg-slate-800 text-slate-100 ring-1 ring-emerald-500/40",
          )}
        >
          {isEditMode ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4 text-emerald-400" />}
          {isEditMode ? "Selesai" : "Inline Edit"}
        </button>

        <Link
          href="/admin"
          className="flex items-center justify-center min-h-[48px] min-w-[48px] rounded-xl bg-slate-800 text-emerald-400 touch-manipulation"
          aria-label="Admin panel"
        >
          <LayoutDashboard className="w-5 h-5" />
        </Link>

        {isDirty && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void publish()}
            className="flex items-center justify-center min-h-[48px] min-w-[48px] rounded-xl bg-amber-500 text-white touch-manipulation disabled:opacity-50"
            aria-label="Publish ke database"
          >
            <CloudUpload className="w-5 h-5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex items-center justify-center min-h-[48px] min-w-[48px] rounded-xl bg-slate-800 text-slate-400 touch-manipulation"
          aria-label="Logout admin"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
