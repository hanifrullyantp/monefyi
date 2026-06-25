import convertTerbilang from 'terbilang-ts';
import { calcEstimationSummary, countedEstimationItems, effectiveItemSelling } from '../estimatorCalc';
import { formatDateId, formatRupiahFull } from '../estimatorFormat';
import { urlToDataUri, fileToDataUri } from './pdfImageUtils';
import type { EstimationFormDraft, PdfTemplate } from '../../types/estimator';
import type { PdfDisplayOptions, PdfSettings } from '../../types/pdfSettings';
import type { Content } from 'pdfmake/interfaces';

export interface QuotationPdfImage {
  dataUri: string;
  caption: string;
}

export interface QuotationPdfContext {
  template: PdfTemplate;
  code: string;
  title: string;
  dateLabel: string;
  validLabel: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
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
  items: Array<{ no: number; name: string; qty: string; unit: string; unitPrice: string; total: string }>;
  subtotalLabel: string;
  overheadLabel: string | null;
  discountLabel: string | null;
  discountFixedLabel: string | null;
  adjustmentLabels: Array<{ label: string; value: string }>;
  taxLabel: string | null;
  grandTotal: string;
  grandTotalWords: string;
  notes: string;
  termsLines: string[];
  images: QuotationPdfImage[];
  colors: { primary: string; secondary: string; accent: string };
  footerText: string;
  options: PdfDisplayOptions;
}

function addDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function rp(n: number): string {
  return formatRupiahFull(n);
}

