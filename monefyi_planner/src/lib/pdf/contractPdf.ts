import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import convertTerbilang from 'terbilang-ts';
import { calcEstimationSummary, countedEstimationItems, summaryOptsFromDraft } from '../estimatorCalc';
import { formatDateId, formatNumberId, formatRupiahForPdf } from '../estimatorFormat';
import { buildEstimationBillingSnapshot } from '../estimationBillingSchedule';
import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';
import { urlToDataUri } from './pdfImageUtils';
import { getEstimationSignatures } from './digitalSignatureStorage';
import { initPdfMake, pdfToBlob, downloadBlob } from './pdfMakeSetup';
import {
  getContractTemplate,
  type ContractClause,
  type ContractDesign,
  type ContractTemplate,
} from './contractTemplates';

type Margin = [number, number, number, number];
const m = (l: number, t: number, r: number, b: number): Margin => [l, t, r, b];

export interface ContractFields {
  contractNumber: string;
  /** ISO yyyy-mm-dd */
  contractDate: string;
  city: string;

  vendorCompany: string;
  vendorName: string;
  vendorPosition: string;
  vendorAddress: string;
  vendorPhone: string;

  clientName: string;
  clientIdNumber: string;
  clientAddress: string;
  clientPhone: string;

  projectTitle: string;
  projectAddress: string;
  scope: string;
  contractValue: number;
  paymentTerms: string;
  bankInfo: string;

  startDate: string;
  durationDays: number;
  warrantyDays: number;
  penaltyPct: number;
  retentionPct: number;
  revisionCount: number;
  jurisdiction: string;

  /** Opsi tampilan */
  accent: string;
  showAppendix: boolean;
  showMaterai: boolean;
  showSignature: boolean;
  showWitness: boolean;
}

export interface ContractPdfInput {
  draft: EstimationFormDraft;
  settings: PdfSettings;
  templateId: string;
  fields: ContractFields;
  clauses: ContractClause[];
}

const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function safeDate(iso: string): Date {
  const d = iso ? new Date(`${iso}T12:00:00`) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, days: number): Date {
  const d = safeDate(iso);
  d.setDate(d.getDate() + Math.max(0, Math.round(days)));
  return d;
}

function words(n: number): string {
  const raw = convertTerbilang(Math.max(0, Math.round(n))).trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Nol';
}

export function buildContractNumber(code: string, date = new Date()): string {
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const safe = (code || 'EST').replace(/\s+/g, '-');
  return `SPK/${safe}/${ymd}`;
}

export function contractTotalOf(draft: EstimationFormDraft): number {
  const items = countedEstimationItems(draft.items);
  return calcEstimationSummary(
    items,
    draft.overhead_pct,
    draft.discount_pct,
    draft.tax_pct,
    summaryOptsFromDraft(draft),
  ).grandTotal;
}

/** Skema pembayaran otomatis dari jadwal tagihan estimasi. */
export function buildPaymentTermsText(draft: EstimationFormDraft): string {
  const total = contractTotalOf(draft);
  if (total <= 0) return 'Pembayaran dilakukan sesuai kesepakatan kedua belah pihak.';
  const snap = buildEstimationBillingSnapshot(total, draft.billing_config, []);
  if (snap.milestones.length === 0) {
    return `Pembayaran dilakukan sekaligus sebesar ${formatRupiahForPdf(total)} pada saat penandatanganan perjanjian.`;
  }
  const timing = (cat: string): string => {
    if (cat === 'dp') return 'dibayar pada saat penandatanganan perjanjian';
    if (cat === 'pelunasan') return 'dibayar paling lambat saat serah terima pekerjaan';
    return 'dibayar sesuai progres pekerjaan yang disepakati';
  };
  const letters = 'abcdefghij';
  const lines = snap.milestones.map(
    (ms, i) => `${letters[i] ?? i + 1}. ${ms.label} (${Math.round(ms.pct)}%) sebesar ${formatRupiahForPdf(ms.amount)}, ${timing(ms.category)}.`,
  );
  return `Pembayaran dilakukan secara bertahap dengan rincian sebagai berikut:\n${lines.join('\n')}`;
}

