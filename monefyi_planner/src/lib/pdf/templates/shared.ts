import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { PdfTemplate } from '../../../types/estimator';
import type { ResolvedPdfDisplayOptions } from '../../../types/pdfSettings';

export type PdfDocPalette = {
  primary: string;
  secondary: string;
  accent: string;
  pageBg: string;
  text: string;
  muted: string;
  surface: string;
  altRow: string;
};

export type PdfLineItem = {
  no: number;
  name: string;
  description?: string;
  qty: string;
  unit: string;
  unitPrice: string;
  total: string;
};

export type PdfBrandFields = {
  companyName: string;
  companyTagline: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  logoDataUri: string | null;
  signatureDataUri: string | null;
  stampDataUri: string | null;
  signatureName: string;
  signatureTitle: string;
  buyerSignatureDataUri?: string | null;
  buyerSignatureName?: string | null;
  buyerSignatureTitle?: string | null;
  buyerSignedAt?: string | null;
  showBuyerSignature?: boolean;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  footerText: string;
  watermarkText: string;
  options: ResolvedPdfDisplayOptions;
  items: PdfLineItem[];
  subtotalLabel: string;
  overheadLabel: string | null;
  discountLabel: string | null;
  discountFixedLabel: string | null;
  adjustmentLabels: Array<{ label: string; value: string }>;
  taxLabel: string | null;
  billingDiscountLabel: string | null;
  bonusNote: string;
  grandTotal: string;
  grandTotalWords: string;
  notes: string;
  termsLines: string[];
  colors: { primary: string; secondary: string; accent: string };
};

const DEFAULTS: Record<PdfTemplate, Omit<PdfDocPalette, 'primary' | 'secondary' | 'accent'>> = {
  formal: { pageBg: '#ffffff', text: '#0f172a', muted: '#64748b', surface: '#f8fafc', altRow: '#f1f5f9' },
  modern: { pageBg: '#ffffff', text: '#1e293b', muted: '#64748b', surface: '#f8fafc', altRow: '#f5f3ff' },
  clean: { pageBg: '#ffffff', text: '#171717', muted: '#78716c', surface: '#fafafa', altRow: '#fafafa' },
  fullcolor: { pageBg: '#ffffff', text: '#064e3b', muted: '#047857', surface: '#ecfdf5', altRow: '#f0fdfa' },
  futuristic: { pageBg: '#0a0a0a', text: '#f8fafc', muted: '#94a3b8', surface: '#111827', altRow: '#1e293b' },
  wellness: { pageBg: '#ffffff', text: '#1f2937', muted: '#6b7280', surface: '#f9fafb', altRow: '#f3f4f6' },
  realestate: { pageBg: '#ffffff', text: '#111827', muted: '#6b7280', surface: '#f8fafc', altRow: '#f1f5f9' },
  cardblue: { pageBg: '#ffffff', text: '#0f172a', muted: '#64748b', surface: '#eff6ff', altRow: '#f8fafc' },
  greenpoly: { pageBg: '#ffffff', text: '#111827', muted: '#6b7280', surface: '#f4f7f5', altRow: '#f3f4f6' },
  navyorange: { pageBg: '#ffffff', text: '#111827', muted: '#6b7280', surface: '#f9fafb', altRow: '#f3f4f6' },
  yellowblock: { pageBg: '#ffffff', text: '#1f2937', muted: '#6b7280', surface: '#efeff1', altRow: '#f3f4f6' },
  atlasblue: { pageBg: '#ffffff', text: '#111827', muted: '#6b7280', surface: '#f9fafb', altRow: '#e7ecf1' },
  bluepill: { pageBg: '#ffffff', text: '#1f2937', muted: '#6b7280', surface: '#e7edf3', altRow: '#f8fafc' },
  innovagreen: { pageBg: '#ffffff', text: '#1f2937', muted: '#6b7280', surface: '#f9fafb', altRow: '#f3f5f4' },
  yellowcharcoal: { pageBg: '#ffffff', text: '#111827', muted: '#6b7280', surface: '#f8f9fa', altRow: '#f1f1f4' },
};

