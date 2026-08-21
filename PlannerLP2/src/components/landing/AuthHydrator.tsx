"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";
import { isAuthenticated } from "@/lib/utils/auth";

/** Hydrate Supabase session + admin inline-edit session on public pages. */
export function AuthHydrator() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const setAdmin = useUIStore((s) => s.setAdmin);

  useEffect(() => {
    void hydrate();
    if (isAuthenticated()) {
      setAdmin(true);
    }
  }, [hydrate, setAdmin]);

  return null;
}
