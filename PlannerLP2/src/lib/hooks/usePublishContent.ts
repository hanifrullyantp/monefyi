"use client";

import { useCallback, useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";

/** Simpan perubahan konten ke Supabase setelah update lokal. */
export function usePublishContent() {
  const publishContent = useContentStore((s) => s.publishContent);
  const isDirty = useContentStore((s) => s.isDirty);
  const isSaving = useContentStore((s) => s.isSaving);
  const lastSaved = useContentStore((s) => s.lastSaved);
  const [error, setError] = useState<string | null>(null);

  const publish = useCallback(async () => {
    setError(null);
    try {
      await publishContent();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
      return false;
    }
  }, [publishContent]);

  return { publish, isDirty, isSaving, lastSaved, error };
}
