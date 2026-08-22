"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SiteContent } from "@/lib/types/content";
import { defaultContent } from "@/data/defaultContent";
import {
  fetchLandingContent,
  mergeSiteContent,
  saveLandingContent,
} from "@/lib/services/landingService";

interface ContentStore {
  content: SiteContent;
  isDirty: boolean;
  isSaving: boolean;
  isLoaded: boolean;
  lastSaved: string | null;
  loadError: string | null;
  history: SiteContent[];
  updateContent: (updates: Partial<SiteContent>) => void;
  updateSection: <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => void;
  updateField: (section: keyof SiteContent, field: string, value: unknown) => void;
  resetContent: () => void;
  markSaved: () => void;
  publishContent: () => Promise<void>;
  loadFromRemote: () => Promise<void>;
  saveToHistory: () => void;
  restoreFromHistory: (index: number) => void;
}

export const useContentStore = create<ContentStore>()(
  persist(
    (set, get) => ({
      content: defaultContent,
      isDirty: false,
      isSaving: false,
      isLoaded: false,
      lastSaved: null,
      loadError: null,
      history: [],

      updateContent: (updates) => {
        set((state) => ({
          content: { ...state.content, ...updates },
          isDirty: true,
        }));
      },

      updateSection: (key, value) => {
        set((state) => ({
          content: { ...state.content, [key]: value },
          isDirty: true,
        }));
      },

      updateField: (section, field, value) => {
        set((state) => ({
          content: {
            ...state.content,
            [section]: {
              ...(state.content[section] as object),
              [field]: value,
            },
          },
          isDirty: true,
        }));
      },

      resetContent: () => {
        set({ content: defaultContent, isDirty: true });
      },

      markSaved: () => {
        set({ isDirty: false, lastSaved: new Date().toISOString() });
      },

      publishContent: async () => {
        set({ isSaving: true });
        try {
          await saveLandingContent(get().content);
          set({
            isDirty: false,
            isSaving: false,
            lastSaved: new Date().toISOString(),
            loadError: null,
          });
        } catch (e) {
          set({ isSaving: false });
          throw e;
        }
      },

      loadFromRemote: async () => {
        try {
          const remote = await fetchLandingContent();
          if (remote) {
            set({
              content: mergeSiteContent(remote),
              isDirty: false,
              isLoaded: true,
              loadError: null,
            });
          } else {
            set({ isLoaded: true });
          }
        } catch (e) {
          set({
            isLoaded: true,
            loadError: e instanceof Error ? e.message : "Gagal memuat konten",
          });
        }
      },

      saveToHistory: () => {
        const { content, history } = get();
        const newHistory = [content, ...history].slice(0, 10);
        set({ history: newHistory });
      },

      restoreFromHistory: (index) => {
        const { history } = get();
        if (history[index]) {
          set({ content: history[index], isDirty: true });
        }
      },
    }),
    {
      name: "monefyi_content_lp2",
      partialize: (state) => ({
        content: state.content,
        lastSaved: state.lastSaved,
        history: state.history,
      }),
    },
  ),
);
