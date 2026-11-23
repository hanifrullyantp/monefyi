"use client";

import { useEffect, type ReactNode } from "react";

/** Markup publik saja — token layout full-bleed (bukan shell aplikasi). */
export function PublicLandingRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("lp-public");
    return () => document.documentElement.classList.remove("lp-public");
  }, []);

  return <div className="lp-bleed min-h-screen bg-[var(--bg)]">{children}</div>;
}
