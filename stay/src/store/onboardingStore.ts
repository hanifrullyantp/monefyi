import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OnboardingStatus } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface OnboardingState {
  tourActive: boolean;
  setupModalOpen: boolean;
  onboardingStatus: OnboardingStatus;
  onboardingCompleted: boolean;
  setupCompleted: boolean;
  startTour: () => void;
  stopTour: () => void;
  openSetupModal: () => void;
  closeSetupModal: () => void;
  setOnboardingStatus: (status: OnboardingStatus) => void;
  markOnboardingCompleted: () => void;
  markSetupCompleted: () => void;
  syncFromUser: (user: {
    onboardingCompleted?: boolean;
    onboardingStatus?: OnboardingStatus;
  }) => void;
  persistOnboardingToServer: (updates: {
    onboardingCompleted?: boolean;
    onboardingStatus?: OnboardingStatus;
  }) => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      tourActive: false,
      setupModalOpen: false,
      onboardingStatus: 'pending',
      onboardingCompleted: false,
      setupCompleted: false,

      startTour: () => set({ tourActive: true }),
      stopTour: () => set({ tourActive: false }),
      openSetupModal: () => set({ setupModalOpen: true, tourActive: false }),
      closeSetupModal: () => set({ setupModalOpen: false }),

      setOnboardingStatus: (status) => set({ onboardingStatus: status }),

      markOnboardingCompleted: () => {
        set({ onboardingCompleted: true, onboardingStatus: 'completed', tourActive: false });
        void get().persistOnboardingToServer({
          onboardingCompleted: true,
          onboardingStatus: 'completed',
        });
      },

      markSetupCompleted: () => {
        set({ setupCompleted: true, setupModalOpen: false });
      },

      syncFromUser: (user) => {
        set({
          onboardingCompleted: Boolean(user.onboardingCompleted),
          onboardingStatus: user.onboardingStatus ?? 'pending',
        });
      },

      persistOnboardingToServer: async (updates) => {
        if (!isSupabaseConfigured || !supabase) return;
        const { error } = await supabase
          .from('stay_users')
          .update({
            onboarding_completed: updates.onboardingCompleted,
            onboarding_status: updates.onboardingStatus,
          })
          .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id);

        if (error) console.error('persistOnboardingToServer:', error);
      },
    }),
    {
      name: 'stay-onboarding',
      partialize: (s) => ({
        onboardingStatus: s.onboardingStatus,
        onboardingCompleted: s.onboardingCompleted,
        setupCompleted: s.setupCompleted,
      }),
    }
  )
);