const ACCENT_DEFAULT: Record<PdfTemplate, string> = {
  formal: '#c9a961',
  modern: '#fb7185',
  clean: '#78716c',
  fullcolor: '#facc15',
  futuristic: '#00d9ff',
  wellness: '#d97706',
  realestate: '#b45309',
  cardblue: '#3b82f6',
  greenpoly: '#39b06a',
  navyorange: '#f5a623',
  yellowblock: '#fce26b',
  atlasblue: '#2c9ad3',
  bluepill: '#124e8c',
  innovagreen: '#8cd66f',
  yellowcharcoal: '#ffc52e',
};

const PRIMARY_DEFAULT: Record<PdfTemplate, string> = {
  formal: '#1e3a8a',
  modern: '#6d28d9',
  clean: '#111111',
  fullcolor: '#059669',
  futuristic: '#00c853',
  wellness: '#065f46',
  realestate: '#1e293b',
  cardblue: '#1d4ed8',
  greenpoly: '#0e7c66',
  navyorange: '#1f2e4d',
  yellowblock: '#1e212b',
  atlasblue: '#1f7fb8',
  bluepill: '#1b4f8a',
  innovagreen: '#1f9d55',
  yellowcharcoal: '#2d2f38',
};

export function paletteFor(
  template: PdfTemplate,
  colors: { primary: string; secondary: string; accent: string },
): PdfDocPalette {
  const base = DEFAULTS[template];
  return {
    ...base,
    primary: colors.primary || PRIMARY_DEFAULT[template],
    secondary: colors.secondary || (template === 'futuristic' ? '#e2e8f0' : '#1e293b'),
    accent: colors.accent || ACCENT_DEFAULT[template],
  };
}

export function pageBackground(palette: PdfDocPalette): TDocumentDefinitions['background'] {
  if (palette.pageBg === '#ffffff') return undefined;
  return () => ({
    canvas: [{ type: 'rect', x: 0, y: 0, w: 595.28, h: 841.89, color: palette.pageBg }],
  });
}

export function watermarkLayer(text: string, dark = false): TDocumentDefinitions['background'] {
  if (!text) return undefined;
  return () => ({
    text,
    fontSize: 56,
    bold: true,
    color: dark ? '#334155' : '#cbd5e1',
    opacity: 0.14,
    alignment: 'center',
    margin: [0, 360, 0, 0] as [number, number, number, number],
  });
}

export function combineBackground(
  palette: PdfDocPalette,
  watermark?: string,
): TDocumentDefinitions['background'] {
  const wm = watermark?.trim();
  const dark = palette.pageBg !== '#ffffff';
  if (!wm && palette.pageBg === '#ffffff') return undefined;
  return (currentPage, pageSize) => {
    const stack: Content[] = [];
    if (palette.pageBg !== '#ffffff') {
      stack.push({
        canvas: [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: palette.pageBg }],
      });
    }
    if (wm) {
      stack.push({
        text: wm,
        fontSize: 56,
        bold: true,
        color: dark ? '#334155' : '#cbd5e1',
        opacity: 0.16,
        alignment: 'center',
        margin: [0, 360, 0, 0] as [number, number, number, number],
      });
    }
    return { stack };
  };
}

