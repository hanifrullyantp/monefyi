"use client";

import { useCallback, useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
import { writeCachedContent } from "@/lib/services/landingService";

/**
 * Toggle inline edit. Saat keluar dari mode edit, simpan ke cache lokal + Supabase jika ada perubahan.
 */
export function useFinishInlineEdit() {
  const { isEditMode, setEditMode } = useLandingAdmin();
  const [saving, setSaving] = useState(false);
  const isDirty = useContentStore((s) => s.isDirty);
  const setSaveNotice = useUIStore((s) => s.setSaveNotice);

  const toggleEditMode = useCallback(async () => {
    if (!isEditMode) {
      setEditMode(true);
      return;
    }

    setEditMode(false);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const state = useContentStore.getState();
    writeCachedContent(state.content);

    if (state.isDirty) {
      setSaving(true);
      const ok = await state.publishContent();
      setSaving(false);
      if (ok) {
        setSaveNotice("Perubahan tersimpan ke database.");
      } else {
        const err =
          useContentStore.getState().publishError ||
          "Gagal ke database — perubahan ada di perangkat ini. Coba Publish lagi atau login ulang.";
        setSaveNotice(err);
      }
    }
  }, [isEditMode, setEditMode, setSaveNotice]);

  return { isEditMode, toggleEditMode, saving, isDirty };
}