function defaultScopeText(draft: EstimationFormDraft): string {
  const items = countedEstimationItems(draft.items).filter(i => i.included !== false && !i.is_bonus);
  if (items.length === 0) return '';
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const top = items.slice(0, 10).map((it, i) => `${letters[i]}. ${it.name} (${formatNumberId(it.qty)} ${it.unit || 'unit'})`);
  const more = items.length > 10 ? `\ndan ${items.length - 10} item pekerjaan lainnya sesuai Lampiran A.` : '';
  return `Pekerjaan meliputi:\n${top.join('\n')}${more}`;
}

export function buildDefaultContractFields(
  draft: EstimationFormDraft,
  settings: PdfSettings,
  template: ContractTemplate,
): ContractFields {
  const today = new Date();
  const bank = [settings.bank_name, settings.bank_account, settings.bank_account_name ? `a.n. ${settings.bank_account_name}` : '']
    .filter(Boolean)
    .join(' ');
  const cityGuess = (settings.address || '').split(',').map(s => s.trim()).filter(Boolean).slice(-2)[0] || '';
  return {
    contractNumber: buildContractNumber(draft.code, today),
    contractDate: toIso(today),
    city: cityGuess,

    vendorCompany: settings.company_name || '',
    vendorName: settings.signature_name || '',
    vendorPosition: settings.signature_title || 'Direktur',
    vendorAddress: settings.address || '',
    vendorPhone: settings.phone || '',

    clientName: draft.customer_name || '',
    clientIdNumber: '',
    clientAddress: draft.customer_address || '',
    clientPhone: draft.customer_phone || '',

    projectTitle: draft.title || '',
    projectAddress: draft.customer_address || '',
    scope: defaultScopeText(draft),
    contractValue: contractTotalOf(draft),
    paymentTerms: buildPaymentTermsText(draft),
    bankInfo: bank || '(isi nomor rekening)',

    startDate: toIso(today),
    durationDays: template.defaults.durationDays,
    warrantyDays: template.defaults.warrantyDays,
    penaltyPct: template.defaults.penaltyPct,
    retentionPct: template.defaults.retentionPct,
    revisionCount: template.defaults.revisionCount,
    jurisdiction: cityGuess,

    accent: template.accent,
    showAppendix: true,
    showMaterai: true,
    showSignature: true,
    showWitness: false,
  };
}

/** Peta placeholder → nilai. Exported agar editor bisa menampilkan pratinjau variabel. */
export function buildContractValues(draft: EstimationFormDraft, f: ContractFields): Record<string, string> {
  const dash = (v: string, fallback = '..................'): string => v.trim() || fallback;
  return {
    vendor_company: dash(f.vendorCompany),
    vendor_name: dash(f.vendorName),
    vendor_position: dash(f.vendorPosition),
    vendor_address: dash(f.vendorAddress),
    vendor_phone: dash(f.vendorPhone),
    client_name: dash(f.clientName),
    client_id: dash(f.clientIdNumber, '-'),
    client_address: dash(f.clientAddress),
    client_phone: dash(f.clientPhone),
    project_title: dash(f.projectTitle),
    project_address: dash(f.projectAddress),
    scope: f.scope.trim(),
    contract_value: formatRupiahForPdf(f.contractValue),
    contract_value_words: words(f.contractValue).toLowerCase(),
    payment_terms: f.paymentTerms.trim(),
    bank_info: dash(f.bankInfo),
    start_date: formatDateId(safeDate(f.startDate)),
    end_date: formatDateId(addDays(f.startDate, f.durationDays)),
    duration_days: String(f.durationDays),
    warranty_days: String(f.warrantyDays),
    penalty_pct: String(f.penaltyPct).replace('.', ','),
    retention_pct: String(f.retentionPct),
    revision_count: String(f.revisionCount),
    jurisdiction: dash(f.jurisdiction),
    city: dash(f.city),
    contract_date: formatDateId(safeDate(f.contractDate)),
    contract_number: f.contractNumber,
    estimation_code: draft.code || '-',
  };
}

