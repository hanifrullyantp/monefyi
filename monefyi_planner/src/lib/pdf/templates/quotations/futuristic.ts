import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { buildImageSection, type QuotationPdfContext } from '../../quotationPdfContext';
import {
  bankBlock,
  baseDoc,
  footerBlock,
  itemsTable,
  notesBlock,
  paletteFor,
  signatureStampBlock,
  summaryBlock,
  termsBlock,
} from '../shared';

/** Futuristic — dark, aksen neon, gaya terminal. */
export function buildQuotationFuturistic(ctx: QuotationPdfContext): TDocumentDefinitions {
  const p = paletteFor('futuristic', ctx.colors);
  const img = buildImageSection(ctx, 'futuristic');

  const content: Content[] = [
    { text: '▸ QUOTATION_V2.0', fontSize: 11, bold: true, color: p.primary, margin: [0, 0, 0, 4] as [number, number, number, number] },
    { text: `#${ctx.code}  //  GENERATED_${ctx.dateLabel.replace(/\s/g, '_')}`, fontSize: 8, color: p.accent },
    {
      table: {
        widths: ['auto'],
        body: [[{
          text: '● ACTIVE',
          fontSize: 8,
          bold: true,
          color: p.primary,
          fillColor: p.surface,
          margin: [8, 4, 8, 4] as [number, number, number, number],
        }]],
      },
      layout: 'noBorders',
      margin: [0, 10, 0, 14] as [number, number, number, number],
    },
    { text: 'CLIENT.DATA', fontSize: 9, bold: true, color: p.accent, margin: [0, 0, 0, 4] as [number, number, number, number] },
    { text: `> name: "${ctx.customerName}"`, fontSize: 9, color: p.text },
    { text: `> location: "${ctx.customerAddress}"`, fontSize: 9, color: p.text },
    { text: `> valid_until: "${ctx.validLabel}"`, fontSize: 9, color: p.text, margin: [0, 0, 0, 12] as [number, number, number, number] },
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: `PROJECT: ${ctx.title.toUpperCase().replace(/\s+/g, '_')}`, fontSize: 11, bold: true, color: p.primary },
            { text: `FROM: ${ctx.companyName}`, fontSize: 8, color: p.muted, margin: [0, 4, 0, 0] as [number, number, number, number] },
          ],
          fillColor: p.surface,
          margin: 10,
        }]],
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => p.primary,
        vLineColor: () => p.primary,
      },
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },
    ...(img ? [img] : []),
    { text: 'ITEMIZATION.LIST', fontSize: 9, bold: true, color: p.accent, margin: [0, 4, 0, 4] as [number, number, number, number] },
    itemsTable(ctx, p.surface, p.primary, p.altRow, true),
    summaryBlock(ctx, p.primary, '#0a0a0a', 'TOTAL_AMOUNT'),
    ...notesBlock(ctx),
    ...termsBlock(ctx, p.accent),
    ...bankBlock(ctx, p.accent),
    { text: 'SIGNATURE.HASH', fontSize: 8, color: p.accent, margin: [0, 12, 0, 2] as [number, number, number, number] },
    { text: `0x${ctx.code.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).padEnd(8, '0')}…${String(ctx.grandTotalRaw || 0).slice(-4)}`, fontSize: 8, color: p.muted },
    ...signatureStampBlock(ctx, p.muted),
    { text: '▸ END_OF_DOCUMENT', fontSize: 8, color: p.primary, margin: [0, 12, 0, 0] as [number, number, number, number] },
    ...footerBlock(ctx, p.muted),
  ];

  return baseDoc(p, content, [40, 40, 40, 40], ctx.watermarkText);
}
