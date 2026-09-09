import { pdfColorsFromBrand } from '../lib/orgBrand';
import { supabase } from '../lib/supabase';
import type { PdfSettings } from '../types/pdfSettings';
import { normalizePdfSettingsRow } from '../types/pdfSettings';

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
    stamp_url: null,
    primary_color: '#059669',
    secondary_color: '#1e293b',
    accent_color: '#10b981',
    default_pdf_template: 'modern',
    default_invoice_template: 'modern',
    footer_text: 'Terima kasih atas kepercayaan Anda',
    watermark_text: null,
    default_dp_pct: 50,
  };
}

export async function loadPdfSettings(orgId: string, companyName: string): Promise<PdfSettings> {
  const { data, error } = await supabase
    .from('planner_pdf_settings')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return normalizePdfSettingsRow(data as PdfSettings);

  const defaults = defaultPdfSettings(orgId, companyName);
  const { data: created, error: insErr } = await supabase
    .from('planner_pdf_settings')
    .insert(defaults)
    .select()
    .single();
  if (insErr) throw new Error(insErr.message);
  return normalizePdfSettingsRow(created as PdfSettings);
}

/** Sinkronkan warna PDF default dari brand organisasi */
export async function syncPdfBrandFromOrg(orgId: string, brandColor: string): Promise<void> {
  const colors = pdfColorsFromBrand(brandColor);
  const { error } = await supabase
    .from('planner_pdf_settings')
    .update({ ...colors, updated_at: new Date().toISOString() })
    .eq('org_id', orgId);
  if (error) throw new Error(error.message);
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
  return normalizePdfSettingsRow(data as PdfSettings);
}