export function fillContractText(text: string, values: Record<string, string>): string {
  return text
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => values[key] ?? '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ------------------------------ PDF building ------------------------------ */

interface BuildCtx {
  design: ContractDesign;
  accent: string;
  fields: ContractFields;
  values: Record<string, string>;
  clauses: ContractClause[];
  draft: EstimationFormDraft;
  logo: string | null;
  signature: string | null;
  buyerSignature: string | null;
}

const BULLET = /^\s*((?:\d{1,2}|[a-z])[.)]|[-•])\s+(.*)$/;

function bodyParagraphs(text: string): Content[] {
  const out: Content[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const hit = BULLET.exec(line);
    if (hit) {
      out.push({
        columns: [
          { width: 16, text: hit[1] === '-' ? '•' : hit[1], fontSize: 10, color: '#334155' },
          { width: '*', text: hit[2], fontSize: 10, alignment: 'justify', color: '#1e293b' },
        ],
        margin: m(14, 0, 0, 3),
        columnGap: 2,
      });
    } else {
      out.push({ text: line, fontSize: 10, alignment: 'justify', color: '#1e293b', lineHeight: 1.25, margin: m(0, 0, 0, 4) });
    }
  }
  return out;
}

function pasalHeading(ctx: BuildCtx, no: number, title: string): Content {
  const label = `Pasal ${no}`;
  switch (ctx.design) {
    case 'formal':
      return {
        stack: [
          { text: label.toUpperCase(), alignment: 'center', bold: true, fontSize: 10.5, color: ctx.accent },
          { text: title.toUpperCase(), alignment: 'center', bold: true, fontSize: 10, color: '#0f172a', margin: m(0, 1, 0, 5) },
        ],
        margin: m(0, 10, 0, 0),
        keepWithNext: true,
      } as Content;
    case 'modern':
      return {
        stack: [
          {
            text: [
              { text: `${label}  `, color: ctx.accent, bold: true },
              { text: title, color: '#0f172a', bold: true },
            ],
            fontSize: 11,
          },
          { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 40, y2: 2, lineWidth: 2, lineColor: ctx.accent }], margin: m(0, 1, 0, 5) },
        ],
        margin: m(0, 10, 0, 0),
        keepWithNext: true,
      } as Content;
    case 'minimal':
      return {
        text: [
          { text: `${no}. `, color: '#94a3b8' },
          { text: title, bold: true, color: '#0f172a' },
        ],
        fontSize: 10.5,
        margin: m(0, 9, 0, 4),
        keepWithNext: true,
      } as Content;
    case 'bold':
    default:
      return {
        table: {
          widths: [54, '*'],
          body: [[
            { text: label.toUpperCase(), fontSize: 8.5, bold: true, color: '#ffffff', fillColor: ctx.accent, margin: m(6, 3, 6, 3), alignment: 'center' },
            { text: title, fontSize: 10.5, bold: true, color: '#0f172a', fillColor: '#f1f5f9', margin: m(8, 3, 6, 3) },
          ]],
        },
        layout: 'noBorders',
        margin: m(0, 10, 0, 5),
        keepWithNext: true,
      } as Content;
  }
}

function partyBlock(role: string, rows: Array<[string, string]>, accent: string, design: ContractDesign): Content {
  const body: Content[] = rows.map(([k, v]) => ({
    columns: [
      { width: 92, text: k, fontSize: 10, color: '#475569' },
      { width: 8, text: ':', fontSize: 10, color: '#475569' },
      { width: '*', text: v, fontSize: 10, color: '#0f172a' },
    ],
    margin: m(0, 0, 0, 2),
  }));
  const tag: Content = design === 'bold'
    ? {
      table: { body: [[{ text: role, bold: true, fontSize: 8.5, color: '#ffffff', fillColor: accent, margin: m(6, 2, 6, 2) }]] },
      layout: 'noBorders',
      margin: m(0, 0, 0, 4),
    }
    : { text: role, bold: true, fontSize: 10, color: accent, margin: m(0, 0, 0, 3) };
  return { stack: [tag, ...body], margin: m(0, 4, 0, 6) } as Content;
}

