"use client";

import { useEffect } from "react";
import { useContentStore } from "@/lib/store/contentStore";

/** Muat konten landing dari Supabase saat app boot. */
export function ContentHydrator() {
  const loadFromRemote = useContentStore((s) => s.loadFromRemote);
  const isLoaded = useContentStore((s) => s.isLoaded);

  useEffect(() => {
    if (!isLoaded) void loadFromRemote();
  }, [isLoaded, loadFromRemote]);

  return null;
}
