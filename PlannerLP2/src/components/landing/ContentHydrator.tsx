"use client";

import { useEffect } from "react";
import { useContentStore } from "@/lib/store/contentStore";

/** Muat konten landing dari Supabase saat idle agar tidak menghambat LCP & TBT. */
export function ContentHydrator() {
  const loadFromRemote = useContentStore((s) => s.loadFromRemote);
  const isLoaded = useContentStore((s) => s.isLoaded);

  useEffect(() => {
    if (isLoaded) return;

    const isEditUrl =
      typeof window !== "undefined" && window.location.search.includes("edit");
    if (isEditUrl) {
      void loadFromRemote();
      return;
    }

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => void loadFromRemote(), {
        timeout: 2500,
      });
      return () => window.cancelIdleCallback(id);
    }

    const timer = setTimeout(() => void loadFromRemote(), 1200);
    return () => clearTimeout(timer);
  }, [isLoaded, loadFromRemote]);

  return null;
}
