import { calcEstimationSummary, countedEstimationItems } from './estimatorCalc';
import { formatRupiahFull } from './estimatorFormat';
import {
  buildWhatsAppQuotationMessage,
  type WhatsAppTemplateConfig,
} from './whatsappQuotationMessage';
import type { EstimationFormDraft } from '../types/estimator';
import type { PdfSettings } from '../types/pdfSettings';

export type WhatsAppEstimationPreset = 'follow_up' | 'penawaran' | 'penagihan';

export const WHATSAPP_PRESET_LABELS: Record<WhatsAppEstimationPreset, string> = {
  follow_up: 'Follow-up',
  penawaran: 'Penawaran',
  penagihan: 'Penagihan',
};

export const WHATSAPP_PRESET_ATTACHMENTS: Record<WhatsAppEstimationPreset, 'none' | 'pdf' | 'kwitansi'> = {
  follow_up: 'none',
  penawaran: 'pdf',
  penagihan: 'kwitansi',
};

export function buildWhatsAppFollowUpMessage(
  draft: EstimationFormDraft,
  settings: PdfSettings,
  salutation = 'Pak',
): string {
  const name = draft.customer_name.trim() || 'Bapak/Ibu';
  const sal = salutation.trim();
  const greeting = sal ? `${sal} ${name}` : name;
  return [
    `Halo ${greeting},`,
    '',
    `Mengingatkan terkait estimasi *${draft.title.trim() || draft.code}*.`,
    'Apakah ada pertanyaan atau hal yang perlu kami follow up?',
    '',
    settings.company_name || '',
    settings.company_tagline || '',
  ].filter(Boolean).join('\n').trim();
}

export function buildWhatsAppPenagihanMessage(
  draft: EstimationFormDraft,
  settings: PdfSettings,
  salutation = 'Pak',
): string {
  const items = countedEstimationItems(draft.items);
  const summary = calcEstimationSummary(
    items,
    draft.overhead_pct,
    draft.discount_pct,
    draft.tax_pct,
    { discountAmount: draft.discount_amount, adjustments: draft.adjustments },
  );
  const name = draft.customer_name.trim() || 'Bapak/Ibu';
  const sal = salutation.trim();
  const greeting = sal ? `${sal} ${name}` : name;
  return [
    `Halo ${greeting},`,
    '',
    `Berikut reminder pembayaran untuk proyek *${draft.title.trim() || draft.code}*.`,
    `Total penawaran: *${formatRupiahFull(summary.grandTotal)}*`,
    '',
    'Silakan konfirmasi jadwal pembayaran DP/Termin/Pelunasan. Kwitansi terlampir jika diperlukan.',
    '',
    settings.company_name || '',
    settings.company_tagline || '',
  ].filter(Boolean).join('\n').trim();
}

export function buildWhatsAppPresetMessage(
  preset: WhatsAppEstimationPreset,
  draft: EstimationFormDraft,
  settings: PdfSettings,
  templateConfig: WhatsAppTemplateConfig,
  salutation = 'Pak',
  subtitle?: string,
): string {
  if (preset === 'follow_up') {
    return buildWhatsAppFollowUpMessage(draft, settings, salutation);
  }
  if (preset === 'penagihan') {
    return buildWhatsAppPenagihanMessage(draft, settings, salutation);
  }
  return buildWhatsAppQuotationMessage(
    draft,
    settings,
    templateConfig,
    salutation,
    subtitle,
  );
}
