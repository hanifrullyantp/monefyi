import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { KwitansiPdfContext } from './kwitansiPdfContext';

function headerBlock(ctx: KwitansiPdfContext): Content {
  const logoStack: Content[] = [];
  if (ctx.logoDataUri) {
    logoStack.push({ image: ctx.logoDataUri, width: 52, margin: [0, 0, 0, 4] as [number, number, number, number] });
  }
  logoStack.push(
    { text: ctx.companyName.toUpperCase(), fontSize: 13, bold: true, color: ctx.colors.primary },
  );
  if (ctx.companyTagline) {
    logoStack.push({ text: ctx.companyTagline, fontSize: 8, color: '#64748b', margin: [0, 2, 0, 0] as [number, number, number, number] });
  }
  const companyLines = [ctx.companyAddress, ctx.companyPhone, ctx.companyEmail].filter(Boolean);
  if (companyLines.length) {
    logoStack.push({
      text: companyLines.join(' · '),
      fontSize: 7,
      color: '#94a3b8',
      margin: [0, 4, 0, 0] as [number, number, number, number],
    });
  }

  return {
    table: {
      widths: ['*', 160],
      body: [[
        { stack: logoStack, margin: [12, 12, 8, 12] as [number, number, number, number] },
        {
          stack: [
            { text: 'KWITANSI', fontSize: 24, bold: true, color: '#ffffff', alignment: 'right' },
            { text: 'PEMBAYARAN', fontSize: 10, color: '#ffffff', alignment: 'right', margin: [0, 2, 0, 0] as [number, number, number, number] },
          ],
          fillColor: ctx.colors.primary,
          margin: [12, 16, 14, 16] as [number, number, number, number],
        },
      ]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 14] as [number, number, number, number],
  };
}

function metaBlock(ctx: KwitansiPdfContext): Content {
  return {
    columns: [
      {
        width: '*',
        stack: [
          metaRow('Nomor Kwitansi', ctx.receiptNumber),
          metaRow('Tanggal', ctx.receiptDate),
          metaRow('Jenis Pembayaran', ctx.paymentCategory),
          metaRow('Ref. Estimasi', `${ctx.estimationCode} — ${ctx.estimationTitle}`),
        ],
      },
      {
        width: 180,
        stack: [
          {
            text: 'Total Penawaran',
            fontSize: 8,
            color: '#64748b',
            alignment: 'right',
          },
          {
            text: ctx.estimationTotal,
            fontSize: 12,
            bold: true,
            color: ctx.colors.primary,
            alignment: 'right',
            margin: [0, 2, 0, 0] as [number, number, number, number],
          },
        ],
      },
    ],
    margin: [0, 0, 0, 16] as [number, number, number, number],
  };
}

function metaRow(label: string, value: string): Content {
  return {
    columns: [
      { text: label, width: 100, fontSize: 8, color: '#64748b', bold: true },
      { text: value, width: '*', fontSize: 9, color: '#0f172a' },
    ],
    margin: [0, 0, 0, 4] as [number, number, number, number],
  };
}

function bodyBlock(ctx: KwitansiPdfContext): Content {
  const rows: Content[] = [
    {
      text: 'Telah terima dari:',
      fontSize: 9,
      color: '#64748b',
      margin: [0, 0, 0, 4] as [number, number, number, number],
    },
    {
      text: ctx.payerName.toUpperCase(),
      fontSize: 14,
      bold: true,
      color: '#0f172a',
      margin: [0, 0, 0, 2] as [number, number, number, number],
    },
  ];

  if (ctx.payerPhone !== '—') {
    rows.push({ text: ctx.payerPhone, fontSize: 9, color: '#64748b' });
  }
  if (ctx.payerAddress !== '—') {
    rows.push({ text: ctx.payerAddress, fontSize: 9, color: '#64748b', margin: [0, 2, 0, 0] as [number, number, number, number] });
  }

  rows.push(
    {
      text: 'Uang sejumlah:',
      fontSize: 9,
      color: '#64748b',
      margin: [0, 16, 0, 6] as [number, number, number, number],
    },
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: ctx.amount, fontSize: 18, bold: true, color: ctx.colors.primary, alignment: 'center' },
            { text: `(${ctx.amountWords} rupiah)`, fontSize: 9, italics: true, color: '#475569', alignment: 'center', margin: [0, 6, 0, 0] as [number, number, number, number] },
          ],
          margin: [12, 14, 12, 14] as [number, number, number, number],
        }]],
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => ctx.colors.primary,
        vLineColor: () => ctx.colors.primary,
      },
      margin: [0, 0, 0, 16] as [number, number, number, number],
    },
    {
      text: 'Untuk pembayaran:',
      fontSize: 9,
      color: '#64748b',
      margin: [0, 0, 0, 4] as [number, number, number, number],
    },
    {
      text: ctx.paymentDescription,
      fontSize: 11,
      bold: true,
      color: '#0f172a',
      margin: [0, 0, 0, 8] as [number, number, number, number],
    },
  );

  if (ctx.paymentMethod !== '—') {
    rows.push({
      text: `Metode: ${ctx.paymentMethod}`,
      fontSize: 9,
      color: '#64748b',
    });
  }

  return { stack: rows };
}

