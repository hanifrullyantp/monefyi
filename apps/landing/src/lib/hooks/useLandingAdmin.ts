"use client";

import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";

/** Admin CMS — sinkronkan uiStore dengan role Supabase. */
export function useLandingAdmin(): {
  isAdmin: boolean;
  isEditMode: boolean;
  setEditMode: (enabled: boolean) => void;
  setAdmin: (enabled: boolean) => void;
} {
  const userIsAdmin = useAuthStore((s) => Boolean(s.user?.isAdmin));
  const uiIsAdmin = useUIStore((s) => s.isAdmin);
  const isEditMode = useUIStore((s) => s.isEditMode);
  const setEditMode = useUIStore((s) => s.setEditMode);
  const setAdmin = useUIStore((s) => s.setAdmin);

  return {
    isAdmin: userIsAdmin || uiIsAdmin,
    isEditMode,
    setEditMode,
    setAdmin,
  };
}

/** URL landing dengan inline edit aktif. */
export const INLINE_EDIT_LANDING_PATH = "/?edit=1";
