import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { SiteSettings } from '../types';
import type { LandingCmsPayload } from '../types/landing-cms';
import type { Lead } from '../lib/lead-types';
import { INITIAL_SETTINGS } from '../data/initial-site-settings';
import { mergeSiteSettings } from '../lib/merge-site-settings';
import {
  buildDefaultPayload,
  fetchLandingContent,
  readCachedPayload,
  readLegacyLocalPayload,
  saveLandingContent,
  writeCachedPayload,
} from '../lib/landing-service';

function clonePayload(payload: LandingCmsPayload): LandingCmsPayload {
  return JSON.parse(JSON.stringify(payload)) as LandingCmsPayload;
}

function payloadsEqual(a: LandingCmsPayload, b: LandingCmsPayload): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface LandingCmsContextValue {
  isReady: boolean;
  isLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
  settings: SiteSettings;
  textOverrides: Record<string, string>;
  hasDraftChanges: boolean;
  changeCount: number;
  canUndo: boolean;
  canRedo: boolean;
  updateTextOverride: (id: string, value: string) => void;
  setSettings: (next: SiteSettings) => void;
  patchSettings: (next: SiteSettings) => void;
  undo: () => void;
  redo: () => void;
  discardDraft: () => void;
  resetDraft: () => void;
  saveToSupabase: (settingsOverride?: SiteSettings) => Promise<{ ok: boolean; error?: string }>;
  appendLead: (lead: Lead) => void;
  getOrderedSections: () => SiteSettings['sections'];
}

const LandingCmsContext = createContext<LandingCmsContextValue | null>(null);

