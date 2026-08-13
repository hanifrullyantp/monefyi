/** Lead types and helpers for landing CRM. */

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

/** Normalize Indonesian phone numbers to 62xxxxxxxxxx */
export function normalizeWhatsapp(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}
