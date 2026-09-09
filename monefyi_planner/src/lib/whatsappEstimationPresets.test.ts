import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppFollowUpMessage,
  buildWhatsAppPenagihanMessage,
  buildWhatsAppPresetMessage,
  WHATSAPP_PRESET_ATTACHMENTS,
} from './whatsappEstimationPresets';
import { defaultWhatsAppTemplateConfig } from '../services/quotationTemplateService';
import { emptyBillingConfig } from './estimationBillingConfig';
import type { EstimationFormDraft } from '../types/estimator';
import type { PdfSettings } from '../types/pdfSettings';

const draft: EstimationFormDraft = {
  code: 'EST-2026-001',
  title: 'Kitchen Set',
  customer_name: 'Budi',
  customer_phone: '08123456789',
  customer_address: '',
  project_id: null,
  overhead_pct: 0,
  margin_pct: 20,
  discount_pct: 0,
  discount_amount: 0,
  adjustments: [],
  tax_pct: 0,
  notes: '',
  terms_conditions: '',
  validity_days: 14,
  status: 'wa',
  pdf_template: 'modern',
  pdf_invoice_template: 'modern',
  pdf_primary_color: '#000',
  pdf_secondary_color: '#000',
  pdf_show_images: true,
  pdf_show_bank: true,
  pdf_show_signature: true,
  pdf_show_logo: true,
  pdf_show_stamp: true,
  pdf_show_footer: true,
  images: [],
  billing_config: emptyBillingConfig(50),
  items: [{
    name: 'Lemari',
    category: 'material',
    unit: 'm',
    qty: 2,
    hpp_per_unit: 100000,
    margin_pct: 20,
    selling_price_per_unit: 125000,
    total_hpp: 200000,
    total_selling: 250000,
    total_profit: 50000,
    included: true,
    is_bonus: false,
    item_discount_pct: 0,
    item_discount_amount: 0,
    pricelist_item_id: null,
    sort_order: 0,
  }],
};

const settings = { company_name: 'PT Test', company_tagline: 'Solusi dapur' } as PdfSettings;

describe('whatsappEstimationPresets - follow up - short message', () => {
  it('includes customer and title', () => {
    const msg = buildWhatsAppFollowUpMessage(draft, settings, 'Pak');
    expect(msg).toContain('Budi');
    expect(msg).toContain('Kitchen Set');
    expect(msg).toContain('PT Test');
  });
});

describe('whatsappEstimationPresets - penagihan - includes total', () => {
  it('mentions pembayaran', () => {
    const msg = buildWhatsAppPenagihanMessage(draft, settings, 'Pak');
    expect(msg.toLowerCase()).toContain('pembayaran');
  });
});

describe('whatsappEstimationPresets - attachments map', () => {
  it('maps penawaran to pdf and penagihan to kwitansi', () => {
    expect(WHATSAPP_PRESET_ATTACHMENTS.penawaran).toBe('pdf');
    expect(WHATSAPP_PRESET_ATTACHMENTS.penagihan).toBe('kwitansi');
    expect(WHATSAPP_PRESET_ATTACHMENTS.follow_up).toBe('none');
  });

  it('builds penawaran via template', () => {
    const msg = buildWhatsAppPresetMessage(
      'penawaran',
      draft,
      settings,
      defaultWhatsAppTemplateConfig(),
      'Pak',
    );
    expect(msg.length).toBeGreaterThan(10);
  });
});