function headerBlock(ctx: BuildCtx): Content[] {
  const f = ctx.fields;
  const companyLine = [f.vendorAddress, f.vendorPhone].filter(Boolean).join(' · ');
  const logo: Content[] = ctx.logo ? [{ image: ctx.logo, width: 44, margin: m(0, 0, 0, 3) }] : [];

  if (ctx.design === 'modern') {
    return [
      {
        table: {
          widths: ['*', 190],
          body: [[
            {
              stack: [
                ...logo,
                { text: ctx.values.vendor_company.toUpperCase(), bold: true, fontSize: 11, color: ctx.accent },
                ...(companyLine ? [{ text: companyLine, fontSize: 7.5, color: '#64748b', margin: m(0, 2, 0, 0) }] : []),
              ],
              margin: m(0, 6, 8, 6),
            },
            {
              stack: [
                { text: 'SURAT PERJANJIAN', fontSize: 14, bold: true, color: '#ffffff', alignment: 'right' },
                { text: 'KERJA', fontSize: 14, bold: true, color: '#ffffff', alignment: 'right' },
                { text: `No. ${f.contractNumber}`, fontSize: 8, color: '#ffffff', alignment: 'right', margin: m(0, 4, 0, 0) },
              ],
              fillColor: ctx.accent,
              margin: m(12, 12, 14, 12),
            },
          ]],
        },
        layout: 'noBorders',
        margin: m(0, 0, 0, 14),
      } as Content,
    ];
  }

  if (ctx.design === 'minimal') {
    return [
      { text: 'PERJANJIAN KERJA', fontSize: 8, bold: true, color: '#94a3b8', characterSpacing: 2 } as Content,
      { text: ctx.values.project_title, fontSize: 18, bold: true, color: '#0f172a', margin: m(0, 2, 0, 2) } as Content,
      {
        text: `No. ${f.contractNumber} · ${ctx.values.vendor_company}`,
        fontSize: 8.5,
        color: '#64748b',
      } as Content,
      { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 515, y2: 4, lineWidth: 0.6, lineColor: '#cbd5e1' }], margin: m(0, 4, 0, 10) } as Content,
    ];
  }

  if (ctx.design === 'bold') {
    return [
      {
        columns: [
          { width: 8, canvas: [{ type: 'rect', x: 0, y: 0, w: 8, h: 62, color: ctx.accent }] },
          {
            width: '*',
            stack: [
              { text: 'SURAT PERJANJIAN KERJA', fontSize: 17, bold: true, color: '#0f172a' },
              { text: ctx.values.project_title, fontSize: 10.5, color: ctx.accent, bold: true, margin: m(0, 3, 0, 2) },
              { text: `No. ${f.contractNumber}  ·  ${ctx.values.contract_date}`, fontSize: 8.5, color: '#64748b' },
            ],
            margin: m(10, 4, 0, 0),
          },
          ...(ctx.logo ? [{ width: 56, image: ctx.logo, fit: [56, 56] as [number, number], alignment: 'right' as const }] : []),
        ],
        margin: m(0, 0, 0, 14),
      } as Content,
    ];
  }

  // formal
  return [
    ...(ctx.logo ? [{ image: ctx.logo, width: 46, alignment: 'center' as const, margin: m(0, 0, 0, 4) }] : []),
    { text: ctx.values.vendor_company.toUpperCase(), alignment: 'center', bold: true, fontSize: 12, color: ctx.accent } as Content,
    ...(companyLine ? [{ text: companyLine, alignment: 'center' as const, fontSize: 8, color: '#64748b', margin: m(0, 2, 0, 0) }] : []),
    {
      canvas: [
        { type: 'line', x1: 0, y1: 6, x2: 515, y2: 6, lineWidth: 2, lineColor: ctx.accent },
        { type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 0.6, lineColor: ctx.accent },
      ],
      margin: m(0, 2, 0, 10),
    } as Content,
    { text: 'SURAT PERJANJIAN KERJA', alignment: 'center', bold: true, fontSize: 14, decoration: 'underline', color: '#0f172a' } as Content,
    { text: `Nomor: ${f.contractNumber}`, alignment: 'center', fontSize: 9, color: '#475569', margin: m(0, 3, 0, 12) } as Content,
  ];
}

