"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createCompatStorage } from "@/lib/store/compatStorage";
import { SiteSettings, defaultSettings } from "@/lib/types/settings";

interface SettingsStore {
  settings: SiteSettings;
  updateSettings: (updates: Partial<SiteSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
    }),
    {
      name: "froyek-settings",
      storage: createCompatStorage(),
      merge: (persisted, current) => ({
        ...current,
        settings: {
          ...defaultSettings,
          ...(persisted as SettingsStore | undefined)?.settings,
        },
      }),
    }
  )
);
