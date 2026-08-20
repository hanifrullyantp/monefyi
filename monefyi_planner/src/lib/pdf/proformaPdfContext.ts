import convertTerbilang from 'terbilang-ts';
import { formatDateId, formatRupiahFull } from '../estimatorFormat';
import { urlToDataUri } from './pdfImageUtils';
import type { NormalizedProjectView } from '../migration/project-normalize';
import type { Project } from '../../store/appStore';
import type { PdfDisplayOptions, PdfSettings } from '../../types/pdfSettings';

export interface ProformaPdfLineItem {
  no: string;
  description: string;
  price: string;
  qty: string;
  total: string;
}

export interface ProformaPdfContext {
  invoiceNumber: string;
  invoiceDate: string;
  accountNo: string;
  projectName: string;
  projectCode: string;
  clientName: string;
  clientContact: string;
  clientLocation: string;
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
  bankBranch: string;
  lineItems: ProformaPdfLineItem[];
  totalNilaiProject: string;
  totalNilaiProjectRaw: number;
  pembayaranDp: string;
  pembayaranDpRaw: number;
  sisaPembayaran: string;
  sisaPembayaranRaw: number;
  dpTerbilang: string;
  termsLines: string[];
  footerText: string;
  colors: { primary: string; secondary: string; accent: string };
  options: PdfDisplayOptions;
}

function rp(n: number): string {
  return formatRupiahFull(n);
}

function buildInvoiceNumber(project: Project): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const code = (project.code || project.id.slice(0, 8)).replace(/\s+/g, '-');
  return `PRO-${code}-${ymd}`;
}

function buildLineItems(project: Project, normalized: NormalizedProjectView, contractValue: number): ProformaPdfLineItem[] {
  const materials = normalized.project.rap?.materials ?? [];
  const workers = normalized.project.rap?.workers ?? [];
  const rapRows = [...materials, ...workers].filter(i => i.name?.trim()).slice(0, 8);

  if (rapRows.length > 0) {
    return rapRows.map((item, idx) => ({
      no: String(idx + 1).padStart(2, '0'),
      description: item.name,
      price: rp(item.rapTotal || item.unitPrice || 0),
      qty: '1',
      total: rp(item.rapTotal || item.unitPrice || 0),
    }));
  }

  const desc = project.description?.trim() || `Pelaksanaan ${project.name}`;
  return [{
    no: '01',
    description: desc,
    price: rp(contractValue),
    qty: '1',
    total: rp(contractValue),
  }];
}

export type ProformaPdfInput = {
  project: Project;
  normalized: NormalizedProjectView;
  settings: PdfSettings;
  options: PdfDisplayOptions;
  dpAmount: number;
  termsText?: string;
};

export async function buildProformaPdfContext(input: ProformaPdfInput): Promise<ProformaPdfContext> {
  const { project, normalized, settings, options, dpAmount, termsText } = input;
  const contractValue = normalized.project.contractValue || project.contract_value || project.total_budget_planned || 0;
  const dp = Math.max(0, Math.min(dpAmount, contractValue));
  const sisa = Math.max(0, contractValue - dp);

  const primary = settings.primary_color || '#1A4B8F';
  const secondary = settings.secondary_color || '#1e293b';
  const accent = settings.accent_color || '#E8F0F7';

  const logoDataUri = settings.logo_url ? await urlToDataUri(settings.logo_url) : null;
  const signatureDataUri = settings.signature_url && options.showSignature
    ? await urlToDataUri(settings.signature_url)
    : null;

  const defaultTerms = [
    'Proforma invoice ini bukan faktur pajak.',
    `Pembayaran DP sebesar ${rp(dp)} (${convertTerbilang(Math.round(dp))} rupiah) wajib dilakukan sebelum pekerjaan dimulai.`,
    `Sisa pembayaran ${rp(sisa)} dapat dibayarkan sesuai termin yang disepakati.`,
    'Pembayaran ditransfer ke rekening perusahaan di bawah ini.',
  ];

  const termsLines = termsText?.trim()
    ? termsText.trim().split(/\n/).map(l => l.trim()).filter(Boolean)
    : defaultTerms;

  return {
    invoiceNumber: buildInvoiceNumber(project),
    invoiceDate: formatDateId(new Date()),
    accountNo: settings.bank_account || '—',
    projectName: project.name,
    projectCode: project.code,
    clientName: project.client_name || '—',
    clientContact: project.client_contact || '—',
    clientLocation: project.location || '—',
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
    bankBranch: settings.address?.split(',')[0]?.trim() || '—',
    lineItems: buildLineItems(project, normalized, contractValue),
    totalNilaiProject: rp(contractValue),
    totalNilaiProjectRaw: contractValue,
    pembayaranDp: rp(dp),
    pembayaranDpRaw: dp,
    sisaPembayaran: rp(sisa),
    sisaPembayaranRaw: sisa,
    dpTerbilang: convertTerbilang(Math.round(dp)),
    termsLines,
    footerText: settings.footer_text || '',
    colors: { primary, secondary, accent },
    options,
  };
}
