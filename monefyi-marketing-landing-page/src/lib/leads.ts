import { INITIAL_SETTINGS } from '../data/initial-site-settings';
import { mergeSiteSettings } from './merge-site-settings';

const SETTINGS_KEY = 'monefyi_v6_settings';

export interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  city?: string;
  birthDate?: string;
  planId?: string;
  planName?: string;
  status: 'baru' | 'dihubungi' | 'deal';
  source: string;
  createdAt: string;
}

function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return mergeSiteSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return mergeSiteSettings(null);
  }
}

function writeSettings(settings: ReturnType<typeof readSettings>) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** Normalize Indonesian phone numbers to 62xxxxxxxxxx */
export function normalizeWhatsapp(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

/**
 * Persist a checkout funnel lead into CMS settings (localStorage).
 * Called before redirect to payment so CRM always receives form data.
 */
export function captureLead(
  payload: Omit<Lead, 'id' | 'status' | 'createdAt'> & { status?: Lead['status'] }
): Lead {
  const settings = readSettings();
  const lead: Lead = {
    id: crypto.randomUUID(),
    status: payload.status ?? 'baru',
    createdAt: new Date().toISOString(),
    whatsapp: normalizeWhatsapp(payload.whatsapp),
    ...payload,
  };

  settings.leads = [lead, ...(settings.leads || [])];
  writeSettings(settings);
  window.dispatchEvent(new CustomEvent('monefyi:leads-updated'));
  return lead;
}

export function getLeads(): Lead[] {
  return readSettings().leads || INITIAL_SETTINGS.leads;
}
