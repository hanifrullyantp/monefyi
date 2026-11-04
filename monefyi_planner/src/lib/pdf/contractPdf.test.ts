import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { emptyBillingConfig } from '../estimationBillingConfig';
import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';
import { CONTRACT_TEMPLATES, cloneClauses } from './contractTemplates';
import {
  buildContractValues,
  buildDefaultContractFields,
  buildPaymentTermsText,
  fillContractText,
  generateContractPdfBlob,
} from './contractPdf';

const item = (name: string, qty: number, unit: string, price: number) => ({
  name,
  category: 'Kitchen Set',
  unit,
  qty,
  hpp_per_unit: price * 0.7,
  margin_pct: 30,
  selling_price_per_unit: price,
  item_discount_pct: 0,
  item_discount_amount: 0,
  is_bonus: false,
  included: true,
  total_hpp: qty * price * 0.7,
  total_selling: qty * price,
  total_profit: qty * price * 0.3,
  sort_order: 0,
  notes: '',
});

const draft: EstimationFormDraft = {
  code: 'EST-2026-037',
  title: 'Kitchen Set Rumah Bu Lisa',
  customer_name: 'Bu Lisa',
  customer_phone: '081234567890',
  customer_address: 'Jl. Melati No. 12, Bintaro, Tangerang Selatan',
  project_id: null,
  overhead_pct: 0,
  margin_pct: 30,
  discount_pct: 0,
  discount_amount: 0,
  adjustments: [],
  tax_pct: 0,
  notes: '',
  terms_conditions: '',
  validity_days: 14,
  status: 'closing',
  pdf_template: 'modern',
  pdf_invoice_template: 'modern',
  pdf_primary_color: '#059669',
  pdf_secondary_color: '#1e293b',
  pdf_show_images: false,
  pdf_show_bank: true,
  pdf_show_signature: true,
  pdf_show_logo: true,
  pdf_show_stamp: true,
  pdf_show_footer: true,
  images: [],
  billing_config: emptyBillingConfig(50),
  items: [
    item('Backsplash HPL', 7.9, 'm', 500_000),
    item('Kabinet Atas Full Plafon', 7.9, 'm', 2_900_000),
    item('Kabinet Bawah', 7.9, 'm', 2_900_000),
    item('Top Table Granit Nero', 5.2, 'm', 2_400_000),
  ],
};

const settings: PdfSettings = {
  id: 'pdf-1',
  org_id: 'org-1',
  company_name: 'CV Jaya Interior',
  company_tagline: 'Interior & Kitchen Set',
  address: 'Jl. Contoh No. 1, Jakarta Selatan',
  phone: '021-1234567',
  email: 'info@jayainterior.com',
  website: 'jayainterior.com',
  logo_url: null,
  signature_url: null,
  signature_name: 'Budi Santoso',
  signature_title: 'Direktur',
  bank_name: 'BCA',
  bank_account: '1234567890',
  bank_account_name: 'CV Jaya Interior',
  primary_color: '#059669',
  secondary_color: '#1e293b',
  accent_color: '#ecfdf5',
  footer_text: '',
  default_pdf_template: 'modern',
  default_invoice_template: 'modern',
  stamp_url: null,
  watermark_text: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('contract templates', () => {
  it('menyediakan beberapa template dengan desain berbeda', () => {
    expect(CONTRACT_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    expect(new Set(CONTRACT_TEMPLATES.map(t => t.design)).size).toBe(CONTRACT_TEMPLATES.length);
  });

  it('tidak menyisakan placeholder {{...}} setelah diisi', () => {
    for (const tpl of CONTRACT_TEMPLATES) {
      const f = buildDefaultContractFields(draft, settings, tpl);
      const values = buildContractValues(draft, f);
      for (const cl of tpl.clauses) {
        const out = fillContractText(cl.body, values);
        expect(out, `${tpl.id}/${cl.id}`).not.toMatch(/\{\{/);
      }
    }
  });

  it('nilai & terbilang konsisten dengan total estimasi', () => {
    const f = buildDefaultContractFields(draft, settings, CONTRACT_TEMPLATES[0]);
    const values = buildContractValues(draft, f);
    expect(f.contractValue).toBeGreaterThan(0);
    expect(values.contract_value).toMatch(/^Rp /);
    expect(values.contract_value_words.length).toBeGreaterThan(3);
  });

  it('skema pembayaran memuat DP dan pelunasan dari jadwal tagihan', () => {
    const text = buildPaymentTermsText(draft);
    expect(text).toMatch(/DP/i);
    expect(text).toMatch(/pelunasan/i);
  });
});

describe('contract pdf', () => {
  it.each(CONTRACT_TEMPLATES.map(t => [t.id, t] as const))('render PDF template %s', async (_id, tpl) => {
    const fields = buildDefaultContractFields(draft, settings, tpl);
    fields.showWitness = tpl.id === 'renovasi';
    const blob = await generateContractPdfBlob({
      draft,
      settings,
      templateId: tpl.id,
      fields,
      clauses: cloneClauses(tpl.clauses),
    });
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(8_000);

    const out = process.env.CONTRACT_PDF_OUT;
    if (out) {
      mkdirSync(out, { recursive: true });
      writeFileSync(join(out, `perjanjian-${tpl.id}.pdf`), Buffer.from(await blob.arrayBuffer()));
    }
  });
});

