import convertTerbilang from 'terbilang-ts';
import { calcEstimationSummary, countedEstimationItems } from '../estimatorCalc';
import { formatDateId, formatRupiahFull } from '../estimatorFormat';
import { urlToDataUri } from './pdfImageUtils';
import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfDisplayOptions, PdfSettings } from '../../types/pdfSettings';

export type KwitansiPaymentCategory = 'dp' | 'termin' | 'pelunasan' | 'other';

export const KWITANSI_CATEGORY_LABELS: Record<KwitansiPaymentCategory, string> = {
  dp: 'DP',
  termin: 'Termin',
  pelunasan: 'Pelunasan',
  other: 'Lainnya',
};

export interface KwitansiPdfContext {
  receiptNumber: string;
  receiptDate: string;
  paymentCategory: string;
  payerName: string;
  payerPhone: string;
  payerAddress: string;
  amount: string;
  amountRaw: number;
  amountWords: string;
  paymentDescription: string;
  paymentMethod: string;
  estimationCode: string;
  estimationTitle: string;
  estimationTotal: string;
  companyName: string;
  companyTagline: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  logoDataUri: string | null;
  signatureDataUri: string | null;
  signatureName: string;
  signatureTitle: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  footerText: string;
  colors: { primary: string; secondary: string; accent: string };
  options: PdfDisplayOptions;
}

function rp(n: number): string {
  return formatRupiahFull(n);
}

export function buildKwitansiNumber(code: string, date = new Date()): string {
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const safeCode = (code || 'EST').replace(/\s+/g, '-');
  return `KWI-${safeCode}-${ymd}`;
}

export function defaultKwitansiDescription(
  draft: EstimationFormDraft,
  category: KwitansiPaymentCategory,
): string {
  const label = KWITANSI_CATEGORY_LABELS[category];
  const title = draft.title?.trim() || 'Estimasi Proyek';
  return `Pembayaran ${label} — ${title}`;
}

export type KwitansiPdfInput = {
  draft: EstimationFormDraft;
  settings: PdfSettings;
  options: PdfDisplayOptions;
  amount: number;
  paymentDate: string;
  category: KwitansiPaymentCategory;
  description: string;
  paymentMethod?: string;
};

export async function buildKwitansiPdfContext(input: KwitansiPdfInput): Promise<KwitansiPdfContext> {
  const { draft, settings, options, amount, paymentDate, category, description, paymentMethod } = input;

  const items = countedEstimationItems(draft.items);
  const summary = calcEstimationSummary(items, draft.overhead_pct, draft.discount_pct, draft.tax_pct, {
    discountAmount: draft.discount_amount,
    adjustments: draft.adjustments,
  });

  const primary = draft.pdf_primary_color || settings.primary_color || '#059669';
  const secondary = draft.pdf_secondary_color || settings.secondary_color || '#1e293b';
  const accent = settings.accent_color || '#ecfdf5';

  const logoDataUri = settings.logo_url ? await urlToDataUri(settings.logo_url) : null;
  const signatureDataUri = settings.signature_url && options.showSignature
    ? await urlToDataUri(settings.signature_url)
    : null;

  const parsedDate = paymentDate ? new Date(`${paymentDate}T12:00:00`) : new Date();
  const safeAmount = Math.max(0, Math.round(amount));

  return {
    receiptNumber: buildKwitansiNumber(draft.code, parsedDate),
    receiptDate: formatDateId(parsedDate),
    paymentCategory: KWITANSI_CATEGORY_LABELS[category],
    payerName: draft.customer_name?.trim() || '—',
    payerPhone: draft.customer_phone?.trim() || '—',
    payerAddress: draft.customer_address?.trim() || '—',
    amount: rp(safeAmount),
    amountRaw: safeAmount,
    amountWords: convertTerbilang(safeAmount),
    paymentDescription: description?.trim() || defaultKwitansiDescription(draft, category),
    paymentMethod: paymentMethod?.trim() || '—',
    estimationCode: draft.code || '—',
    estimationTitle: draft.title?.trim() || '—',
    estimationTotal: rp(summary.grandTotal),
    companyName: settings.company_name || 'Perusahaan',
    companyTagline: settings.company_tagline || '',
    companyAddress: settings.address || '',
    companyPhone: settings.phone || '',
    companyEmail: settings.email || '',
    companyWebsite: settings.website || '',
    logoDataUri,
    signatureDataUri,
    signatureName: settings.signature_name || '',
    signatureTitle: settings.signature_title || 'Account Manager',
    bankName: settings.bank_name || '—',
    bankAccount: settings.bank_account || '—',
    bankAccountName: settings.bank_account_name || settings.company_name || '—',
    footerText: settings.footer_text || '',
    colors: { primary, secondary, accent },
    options,
  };
}
