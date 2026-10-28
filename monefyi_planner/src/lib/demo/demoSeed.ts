import { calcItemRow, effectiveItemSelling, emptyItem } from '../estimatorCalc';
import type { EstimationFormDraft, EstimationItemDraft, PricelistItem } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';
import { billingConfigFromOrgDefaults } from '../estimationBillingConfig';

const DEMO_ITEM_SPECS: Array<{
  name: string;
  qty: number;
  unit: string;
  selling: number;
}> = [
  { name: 'Kabinet Atas — Kitchen set', qty: 1, unit: 'unit', selling: 12_000_000 },
  { name: 'Kabinet Bawah — Kitchen set', qty: 1, unit: 'unit', selling: 14_000_000 },
  { name: 'Meja kompor — Kitchen set', qty: 1, unit: 'unit', selling: 8_000_000 },
  { name: 'Backsplash — Kitchen set', qty: 4, unit: 'm', selling: 600_000 },
  { name: 'Handle & aksesoris', qty: 1, unit: 'unit', selling: 8_600_000 },
];

function buildItems(): EstimationItemDraft[] {
  return DEMO_ITEM_SPECS.map((spec, i) => {
    const base = emptyItem(i);
    const merged: EstimationItemDraft = {
      ...base,
      id: `demo-item-${i + 1}`,
      name: spec.name,
      qty: spec.qty,
      unit: spec.unit,
      selling_price_per_unit: spec.selling,
      margin_pct: 35,
    };
    const calc = calcItemRow(merged, 'selling');
    const row: EstimationItemDraft = { ...merged, ...calc };
    row.total_profit = effectiveItemSelling(row) - (Number(row.total_hpp) || 0);
    return row;
  });
}

export function createDemoEstimationDraft(): EstimationFormDraft {
  const billing_config = billingConfigFromOrgDefaults(null, 50);
  return {
    code: 'DEMO-KS-001',
    title: 'Kitchen set',
    customer_name: 'Ibu Rina',
    customer_phone: '+62 812-0000-0000',
    customer_address: 'Cluster demo, Jakarta Selatan',
    project_id: null,
    overhead_pct: 0,
    margin_pct: 20,
    discount_pct: 0,
    discount_amount: 0,
    adjustments: [],
    tax_pct: 0,
    notes: 'Catatan demo — data fiktif untuk landing page.',
    terms_conditions: '',
    validity_days: 14,
    status: 'wa',
    pdf_template: 'modern',
    pdf_invoice_template: 'modern',
    pdf_primary_color: '#157F5F',
    pdf_secondary_color: '#11201B',
    pdf_show_images: true,
    pdf_show_bank: true,
    pdf_show_signature: true,
    pdf_show_logo: true,
    pdf_show_stamp: false,
    pdf_show_footer: true,
    images: [],
    billing_config,
    items: buildItems(),
  };
}

export function createDemoPricelistItems(): PricelistItem[] {
  const extras = [
    { name: 'Top table quartz', product: 'Kitchen set', unit: 'unit', selling: 8_200_000 },
    { name: 'LED under cabinet', product: 'Kitchen set', unit: 'm', selling: 180_000 },
    { name: 'Sink + kran', product: 'Kitchen set', unit: 'set', selling: 1_200_000 },
  ];
  const now = new Date().toISOString();
  return [...DEMO_ITEM_SPECS, ...extras.map((e) => ({ ...e, qty: 1 }))].map((spec, i) => ({
    id: `demo-pl-${i}`,
    org_id: 'demo-org-embed',
    name: spec.name.split(' — ')[0] || spec.name,
    product: 'Kitchen set',
    category: 'borongan' as const,
    unit: spec.unit,
    base_cost: Math.round(spec.selling * 0.65),
    default_margin_pct: 35,
    selling_price: spec.selling,
    is_active: true,
    created_at: now,
    updated_at: now,
  }));
}

export function createDemoPdfSettings(): PdfSettings {
  const now = new Date().toISOString();
  return {
    id: 'demo-pdf-settings',
    org_id: 'demo-org-embed',
    logo_url: null,
    company_name: 'Studio Interior Demo',
    company_tagline: 'Contoh penawaran — bukan data nyata',
    address: 'Jakarta',
    phone: '+62 21-0000-0000',
    email: 'demo@contoh.local',
    website: 'https://estimator.monefyi.com',
    bank_name: null,
    bank_account: null,
    bank_account_name: null,
    signature_url: null,
    signature_name: 'Demo Vendor',
    signature_title: 'Owner',
    stamp_url: null,
    primary_color: '#157F5F',
    secondary_color: '#11201B',
    accent_color: '#21AB7B',
    default_pdf_template: 'modern',
    default_invoice_template: 'modern',
    footer_text: 'CONTOH — TIDAK UNTUK DIUNDUH',
    watermark_text: 'CONTOH - TIDAK UNTUK DIUNDUH',
    created_at: now,
    updated_at: now,
  };
}