function openingBlock(ctx: BuildCtx): Content[] {
  const d = safeDate(ctx.fields.contractDate);
  const v = ctx.values;
  const intro = `Pada hari ini, ${WEEKDAYS[d.getDay()]}, tanggal ${formatDateId(d)}, bertempat di ${v.city}, yang bertanda tangan di bawah ini:`;
  return [
    { text: intro, fontSize: 10, alignment: 'justify', color: '#1e293b', margin: m(0, 0, 0, 6) },
    partyBlock(
      'PIHAK PERTAMA (Vendor)',
      [
        ['Nama', v.vendor_name],
        ['Jabatan', v.vendor_position],
        ['Perusahaan', v.vendor_company],
        ['Alamat', v.vendor_address],
        ['No. Telepon', v.vendor_phone],
      ],
      ctx.accent,
      ctx.design,
    ),
    { text: 'Selanjutnya disebut PIHAK PERTAMA.', fontSize: 9.5, italics: true, color: '#475569', margin: m(0, 0, 0, 6) },
    partyBlock(
      'PIHAK KEDUA (Klien)',
      [
        ['Nama', v.client_name],
        ['No. KTP/NIK', v.client_id],
        ['Alamat', v.client_address],
        ['No. Telepon', v.client_phone],
      ],
      ctx.accent,
      ctx.design,
    ),
    { text: 'Selanjutnya disebut PIHAK KEDUA.', fontSize: 9.5, italics: true, color: '#475569', margin: m(0, 0, 0, 8) },
    {
      text: 'PIHAK PERTAMA dan PIHAK KEDUA secara bersama-sama disebut "Para Pihak". Para Pihak sepakat mengikatkan diri dalam perjanjian kerja dengan ketentuan sebagai berikut:',
      fontSize: 10,
      alignment: 'justify',
      color: '#1e293b',
      margin: m(0, 0, 0, 2),
    },
  ];
}

function signatureBlock(ctx: BuildCtx): Content {
  const f = ctx.fields;
  const v = ctx.values;
  const line: Content = { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 190, y2: 0, lineWidth: 0.6, lineColor: '#64748b' }] };

  const vendorSign: Content[] = ctx.signature && f.showSignature
    ? [{ image: ctx.signature, width: 90, margin: m(0, 2, 0, 2) }]
    : [{ text: ' ', margin: m(0, 0, 0, f.showMaterai ? 0 : 38) }];

  const materai: Content[] = f.showMaterai
    ? [{
      table: { widths: [66], body: [[{ text: 'MATERAI\nRp 10.000', alignment: 'center', fontSize: 7, color: '#94a3b8', margin: m(0, 12, 0, 12) }]] },
      layout: {
        hLineWidth: () => 0.6, vLineWidth: () => 0.6,
        hLineColor: () => '#cbd5e1', vLineColor: () => '#cbd5e1',
        hLineStyle: () => ({ dash: { length: 3 } }), vLineStyle: () => ({ dash: { length: 3 } }),
      },
      margin: m(0, 4, 0, 4),
    } as Content]
    : [{ text: ' ', margin: m(0, 0, 0, 38) }];

  const clientSign: Content[] = ctx.buyerSignature && f.showSignature
    ? [{ image: ctx.buyerSignature, width: 90, margin: m(0, 2, 0, 2) }]
    : materai;

  const col = (role: string, mid: Content[], name: string, sub: string) => ({
    width: '*',
    stack: [
      { text: role, bold: true, fontSize: 10, color: ctx.accent },
      ...mid,
      line,
      { text: name, bold: true, fontSize: 10, color: '#0f172a', margin: m(0, 3, 0, 0) },
      { text: sub, fontSize: 8.5, color: '#64748b' },
    ],
  });

  const stack: Content[] = [
    { text: `${v.city}, ${v.contract_date}`, fontSize: 10, margin: m(0, 0, 0, 8), color: '#1e293b' },
    {
      columns: [
        col('PIHAK PERTAMA', vendorSign, v.vendor_name, v.vendor_position),
        col('PIHAK KEDUA', clientSign, v.client_name, 'Klien'),
      ],
      columnGap: 30,
    },
  ];

  if (f.showWitness) {
    stack.push({
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Saksi 1', fontSize: 9, color: '#475569', margin: m(0, 16, 0, 34) },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: '#94a3b8' }] },
            { text: '(.................................)', fontSize: 8.5, color: '#64748b', margin: m(0, 2, 0, 0) },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'Saksi 2', fontSize: 9, color: '#475569', margin: m(0, 16, 0, 34) },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: '#94a3b8' }] },
            { text: '(.................................)', fontSize: 8.5, color: '#64748b', margin: m(0, 2, 0, 0) },
          ],
        },
      ],
      columnGap: 30,
    });
  }

  return { stack, unbreakable: true, margin: m(0, 22, 0, 0) } as Content;
}

