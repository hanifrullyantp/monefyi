import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { buildImageSection, type QuotationPdfContext } from '../../quotationPdfContext';
import {
  bankBlock,
  baseDoc,
  footerBlock,
  notesBlock,
  paletteFor,
  signatureStampBlock,
  summaryBlock,
  termsBlock,
} from '../shared';

/** Clean — minimalis, whitespace besar, nomor sebagai statement. */
export function buildQuotationClean(ctx: QuotationPdfContext): TDocumentDefinitions {
  const p = paletteFor('clean', ctx.colors);
  const img = buildImageSection(ctx, 'clean');
  const statement = (ctx.code.split('-').pop() || ctx.code).replace(/^0+/, '') || '01';

  const itemRows: Content[] = ctx.items.flatMap((row, i) => [
    {
      columns: [
        { text: row.name, width: '*', fontSize: 10 },
        { text: row.total, width: 'auto', alignment: 'right', fontSize: 10 },
      ],
      margin: [0, 6, 0, 2] as [number, number, number, number],
    },
    {
      text: `${row.qty} ${row.unit} × ${row.unitPrice}`,
      fontSize: 8,
      color: p.muted,
      margin: [0, 0, 0, i === ctx.items.length - 1 ? 8 : 4] as [number, number, number, number],
    },
  ]);

  const content: Content[] = [
    { text: 'PENAWARAN', fontSize: 9, characterSpacing: 4, color: p.muted, margin: [0, 12, 0, 8] as [number, number, number, number] },
    { text: statement, fontSize: 36, bold: true, color: p.primary, margin: [0, 0, 0, 16] as [number, number, number, number] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: '#d6d3d1' }], margin: [0, 0, 0, 20] as [number, number, number, number] },
    { text: 'KEPADA', fontSize: 8, color: p.muted, characterSpacing: 1.5 },
    { text: ctx.customerName, fontSize: 12, margin: [0, 2, 0, 2] as [number, number, number, number] },
    { text: ctx.customerAddress, fontSize: 9, color: p.muted, margin: [0, 0, 0, 14] as [number, number, number, number] },
    { text: 'DARI', fontSize: 8, color: p.muted, characterSpacing: 1.5 },
    { text: ctx.companyName, fontSize: 12, margin: [0, 2, 0, 20] as [number, number, number, number] },
    { text: ctx.title, fontSize: 22, margin: [0, 0, 0, 6] as [number, number, number, number] },
    { text: `${ctx.dateLabel}  ·  ${ctx.validLabel}`, fontSize: 9, color: p.muted, margin: [0, 0, 0, 16] as [number, number, number, number] },
    ...(img ? [img] : []),
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: '#d6d3d1' }] },
    ...itemRows,
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: '#d6d3d1' }], margin: [0, 4, 0, 8] as [number, number, number, number] },
    summaryBlock(ctx, p.primary),
    ...notesBlock(ctx),
    ...termsBlock(ctx, p.text),
    ...bankBlock(ctx, p.text),
    { text: 'Terima kasih.', fontSize: 11, margin: [0, 20, 0, 8] as [number, number, number, number] },
    ...signatureStampBlock(ctx, p.muted),
    ...footerBlock(ctx, p.muted),
  ];

  return baseDoc(p, content, [60, 56, 60, 56], ctx.watermarkText);
}
