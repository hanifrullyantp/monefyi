"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SiteContent } from "@/lib/types/content";
import { defaultContent } from "@/data/defaultContent";
import {
  fetchLandingContent,
  mergeSiteContent,
  saveLandingContent,
  writeCachedContent,
} from "@/lib/services/landingService";

interface ContentStore {
  content: SiteContent;
  isDirty: boolean;
  isSaving: boolean;
  isLoaded: boolean;
  lastSaved: string | null;
  remoteUpdatedAt: string | null;
  dbSynced: boolean;
  publishError: string | null;
  loadError: string | null;
  history: SiteContent[];
  updateContent: (updates: Partial<SiteContent>) => void;
  updateSection: <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => void;
  updateField: (section: keyof SiteContent, field: string, value: unknown) => void;
  resetContent: () => void;
  markSaved: () => void;
  publishContent: () => Promise<boolean>;
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
      remoteUpdatedAt: null,
      dbSynced: false,
      publishError: null,
      loadError: null,
      history: [],

      updateContent: (updates) => {
        set((state) => {
          const content = { ...state.content, ...updates };
          writeCachedContent(content);
          return { content, isDirty: true, publishError: null };
        });
      },

      updateSection: (key, value) => {
        set((state) => {
          const content = { ...state.content, [key]: value };
          writeCachedContent(content);
          return { content, isDirty: true, publishError: null };
        });
      },

      updateField: (section, field, value) => {
        set((state) => {
          const path = field.split(".").filter(Boolean);
          const currentSection = (state.content[section] || defaultContent[section] || {}) as Record<string, unknown>;
          const updatedSection = structuredClone(currentSection);
          let target: Record<string, unknown> | unknown[] = updatedSection;

          for (const segment of path.slice(0, -1)) {
            const key: string | number = Array.isArray(target) && /^\d+$/.test(segment)
              ? Number(segment)
              : segment;
            const next = (target as Record<string | number, unknown>)[key];
            if (!next || typeof next !== "object") break;
            target = next as Record<string, unknown> | unknown[];
          }

          const finalSegment = path.at(-1);
          if (finalSegment !== undefined) {
            const key: string | number = Array.isArray(target) && /^\d+$/.test(finalSegment)
              ? Number(finalSegment)
              : finalSegment;
            (target as Record<string | number, unknown>)[key] = value;
          }

          const content = { ...state.content, [section]: updatedSection } as SiteContent;
          writeCachedContent(content);
          return { content, isDirty: true, publishError: null };
        });
      },

      resetContent: () => {
        set({ content: defaultContent, isDirty: true, publishError: null });
      },

      markSaved: () => {
        set({ isDirty: false, lastSaved: new Date().toISOString() });
      },

      publishContent: async () => {
        set({ isSaving: true, publishError: null });
        try {
          const { updatedAt } = await saveLandingContent(get().content);
          set({
            isDirty: false,
            isSaving: false,
            lastSaved: new Date().toISOString(),
            remoteUpdatedAt: updatedAt,
            dbSynced: true,
            loadError: null,
            publishError: null,
          });
          return true;
        } catch (e) {
          const message = e instanceof Error ? e.message : "Gagal menyimpan ke database";
          set({ isSaving: false, publishError: message });
          return false;
        }
      },

      loadFromRemote: async () => {
        try {
          const { isDirty, content: localContent } = get();
          const remote = await fetchLandingContent();
          if (remote?.fromDatabase) {
            if (isDirty) {
              writeCachedContent(localContent);
              set({
                isLoaded: true,
                loadError: null,
                remoteUpdatedAt: remote.updatedAt,
                dbSynced: true,
              });
              return;
            }
            set({
              content: mergeSiteContent(remote.content),
              isDirty: false,
              isLoaded: true,
              loadError: null,
              publishError: null,
              remoteUpdatedAt: remote.updatedAt,
              dbSynced: true,
              lastSaved: remote.updatedAt ?? get().lastSaved,
            });
            return;
          }

          set({
            isLoaded: true,
            dbSynced: false,
            loadError: remote
              ? null
              : "Konten belum ada di database — klik Publish Changes untuk simpan permanen.",
          });
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
          set({ content: history[index], isDirty: true, publishError: null });
        }
      },
    }),
    {
      name: "monefyi_content_lp3",
      partialize: (state) => ({
        content: state.content,
        isDirty: state.isDirty,
        lastSaved: state.lastSaved,
        remoteUpdatedAt: state.remoteUpdatedAt,
        dbSynced: state.dbSynced,
        history: state.history,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<ContentStore> | undefined;
        if (!saved?.content) return current;
        return {
          ...current,
          ...saved,
          content: mergeSiteContent(saved.content),
          history: (saved.history ?? current.history).map((item) =>
            mergeSiteContent(item),
          ),
        };
      },
      onRehydrateStorage: () => {
        return () => {
          void useContentStore.getState().loadFromRemote();
        };
      },
    },
  ),
);
