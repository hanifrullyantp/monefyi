import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { ProformaPdfContext } from './proformaPdfContext';

const ROW_ALT = '#E8F0F7';

function headerBlock(ctx: ProformaPdfContext): Content {
  const logoStack: Content[] = [];
  if (ctx.logoDataUri) {
    logoStack.push({ image: ctx.logoDataUri, width: 56, margin: [0, 0, 0, 4] as [number, number, number, number] });
  }
  logoStack.push(
    { text: ctx.companyName.toUpperCase(), fontSize: 14, bold: true, color: ctx.colors.primary },
  );
  if (ctx.companyTagline) {
    logoStack.push({ text: ctx.companyTagline, fontSize: 8, color: '#64748b', margin: [0, 2, 0, 0] as [number, number, number, number] });
  }

  return {
    table: {
      widths: ['*', 180],
      body: [[
        { stack: logoStack, margin: [12, 14, 8, 14] as [number, number, number, number] },
        {
          stack: [
            { text: 'PROFORMA', fontSize: 22, bold: true, color: '#ffffff', alignment: 'right' },
            { text: 'INVOICE', fontSize: 22, bold: true, color: '#ffffff', alignment: 'right' },
          ],
          fillColor: ctx.colors.primary,
          margin: [12, 18, 16, 18] as [number, number, number, number],
        },
      ]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 16] as [number, number, number, number],
  };
}

function metaBlock(ctx: ProformaPdfContext): Content {
  return {
    columns: [
      {
        width: '*',
        stack: [
          { text: 'INVOICE TO:', fontSize: 9, bold: true, color: ctx.colors.primary, margin: [0, 0, 0, 4] as [number, number, number, number] },
          { text: ctx.clientName.toUpperCase(), fontSize: 16, bold: true, color: '#0f172a', margin: [0, 0, 0, 6] as [number, number, number, number] },
          { text: ctx.projectName, fontSize: 10, color: '#475569' },
          ctx.clientContact !== '—' ? { text: ctx.clientContact, fontSize: 9, color: '#64748b', margin: [0, 2, 0, 0] as [number, number, number, number] } : '',
          ctx.clientLocation !== '—' ? { text: ctx.clientLocation, fontSize: 9, color: '#64748b', margin: [0, 2, 0, 0] as [number, number, number, number] } : '',
        ],
      },
      {
        width: 200,
        stack: [
          metaRow('Invoice Number', ctx.invoiceNumber, ctx.colors.primary),
          metaRow('Account No', ctx.accountNo, ctx.colors.primary),
          metaRow('Invoice Date', ctx.invoiceDate, ctx.colors.primary),
          metaRow('Project Code', ctx.projectCode, ctx.colors.primary),
        ],
      },
    ],
    margin: [0, 0, 0, 18] as [number, number, number, number],
  };
}

function metaRow(label: string, value: string, color: string): Content {
  return {
    columns: [
      { text: label, width: 90, fontSize: 8, color, bold: true },
      { text: value, width: '*', fontSize: 9, alignment: 'right', color: '#0f172a' },
    ],
    margin: [0, 0, 0, 4] as [number, number, number, number],
  };
}

function itemsTable(ctx: ProformaPdfContext): Content {
  const headerFill = ctx.colors.primary;
  const body: Content[][] = [
    [
      { text: 'NO.', style: 'tableHeader', fillColor: headerFill, color: '#ffffff' },
      { text: 'PRODUCT DESCRIPTION', style: 'tableHeader', fillColor: headerFill, color: '#ffffff' },
      { text: 'PRICE', style: 'tableHeader', fillColor: headerFill, color: '#ffffff', alignment: 'right' },
      { text: 'QTY', style: 'tableHeader', fillColor: headerFill, color: '#ffffff', alignment: 'center' },
      { text: 'TOTAL', style: 'tableHeader', fillColor: headerFill, color: '#ffffff', alignment: 'right' },
    ],
    ...ctx.lineItems.map((row, i) => {
      const fill = i % 2 === 0 ? ROW_ALT : '#ffffff';
      return [
        { text: row.no, fillColor: fill, fontSize: 9 },
        { text: row.description, fillColor: fill, fontSize: 9 },
        { text: row.price, fillColor: fill, fontSize: 9, alignment: 'right' },
        { text: row.qty, fillColor: fill, fontSize: 9, alignment: 'center' },
        { text: row.total, fillColor: fill, fontSize: 9, alignment: 'right', bold: true },
      ] as Content[];
    }),
  ];

  return {
    table: { headerRows: 1, widths: [28, '*', 72, 32, 72], body },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 12] as [number, number, number, number],
  };
}

