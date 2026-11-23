import type { Content, TableCell } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';

export function invoiceStatusBadge(
  ctx: InvoicePdfContext,
  fill?: string,
  textColor = '#ffffff',
): Content {
  const defaultFill =
    ctx.paymentStatus === 'paid'
      ? '#059669'
      : ctx.paymentStatus === 'partial'
        ? '#d97706'
        : '#475569';
  const bg = fill || defaultFill;

  return {
    table: {
      widths: ['auto'],
      body: [
        [
          {
            text: ctx.paymentStatusLabel,
            bold: true,
            fontSize: 9,
            color: textColor,
            fillColor: bg,
            alignment: 'center',
            margin: [10, 3, 10, 3] as [number, number, number, number],
          },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 2, 0, 4] as [number, number, number, number],
  };
}

export function invoiceInstallmentsTable(
  ctx: InvoicePdfContext,
  headerFill: string,
  altFill?: string,
  headerText = '#ffffff',
): Content {
  if (!ctx.installments || !ctx.installments.length) return { text: '' };

  const body: TableCell[][] = [
    [
      { text: 'Termin / Tahapan', bold: true, color: headerText, fillColor: headerFill, fontSize: 8 },
      { text: 'Tagihan', bold: true, color: headerText, fillColor: headerFill, fontSize: 8, alignment: 'right' as const },
      { text: 'Terbayar', bold: true, color: headerText, fillColor: headerFill, fontSize: 8, alignment: 'right' as const },
      { text: 'Sisa', bold: true, color: headerText, fillColor: headerFill, fontSize: 8, alignment: 'right' as const },
      { text: 'Status', bold: true, color: headerText, fillColor: headerFill, fontSize: 8 },
    ],
    ...ctx.installments.map((row, i) => [
      {
        stack: [
          { text: row.label, fontSize: 8.5, bold: true },
          { text: `Rencana: ${row.plannedPct}%`, fontSize: 7, color: '#64748b' },
        ],
        fillColor: altFill && i % 2 ? altFill : undefined,
      },
      { text: row.amount, alignment: 'right' as const, fillColor: altFill && i % 2 ? altFill : undefined, fontSize: 8 },
      { text: row.paidAmount, alignment: 'right' as const, fillColor: altFill && i % 2 ? altFill : undefined, fontSize: 8 },
      { text: row.dueAmount, alignment: 'right' as const, fillColor: altFill && i % 2 ? altFill : undefined, fontSize: 8 },
      {
        stack: [
          { text: row.statusLabel, fontSize: 8, bold: true },
          ...(row.paidDate ? [{ text: row.paidDate, fontSize: 7, color: '#64748b' }] : []),
        ],
        fillColor: altFill && i % 2 ? altFill : undefined,
      },
    ]),
  ];

  return {
    table: {
      headerRows: 1,
      widths: ['*', 70, 70, 70, 65],
      body,
    },
    layout: {
      hLineWidth: () => 0.4,
      vLineWidth: () => 0,
      hLineColor: () => '#e2e8f0',
      paddingLeft: () => 5,
      paddingRight: () => 5,
      paddingTop: () => 3.5,
      paddingBottom: () => 3.5,
    },
    margin: [0, 4, 0, 8] as [number, number, number, number],
  };
}

export function invoicePaymentInfoBox(
  ctx: InvoicePdfContext,
  bg = '#f8fafc',
  borderColor = '#e2e8f0',
  textColor = '#0f172a',
): Content {
  const bankLines: string[] = [];
  if (ctx.bankName) bankLines.push(`Bank: ${ctx.bankName}`);
  if (ctx.bankAccount) bankLines.push(`No. Rekening: ${ctx.bankAccount}`);
  if (ctx.bankAccountName) bankLines.push(`Atas Nama: ${ctx.bankAccountName}`);
  if (!bankLines.length) bankLines.push('Informasi rekening belum diatur');

  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            stack: [
              { text: 'INFORMASI PEMBAYARAN & BANK', fontSize: 8, bold: true, color: '#64748b', margin: [0, 0, 0, 2] as [number, number, number, number] },
              { text: bankLines.join('\n'), fontSize: 8.5, color: textColor, lineHeight: 1.25 },
              {
                text: [
                  { text: 'Dibayar: ', fontSize: 8, color: '#64748b' },
                  { text: `${ctx.amountPaid}  `, fontSize: 8, bold: true, color: '#059669' },
                  { text: 'Sisa Tagihan: ', fontSize: 8, color: '#64748b' },
                  { text: ctx.amountRemaining, fontSize: 8, bold: true, color: '#e11d48' },
                ],
                margin: [0, 3, 0, 0] as [number, number, number, number],
              },
            ],
            fillColor: bg,
            margin: [8, 6, 8, 6] as [number, number, number, number],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => borderColor,
      vLineColor: () => borderColor,
    },
    margin: [0, 0, 0, 8] as [number, number, number, number],
  };
}

