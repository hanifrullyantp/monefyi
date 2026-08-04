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
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke('stay-register', {
      body: {
        ...payload,
        leadSource: payload.leadSource ?? 'direct_register',
        acceptTerms: payload.acceptTerms,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as { success?: boolean; error?: string; email?: string };
    if (!result?.success) {
      return { success: false, error: result?.error ?? 'Registrasi gagal' };
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
