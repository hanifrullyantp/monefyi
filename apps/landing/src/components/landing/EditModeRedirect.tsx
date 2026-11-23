"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";

function EditModeRedirectInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const setAdmin = useUIStore((s) => s.setAdmin);
  const setEditMode = useUIStore((s) => s.setEditMode);

  useEffect(() => {
    if (!hydrated || searchParams.get("edit") !== "1") return;

    if (user?.isAdmin) {
      setAdmin(true);
      setEditMode(true);
    }

    router.replace("/", { scroll: false });
  }, [hydrated, user?.isAdmin, searchParams, setAdmin, setEditMode, router]);

  return null;
}

/** Aktifkan inline edit dari query `?edit=1` (dipakai dari admin panel mobile). */
export function EditModeRedirect() {
  return (
    <Suspense fallback={null}>
      <EditModeRedirectInner />
    </Suspense>
  );
}