function footerBlock(ctx: KwitansiPdfContext): Content {
  const left: Content[] = [
    {
      text: 'Dokumen ini bukan faktur pajak.',
      fontSize: 8,
      italics: true,
      color: '#94a3b8',
      margin: [0, 0, 0, 8] as [number, number, number, number],
    },
  ];

  if (ctx.options.showBank) {
    left.push(
      { text: 'Rekening Perusahaan', fontSize: 9, bold: true, color: ctx.colors.primary, margin: [0, 0, 0, 4] as [number, number, number, number] },
      { text: `${ctx.bankName} · ${ctx.bankAccount}`, fontSize: 8, color: '#64748b' },
      { text: `a.n. ${ctx.bankAccountName}`, fontSize: 8, color: '#64748b', margin: [0, 0, 0, 0] as [number, number, number, number] },
    );
  }

  const right: Content[] = [];
  if (ctx.options.showSignature && ctx.signatureDataUri) {
    right.push({
      stack: [
        { text: 'Yang menerima,', fontSize: 9, alignment: 'right', color: '#64748b', margin: [0, 0, 0, 8] as [number, number, number, number] },
        { image: ctx.signatureDataUri, width: 90, alignment: 'right', margin: [0, 0, 0, 4] as [number, number, number, number] },
        { canvas: [{ type: 'line', x1: 60, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#94a3b8' }] },
        { text: ctx.signatureName || '(_________________)', fontSize: 9, alignment: 'right', margin: [0, 4, 0, 0] as [number, number, number, number] },
        { text: ctx.signatureTitle, fontSize: 8, alignment: 'right', color: '#64748b' },
      ],
    });
  } else if (ctx.options.showSignature) {
    right.push({
      stack: [
        { text: 'Yang menerima,', fontSize: 9, alignment: 'right', color: '#64748b', margin: [0, 0, 0, 40] as [number, number, number, number] },
        { canvas: [{ type: 'line', x1: 60, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#94a3b8' }] },
        { text: ctx.signatureName || '(_________________)', fontSize: 9, alignment: 'right', margin: [0, 4, 0, 0] as [number, number, number, number] },
        { text: ctx.signatureTitle, fontSize: 8, alignment: 'right', color: '#64748b' },
      ],
    });
  }

  return {
    columns: [
      { width: '*', stack: left },
      { width: 220, stack: right },
    ],
    margin: [0, 24, 0, 0] as [number, number, number, number],
  };
}

export function buildKwitansiDocumentDefinition(ctx: KwitansiPdfContext): TDocumentDefinitions {
  const content: Content[] = [
    headerBlock(ctx),
    metaBlock(ctx),
    bodyBlock(ctx),
    footerBlock(ctx),
  ];

  if (ctx.footerText) {
    content.push({
      text: ctx.footerText,
      fontSize: 7,
      color: '#94a3b8',
      alignment: 'center',
      margin: [0, 12, 0, 0] as [number, number, number, number],
    });
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 48],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#334155' },
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        {
          canvas: [{
            type: 'rect',
            x: 0,
            y: 0,
            w: 120,
            h: 6,
            color: ctx.colors.primary,
          }],
          width: 120,
        },
        { text: `Hal ${currentPage} / ${pageCount}`, alignment: 'right', fontSize: 8, color: '#94a3b8' },
      ],
      margin: [40, 0, 40, 20] as [number, number, number, number],
    }),
  };
}