export function LandingCmsProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [published, setPublished] = useState<LandingCmsPayload>(() => readCachedPayload() ?? buildDefaultPayload());
  const [draft, setDraft] = useState<LandingCmsPayload>(() => readCachedPayload() ?? buildDefaultPayload());
  const [undoStack, setUndoStack] = useState<{ entries: LandingCmsPayload[]; index: number }>(() => {
    const initial = clonePayload(readCachedPayload() ?? buildDefaultPayload());
    return { entries: [initial], index: 0 };
  });
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const bootstrapped = useRef(false);

  const pushHistory = useCallback((next: LandingCmsPayload) => {
    const cloned = clonePayload(next);
    setUndoStack(({ entries, index }) => {
      const trimmed = entries.slice(0, index + 1);
      return { entries: [...trimmed, cloned], index: trimmed.length };
    });
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const remote = await fetchLandingContent();
        if (cancelled) return;

        let baseline = remote ?? readCachedPayload() ?? readLegacyLocalPayload() ?? buildDefaultPayload();
        baseline = clonePayload(baseline);

        setPublished(baseline);
        setDraft(baseline);
        setUndoStack({ entries: [clonePayload(baseline)], index: 0 });
        writeCachedPayload(baseline);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onLead = (event: Event) => {
      const lead = (event as CustomEvent<Lead>).detail;
      if (!lead) return;
      setDraft((prev) => {
        const next: LandingCmsPayload = {
          ...prev,
          settings: {
            ...prev.settings,
            leads: [lead, ...(prev.settings.leads || [])],
          },
        };
        pushHistory(next);
        return next;
      });
    };

    window.addEventListener('monefyi:lead-captured', onLead);
    return () => window.removeEventListener('monefyi:lead-captured', onLead);
  }, [pushHistory]);

  const settings = useMemo(() => mergeSiteSettings(draft.settings), [draft.settings]);

  const hasDraftChanges = useMemo(
    () => !payloadsEqual(draft, published),
    [draft, published]
  );

  const changeCount = useMemo(() => {
    let count = 0;
    const pubText = published.textOverrides || {};
    Object.keys(draft.textOverrides || {}).forEach((key) => {
      if (draft.textOverrides[key] !== pubText[key]) count++;
    });
    Object.keys(pubText).forEach((key) => {
      if (draft.textOverrides[key] === undefined && pubText[key]) count++;
    });
    if (JSON.stringify(draft.settings) !== JSON.stringify(published.settings)) {
      count += 1;
    }
    return Math.max(count, hasDraftChanges ? 1 : 0);
  }, [draft, published, hasDraftChanges]);

  const updateTextOverride = useCallback((id: string, value: string) => {
    setDraft((prev) => {
      const next: LandingCmsPayload = {
        ...prev,
        textOverrides: { ...prev.textOverrides, [id]: value },
      };
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const setSettings = useCallback((next: SiteSettings) => {
    setDraft((prev) => {
      const payload: LandingCmsPayload = { ...prev, settings: next };
      pushHistory(payload);
      return payload;
    });
  }, [pushHistory]);

  const patchSettings = useCallback((next: SiteSettings) => {
    setSettings(next);
  }, [setSettings]);

  const undo = useCallback(() => {
    setUndoStack(({ entries, index }) => {
      if (index <= 0) return { entries, index };
      const nextIdx = index - 1;
      setDraft(clonePayload(entries[nextIdx]));
      return { entries, index: nextIdx };
    });
  }, []);

  const redo = useCallback(() => {
    setUndoStack(({ entries, index }) => {
      if (index >= entries.length - 1) return { entries, index };
      const nextIdx = index + 1;
      setDraft(clonePayload(entries[nextIdx]));
      return { entries, index: nextIdx };
    });
  }, []);

  const discardDraft = useCallback(() => {
    const baseline = clonePayload(published);
    setDraft(baseline);
    setUndoStack({ entries: [baseline], index: 0 });
    setSaveError(null);
  }, [published]);

  const resetDraft = useCallback(() => {
    if (!confirm('Batalkan semua perubahan draft dan kembali ke versi terakhir disimpan?')) return;
    discardDraft();
  }, [discardDraft]);

  const saveToSupabase = useCallback(async (settingsOverride?: SiteSettings) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = clonePayload(draft);
      if (settingsOverride) {
        payload.settings = settingsOverride;
        setDraft(payload);
      }
      await saveLandingContent(payload);
      writeCachedPayload(payload);
      setPublished(payload);
      setUndoStack({ entries: [clonePayload(payload)], index: 0 });
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menyimpan ke Supabase';
      setSaveError(message);
      return { ok: false as const, error: message };
    } finally {
      setIsSaving(false);
    }
  }, [draft]);

  const appendLead = useCallback((lead: Lead) => {
    setDraft((prev) => {
      const next: LandingCmsPayload = {
        ...prev,
        settings: {
          ...prev.settings,
          leads: [lead, ...(prev.settings.leads || [])],
        },
      };
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const getOrderedSections = useCallback(() => {
    const sections = settings.sections || INITIAL_SETTINGS.sections;
    return [...sections].sort((a, b) => a.order - b.order);
  }, [settings.sections]);

  const value = useMemo<LandingCmsContextValue>(
    () => ({
      isReady,
      isLoading,
      isSaving,
      saveError,
      settings,
      textOverrides: draft.textOverrides,
      hasDraftChanges,
      changeCount,
      canUndo: undoStack.index > 0,
      canRedo: undoStack.index < undoStack.entries.length - 1,
      updateTextOverride,
      setSettings,
      patchSettings,
      undo,
      redo,
      discardDraft,
      resetDraft,
      saveToSupabase,
      appendLead,
      getOrderedSections,
    }),
    [
      isReady,
      isLoading,
      isSaving,
      saveError,
      settings,
      draft.textOverrides,
      hasDraftChanges,
      changeCount,
      undoStack.index,
      undoStack.entries.length,
      updateTextOverride,
      setSettings,
      patchSettings,
      undo,
      redo,
      discardDraft,
      resetDraft,
      saveToSupabase,
      appendLead,
      getOrderedSections,
    ]
  );

  return <LandingCmsContext.Provider value={value}>{children}</LandingCmsContext.Provider>;
}

export function useLandingCms(): LandingCmsContextValue {
  const ctx = useContext(LandingCmsContext);
  if (!ctx) throw new Error('useLandingCms must be used within LandingCmsProvider');
  return ctx;
}
