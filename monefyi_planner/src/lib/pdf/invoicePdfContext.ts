import { calcEstimationSummary, countedEstimationItems } from '../estimatorCalc';
import { formatDateId, formatRupiahFull } from '../estimatorFormat';
import { buildEstimationBillingSnapshot } from '../estimationBillingSchedule';
import { normalizePdfTemplate, type EstimationFormDraft, type PdfTemplate } from '../../types/estimator';
import type { PdfDisplayOptions, PdfSettings } from '../../types/pdfSettings';
import type { ProjectIncome } from '../../services/estimationPaymentService';
import { buildQuotationPdfContext, type QuotationPdfContext } from './quotationPdfContext';

export type InvoicePaymentStatus = 'paid' | 'partial' | 'pending';

export interface InvoiceInstallmentRow {
  label: string;
  amount: string;
  status: InvoicePaymentStatus;
  statusLabel: string;
  paidDate?: string;
}

export interface InvoicePdfContext extends QuotationPdfContext {
  invoiceNumber: string;
  paymentStatus: InvoicePaymentStatus;
  paymentStatusLabel: string;
  amountPaid: string;
  amountPaidRaw: number;
  amountRemaining: string;
  amountRemainingRaw: number;
  progressPct: number;
  installments: InvoiceInstallmentRow[];
  paymentMethod: string;
  paymentDateLabel: string;
}

const STATUS_LABEL: Record<InvoicePaymentStatus, string> = {
  paid: 'LUNAS',
  partial: 'SEBAGIAN',
  pending: 'MENUNGGU',
};

export function invoiceStatusFromAmounts(paid: number, total: number): InvoicePaymentStatus {
  if (total <= 0) return 'pending';
  if (paid <= 0) return 'pending';
  if (paid >= total - 1) return 'paid';
  return 'partial';
}

export function buildInvoiceNumber(code: string): string {
  const safe = (code || 'EST').replace(/\s+/g, '-');
  return `INV-${safe}`;
}

function lastPaidDate(draft: EstimationFormDraft, key: string): string | undefined {
  const dates = draft.billing_config.payments
    .filter(p => p.milestone_key === key && p.date)
    .map(p => p.date)
    .sort();
  return dates.length ? formatDateId(dates[dates.length - 1]) : undefined;
}

export async function buildInvoicePdfContext(
  draft: EstimationFormDraft,
  settings: PdfSettings,
  options: PdfDisplayOptions,
  projectPayments: ProjectIncome[] = [],
): Promise<InvoicePdfContext> {
  const quotation = await buildQuotationPdfContext(
    { ...draft, pdf_template: normalizePdfTemplate(draft.pdf_invoice_template || draft.pdf_template) },
    settings,
    options,
  );

  const items = countedEstimationItems(draft.items);
  const summary = calcEstimationSummary(items, draft.overhead_pct, draft.discount_pct, draft.tax_pct, {
    discountAmount: draft.discount_amount,
    adjustments: draft.adjustments,
  });
  const snapshot = buildEstimationBillingSnapshot(summary.grandTotal, draft.billing_config, projectPayments);
  const paymentStatus = invoiceStatusFromAmounts(snapshot.totalReceived, snapshot.contractTotal);
  const lastPayment = [...draft.billing_config.payments].sort((a, b) => b.date.localeCompare(a.date))[0];
  const method = lastPayment?.payment_method
    || [settings.bank_name, settings.bank_account].filter(Boolean).join(' ')
    || 'Transfer';

  const installments: InvoiceInstallmentRow[] = snapshot.milestones.map(m => ({
    label: m.label,
    amount: formatRupiahFull(m.amount),
    status: m.status,
    statusLabel: STATUS_LABEL[m.status],
    paidDate: m.status === 'pending' ? undefined : lastPaidDate(draft, m.id),
  }));

  const watermark = paymentStatus === 'paid'
    ? (quotation.watermarkText || 'LUNAS')
    : quotation.watermarkText;

  return {
    ...quotation,
    template: normalizePdfTemplate(draft.pdf_invoice_template || draft.pdf_template),
    invoiceNumber: buildInvoiceNumber(draft.code),
    paymentStatus,
    paymentStatusLabel: STATUS_LABEL[paymentStatus],
    amountPaid: formatRupiahFull(snapshot.totalReceived),
    amountPaidRaw: snapshot.totalReceived,
    amountRemaining: formatRupiahFull(snapshot.remaining),
    amountRemainingRaw: snapshot.remaining,
    progressPct: snapshot.progressPct,
    installments,
    paymentMethod: method,
    paymentDateLabel: lastPayment?.date ? formatDateId(lastPayment.date) : formatDateId(new Date()),
    watermarkText: watermark,
  };
}

export function invoiceTemplateId(value: string | null | undefined): PdfTemplate {
  return normalizePdfTemplate(value);
}
