import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FrontDeskPreferences {
  /** Animasi UI (stagger, transitions) */
  animationsEnabled: boolean;
  /** Efek suara */
  soundsEnabled: boolean;
  /** Keyboard shortcuts global */
  keyboardShortcutsEnabled: boolean;
  /** Dark mode (class on html) */
  darkMode: boolean;
  /** Volume 0–1 */
  soundVolume: number;
}

const DEFAULT_PREFERENCES: FrontDeskPreferences = {
  animationsEnabled: true,
  soundsEnabled: true,
  keyboardShortcutsEnabled: true,
  darkMode: false,
  soundVolume: 0.6,
};

interface FrontDeskPreferencesState extends FrontDeskPreferences {
  setPreference: <K extends keyof FrontDeskPreferences>(
    key: K,
    value: FrontDeskPreferences[K]
  ) => void;
  resetPreferences: () => void;
}

function applyDarkMode(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', enabled);
}

export const useFrontDeskPreferencesStore = create<FrontDeskPreferencesState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PREFERENCES,

      setPreference: (key, value) => {
        set({ [key]: value } as Partial<FrontDeskPreferencesState>);
        if (key === 'darkMode') {
          applyDarkMode(value as boolean);
        }
      },

      resetPreferences: () => {
        set(DEFAULT_PREFERENCES);
        applyDarkMode(DEFAULT_PREFERENCES.darkMode);
      },
    }),
    {
      name: 'stay-frontdesk-preferences',
      onRehydrateStorage: () => (state) => {
        applyDarkMode(Boolean(state?.darkMode));
      },
    }
  )
);

/** Hook untuk cek apakah animasi boleh dijalankan */
export function useAnimationsEnabled(): boolean {
  const enabled = useFrontDeskPreferencesStore((s) => s.animationsEnabled);
  if (!enabled) return false;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  return true;
}
