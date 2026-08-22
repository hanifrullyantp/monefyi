import { describe, expect, it } from 'vitest';
import {
  buildKwitansiNumber,
  buildKwitansiPdfContext,
  defaultKwitansiDescription,
  type KwitansiPdfInput,
} from './kwitansiPdfContext';
import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';

const baseDraft: EstimationFormDraft = {
  code: 'EST-001',
  title: 'Renovasi Kamar Mandi',
  customer_name: 'Pak Budi',
  customer_phone: '08123456789',
  customer_address: 'Jakarta Selatan',
  project_id: null,
  overhead_pct: 10,
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
  pdf_primary_color: '#059669',
  pdf_secondary_color: '#1e293b',
  pdf_show_images: false,
  pdf_show_bank: true,
  pdf_show_signature: true,
  images: [],
  items: [{
    name: 'Renovasi KM',
    category: 'Renovasi',
    unit: 'paket',
    qty: 1,
    hpp_per_unit: 5_000_000,
    margin_pct: 30,
    selling_price_per_unit: 7_000_000,
    item_discount_pct: 0,
    item_discount_amount: 0,
    is_bonus: false,
    included: true,
    total_hpp: 5_000_000,
    total_selling: 7_000_000,
    total_profit: 2_000_000,
    sort_order: 0,
    notes: '',
  }],
};

const baseSettings: PdfSettings = {
  id: 'pdf-1',
  org_id: 'org-1',
  company_name: 'CV Jaya Build',
  company_tagline: 'Kontraktor Terpercaya',
  address: 'Jl. Contoh No. 1',
  phone: '021-1234567',
  email: 'info@jayabuild.com',
  website: 'jayabuild.com',
  logo_url: null,
  signature_url: null,
  signature_name: 'Budi Santoso',
  signature_title: 'Direktur',
  bank_name: 'BCA',
  bank_account: '1234567890',
  bank_account_name: 'CV Jaya Build',
  primary_color: '#059669',
  secondary_color: '#1e293b',
  accent_color: '#ecfdf5',
  footer_text: '',
  default_pdf_template: 'modern',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function makeInput(overrides: Partial<KwitansiPdfInput> = {}): KwitansiPdfInput {
  return {
    draft: baseDraft,
    settings: baseSettings,
    options: { showImages: false, showBank: true, showSignature: true },
    amount: 2_100_000,
    paymentDate: '2026-08-22',
    category: 'dp',
    description: defaultKwitansiDescription(baseDraft, 'dp'),
    paymentMethod: 'Transfer BCA',
    ...overrides,
  };
}

describe('kwitansiPdfContext - buildKwitansiNumber', () => {
  it('formats receipt number with estimation code and date', () => {
    const num = buildKwitansiNumber('EST-001', new Date('2026-08-22T12:00:00'));
    expect(num).toBe('KWI-EST-001-20260822');
  });
});

describe('kwitansiPdfContext - defaultKwitansiDescription', () => {
  it('includes payment category and estimation title', () => {
    expect(defaultKwitansiDescription(baseDraft, 'dp')).toBe(
      'Pembayaran DP — Renovasi Kamar Mandi',
    );
  });
});

describe('kwitansiPdfContext - buildKwitansiPdfContext', () => {
  it('builds context with formatted amount and terbilang', async () => {
    const ctx = await buildKwitansiPdfContext(makeInput());
    expect(ctx.receiptNumber).toBe('KWI-EST-001-20260822');
    expect(ctx.payerName).toBe('Pak Budi');
    expect(ctx.amount).toMatch(/2\.100\.000/);
    expect(ctx.amountWords.toLowerCase()).toContain('juta');
    expect(ctx.paymentMethod).toBe('Transfer BCA');
    expect(ctx.estimationTotal).toMatch(/^Rp/);
  });

  it('falls back when customer name is empty', async () => {
    const ctx = await buildKwitansiPdfContext(makeInput({
      draft: { ...baseDraft, customer_name: '' },
    }));
    expect(ctx.payerName).toBe('—');
  });
});
