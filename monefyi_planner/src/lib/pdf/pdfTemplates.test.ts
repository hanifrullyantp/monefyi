import { describe, expect, it } from 'vitest';
import { normalizePdfTemplate } from '../../types/estimator';
import { invoiceStatusFromAmounts, buildInvoiceNumber, buildInvoicePdfContext } from './invoicePdfContext';
import { previewEstimationDraft, previewPdfSettings } from './pdfTemplatePreviewData';
import { buildQuotationDoc, buildInvoiceDoc } from './templates';
import { buildQuotationPdfContext } from './quotationPdfContext';
import { displayOptionsFromDraft } from '../../types/pdfSettings';
import { defaultPdfSettings } from '../../services/pdfSettingsService';
import { generateQuotationPdfBlob } from './generateQuotationPdf';
import { generateInvoicePdfBlob } from './generateInvoicePdf';
import { buildKwitansiPdfInputFromDraft, generateKwitansiPdfBlob } from './generateKwitansiPdf';

describe('normalizePdfTemplate - alias lama', () => {
  it('maps classic/minimal/bold to new ids', () => {
    expect(normalizePdfTemplate('classic')).toBe('formal');
    expect(normalizePdfTemplate('minimal')).toBe('clean');
    expect(normalizePdfTemplate('bold')).toBe('fullcolor');
  });

  it('keeps new ids and falls back to modern', () => {
    expect(normalizePdfTemplate('futuristic')).toBe('futuristic');
    expect(normalizePdfTemplate('modern')).toBe('modern');
    expect(normalizePdfTemplate('unknown')).toBe('modern');
    expect(normalizePdfTemplate(null)).toBe('modern');
  });
});

describe('invoiceStatusFromAmounts', () => {
  it('returns pending/partial/paid', () => {
    expect(invoiceStatusFromAmounts(0, 1_000_000)).toBe('pending');
    expect(invoiceStatusFromAmounts(400_000, 1_000_000)).toBe('partial');
    expect(invoiceStatusFromAmounts(1_000_000, 1_000_000)).toBe('paid');
  });
});

describe('buildInvoiceNumber', () => {
  it('prefixes INV', () => {
    expect(buildInvoiceNumber('PWR-2026-001')).toBe('INV-PWR-2026-001');
  });
});

describe('invoicePdfContext - termin dari billing', () => {
  it('marks DP paid from local payments', async () => {
    const draft = previewEstimationDraft('modern');
    const settings = previewPdfSettings(defaultPdfSettings('org', 'CV Test'));
    const ctx = await buildInvoicePdfContext(draft, settings, displayOptionsFromDraft(draft));
    expect(ctx.invoiceNumber).toBe('INV-PWR-2026-001');
    expect(ctx.installments.length).toBeGreaterThan(0);
    expect(ctx.installments[0].status).not.toBe('pending');
    expect(ctx.paymentStatus).toBe('partial');
    expect(ctx.amountPaidRaw).toBeGreaterThan(0);
  });
});

describe('pdf templates - document definition', () => {
  it('builds quotation and invoice docs for all templates without throw', async () => {
    const ids = ['formal', 'modern', 'clean', 'fullcolor', 'futuristic'] as const;
    for (const id of ids) {
      const draft = previewEstimationDraft(id);
      draft.items = [];
      const settings = previewPdfSettings(defaultPdfSettings('org', 'CV Test'));
      const opts = displayOptionsFromDraft(draft);
      const q = await buildQuotationPdfContext(draft, settings, opts);
      const i = await buildInvoicePdfContext(draft, settings, opts);
      expect(buildQuotationDoc(q).content).toBeTruthy();
      expect(buildInvoiceDoc(i).content).toBeTruthy();
    }
  });
});

describe('generate blobs - tiga jenis dokumen', () => {
  it('creates quotation, invoice, and kwitansi blobs from dummy data', async () => {
    const draft = previewEstimationDraft('modern');
    const settings = previewPdfSettings(defaultPdfSettings('org', 'CV Test'));
    const opts = displayOptionsFromDraft(draft);
    const quotation = await generateQuotationPdfBlob(draft, settings, opts);
    const invoice = await generateInvoicePdfBlob(draft, settings, opts);
    const kwitansi = await generateKwitansiPdfBlob(buildKwitansiPdfInputFromDraft(draft, settings));
    expect(quotation.size).toBeGreaterThan(100);
    expect(invoice.size).toBeGreaterThan(100);
    expect(kwitansi.size).toBeGreaterThan(100);
  });

  it('creates quotation and invoice blobs when items are empty', async () => {
    const draft = previewEstimationDraft('formal');
    draft.items = [];
    const settings = previewPdfSettings(defaultPdfSettings('org', 'CV Test'));
    const opts = displayOptionsFromDraft(draft);
    await expect(generateQuotationPdfBlob(draft, settings, opts)).resolves.toBeInstanceOf(Blob);
    await expect(generateInvoicePdfBlob(draft, settings, opts)).resolves.toBeInstanceOf(Blob);
  });
});
