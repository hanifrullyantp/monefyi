"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";

/** Hydrate Supabase session dan set mode admin dari role user. */
export function AuthHydrator() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const setAdmin = useUIStore((s) => s.setAdmin);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    setAdmin(Boolean(user?.isAdmin));
  }, [hydrated, user?.isAdmin, setAdmin]);

  return null;
}