function appendixBlock(ctx: BuildCtx): Content[] {
  const items = countedEstimationItems(ctx.draft.items).filter(i => i.included !== false);
  if (items.length === 0) return [];
  const head = (t: string, align: 'left' | 'right' | 'center' = 'left') => ({
    text: t, bold: true, fontSize: 8.5, color: '#ffffff', fillColor: ctx.accent, alignment: align, margin: m(2, 3, 2, 3),
  });
  const body: Content[][] = [[head('No', 'center'), head('Uraian Pekerjaan'), head('Qty', 'right'), head('Satuan'), head('Harga Satuan', 'right'), head('Jumlah', 'right')] as Content[]];
  let sum = 0;
  items.forEach((it, i) => {
    const total = it.is_bonus ? 0 : Math.round(it.total_selling || it.qty * it.selling_price_per_unit);
    sum += total;
    const cell = (t: string, align: 'left' | 'right' | 'center' = 'left') => ({ text: t, fontSize: 8.5, alignment: align, color: '#1e293b', margin: m(2, 2, 2, 2) });
    body.push([
      cell(String(i + 1), 'center'),
      cell(it.is_bonus ? `${it.name} (Bonus)` : it.name),
      cell(formatNumberId(it.qty), 'right'),
      cell(it.unit || '-'),
      cell(formatRupiahForPdf(it.selling_price_per_unit), 'right'),
      cell(it.is_bonus ? 'Bonus' : formatRupiahForPdf(total), 'right'),
    ] as Content[]);
  });
  const foot = (t: string, bold = false, align: 'left' | 'right' = 'right') => ({
    text: t, bold, fontSize: 9, alignment: align, color: '#0f172a', margin: m(2, 3, 2, 3), fillColor: '#f1f5f9',
  });
  body.push([
    { ...foot('Nilai Perjanjian (setelah diskon & pajak, jika ada)', true), colSpan: 5 } as Content,
    {} as Content, {} as Content, {} as Content, {} as Content,
    foot(formatRupiahForPdf(ctx.fields.contractValue), true) as Content,
  ]);

  return [
    { text: '', pageBreak: 'before' } as Content,
    { text: 'LAMPIRAN A', bold: true, fontSize: 12, color: ctx.accent } as Content,
    { text: `Rincian Pekerjaan — ${ctx.values.project_title}`, fontSize: 10, color: '#475569', margin: m(0, 2, 0, 8) } as Content,
    {
      table: { headerRows: 1, widths: [22, '*', 38, 40, 78, 82], body },
      layout: {
        hLineWidth: () => 0.4,
        vLineWidth: () => 0,
        hLineColor: () => '#e2e8f0',
      },
    } as Content,
    {
      text: `Lampiran ini bagian tak terpisahkan dari perjanjian dan mengacu pada Penawaran No. ${ctx.values.estimation_code}. Jumlah baris pekerjaan ${formatRupiahForPdf(sum)}; nilai perjanjian mengikuti angka akhir di atas.`,
      fontSize: 8, italics: true, color: '#94a3b8', margin: m(0, 6, 0, 0),
    } as Content,
  ];
}

