import { normalizeWhatsapp, type Lead } from './lead-types';

/**
 * Capture checkout lead into local CMS draft (persisted to Supabase on admin Simpan).
 */
export function captureLead(
  payload: Omit<Lead, 'id' | 'status' | 'createdAt'> & { status?: Lead['status'] }
): Lead {
  const lead: Lead = {
    id: crypto.randomUUID(),
    status: payload.status ?? 'baru',
    createdAt: new Date().toISOString(),
    whatsapp: normalizeWhatsapp(payload.whatsapp),
    ...payload,
  };

  window.dispatchEvent(new CustomEvent('monefyi:lead-captured', { detail: lead }));
  return lead;
}

export { normalizeWhatsapp, type Lead } from './lead-types';