export function itemsTable(
  ctx: Pick<PdfBrandFields, 'items'>,
  headerFill: string,
  headerColor = '#ffffff',
  altFill?: string,
  bordered = false,
): Content {
  const body: Content[][] = [
    [
      { text: '#', style: 'tableHeader', fillColor: headerFill, color: headerColor },
      { text: 'Item', style: 'tableHeader', fillColor: headerFill, color: headerColor },
      { text: 'Qty', style: 'tableHeader', fillColor: headerFill, color: headerColor },
      { text: 'Satuan', style: 'tableHeader', fillColor: headerFill, color: headerColor },
      { text: 'Harga/Unit', style: 'tableHeader', fillColor: headerFill, color: headerColor, alignment: 'right' },
      { text: 'Total', style: 'tableHeader', fillColor: headerFill, color: headerColor, alignment: 'right' },
    ],
    ...(ctx.items.length
      ? ctx.items.map((row, i) => [
          { text: String(row.no), fillColor: altFill && i % 2 ? altFill : undefined, color: undefined } as Content,
          { text: row.name, fillColor: altFill && i % 2 ? altFill : undefined } as Content,
          { text: row.qty, alignment: 'center', fillColor: altFill && i % 2 ? altFill : undefined } as Content,
          { text: row.unit, fillColor: altFill && i % 2 ? altFill : undefined } as Content,
          { text: row.unitPrice, alignment: 'right', fillColor: altFill && i % 2 ? altFill : undefined } as Content,
          { text: row.total, alignment: 'right', bold: true, fillColor: altFill && i % 2 ? altFill : undefined } as Content,
        ])
      : [[
          { text: 'Tidak ada item', italics: true, color: '#94a3b8', colSpan: 6, alignment: 'center' } as Content,
          { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' },
        ]]),
  ];

  return {
    table: { headerRows: 1, widths: [22, '*', 32, 40, 70, 75], body },
    layout: {
      hLineWidth: () => (bordered ? 0.6 : 0.4),
      vLineWidth: () => (bordered ? 0.4 : 0),
      hLineColor: () => (bordered ? '#94a3b8' : '#e2e8f0'),
      vLineColor: () => '#cbd5e1',
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
    margin: [0, 8, 0, 8] as [number, number, number, number],
  };
}

export function summaryBlock(
  ctx: Pick<PdfBrandFields, 'subtotalLabel' | 'overheadLabel' | 'discountLabel' | 'discountFixedLabel' | 'adjustmentLabels' | 'taxLabel' | 'billingDiscountLabel' | 'bonusNote' | 'grandTotal' | 'grandTotalWords'>,
  highlightColor: string,
  textColor = '#ffffff',
  totalLabel = 'GRAND TOTAL',
): Content {
  const rows: Content[] = [
    { columns: [{ text: 'Subtotal', width: '*' }, { text: ctx.subtotalLabel, width: 'auto', alignment: 'right' }], margin: [0, 2, 0, 2] as [number, number, number, number] },
  ];
  if (ctx.overheadLabel) rows.push({ columns: [{ text: 'Overhead', width: '*' }, { text: ctx.overheadLabel, width: 'auto', alignment: 'right' }], margin: [0, 2, 0, 2] as [number, number, number, number] });
  if (ctx.discountLabel) rows.push({ columns: [{ text: 'Diskon total', width: '*' }, { text: ctx.discountLabel, width: 'auto', alignment: 'right', color: '#e11d48' }], margin: [0, 2, 0, 2] as [number, number, number, number] });
  if (ctx.discountFixedLabel) rows.push({ columns: [{ text: 'Diskon nominal', width: '*' }, { text: ctx.discountFixedLabel, width: 'auto', alignment: 'right', color: '#e11d48' }], margin: [0, 2, 0, 2] as [number, number, number, number] });
  for (const adj of ctx.adjustmentLabels) {
    rows.push({ columns: [{ text: adj.label, width: '*' }, { text: adj.value, width: 'auto', alignment: 'right', color: '#e11d48' }], margin: [0, 2, 0, 2] as [number, number, number, number] });
  }
  if (ctx.taxLabel) rows.push({ columns: [{ text: 'PPN', width: '*' }, { text: ctx.taxLabel, width: 'auto', alignment: 'right' }], margin: [0, 2, 0, 2] as [number, number, number, number] });
  if (ctx.billingDiscountLabel) {
    rows.push({ columns: [{ text: 'Potongan tagihan', width: '*' }, { text: ctx.billingDiscountLabel, width: 'auto', alignment: 'right', color: '#e11d48' }], margin: [0, 2, 0, 2] as [number, number, number, number] });
  }

  rows.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: totalLabel, fontSize: 9, color: textColor, opacity: 0.9 },
          { text: ctx.grandTotal, fontSize: 18, bold: true, color: textColor },
          { text: `(${ctx.grandTotalWords} rupiah)`, fontSize: 8, color: textColor, italics: true, margin: [0, 4, 0, 0] as [number, number, number, number] },
        ],
        fillColor: highlightColor,
        margin: 8,
      }]],
    },
    layout: 'noBorders',
    margin: [0, 8, 0, 0] as [number, number, number, number],
  });

  return { stack: rows, alignment: 'right' };
}

export function bankBlock(ctx: PdfBrandFields, titleColor?: string): Content[] {
  if (!ctx.options.showBank || !ctx.bankName) return [];
  return [
    { text: 'INFORMASI PEMBAYARAN', fontSize: 11, bold: true, color: titleColor, margin: [0, 8, 0, 6] as [number, number, number, number] },
    {
      text: [`Bank: ${ctx.bankName}\n`, `No. Rek: ${ctx.bankAccount}\n`, `a/n: ${ctx.bankAccountName}`],
      fontSize: 9,
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },
  ];
}

