/** Invoice PDF service — generates printable HTML for A4 invoices */
import type { PosTransaction } from '../types/pos';

export interface InvoiceData {
  tenantName: string;
  tenantAddress?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  guestName?: string;
  bookingCode?: string;
  checkIn?: string;
  checkOut?: string;
  transaction: PosTransaction;
}

export function buildInvoiceHtml(data: InvoiceData): string {
  const { transaction: tx } = data;
  const itemsHtml = tx.items
    .map(
      (i) =>
        `<tr><td>${i.description}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${formatRp(i.subtotal)}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${tx.transactionNumber}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#1e293b}
h1{color:#059669}table{width:100%;border-collapse:collapse;margin:20px 0}
th,td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}
.total{font-size:1.25rem;font-weight:bold;text-align:right;margin-top:16px}
.footer{margin-top:40px;text-align:center;font-size:12px;color:#94a3b8}
</style></head><body>
<h1>${data.tenantName}</h1>
<p>${data.tenantAddress ?? ''}<br>${data.tenantPhone ?? ''} · ${data.tenantEmail ?? ''}</p>
<hr>
<p><strong>Invoice:</strong> ${tx.transactionNumber}<br>
<strong>Tanggal:</strong> ${new Date(tx.createdAt).toLocaleDateString('id-ID')}<br>
<strong>Tamu:</strong> ${data.guestName ?? '-'}<br>
${data.bookingCode ? `<strong>Booking:</strong> ${data.bookingCode}<br>` : ''}
${data.checkIn ? `<strong>Check-in:</strong> ${data.checkIn} · <strong>Check-out:</strong> ${data.checkOut}` : ''}</p>
<table><thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
<p class="total">TOTAL: ${formatRp(tx.grandTotal)}</p>
<p>Status: ${tx.status.toUpperCase()}</p>
<div class="footer">Powered by STAY · stay.monefyi.com</div>
</body></html>`;
}

function formatRp(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export function downloadInvoicePdf(data: InvoiceData): void {
  const html = buildInvoiceHtml(data);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

export function getInvoiceMailtoLink(data: InvoiceData, email: string): string {
  const subject = encodeURIComponent(`Invoice ${data.transaction.transactionNumber} - ${data.tenantName}`);
  const body = encodeURIComponent(`Terlampir invoice ${data.transaction.transactionNumber}. Total: ${formatRp(data.transaction.grandTotal)}`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
