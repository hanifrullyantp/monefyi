import type { RegisterFormData } from '../schemas/validation';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { generateId } from '../utils/id';
import { mockUsers, mockTenant } from '../data/mockData';
import type { UserProfile, Tenant } from '../types';

export type LeadSource = 'landing_page_cta' | 'direct_register' | 'login_link';

export interface RegisterPayload extends RegisterFormData {
  leadSource?: LeadSource;
}

export interface RegisterResult {
  success: boolean;
  error?: string;
  email?: string;
}

const LEADS_STORAGE_KEY = 'stay-leads-local';
const REGISTER_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Permintaan registrasi timeout. Periksa koneksi dan coba lagi.'));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function parseRegisterResponse(data: unknown): { success?: boolean; error?: string; email?: string } {
  if (data && typeof data === 'object') {
    return data as { success?: boolean; error?: string; email?: string };
  }
  return {};
}

function saveLocalLead(payload: RegisterPayload, tenantId: string, userId: string): void {
  try {
    const existing = JSON.parse(localStorage.getItem(LEADS_STORAGE_KEY) ?? '[]') as unknown[];
    existing.push({
      lead_source: payload.leadSource ?? 'direct_register',
      created_at: new Date().toISOString(),
      user_data: {
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
      },
      property_data: {
        propertyName: payload.propertyName,
        propertyType: payload.propertyType,
        city: payload.city,
        address: payload.address,
        roomCount: payload.roomCount,
        operatingStatus: payload.operatingStatus,
        referralSource: payload.referralSource,
      },
      onboarding_status: 'started',
      tenant_id: tenantId,
      user_id: userId,
    });
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    /* ignore */
  }
}

/**
 * Registrasi akun STAY baru — edge function atau mock lokal.
 */
export async function registerStayAccount(payload: RegisterPayload): Promise<RegisterResult> {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await withTimeout(
        supabase.functions.invoke('stay-register', {
          body: {
            ...payload,
            leadSource: payload.leadSource ?? 'direct_register',
            acceptTerms: payload.acceptTerms,
          },
        }),
        REGISTER_TIMEOUT_MS
      );

      if (error) {
        const msg = error.message?.includes('Failed to fetch')
          ? 'Gagal hubungi server. Periksa koneksi internet dan coba lagi.'
          : error.message;
        return { success: false, error: msg };
      }

      const result = parseRegisterResponse(data);
      if (!result.success) {
        return { success: false, error: result.error ?? 'Registrasi gagal. Silakan coba lagi.' };
      }

      return { success: true, email: result.email ?? payload.email };
    }

    await new Promise((r) => setTimeout(r, 800));

    const existing = mockUsers.find((u) => u.email === payload.email);
    if (existing) {
      return { success: false, error: 'Email sudah terdaftar' };
    }

    const tenantId = generateId('tenant');
    const userId = generateId('user');
    saveLocalLead(payload, tenantId, userId);

    return { success: true, email: payload.email };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Registrasi gagal. Silakan coba lagi.',
    };
  }
}

/** Export leads dari localStorage (mock / dev) */
export function exportLocalLeads(): unknown[] {
  try {
    return JSON.parse(localStorage.getItem(LEADS_STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function createMockRegisteredUser(payload: RegisterPayload): {
  user: UserProfile;
  tenant: Tenant;
} {
  const tenantId = generateId('tenant');
  const user: UserProfile = {
    id: generateId('user'),
    tenantId,
    name: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    role: 'owner',
    isActive: true,
    createdAt: new Date().toISOString(),
    onboardingCompleted: false,
    onboardingStatus: 'started',
    marketingOptIn: payload.marketingOptIn,
  };

  const trial = new Date();
  trial.setDate(trial.getDate() + 14);

  const tenant: Tenant = {
    id: tenantId,
    name: payload.propertyName,
    slug: payload.propertyName.toLowerCase().replace(/\s+/g, '-'),
    primaryColor: '#00A86B',
    address: payload.address ?? '',
    phone: payload.phone,
    email: payload.email,
    checkInTime: '14:00',
    checkOutTime: '12:00',
    taxPercent: 10,
    serviceChargePercent: 5,
    currency: 'IDR',
    subscriptionPlan: 'starter',
    subscriptionExpiry: trial.toISOString().split('T')[0],
    setupCompleted: false,
    createdAt: new Date().toISOString(),
  };

  return { user, tenant };
}