export function buildContractDocumentDefinition(ctx: BuildCtx): TDocumentDefinitions {
  const content: Content[] = [...headerBlock(ctx), ...openingBlock(ctx)];

  ctx.clauses.forEach((cl, i) => {
    const text = fillContractText(cl.body, ctx.values);
    const paras = bodyParagraphs(text);
    // Judul + paragraf pertama tidak boleh terpisah halaman (hindari judul yatim).
    const [first, ...rest] = paras;
    content.push(
      { stack: first ? [pasalHeading(ctx, i + 1, cl.title), first] : [pasalHeading(ctx, i + 1, cl.title)], unbreakable: true } as Content,
      ...rest,
    );
  });

  content.push(signatureBlock(ctx));
  if (ctx.fields.showAppendix) content.push(...appendixBlock(ctx));

  return {
    pageSize: 'A4',
    pageMargins: [40, 44, 40, 54],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#334155' },
    info: { title: `Surat Perjanjian Kerja ${ctx.fields.contractNumber}` },
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `Perjanjian ${ctx.fields.contractNumber}`, fontSize: 7.5, color: '#94a3b8', width: '*' },
        { text: 'Paraf: ______ / ______', fontSize: 7.5, color: '#94a3b8', alignment: 'center', width: 120 },
        { text: `Hal ${currentPage} / ${pageCount}`, fontSize: 7.5, color: '#94a3b8', alignment: 'right', width: 70 },
      ],
      margin: m(40, 16, 40, 0),
    }),
  };
}

function sanitize(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '').trim() || 'Perjanjian';
}

export function contractPdfFilename(draft: EstimationFormDraft): string {
  const customer = draft.customer_name?.trim() || draft.code;
  return `Surat Perjanjian ${sanitize(draft.code)} - ${sanitize(customer)}.pdf`;
}

export async function generateContractPdfBlob(input: ContractPdfInput): Promise<Blob> {
  const template = getContractTemplate(input.templateId);
  const logo = input.settings.logo_url ? await urlToDataUri(input.settings.logo_url).catch(() => null) : null;

  const storedSigs = getEstimationSignatures(input.draft.code || 'draft') || input.draft.signatures;
  let signature: string | null = null;
  if (input.fields.showSignature) {
    if (storedSigs?.userSignature?.dataUri) {
      signature = storedSigs.userSignature.dataUri;
    } else if (input.draft.user_signature_url) {
      signature = await urlToDataUri(input.draft.user_signature_url).catch(() => null);
    } else if (input.settings.signature_url) {
      signature = await urlToDataUri(input.settings.signature_url).catch(() => null);
    }
  }

  let buyerSignature: string | null = null;
  if (input.fields.showSignature) {
    if (storedSigs?.buyerSignature?.dataUri) {
      buyerSignature = storedSigs.buyerSignature.dataUri;
    } else if (input.draft.buyer_signature_url) {
      buyerSignature = await urlToDataUri(input.draft.buyer_signature_url).catch(() => null);
    }
  }

  const ctx: BuildCtx = {
    design: template.design,
    accent: input.fields.accent || template.accent,
    fields: input.fields,
    values: buildContractValues(input.draft, input.fields),
    clauses: input.clauses,
    draft: input.draft,
    logo,
    signature,
    buyerSignature,
  };
  const pdf = initPdfMake().createPdf(buildContractDocumentDefinition(ctx));
  return pdfToBlob(pdf);
}

export async function downloadContractPdf(input: ContractPdfInput): Promise<void> {
  downloadBlob(await generateContractPdfBlob(input), contractPdfFilename(input.draft));
}
