import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, Tenant } from '../types';
import { mockUsers, mockTenant } from '../data/mockData';

interface AuthState {
  user: UserProfile | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUser: (user: UserProfile) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, _password: string) => {
        set({ isLoading: true });
        await new Promise((r) => setTimeout(r, 800));

        const found = mockUsers.find((u) => u.email === email);
        if (found) {
          set({ user: found, tenant: mockTenant, isAuthenticated: true, isLoading: false });
          return { success: true };
        }
        set({ isLoading: false });
        return { success: false, error: 'Email atau password salah' };
      },

      logout: () => {
        set({ user: null, tenant: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'stay-auth',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