export async function buildQuotationPdfContext(
  draft: EstimationFormDraft,
  settings: PdfSettings,
  options: PdfDisplayOptions,
): Promise<QuotationPdfContext> {
  const items = countedEstimationItems(draft.items);
  const summary = calcEstimationSummary(items, draft.overhead_pct, draft.discount_pct, draft.tax_pct, {
    discountAmount: draft.discount_amount,
    adjustments: draft.adjustments,
  });

  const primary = draft.pdf_primary_color || settings.primary_color || '#059669';
  const secondary = draft.pdf_secondary_color || settings.secondary_color || '#1e293b';

  const images: QuotationPdfImage[] = [];
  if (options.showImages) {
    for (const img of draft.images) {
      let dataUri: string | null = null;
      if (img.pendingFile) {
        dataUri = await fileToDataUri(img.pendingFile);
      } else if (img.previewUrl) {
        dataUri = await urlToDataUri(img.previewUrl);
      }
      if (dataUri) images.push({ dataUri, caption: img.caption || '' });
    }
  }

  const logoDataUri = settings.logo_url ? await urlToDataUri(settings.logo_url) : null;
  const signatureDataUri = settings.signature_url && options.showSignature
    ? await urlToDataUri(settings.signature_url)
    : null;

  const termsRaw = draft.terms_conditions.trim();
  const termsLines = termsRaw
    ? termsRaw.split(/\n/).map(l => l.trim()).filter(Boolean)
    : [];

  return {
    template: draft.pdf_template,
    code: draft.code,
    title: draft.title,
    dateLabel: formatDateId(new Date()),
    validLabel: `${draft.validity_days} hari (s/d ${formatDateId(addDays(draft.validity_days))})`,
    customerName: draft.customer_name || '—',
    customerPhone: draft.customer_phone || '—',
    customerAddress: draft.customer_address || '—',
    companyName: settings.company_name || 'Perusahaan',
    companyTagline: settings.company_tagline || '',
    companyAddress: settings.address || '',
    companyPhone: settings.phone || '',
    companyEmail: settings.email || '',
    companyWebsite: settings.website || '',
    logoDataUri,
    signatureDataUri,
    signatureName: settings.signature_name || '',
    signatureTitle: settings.signature_title || '',
    bankName: settings.bank_name || '',
    bankAccount: settings.bank_account || '',
    bankAccountName: settings.bank_account_name || '',
    items: items.map((item, idx) => {
      const net = effectiveItemSelling(item);
      const suffix = item.is_bonus ? ' (BONUS)' : '';
      const discNote = item.item_discount_pct > 0 || item.item_discount_amount > 0
        ? ` [diskon ${item.item_discount_pct > 0 ? `${item.item_discount_pct}%` : ''}${item.item_discount_amount > 0 ? ` ${rp(item.item_discount_amount)}` : ''}]`
        : '';
      return {
        no: idx + 1,
        name: `${item.name}${suffix}${discNote}`,
        qty: String(item.qty),
        unit: item.unit,
        unitPrice: item.is_bonus ? '—' : rp(item.selling_price_per_unit),
        total: item.is_bonus ? 'BONUS' : rp(net),
      };
    }),
    subtotalLabel: rp(summary.subtotalBeforeDiscount),
    overheadLabel: draft.overhead_pct > 0 ? `${rp(summary.overheadAmount)} (${draft.overhead_pct}%)` : null,
    discountLabel: draft.discount_pct > 0 ? `-${rp(summary.discountAmountPct)} (${draft.discount_pct}%)` : null,
    discountFixedLabel: draft.discount_amount > 0 ? `-${rp(summary.discountAmountFixed)}` : null,
    adjustmentLabels: (draft.adjustments || [])
      .filter(a => a.label.trim() && a.amount > 0)
      .map(a => ({ label: a.label.trim(), value: `-${rp(a.amount)}` })),
    taxLabel: draft.tax_pct > 0 ? `${rp(summary.taxAmount)} (${draft.tax_pct}%)` : null,
    grandTotal: rp(summary.grandTotal),
    grandTotalWords: capitalizeFirst(convertTerbilang(Math.round(summary.grandTotal))),
    notes: draft.notes.trim(),
    termsLines,
    images,
    colors: { primary, secondary, accent: settings.accent_color || '#10b981' },
    footerText: settings.footer_text || 'Terima kasih atas kepercayaan Anda',
    options,
  };
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildImageSection(ctx: QuotationPdfContext, layout: PdfTemplate): Content | null {
  if (!ctx.options.showImages || ctx.images.length === 0) return null;

  const caption = (c: string): Content => ({
    text: c,
    fontSize: 8,
    italics: true,
    color: '#64748b',
    alignment: 'center',
    margin: [0, 2, 0, 6] as [number, number, number, number],
  });

  const imgs = ctx.images;

  if (layout === 'minimal' && imgs.length >= 1) {
    return {
      stack: [
        { image: imgs[0].dataUri, width: 480, margin: [0, 0, 0, 4] as [number, number, number, number] },
        imgs[0].caption ? caption(imgs[0].caption) : '',
      ],
      margin: [0, 10, 0, 10] as [number, number, number, number],
    };
  }

  if (imgs.length === 1) {
    return {
      stack: [
        { image: imgs[0].dataUri, width: 500, margin: [0, 0, 0, 4] as [number, number, number, number] },
        imgs[0].caption ? caption(imgs[0].caption) : '',
      ],
      margin: [0, 10, 0, 10] as [number, number, number, number],
    };
  }

  if (imgs.length === 2) {
    return {
      columns: imgs.map(img => ({
        width: '*',
        stack: [
          { image: img.dataUri, width: 240, height: 140, margin: [0, 0, 0, 4] as [number, number, number, number] },
          img.caption ? caption(img.caption) : '',
        ],
      })),
      columnGap: 10,
      margin: [0, 10, 0, 10] as [number, number, number, number],
    };
  }

  // 3 images: hero + 2 thumbnails (modern default)
  return {
    stack: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { image: imgs[0].dataUri, width: 320, height: 160 },
              imgs[0].caption ? caption(imgs[0].caption) : '',
            ],
          },
          {
            width: '*',
            stack: [
              { image: imgs[1].dataUri, width: 160, height: 76, margin: [0, 0, 0, 8] as [number, number, number, number] },
              imgs[1].caption ? caption(imgs[1].caption) : '',
              { image: imgs[2].dataUri, width: 160, height: 76 },
              imgs[2].caption ? caption(imgs[2].caption) : '',
            ],
          },
        ],
        columnGap: 10,
      },
    ],
    margin: [0, 10, 0, 10] as [number, number, number, number],
  };
}
