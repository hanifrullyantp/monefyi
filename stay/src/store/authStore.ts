import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, Tenant } from '../types';
import { mockUsers, mockTenant, mockRooms } from '../data/mockData';
import { backfillPositionsFromMock } from '../utils/roomLayout';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  fetchStayUserProfile,
  hydrateAppStoreFromRemote,
  signInWithEmail,
} from '../services/api/stayApi';
import { useAppStore } from './appStore';
import {
  registerStayAccount,
  createMockRegisteredUser,
  type RegisterPayload,
} from '../services/registerService';
import type { OnboardingStatus } from '../types';

interface AuthState {
  user: UserProfile | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionInitialized: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  initializeSession: () => Promise<void>;
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
    onboardingCompleted: Boolean(row.onboarding_completed),
    onboardingStatus: (row.onboarding_status as OnboardingStatus) ?? 'pending',
    marketingOptIn: Boolean(row.marketing_opt_in),
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
    setupCompleted: Boolean(row.setup_completed),
    createdAt: row.created_at as string,
  };
}

function backfillMockRoomPositions(): void {
  const { rooms } = useAppStore.getState();
  const updated = backfillPositionsFromMock(rooms, mockRooms);
  const changed = updated.some(
    (room, i) =>
      room.positionX !== rooms[i]?.positionX || room.positionY !== rooms[i]?.positionY
  );
  if (changed) {
    useAppStore.setState({ rooms: updated });
  }
}

async function applyProfileFromAuth(authUserId: string): Promise<{ success: boolean; error?: string }> {
  const profile = await fetchStayUserProfile(authUserId);
  if (!profile) {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    return {
      success: false,
      error: 'Akun ini belum terdaftar di STAY. Daftar di stay.monefyi.com terlebih dahulu.',
    };
  }

  const user = mapDbUserToProfile(profile);
  const tenantRow = profile.stay_tenants as Record<string, unknown>;
  const tenant = mapDbTenant(tenantRow);

  useAuthStore.setState({ user, tenant, isAuthenticated: true });
  useAppStore.setState({ tenant });
  await hydrateAppStoreFromRemote(tenant.id);

  return { success: true };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,
      sessionInitialized: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          if (isSupabaseConfigured && supabase) {
            const authData = await signInWithEmail(email, password);
            if (!authData?.user) {
              set({ isLoading: false });
              return { success: false, error: 'Email atau password salah' };
            }

            const result = await applyProfileFromAuth(authData.user.id);
            if (!result.success) {
              set({ isLoading: false, isAuthenticated: false, user: null, tenant: null });
              return { success: false, error: result.error };
            }
            set({ isLoading: false });
            return { success: true };
          }

          await new Promise((r) => setTimeout(r, 600));
          const found = mockUsers.find((u) => u.email === email);
          if (found && password.length >= 1) {
            set({ user: found, tenant: mockTenant, isAuthenticated: true, isLoading: false });
            useAppStore.setState({ tenant: mockTenant });
            backfillMockRoomPositions();
            return { success: true };
          }
          set({ isLoading: false });
          return { success: false, error: 'Email atau password salah' };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err instanceof Error ? err.message : 'Login gagal' };
        }
      },

      signUp: async (payload: RegisterPayload) => {
        set({ isLoading: true });
        try {
          const reg = await registerStayAccount(payload);
          if (!reg.success) {
            set({ isLoading: false });
            return { success: false, error: reg.error };
          }

          if (isSupabaseConfigured && supabase) {
            const loginResult = await get().login(payload.email, payload.password);
            set({ isLoading: false });
            return loginResult;
          }

          const { user, tenant } = createMockRegisteredUser(payload);
          useAppStore.setState({
            tenant,
            rooms: [],
            roomTypes: [],
            bookings: [],
            guests: [],
            payments: [],
          });
          set({ user, tenant, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err instanceof Error ? err.message : 'Registrasi gagal' };
        }
      },

      logout: async () => {
        if (isSupabaseConfigured && supabase) {
          await supabase.auth.signOut();
        }
        set({ user: null, tenant: null, isAuthenticated: false });
      },

      initializeSession: async () => {
        if (get().sessionInitialized) return;
        set({ sessionInitialized: true });

        if (!isSupabaseConfigured || !supabase) {
          if (get().isAuthenticated && get().tenant?.id === mockTenant.id) {
            backfillMockRoomPositions();
          }
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const result = await applyProfileFromAuth(session.user.id);
          if (!result.success) {
            set({ user: null, tenant: null, isAuthenticated: false });
          }
        }

        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            set({ user: null, tenant: null, isAuthenticated: false });
            return;
          }
          if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            const result = await applyProfileFromAuth(session.user.id);
            if (!result.success) {
              set({ user: null, tenant: null, isAuthenticated: false });
            }
          }
        });
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