export function signatureStampBlock(ctx: PdfBrandFields, muted = '#64748b'): Content[] {
  const hasUserSig = ctx.options.showSignature;
  const hasStamp = ctx.options.showStamp && Boolean(ctx.stampDataUri);
  const hasBuyerSig = Boolean(ctx.buyerSignatureDataUri || ctx.showBuyerSignature);

  if (!hasUserSig && !hasStamp && !hasBuyerSig) return [];

  // 1. DUA PIHAK: Tanda tangan Penyedia (User) & Pembeli (Buyer)
  if (hasBuyerSig) {
    const leftParty: Content[] = [];
    if (hasUserSig) {
      leftParty.push({ text: 'Dibuat Oleh (Penyedia),', fontSize: 9, bold: true, margin: [0, 8, 0, 8] as [number, number, number, number] });
      if (ctx.signatureDataUri) {
        leftParty.push({ image: ctx.signatureDataUri, width: 95, margin: [0, 0, 0, 4] as [number, number, number, number] });
      } else {
        leftParty.push({ text: '_________________', fontSize: 9, margin: [0, 24, 0, 4] as [number, number, number, number] });
      }
      if (ctx.signatureName) leftParty.push({ text: ctx.signatureName, bold: true, fontSize: 10 });
      if (ctx.signatureTitle) leftParty.push({ text: ctx.signatureTitle, fontSize: 9, color: muted });
      if (hasStamp && ctx.stampDataUri) {
        leftParty.push({ image: ctx.stampDataUri, width: 65, margin: [0, 4, 0, 0] as [number, number, number, number] });
      }
    }

    const rightParty: Content[] = [];
    rightParty.push({ text: 'Disetujui Oleh (Klien / Buyer),', fontSize: 9, bold: true, margin: [0, 8, 0, 8] as [number, number, number, number] });
    if (ctx.buyerSignatureDataUri) {
      rightParty.push({ image: ctx.buyerSignatureDataUri, width: 95, margin: [0, 0, 0, 4] as [number, number, number, number] });
    } else {
      rightParty.push({ text: '_________________', fontSize: 9, margin: [0, 24, 0, 4] as [number, number, number, number] });
    }
    rightParty.push({ text: ctx.buyerSignatureName || 'Klien / Buyer', bold: true, fontSize: 10 });
    rightParty.push({
      text: ctx.buyerSignedAt ? `Tgl: ${ctx.buyerSignedAt}` : (ctx.buyerSignatureTitle || 'Pemilik Proyek / Klien'),
      fontSize: 9,
      color: muted,
    });

    return [{
      columns: [
        { width: '*', stack: leftParty },
        { width: '*', stack: rightParty },
      ],
      margin: [0, 10, 0, 0] as [number, number, number, number],
    }];
  }

  // 2. SATU PIHAK (Default klasik: User di kiri, Cap di kanan)
  const left: Content[] = [];
  if (ctx.options.showSignature) {
    left.push({ text: 'Hormat kami,', fontSize: 9, margin: [0, 8, 0, 8] as [number, number, number, number] });
    if (ctx.signatureDataUri) {
      left.push({ image: ctx.signatureDataUri, width: 100, margin: [0, 0, 0, 4] as [number, number, number, number] });
    } else {
      left.push({ text: '_________________', fontSize: 9, margin: [0, 24, 0, 4] as [number, number, number, number] });
    }
    if (ctx.signatureName) left.push({ text: ctx.signatureName, bold: true, fontSize: 10 });
    if (ctx.signatureTitle) left.push({ text: ctx.signatureTitle, fontSize: 9, color: muted });
  }
  const right: Content[] = [];
  if (ctx.options.showStamp && ctx.stampDataUri) {
    right.push({ image: ctx.stampDataUri, width: 80, alignment: 'center' });
    right.push({ text: 'Cap perusahaan', fontSize: 8, color: muted, alignment: 'center', margin: [0, 4, 0, 0] as [number, number, number, number] });
  }
  if (!left.length && !right.length) return [];
  return [{
    columns: [
      { width: '*', stack: left },
      { width: 110, stack: right.length ? right : [{ text: '' }] },
    ],
    margin: [0, 8, 0, 0] as [number, number, number, number],
  }];
}

