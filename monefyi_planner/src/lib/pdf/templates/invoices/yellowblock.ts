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
  invoiceInstallmentsTable,
  invoicePaymentInfoBox,
  invoiceSignatureBlock,
  invoiceStatusBadge,
} from './helpers';

/**
 * Template Invoice 5: Kuning Blok / Pixel Kuning (Yellow Block)
 * Ciri khas: Aksen blok kuning hangat (#FCE26B), header tabel gelap charcoal (#1E212B)
 * dengan teks putih, nama pelanggan beraksen oranye-amber (#F0A400),
 * dan box ringkasan pembayaran & total yang tegas modern.
 */
export function buildInvoiceYellowBlock(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('clean', ctx.colors);
  const yellow = '#FCE26B';
  const charcoal = '#1E212B';
  const amber = '#F0A400';
  const darkInk = '#1F2937';
  const muted = '#6B7280';
  const lightGreyBg = '#EFEFF1';
  const lineMuted = '#E5E7EB';

  const itemRows: Content[][] = ctx.items.map((it) => [
    {
      stack: [
        { text: it.name, fontSize: 8.5, bold: true, color: charcoal },
        ...(it.description ? [{ text: it.description, fontSize: 7.5, color: muted, margin: [0, 1, 0, 0] as [number, number, number, number] }] : []),
      ],
      margin: [6, 4, 6, 4] as [number, number, number, number],
    },
    { text: it.unitPrice, fontSize: 8, alignment: 'right', color: darkInk, margin: [0, 4, 4, 4] as [number, number, number, number] },
    { text: `${it.qty} ${it.unit || ''}`.trim(), fontSize: 8, alignment: 'center', color: darkInk, margin: [0, 4, 0, 4] as [number, number, number, number] },
    { text: it.total, fontSize: 8.5, bold: true, alignment: 'right', color: darkInk, margin: [0, 4, 6, 4] as [number, number, number, number] },
  ]);

  const content: Content[] = [
    // Header Atas: Brand di kiri, Blok Kuning INVOICE di kanan
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
              ? [{ text: ctx.companyTagline, fontSize: 8, color: muted }]
              : []),
            {
              text: [
                ...(ctx.companyPhone ? [`Telp: ${ctx.companyPhone}`] : []),
                ...(ctx.companyAddress ? [ctx.companyAddress] : []),
              ].join('  •  '),
              fontSize: 7.5,
              color: muted,
              margin: [0, 3, 0, 0] as [number, number, number, number],
            },
          ],
        },
        {
          width: 170,
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: 'INVOICE', fontSize: 24, bold: true, color: charcoal, alignment: 'center', characterSpacing: 2 },
                    { text: `#${ctx.invoiceNumber}`, fontSize: 9, bold: true, color: charcoal, alignment: 'center', margin: [0, 2, 0, 0] as [number, number, number, number] },
                    { text: ctx.dateLabel, fontSize: 7.5, color: '#374151', alignment: 'center', margin: [0, 1, 0, 2] as [number, number, number, number] },
                  ],
                  fillColor: yellow,
                  margin: [8, 8, 8, 8] as [number, number, number, number],
                },
              ],
            ],
          },
          layout: 'noBorders',
        },
      ],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Baris Pelanggan & Status
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Tagihan Kepada:', fontSize: 7.5, bold: true, color: muted },
            { text: ctx.customerName || 'Pelanggan', fontSize: 11, bold: true, color: amber, margin: [0, 2, 0, 1] as [number, number, number, number] },
            { text: [ctx.customerPhone, ctx.customerAddress].filter(Boolean).join('\n'), fontSize: 8, color: '#4B5563' },
          ],
        },
        {
          width: 'auto',
          stack: [
            invoiceStatusBadge(ctx, charcoal, '#FFFFFF'),
          ],
        },
      ],
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },

    // Judul Proyek
    { text: ctx.title, fontSize: 10.5, bold: true, color: charcoal, margin: [0, 0, 0, 6] as [number, number, number, number] },

    // Tabel Item (Header Charcoal #1E212B)
    {
      table: {
        headerRows: 1,
        widths: ['*', 85, 50, 95],
        body: [
          [
            { text: 'Deskripsi Item', fontSize: 7.5, bold: true, color: '#FFFFFF', fillColor: charcoal, margin: [6, 5, 6, 5] as [number, number, number, number] },
            { text: 'Harga Satuan', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'right', fillColor: charcoal, margin: [0, 5, 4, 5] as [number, number, number, number] },
            { text: 'Qty', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'center', fillColor: charcoal, margin: [0, 5, 0, 5] as [number, number, number, number] },
            { text: 'Total', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'right', fillColor: charcoal, margin: [0, 5, 6, 5] as [number, number, number, number] },
          ],
          ...itemRows,
        ],
      },
      layout: {
        hLineWidth: (i, node) => (i <= 1 || i === node.table.body.length ? 0 : 0.6),
        vLineWidth: () => 0,
        hLineColor: () => lineMuted,
      },
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Bagian Bawah: Box Pembayaran abu-abu muda di kiri, Rincian Total di kanan
    {
      columns: [
        {
          width: '*',
          stack: [
            invoicePaymentInfoBox(ctx, lightGreyBg, '#D1D5DB', charcoal),
            { text: 'Rincian Termin Pembayaran', fontSize: 9, bold: true, color: charcoal, margin: [0, 6, 0, 2] as [number, number, number, number] },
            invoiceInstallmentsTable(ctx, charcoal, '#F3F4F6', '#FFFFFF'),
            ...notesBlock(ctx),
          ],
        },
        { width: 18, text: '' },
        {
          width: 195,
          stack: [
            {
              table: {
                widths: ['*', 'auto'],
                body: [
                  [{ text: 'Sub Total', fontSize: 8, color: '#4B5563' }, { text: ctx.subtotalLabel, fontSize: 8, bold: true, alignment: 'right', color: charcoal }],
                  ...(ctx.discountLabel ? [[{ text: 'Diskon', fontSize: 8, color: '#e11d48' }, { text: ctx.discountLabel, fontSize: 8, bold: true, alignment: 'right', color: '#e11d48' }]] : []),
                  ...(ctx.taxLabel ? [[{ text: 'PPN / Pajak', fontSize: 8, color: '#4B5563' }, { text: ctx.taxLabel, fontSize: 8, bold: true, alignment: 'right', color: charcoal }]] : []),
                  ...(ctx.billingDiscountLabel ? [[{ text: 'Potongan Tagihan', fontSize: 8, color: '#e11d48' }, { text: ctx.billingDiscountLabel, fontSize: 8, bold: true, alignment: 'right', color: '#e11d48' }]] : []),
                ],
              },
              layout: 'noBorders',
              margin: [0, 0, 0, 4] as [number, number, number, number],
            },
            // Pill Box Kuning Total
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      columns: [
                        { text: 'TOTAL', fontSize: 9, bold: true, color: charcoal },
                        { text: ctx.grandTotal, fontSize: 13, bold: true, color: charcoal, alignment: 'right' },
                      ],
                      fillColor: yellow,
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

    // Bottom Charcoal bar
    {
      table: {
        widths: ['*'],
        body: [
          [{ text: '', fillColor: charcoal, margin: [0, 2, 0, 2] as [number, number, number, number] }],
        ],
      },
      layout: 'noBorders',
      margin: [-40, 10, -40, -36] as [number, number, number, number],
    },
  ];

  return baseDoc(p, content, [40, 36, 40, 36], ctx.watermarkText);
}
