import { supabase } from '../lib/supabase';
import type { PdfSettings } from '../types/pdfSettings';
import type { PdfTemplate } from '../types/estimator';

export function defaultPdfSettings(orgId: string, companyName: string): Omit<PdfSettings, 'id' | 'created_at' | 'updated_at'> {
  return {
    org_id: orgId,
    logo_url: null,
    company_name: companyName,
    company_tagline: null,
    address: null,
    phone: null,
    email: null,
    website: null,
    bank_name: null,
    bank_account: null,
    bank_account_name: null,
    signature_url: null,
    signature_name: null,
    signature_title: null,
    primary_color: '#059669',
    secondary_color: '#1e293b',
    accent_color: '#10b981',
    default_pdf_template: 'modern',
    footer_text: 'Terima kasih atas kepercayaan Anda',
  };
}

export async function loadPdfSettings(orgId: string, companyName: string): Promise<PdfSettings> {
  const { data, error } = await supabase
    .from('planner_pdf_settings')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as PdfSettings;

  const defaults = defaultPdfSettings(orgId, companyName);
  const { data: created, error: insErr } = await supabase
    .from('planner_pdf_settings')
    .insert(defaults)
    .select()
    .single();
  if (insErr) throw new Error(insErr.message);
  return created as PdfSettings;
}

export async function updatePdfSettings(
  orgId: string,
  patch: Partial<Omit<PdfSettings, 'id' | 'org_id' | 'created_at'>>,
): Promise<PdfSettings> {
  const { data, error } = await supabase
    .from('planner_pdf_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PdfSettings;
}

