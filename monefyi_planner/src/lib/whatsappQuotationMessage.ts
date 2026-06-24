import { calcEstimationSummary, effectiveItemSelling } from './estimatorCalc';
import { formatRupiahFull } from './estimatorFormat';
import type { EstimationFormDraft } from '../types/estimator';
import type { PdfSettings } from '../types/pdfSettings';

export const DEFAULT_WHATSAPP_BODY = `Halo {{salutation}} {{customer_name}}, berikut harga penawaran {{title}} ({{subtitle}})

Rincian produk:
{{items_list}}

Total: {{total}}

{{company_name}}
{{company_tagline}}`;

export const DEFAULT_WHATSAPP_ITEM_LINE = '{{name}} {{qty}} {{unit}} x {{price}} = {{total}}';

export interface WhatsAppTemplateConfig {
  body: string;
  itemLine: string;
  defaultSalutation: string;
  defaultSubtitle: string;
}

export function parseWhatsAppTemplateJson(raw: string): WhatsAppTemplateConfig {
  try {
    const parsed = JSON.parse(raw) as Partial<WhatsAppTemplateConfig>;
    if (parsed && typeof parsed.body === 'string') {
      return {
        body: parsed.body,
        itemLine: parsed.itemLine || DEFAULT_WHATSAPP_ITEM_LINE,
        defaultSalutation: parsed.defaultSalutation || 'Pak',
        defaultSubtitle: parsed.defaultSubtitle || '',
      };
    }
  } catch {
    /* plain text legacy */
  }
  return {
    body: raw || DEFAULT_WHATSAPP_BODY,
    itemLine: DEFAULT_WHATSAPP_ITEM_LINE,
    defaultSalutation: 'Bapak/Ibu',
    defaultSubtitle: '',
  };
}

export function serializeWhatsAppTemplate(config: WhatsAppTemplateConfig): string {
  return JSON.stringify(config);
}

function applyPlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export function buildWhatsAppQuotationMessage(
  draft: EstimationFormDraft,
  settings: PdfSettings,
  config: WhatsAppTemplateConfig,
  salutation: string,
  subtitle?: string,
): string {
  const activeItems = draft.items.filter(i => i.name.trim());
  const summary = calcEstimationSummary(
    activeItems,
    draft.overhead_pct,
    draft.discount_pct,
    draft.tax_pct,
    { discountAmount: draft.discount_amount, adjustments: draft.adjustments },
  );

  const itemLines = activeItems.map(item => {
    const net = effectiveItemSelling(item);
    const vars = {
      name: item.is_bonus ? `${item.name} (BONUS)` : item.name,
      qty: String(item.qty),
      unit: item.unit,
      price: item.is_bonus ? '—' : formatRupiahFull(item.selling_price_per_unit),
      total: item.is_bonus ? 'BONUS' : formatRupiahFull(net),
    };
    return applyPlaceholders(config.itemLine, vars).trim();
  });

  const vars: Record<string, string> = {
    salutation: salutation.trim(),
    customer_name: draft.customer_name.trim(),
    title: draft.title.trim(),
    subtitle: (subtitle || config.defaultSubtitle || '').trim(),
    items_list: itemLines.join('\n'),
    total: formatRupiahFull(summary.grandTotal),
    company_name: settings.company_name || '',
    company_tagline: settings.company_tagline || '',
    code: draft.code,
  };

  return applyPlaceholders(config.body, vars).replace(/\n{3,}/g, '\n\n').trim();
}

export function toWaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  return digits;
}

export function openWhatsAppChat(phone: string, text: string): void {
  const waPhone = toWaPhone(phone);
  const base = waPhone ? `https://wa.me/${waPhone}` : 'https://wa.me/';
  const url = `${base}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