export function footerBlock(ctx: PdfBrandFields, muted = '#94a3b8'): Content[] {
  if (!ctx.options.showFooter) return [];
  const extra = [ctx.companyWebsite, ctx.companyEmail].filter(Boolean).join(' · ');
  return [{
    text: `${ctx.footerText}${extra ? ` · ${extra}` : ''} · Monefyi ${new Date().getFullYear()}`,
    fontSize: 7,
    color: muted,
    alignment: 'center',
    margin: [0, 18, 0, 0] as [number, number, number, number],
  }];
}

export function termsBlock(ctx: PdfBrandFields, titleColor?: string): Content[] {
  if (!ctx.termsLines.length) return [];
  return [
    { text: 'SYARAT & KETENTUAN', fontSize: 11, bold: true, color: titleColor, margin: [0, 14, 0, 6] as [number, number, number, number] },
    { ol: ctx.termsLines, fontSize: 9, margin: [0, 0, 0, 8] as [number, number, number, number] },
  ];
}

export function notesBlock(ctx: PdfBrandFields): Content[] {
  const parts: Content[] = [];
  if (ctx.bonusNote) {
    parts.push({ text: `Bonus: ${ctx.bonusNote}`, fontSize: 9, bold: true, margin: [0, 8, 0, ctx.notes ? 2 : 0] as [number, number, number, number] });
  }
  if (ctx.notes) {
    parts.push({ text: `Catatan: ${ctx.notes}`, fontSize: 9, italics: true, margin: [0, ctx.bonusNote ? 0 : 8, 0, 0] as [number, number, number, number] });
  }
  return parts;
}

export function fromToCards(ctx: PdfBrandFields, fromLabel: string, toLabel: string, fill: string, text = '#0f172a'): Content {
  return {
    table: {
      widths: ['*', '*'],
      body: [[
        {
          stack: [
            { text: fromLabel, fontSize: 8, color: '#64748b', margin: [0, 0, 0, 2] as [number, number, number, number] },
            { text: ctx.companyName, bold: true, color: text },
            { text: [ctx.companyAddress, ctx.companyPhone, ctx.companyEmail].filter(Boolean).join('\n'), fontSize: 9, color: text },
          ],
          fillColor: fill,
          margin: 10,
        },
        {
          stack: [
            { text: toLabel, fontSize: 8, color: '#64748b', margin: [0, 0, 0, 2] as [number, number, number, number] },
            { text: toLabel === 'KEPADA' || toLabel === 'TO' || toLabel === 'UNTUK' ? '' : '' },
          ],
          fillColor: fill,
          margin: 10,
        },
      ]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 12] as [number, number, number, number],
  };
}

export function partyColumns(
  ctx: PdfBrandFields & { customerName: string; customerPhone: string; customerAddress: string },
  leftTitle: string,
  rightTitle: string,
  fill: string,
  text = '#0f172a',
): Content {
  return {
    table: {
      widths: ['*', '*'],
      body: [[
        {
          stack: [
            { text: leftTitle, fontSize: 8, color: '#64748b', margin: [0, 0, 0, 2] as [number, number, number, number] },
            { text: ctx.companyName, bold: true, color: text },
            { text: [ctx.companyAddress, ctx.companyPhone, ctx.companyEmail].filter(Boolean).join('\n'), fontSize: 9, color: text },
          ],
          fillColor: fill,
          margin: 10,
        },
        {
          stack: [
            { text: rightTitle, fontSize: 8, color: '#64748b', margin: [0, 0, 0, 2] as [number, number, number, number] },
            { text: ctx.customerName, bold: true, color: text },
            { text: [ctx.customerPhone, ctx.customerAddress].filter(Boolean).join('\n'), fontSize: 9, color: text },
          ],
          fillColor: fill,
          margin: 10,
        },
      ]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 12] as [number, number, number, number],
  };
}

export function baseDoc(
  palette: PdfDocPalette,
  content: Content[],
  margins: [number, number, number, number] = [40, 40, 40, 40],
  watermark?: string,
): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageMargins: margins,
    defaultStyle: { font: 'Roboto', fontSize: 10, color: palette.text },
    background: combineBackground(palette, watermark),
    styles: {
      tableHeader: { bold: true, fontSize: 9 },
      sectionTitle: { fontSize: 11, bold: true, color: palette.secondary },
    },
    content,
  };
}
