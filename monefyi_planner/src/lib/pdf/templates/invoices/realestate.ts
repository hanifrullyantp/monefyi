import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import {
  baseDoc,
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
 * Template Invoice 2: Real Estate
 * Ciri khas: Poligon geomertik atas-bawah (Navy #0F2744, Teal #18B5A9, Kuning Emas #F2B13C),
 * header tabel Dark Navy tegas dengan garis pemisah emas.
 */
export function buildInvoiceRealEstate(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('formal', ctx.colors);
  const navy = '#0F2744';
  const teal = '#18B5A9';
  const amber = '#F2B13C';

  const content: Content[] = [
    // Top multi-color decorative band
    {
      table: {
        widths: [130, 70, 200, 115],
        body: [
          [
            { text: '', fillColor: teal, margin: [0, 4, 0, 4] as [number, number, number, number] },
            { text: '', fillColor: amber, margin: [0, 4, 0, 4] as [number, number, number, number] },
            { text: '', fillColor: navy, margin: [0, 4, 0, 4] as [number, number, number, number] },
            { text: '', fillColor: teal, margin: [0, 4, 0, 4] as [number, number, number, number] },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [-40, -40, -40, 14] as [number, number, number, number],
    },

    // Header: INVOICE & Real Estate / Brand Name
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'INVOICE', fontSize: 24, bold: true, color: navy, characterSpacing: 2 },
            { text: ctx.title, fontSize: 10, bold: true, color: '#475569', margin: [0, 2, 0, 0] as [number, number, number, number] },
          ],
        },
        {
          width: 'auto',
          stack: [
            ...(ctx.logoDataUri
              ? [{ image: ctx.logoDataUri, width: 44, alignment: 'right' as const, margin: [0, 0, 0, 2] as [number, number, number, number] }]
              : []),
            { text: ctx.companyName, fontSize: 13, bold: true, color: navy, alignment: 'right' as const },
            ...(ctx.companyTagline
              ? [{ text: ctx.companyTagline, fontSize: 8, color: '#64748b', alignment: 'right' as const }]
              : []),
            invoiceStatusBadge(ctx, navy),
          ],
        },
      ],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Info Penerima & Invoice # / Tanggal
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Invoice to:', fontSize: 8, color: navy },
            { text: ctx.customerName, fontSize: 11, bold: true, color: navy },
            { text: [ctx.customerAddress, ctx.customerPhone].filter(Boolean).join('\n'), fontSize: 8, color: '#334155' },
          ],
        },
        {
          width: 180,
          stack: [
            {
              table: {
                widths: ['*', 'auto'],
                body: [
                  [{ text: 'Invoice #', fontSize: 8.5, color: navy }, { text: ctx.invoiceNumber, fontSize: 8.5, bold: true, color: navy, alignment: 'right' as const }],
                  [{ text: 'Date', fontSize: 8.5, color: navy }, { text: ctx.dateLabel, fontSize: 8.5, color: navy, alignment: 'right' as const }],
                ],
              },
              layout: 'noBorders',
            },
          ],
        },
      ],
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },

    // Tabel Produk: Navy Header dengan pembatas garis amber
    {
      table: {
        headerRows: 1,
        widths: [22, '*', 32, 40, 70, 75],
        body: [
          [
            { text: 'SL.', bold: true, color: '#ffffff', fillColor: navy, fontSize: 8 },
            { text: 'Deskripsi Item', bold: true, color: '#ffffff', fillColor: navy, fontSize: 8 },
            { text: 'Qty', bold: true, color: '#ffffff', fillColor: navy, fontSize: 8, alignment: 'center' as const },
            { text: 'Satuan', bold: true, color: '#ffffff', fillColor: navy, fontSize: 8 },
            { text: 'Harga Satuan', bold: true, color: '#ffffff', fillColor: navy, fontSize: 8, alignment: 'right' as const },
            { text: 'Total', bold: true, color: '#ffffff', fillColor: navy, fontSize: 8, alignment: 'right' as const },
          ],
          ...(ctx.items.length
            ? ctx.items.map((row) => [
                { text: String(row.no), fontSize: 8 },
                { text: row.name, fontSize: 8 },
                { text: row.qty, alignment: 'center' as const, fontSize: 8 },
                { text: row.unit, fontSize: 8 },
                { text: row.unitPrice, alignment: 'right' as const, fontSize: 8 },
                { text: row.total, alignment: 'right' as const, bold: true, fontSize: 8 },
              ])
            : [[
                { text: 'Tidak ada item', italics: true, color: '#94a3b8', colSpan: 6, alignment: 'center' as const, fontSize: 8 } as Content,
                { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' },
              ]]),
        ],
      },
      layout: {
        hLineWidth: () => 0.7,
        vLineWidth: () => 0,
        hLineColor: (i, node) => (i === 1 ? navy : amber),
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Bagian Bawah: Info & Termin di kiri, Subtotal & TOTAL Box di kanan
    {
      columns: [
        {
          width: '*',
          stack: [
            invoicePaymentInfoBox(ctx, '#F8FAFC', '#E2E8F0', navy),
            { text: 'Jadwal Termin Tagihan', fontSize: 9, bold: true, color: navy, margin: [0, 2, 0, 2] as [number, number, number, number] },
            invoiceInstallmentsTable(ctx, navy, '#F1F5F9'),
            ...notesBlock(ctx),
          ],
        },
        { width: 20, text: '' },
        {
          width: 180,
          stack: [
            invoiceBreakdownTable(ctx, navy),
            // TOTAL Box Navy Solid
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        {
                          columns: [
                            { text: 'TOTAL', fontSize: 9, bold: true, color: '#ffffff' },
                            { text: ctx.grandTotal, fontSize: 12, bold: true, color: '#ffffff', alignment: 'right' as const },
                          ],
                        },
                      ],
                      fillColor: navy,
                      margin: [10, 6, 10, 6] as [number, number, number, number],
                    },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 0, 0, 10] as [number, number, number, number],
            },
            invoiceSignatureBlock(ctx, 'Authorised Sign', amber),
          ],
        },
      ],
    },

    // Footer
    ...footerBlock(ctx, navy),

    // Bottom decorative bar
    {
      table: {
        widths: [140, 90, 180, 105],
        body: [
          [
            { text: '', fillColor: teal, margin: [0, 3, 0, 3] as [number, number, number, number] },
            { text: '', fillColor: amber, margin: [0, 3, 0, 3] as [number, number, number, number] },
            { text: '', fillColor: navy, margin: [0, 3, 0, 3] as [number, number, number, number] },
            { text: '', fillColor: amber, margin: [0, 3, 0, 3] as [number, number, number, number] },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [-40, 14, -40, -40] as [number, number, number, number],
    },
  ];

  return baseDoc(p, content, [40, 40, 40, 40], ctx.watermarkText);
}

