import type { PdfTemplate } from './estimator';

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
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  default_pdf_template: PdfTemplate;
  footer_text: string;
  created_at: string;
  updated_at: string;
}

export interface PdfDisplayOptions {
  showImages: boolean;
  showBank: boolean;
  showSignature: boolean;
}
