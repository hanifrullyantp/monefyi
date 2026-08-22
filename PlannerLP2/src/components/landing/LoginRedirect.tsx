"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUIStore } from "@/lib/store/uiStore";
import { useAuthStore } from "@/lib/store/authStore";

function LoginRedirectInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setLoginModalOpen = useUIStore((s) => s.setLoginModalOpen);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const setAdmin = useUIStore((s) => s.setAdmin);

  useEffect(() => {
    if (!hydrated) return;

    const wantsLogin = searchParams.get("login") === "1";
    const next = searchParams.get("next") || "";

    if (wantsLogin && !isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }

    if (isAuthenticated && user?.isAdmin) {
      setAdmin(true);
      if (next.startsWith("/admin")) {
        router.replace(next);
      }
    }
  }, [hydrated, isAuthenticated, user, searchParams, setLoginModalOpen, setAdmin, router]);

  return null;
}

export function LoginRedirect() {
  return (
    <Suspense fallback={null}>
      <LoginRedirectInner />
    </Suspense>
  );
}
