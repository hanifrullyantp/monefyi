import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import {
  baseDoc,
  combineBackground,
  footerBlock,
  notesBlock,
  paletteFor,
} from '../shared';
import {
  invoiceBreakdownTable,
  invoiceInstallmentsTable,
  invoicePaymentInfoBox,
  invoiceSignatureBlock,
  invoiceStatusBadge,
} from './helpers';

/**
 * Template Invoice 10: Kuning Charcoal (Yellow Charcoal)
 * Ciri khas: Aksen strip kuning emas (#FFC52E), header tabel charcoal tegas (#2D2F38)
 * berbingkai rapi (#D6D8E0) dengan baris zebra (#F1F1F4), serta box Total kuning tegas
 * yang mencolok dan profesional.
 */
export function buildInvoiceYellowCharcoal(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('clean', ctx.colors);
  const goldYellow = '#FFC52E';
  const charcoal = '#2D2F38';
  const darkInk = '#111827';
  const muted = '#6B7280';
  const tableBorder = '#D6D8E0';
  const zebraBg = '#F1F1F4';

  const itemRows: Content[][] = ctx.items.map((it, idx) => {
    const bg = idx % 2 === 1 ? zebraBg : undefined;
    return [
      { text: String(idx + 1), fontSize: 8, alignment: 'center', color: darkInk, fillColor: bg, margin: [0, 5, 0, 5] as [number, number, number, number] },
      {
        stack: [
          { text: it.name, fontSize: 8.5, bold: true, color: darkInk },
          ...(it.description ? [{ text: it.description, fontSize: 7.5, color: muted, margin: [0, 1, 0, 0] as [number, number, number, number] }] : []),
        ],
        fillColor: bg,
        margin: [6, 5, 6, 5] as [number, number, number, number],
      },
      { text: it.unitPrice, fontSize: 8, alignment: 'right', color: darkInk, fillColor: bg, margin: [0, 5, 6, 5] as [number, number, number, number] },
      { text: `${it.qty} ${it.unit || ''}`.trim(), fontSize: 8, alignment: 'center', color: darkInk, fillColor: bg, margin: [0, 5, 0, 5] as [number, number, number, number] },
      { text: it.total, fontSize: 8.5, bold: true, alignment: 'right', color: darkInk, fillColor: bg, margin: [0, 5, 6, 5] as [number, number, number, number] },
    ];
  });

  const content: Content[] = [
    // Garis Aksen Emas Kuning di Atas
    {
      canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 4, color: goldYellow }],
      margin: [0, -10, 0, 12] as [number, number, number, number],
    },

    // Header Atas: Brand & INVOICE
    {
      columns: [
        {
          width: '*',
          stack: [
            ...(ctx.logoDataUri
              ? [{ image: ctx.logoDataUri, width: 44, margin: [0, 0, 0, 4] as [number, number, number, number] }]
              : []),
            { text: ctx.companyName, fontSize: 13, bold: true, color: charcoal },
            ...(ctx.companyTagline
              ? [{ text: ctx.companyTagline, fontSize: 7.5, color: muted, characterSpacing: 0.6 }]
              : []),
          ],
        },
        {
          width: 'auto',
          stack: [
            { text: 'INVOICE', fontSize: 24, bold: true, color: charcoal, characterSpacing: 2, alignment: 'right' },
            {
              text: [
                { text: 'Invoice #: ', fontSize: 8, bold: true, color: charcoal },
                { text: `${ctx.invoiceNumber}    `, fontSize: 8, color: darkInk },
                { text: 'Date: ', fontSize: 8, bold: true, color: charcoal },
                { text: ctx.dateLabel, fontSize: 8, color: darkInk },
              ],
              alignment: 'right',
              margin: [0, 3, 0, 4] as [number, number, number, number],
            },
            invoiceStatusBadge(ctx, goldYellow, charcoal),
          ],
        },
      ],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Tagihan Kepada Pelanggan
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                { text: 'Invoice to:', fontSize: 7.5, bold: true, color: charcoal },
                { text: ctx.customerName || 'Pelanggan', fontSize: 10, bold: true, color: darkInk, margin: [0, 2, 0, 1] as [number, number, number, number] },
                { text: [ctx.customerPhone, ctx.customerAddress].filter(Boolean).join(' • '), fontSize: 8, color: '#4B5563' },
              ],
              fillColor: '#F8F9FA',
              margin: [8, 6, 8, 6] as [number, number, number, number],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.6,
        vLineWidth: () => 0.6,
        hLineColor: () => tableBorder,
        vLineColor: () => tableBorder,
      },
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },

    // Judul Dokumen
    { text: ctx.title, fontSize: 10.5, bold: true, color: charcoal, margin: [0, 0, 0, 6] as [number, number, number, number] },

    // Tabel Item Berbingkai dengan Header Charcoal
    {
      table: {
        headerRows: 1,
        widths: [24, '*', 80, 45, 85],
        body: [
          [
            { text: 'SL.', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'center', fillColor: charcoal, margin: [0, 5, 0, 5] as [number, number, number, number] },
            { text: 'Item Description', fontSize: 7.5, bold: true, color: '#FFFFFF', fillColor: charcoal, margin: [6, 5, 6, 5] as [number, number, number, number] },
            { text: 'Price', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'right', fillColor: charcoal, margin: [0, 5, 6, 5] as [number, number, number, number] },
            { text: 'Qty.', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'center', fillColor: charcoal, margin: [0, 5, 0, 5] as [number, number, number, number] },
            { text: 'Total', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'right', fillColor: charcoal, margin: [0, 5, 6, 5] as [number, number, number, number] },
          ],
          ...itemRows,
        ],
      },
      layout: {
        hLineWidth: () => 0.6,
        vLineWidth: () => 0.6,
        hLineColor: () => tableBorder,
        vLineColor: () => tableBorder,
      },
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Bagian Bawah: Payment Info di kiri, Box Total Kuning di kanan
    {
      columns: [
        {
          width: '*',
          stack: [
            invoicePaymentInfoBox(ctx, '#F9FAFB', tableBorder, charcoal),
            { text: 'Rincian Termin Pembayaran', fontSize: 9, bold: true, color: charcoal, margin: [0, 6, 0, 2] as [number, number, number, number] },
            invoiceInstallmentsTable(ctx, charcoal, zebraBg),
            ...notesBlock(ctx),
          ],
        },
        { width: 18, text: '' },
        {
          width: 195,
          stack: [
            invoiceBreakdownTable(ctx),
            // Total Box Kuning Emas
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        {
                          columns: [
                            { text: 'Total:', fontSize: 9, bold: true, color: charcoal },
                            { text: ctx.grandTotal, fontSize: 13, bold: true, color: charcoal, alignment: 'right' as const },
                          ],
                        },
                      ],
                      fillColor: goldYellow,
                      margin: [8, 6, 8, 6] as [number, number, number, number],
                    },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 2, 0, 10] as [number, number, number, number],
            },
            invoiceSignatureBlock(ctx, 'Authorised Sign', charcoal),
          ],
        },
      ],
    },

    // Footer
    ...footerBlock(ctx, charcoal),

    // Bottom gold stripe
    {
      table: {
        widths: ['*'],
        body: [
          [{ text: '', fillColor: goldYellow, margin: [0, 1, 0, 1] as [number, number, number, number] }],
        ],
      },
      layout: 'noBorders',
      margin: [-40, 10, -40, -36] as [number, number, number, number],
    },
  ];

  return baseDoc(p, content, [40, 36, 40, 36], ctx.watermarkText);
}
