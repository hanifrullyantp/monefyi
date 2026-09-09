import type { EstimationFormDraft, PdfTemplate } from './estimator';
import { normalizePdfTemplate } from './estimator';

export interface PdfSettings {
  id: string;
  org_id: string;
  logo_url: string | null;
  company_name: string | null;
  company_tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_account_name: string | null;
  signature_url: string | null;
  signature_name: string | null;
  signature_title: string | null;
  stamp_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  default_pdf_template: PdfTemplate;
  default_invoice_template: PdfTemplate;
  footer_text: string;
  watermark_text: string | null;
  /** Default persentase DP untuk jadwal tagihan baru. */
  default_dp_pct?: number;
  created_at: string;
  updated_at: string;
}

export interface PdfDisplayOptions {
  showImages: boolean;
  showBank: boolean;
  showSignature: boolean;
  showLogo?: boolean;
  showStamp?: boolean;
  showFooter?: boolean;
}

export type ResolvedPdfDisplayOptions = Required<PdfDisplayOptions>;

export function resolvePdfDisplayOptions(opts: PdfDisplayOptions): ResolvedPdfDisplayOptions {
  return {
    showImages: opts.showImages,
    showBank: opts.showBank,
    showSignature: opts.showSignature,
    showLogo: opts.showLogo !== false,
    showStamp: opts.showStamp !== false,
    showFooter: opts.showFooter !== false,
  };
}

export function displayOptionsFromDraft(draft: Pick<
  EstimationFormDraft,
  'pdf_show_images' | 'pdf_show_bank' | 'pdf_show_signature' | 'pdf_show_logo' | 'pdf_show_stamp' | 'pdf_show_footer'
>): ResolvedPdfDisplayOptions {
  return resolvePdfDisplayOptions({
    showImages: draft.pdf_show_images,
    showBank: draft.pdf_show_bank,
    showSignature: draft.pdf_show_signature,
    showLogo: draft.pdf_show_logo !== false,
    showStamp: draft.pdf_show_stamp !== false,
    showFooter: draft.pdf_show_footer !== false,
  });
}

/** Isi field baru + alias template lama saat load dari DB. */
export function normalizePdfSettingsRow(row: PdfSettings): PdfSettings {
  return {
    ...row,
    stamp_url: row.stamp_url ?? null,
    watermark_text: row.watermark_text ?? null,
    default_pdf_template: normalizePdfTemplate(row.default_pdf_template),
    default_invoice_template: normalizePdfTemplate(
      row.default_invoice_template || row.default_pdf_template,
    ),
  };
}
