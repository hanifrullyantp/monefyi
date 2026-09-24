import { calcEstimationSummary, countedEstimationItems } from './estimatorCalc';
import { formatRupiahFull } from './estimatorFormat';
import {
  buildEstimationBillingSnapshot,
  type BillingMilestone,
  type EstimationBillingSnapshot,
} from './estimationBillingSchedule';
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

function snapshotFromDraft(draft: EstimationFormDraft): EstimationBillingSnapshot {
  const items = countedEstimationItems(draft.items);
  const summary = calcEstimationSummary(
    items,
    draft.overhead_pct,
    draft.discount_pct,
    draft.tax_pct,
    { discountAmount: draft.discount_amount, adjustments: draft.adjustments },
  );
  return buildEstimationBillingSnapshot(summary.grandTotal, draft.billing_config);
}

function bankLines(settings: PdfSettings): string[] {
  if (!settings.bank_name && !settings.bank_account) return [];
  return [
    'Rekening:',
    [settings.bank_name, settings.bank_account].filter(Boolean).join(' '),
    settings.bank_account_name ? `a/n ${settings.bank_account_name}` : '',
  ].filter(Boolean);
}

function scheduleLines(snapshot: EstimationBillingSnapshot): string[] {
  return snapshot.milestones.map(m => {
    const bits = [`• ${m.label}: *${formatRupiahFull(m.amount)}*`];
    if (m.paidAmount > 0) bits.push(`terbayar ${formatRupiahFull(m.paidAmount)}`);
    if (m.dueAmount > 0 && m.status !== 'paid') bits.push(`sisa ${formatRupiahFull(m.dueAmount)}`);
    bits.push(m.status === 'paid' ? 'LUNAS' : m.status === 'partial' ? 'sebagian' : 'belum');
    return bits.join(' · ');
  });
}

export function buildWhatsAppPenagihanMessage(
  draft: EstimationFormDraft,
  settings: PdfSettings,
  salutation = 'Pak',
): string {
  const snapshot = snapshotFromDraft(draft);
  const name = draft.customer_name.trim() || 'Bapak/Ibu';
  const sal = salutation.trim();
  const greeting = sal ? `${sal} ${name}` : name;
  const next = snapshot.nextDue;
  return [
    `Halo ${greeting},`,
    '',
    `Berikut rincian tagihan proyek *${draft.title.trim() || draft.code}* (${draft.code}).`,
    `Total kontrak: *${formatRupiahFull(snapshot.contractTotal)}*`,
    `Sudah dibayar: *${formatRupiahFull(snapshot.totalReceived)}*`,
    `Sisa tagihan: *${formatRupiahFull(snapshot.remaining)}*`,
    '',
    'Jadwal pembayaran:',
    ...scheduleLines(snapshot),
    '',
    next
      ? `Tagihan berikutnya: *${next.label}* sebesar *${formatRupiahFull(next.dueAmount)}*.`
      : 'Tidak ada sisa tagihan.',
    ...bankLines(settings),
    '',
    'Mohon konfirmasi jadwal transfer. Terima kasih.',
    '',
    settings.company_name || '',
    settings.company_tagline || '',
  ].filter(Boolean).join('\n').trim();
}

/** Pesan penagihan spesifik per milestone jadwal tagihan. */
export function buildWhatsAppMilestoneTagihMessage(
  draft: EstimationFormDraft,
  settings: PdfSettings,
  milestone: BillingMilestone,
  salutation = 'Pak',
): string {
  const snapshot = snapshotFromDraft(draft);
  const live = snapshot.milestones.find(m => m.id === milestone.id) ?? milestone;
  const name = draft.customer_name.trim() || 'Bapak/Ibu';
  const sal = salutation.trim();
  const greeting = sal ? `${sal} ${name}` : name;
  const due = Math.max(0, live.dueAmount);
  return [
    `Halo ${greeting},`,
    '',
    `Reminder pembayaran *${live.label}* untuk proyek *${draft.title.trim() || draft.code}* (${draft.code}).`,
    `Total kontrak: *${formatRupiahFull(snapshot.contractTotal)}*`,
    `Sudah dibayar: *${formatRupiahFull(snapshot.totalReceived)}*`,
    `Sisa seluruh tagihan: *${formatRupiahFull(snapshot.remaining)}*`,
    '',
    `Tagihan ${live.label}: *${formatRupiahFull(live.amount)}*`,
    live.paidAmount > 0
      ? `Terbayar ${formatRupiahFull(live.paidAmount)} · sisa *${formatRupiahFull(due)}*`
      : `Nominal yang ditagih sekarang: *${formatRupiahFull(due)}*`,
    '',
    'Rincian jadwal:',
    ...scheduleLines(snapshot),
    ...bankLines(settings),
    '',
    'Mohon konfirmasi jadwal transfer. Terima kasih.',
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
