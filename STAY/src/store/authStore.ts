import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, Tenant } from '../types';
import { mockUsers, mockTenant } from '../data/mockData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { fetchStayUserProfile, signInWithEmail } from '../services/api/stayApi';

interface AuthState {
  user: UserProfile | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setUser: (user: UserProfile) => void;
  setTenant: (tenant: Tenant) => void;
}

function mapDbUserToProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as UserProfile['role'],
    phone: row.phone as string | undefined,
    avatar: row.avatar as string | undefined,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
  };
}

function mapDbTenant(row: Record<string, unknown>): Tenant {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    logo: row.logo as string | undefined,
    primaryColor: (row.primary_color as string) || '#10b981',
    address: row.address as string,
    phone: row.phone as string,
    email: row.email as string,
    checkInTime: (row.check_in_time as string) || '14:00',
    checkOutTime: (row.check_out_time as string) || '12:00',
    taxPercent: Number(row.tax_percent) || 10,
    serviceChargePercent: Number(row.service_charge_percent) || 5,
    currency: (row.currency as string) || 'IDR',
    subscriptionPlan: (row.subscription_plan as Tenant['subscriptionPlan']) || 'free',
    subscriptionExpiry: row.subscription_expiry as string,
    createdAt: row.created_at as string,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          if (isSupabaseConfigured && supabase) {
            const authData = await signInWithEmail(email, password);
            if (!authData?.user) {
              set({ isLoading: false });
              return { success: false, error: 'Email atau password salah' };
            }

            const profile = await fetchStayUserProfile(authData.user.id);
            if (!profile) {
              set({ isLoading: false });
              return { success: false, error: 'Profil STAY tidak ditemukan' };
            }

            const user = mapDbUserToProfile(profile);
            const tenantRow = profile.stay_tenants as Record<string, unknown>;
            const tenant = mapDbTenant(tenantRow);

            set({ user, tenant, isAuthenticated: true, isLoading: false });
            return { success: true };
          }

          await new Promise((r) => setTimeout(r, 600));
          const found = mockUsers.find((u) => u.email === email);
          if (found && password.length >= 1) {
            set({ user: found, tenant: mockTenant, isAuthenticated: true, isLoading: false });
            return { success: true };
          }
          set({ isLoading: false });
          return { success: false, error: 'Email atau password salah' };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err instanceof Error ? err.message : 'Login gagal' };
        }
      },

      logout: async () => {
        if (isSupabaseConfigured && supabase) {
          await supabase.auth.signOut();
        }
        set({ user: null, tenant: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
      setTenant: (tenant) => set({ tenant }),
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