export function invoiceSignatureBlock(
  ctx: InvoicePdfContext,
  signLabel = 'Authorised Sign',
  accentColor = '#64748b',
): Content {
  const hasUserSig = ctx.options.showSignature;
  const hasBuyerSig = Boolean(ctx.buyerSignatureDataUri || ctx.showBuyerSignature);

  if (hasBuyerSig) {
    const vendorElements: Content[] = [];
    if (hasUserSig && ctx.signatureDataUri) {
      vendorElements.push({
        image: ctx.signatureDataUri,
        width: 70,
        alignment: 'center',
        margin: [0, 0, 0, 2] as [number, number, number, number],
      });
    } else {
      vendorElements.push({ text: ' ', margin: [0, 16, 0, 0] as [number, number, number, number] });
    }
    vendorElements.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 110, y2: 0, lineWidth: 0.8, lineColor: accentColor }],
      alignment: 'center',
      margin: [0, 2, 0, 2] as [number, number, number, number],
    });
    vendorElements.push({
      text: ctx.signatureName || ctx.companyName,
      fontSize: 8,
      bold: true,
      alignment: 'center',
      color: '#0f172a',
    });
    vendorElements.push({
      text: ctx.signatureTitle || signLabel,
      fontSize: 7,
      color: '#64748b',
      alignment: 'center',
    });

    const buyerElements: Content[] = [];
    if (ctx.buyerSignatureDataUri) {
      buyerElements.push({
        image: ctx.buyerSignatureDataUri,
        width: 70,
        alignment: 'center',
        margin: [0, 0, 0, 2] as [number, number, number, number],
      });
    } else {
      buyerElements.push({ text: ' ', margin: [0, 16, 0, 0] as [number, number, number, number] });
    }
    buyerElements.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 110, y2: 0, lineWidth: 0.8, lineColor: accentColor }],
      alignment: 'center',
      margin: [0, 2, 0, 2] as [number, number, number, number],
    });
    buyerElements.push({
      text: ctx.buyerSignatureName || 'Klien / Pembayar',
      fontSize: 8,
      bold: true,
      alignment: 'center',
      color: '#0f172a',
    });
    buyerElements.push({
      text: ctx.buyerSignedAt ? `Tgl: ${ctx.buyerSignedAt}` : (ctx.buyerSignatureTitle || 'Tanda Terima Klien'),
      fontSize: 7,
      color: '#64748b',
      alignment: 'center',
    });

    return {
      columns: [
        { stack: vendorElements, width: '*', alignment: 'center' },
        { stack: buyerElements, width: '*', alignment: 'center' },
      ],
      columnGap: 20,
    };
  }

  const elements: Content[] = [];

  if (ctx.options.showSignature && ctx.signatureDataUri) {
    elements.push({
      image: ctx.signatureDataUri,
      width: 75,
      alignment: 'center',
      margin: [0, 0, 0, 2] as [number, number, number, number],
    });
  } else {
    elements.push({ text: ' ', margin: [0, 16, 0, 0] as [number, number, number, number] });
  }

  // Garis tanda tangan
  elements.push({
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 120,
        y2: 0,
        lineWidth: 0.8,
        lineColor: accentColor,
      },
    ],
    alignment: 'center',
    margin: [0, 2, 0, 2] as [number, number, number, number],
  });

  const signer = ctx.signatureName || ctx.companyName;
  elements.push({
    text: signer,
    fontSize: 8,
    bold: true,
    alignment: 'center',
    color: '#0f172a',
  });

  if (ctx.signatureTitle) {
    elements.push({
      text: ctx.signatureTitle,
      fontSize: 7,
      color: '#64748b',
      alignment: 'center',
    });
  } else {
    elements.push({
      text: signLabel,
      fontSize: 7,
      color: '#64748b',
      alignment: 'center',
    });
  }

  if (ctx.options.showStamp && ctx.stampDataUri) {
    elements.push({
      image: ctx.stampDataUri,
      width: 45,
      alignment: 'center',
      margin: [0, 2, 0, 0] as [number, number, number, number],
    });
  }

  return {
    stack: elements,
    alignment: 'center',
  };
}

export function invoiceMetaTable(ctx: InvoicePdfContext, textColor = '#111827'): Content {
  const body: TableCell[][] = [
    [{ text: 'Invoice No:', fontSize: 8, bold: true, color: textColor }, { text: ctx.invoiceNumber, fontSize: 8, bold: true, alignment: 'right' as const }],
    [{ text: 'Date:', fontSize: 8, bold: true, color: textColor }, { text: ctx.dateLabel, fontSize: 8, alignment: 'right' as const }],
  ];
  if (ctx.dueDateLabel) {
    body.push([{ text: 'Jatuh Tempo:', fontSize: 8, bold: true, color: textColor }, { text: ctx.dueDateLabel, fontSize: 8, alignment: 'right' as const }]);
  }
  return {
    table: { widths: [70, '*'], body },
    layout: 'noBorders',
  };
}

export function invoiceBreakdownTable(ctx: InvoicePdfContext, textColor = '#111827'): Content {
  const body: TableCell[][] = [
    [{ text: 'SUB TOTAL:', fontSize: 8, bold: true, color: textColor }, { text: ctx.subtotalLabel, fontSize: 8, alignment: 'right' as const }],
  ];
  if (ctx.discountLabel) {
    body.push([{ text: 'DISKON:', fontSize: 8, bold: true, color: '#e11d48' }, { text: ctx.discountLabel, fontSize: 8, alignment: 'right' as const, color: '#e11d48' }]);
  }
  if (ctx.taxLabel) {
    body.push([{ text: 'TAX / PPN:', fontSize: 8, bold: true, color: textColor }, { text: ctx.taxLabel, fontSize: 8, alignment: 'right' as const }]);
  }
  if (ctx.billingDiscountLabel) {
    body.push([{ text: 'POTONGAN:', fontSize: 8, bold: true, color: '#e11d48' }, { text: ctx.billingDiscountLabel, fontSize: 8, alignment: 'right' as const, color: '#e11d48' }]);
  }
  return {
    table: { widths: ['*', 'auto'], body },
    layout: 'noBorders',
    margin: [0, 0, 0, 4] as [number, number, number, number],
  };
}