function summaryBlock(ctx: ProformaPdfContext): Content {
  const summaryRows: Content[] = [
    summaryRow('Total Nilai Project', ctx.totalNilaiProject),
    summaryRow('Pembayaran DP', ctx.pembayaranDp, '#0f172a'),
  ];

  summaryRows.push({
    table: {
      widths: ['*', 'auto'],
      body: [[
        {
          text: 'Sisa Pembayaran',
          fontSize: 11,
          bold: true,
          color: '#ffffff',
          margin: [12, 10, 4, 10] as [number, number, number, number],
        },
        {
          text: ctx.sisaPembayaran,
          fontSize: 14,
          bold: true,
          color: '#ffffff',
          alignment: 'right',
          margin: [4, 10, 12, 10] as [number, number, number, number],
        },
      ]],
    },
    layout: 'noBorders',
    fillColor: ctx.colors.primary,
    margin: [0, 8, 0, 0] as [number, number, number, number],
  });

  return { stack: summaryRows, width: 220 };
}

function summaryRow(label: string, value: string, color = '#475569'): Content {
  return {
    columns: [
      { text: label, width: '*', fontSize: 10, color: '#64748b' },
      { text: value, width: 'auto', fontSize: 10, bold: true, color, alignment: 'right' },
    ],
    margin: [0, 0, 0, 4] as [number, number, number, number],
  };
}

function footerBlock(ctx: ProformaPdfContext): Content {
  const left: Content[] = [];

  if (ctx.options.showBank) {
    left.push(
      { text: 'Payment Method', fontSize: 10, bold: true, color: ctx.colors.primary, margin: [0, 0, 0, 6] as [number, number, number, number] },
      { text: `Account No: ${ctx.bankAccount}`, fontSize: 9, margin: [0, 0, 0, 2] as [number, number, number, number] },
      { text: `Account Name: ${ctx.bankAccountName}`, fontSize: 9, margin: [0, 0, 0, 2] as [number, number, number, number] },
      { text: `Bank: ${ctx.bankName}`, fontSize: 9, margin: [0, 0, 0, 8] as [number, number, number, number] },
    );
  }

  left.push(
    { text: 'Thank You For Your Business', fontSize: 10, bold: true, color: '#0f172a', margin: [0, 0, 0, 6] as [number, number, number, number] },
    { text: 'Terms & Conditions:', fontSize: 9, bold: true, color: ctx.colors.primary, margin: [0, 0, 0, 4] as [number, number, number, number] },
    { ul: ctx.termsLines, fontSize: 8, color: '#64748b', margin: [0, 0, 0, 0] as [number, number, number, number] },
  );

  const right: Content[] = [
    summaryBlock(ctx),
  ];

  if (ctx.options.showSignature && ctx.signatureDataUri) {
    right.push({
      stack: [
        { image: ctx.signatureDataUri, width: 100, alignment: 'right', margin: [0, 16, 0, 4] as [number, number, number, number] },
        { canvas: [{ type: 'line', x1: 80, y1: 0, x2: 220, y2: 0, lineWidth: 0.5, lineColor: '#94a3b8' }] },
        { text: ctx.signatureName || 'Your Name & Signature', fontSize: 9, alignment: 'right', margin: [0, 4, 0, 0] as [number, number, number, number] },
        { text: ctx.signatureTitle, fontSize: 8, alignment: 'right', color: '#64748b' },
      ],
      margin: [0, 12, 0, 0] as [number, number, number, number],
    });
  } else if (ctx.options.showSignature) {
    right.push({
      stack: [
        { text: '\n\n', fontSize: 8 },
        { canvas: [{ type: 'line', x1: 80, y1: 0, x2: 220, y2: 0, lineWidth: 0.5, lineColor: '#94a3b8' }] },
        { text: ctx.signatureName || 'Your Name & Signature', fontSize: 9, alignment: 'right', margin: [0, 4, 0, 0] as [number, number, number, number] },
        { text: ctx.signatureTitle, fontSize: 8, alignment: 'right', color: '#64748b' },
      ],
      margin: [0, 12, 0, 0] as [number, number, number, number],
    });
  }

  return {
    columns: [
      { width: '*', stack: left },
      { width: 240, stack: right },
    ],
    margin: [0, 8, 0, 0] as [number, number, number, number],
  };
}

export function buildProformaDocumentDefinition(ctx: ProformaPdfContext): TDocumentDefinitions {
  const content: Content[] = [
    headerBlock(ctx),
    metaBlock(ctx),
    itemsTable(ctx),
    footerBlock(ctx),
  ];

  if (ctx.footerText) {
    content.push({
      text: ctx.footerText,
      fontSize: 7,
      color: '#94a3b8',
      alignment: 'center',
      margin: [0, 16, 0, 0] as [number, number, number, number],
    });
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 48],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#334155' },
    styles: {
      tableHeader: { fontSize: 8, bold: true },
    },
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        {
          canvas: [{
            type: 'rect',
            x: 0,
            y: 0,
            w: 180,
            h: 8,
            color: ctx.colors.primary,
          }],
          width: 180,
        },
        { text: `Hal ${currentPage} / ${pageCount}`, alignment: 'right', fontSize: 8, color: '#94a3b8', margin: [0, 0, 0, 0] as [number, number, number, number] },
      ],
      margin: [40, 0, 40, 20] as [number, number, number, number],
    }),
  };
}
