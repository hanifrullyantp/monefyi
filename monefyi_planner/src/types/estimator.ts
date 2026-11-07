export type PricelistCategory = 'material' | 'upah' | 'alat' | 'jasa' | 'borongan' | 'other';
/** Sales / delivery pipeline stages shown on estimation cards. */
export type EstimationWorkflowStatus =
  | 'wa'
  | 'survei'
  | 'penawaran'
  | 'closing'
  | 'proses'
  | 'finishing'
  | 'selesai';

export type EstimationStatus = EstimationWorkflowStatus | 'rejected' | 'converted';
export type PdfTemplate =
  | 'formal'
  | 'modern'
  | 'clean'
  | 'fullcolor'
  | 'futuristic'
  | 'wellness'
  | 'realestate'
  | 'cardblue'
  | 'greenpoly'
  | 'yellowblock'
  | 'navyorange'
  | 'bluepill'
  | 'innovagreen'
  | 'atlasblue'
  | 'yellowcharcoal';

export type LegacyPdfTemplate = 'classic' | 'minimal' | 'bold';

const PDF_TEMPLATE_SET = new Set<string>([
  'formal',
  'modern',
  'clean',
  'fullcolor',
  'futuristic',
  'wellness',
  'realestate',
  'cardblue',
  'greenpoly',
  'yellowblock',
  'navyorange',
  'bluepill',
  'innovagreen',
  'atlasblue',
  'yellowcharcoal',
]);

const PDF_TEMPLATE_ALIASES: Record<string, PdfTemplate> = {
  classic: 'formal',
  minimal: 'clean',
  bold: 'fullcolor',
  inv1: 'wellness',
  inv2: 'realestate',
  inv3: 'cardblue',
  inv4: 'greenpoly',
  inv5: 'yellowblock',
  inv6: 'navyorange',
  inv7: 'bluepill',
  inv8: 'innovagreen',
  inv9: 'atlasblue',
  inv10: 'yellowcharcoal',
};

/** Map ID lama (classic/minimal/bold) ke template baru. */
export function normalizePdfTemplate(value: string | null | undefined): PdfTemplate {
  if (!value) return 'modern';
  if (value in PDF_TEMPLATE_ALIASES) return PDF_TEMPLATE_ALIASES[value];
  if (PDF_TEMPLATE_SET.has(value)) return value as PdfTemplate;
  return 'modern';
}

export interface PricelistItem {
  id: string;
  org_id: string;
  name: string;
  product: string | null;
  category: PricelistCategory | null;
  unit: string;
  base_cost: number;
  default_margin_pct: number;
  selling_price: number;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstimationItem {
  id: string;
  estimation_id: string;
  pricelist_item_id: string | null;
  name: string;
  category: string | null;
  unit: string;
  qty: number;
  hpp_per_unit: number;
  margin_pct: number;
  selling_price_per_unit: number;
  item_discount_pct: number;
  item_discount_amount: number;
  is_bonus: boolean;
  /** Centang = masuk total estimasi; tidak centang = tetap ada tapi diabaikan dari total. */
  included: boolean;
  total_hpp: number;
  total_selling: number;
  total_profit: number;
  sort_order: number;
  notes: string | null;
  created_at: string;
}

export interface Estimation {
  id: string;
  org_id: string;
  code: string;
  title: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  project_id: string | null;
  subtotal_hpp: number;
  overhead_pct: number;
  margin_pct: number;
  discount_pct: number;
  discount_amount: number;
  adjustments: EstimationAdjustment[] | null;
  tax_pct: number;
  total_selling_price: number;
  total_profit: number;
  image_1_url: string | null;
  image_1_caption: string | null;
  image_2_url: string | null;
  image_2_caption: string | null;
  image_3_url: string | null;
  image_3_caption: string | null;
  pdf_primary_color: string | null;
  pdf_secondary_color: string | null;
  pdf_template: PdfTemplate;
  pdf_invoice_template?: PdfTemplate | null;
  notes: string | null;
  terms_conditions: string | null;
  validity_days: number;
  status: EstimationStatus;
  wa_at: string | null;
  survei_at: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  proses_at: string | null;
  finishing_at: string | null;
  selesai_at: string | null;
  rejected_at: string | null;
  converted_at: string | null;
  converted_project_id: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  archive_purge_at?: string | null;
  sort_order?: number;
  billing_config?: EstimationBillingConfig | Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: EstimationItem[];
}

/** Pengurangan / penyesuaian harga di level estimasi (dengan keterangan). */
export interface EstimationAdjustment {
  id: string;
  label: string;
  /** Nominal positif — dikurangkan dari subtotal penawaran. */
  amount: number;
}

export type BillingMilestoneKey = 'dp' | 'termin_1' | 'termin_2' | 'termin_3' | 'pelunasan';

export interface BillingMilestoneConfig {
  key: BillingMilestoneKey;
  label: string;
  pct: number;
  enabled: boolean;
}

export interface EstimationLocalPayment {
  id: string;
  milestone_key: BillingMilestoneKey;
  date: string;
  amount: number;
  payment_method?: string | null;
  note?: string;
}

/** Konfigurasi tagihan & pembayaran lokal per estimasi (tanpa wajib proyek). */
export interface EstimationBillingConfig {
  milestones: BillingMilestoneConfig[];
  /** Potongan / diskon khusus kontrak tagihan (Rp). */
  billing_discount_amount: number;
  /** Catatan bonus untuk klien (tidak mengurangi tagihan). */
  billing_bonus_note: string;
  payments: EstimationLocalPayment[];
}

/** Draft row for the editable items table (may lack id until saved). */
export interface EstimationItemDraft {
  id?: string;
  pricelist_item_id?: string | null;
  /** Kelompok produk (merk/spesifikasi) — untuk sinkron qty global antar item. */
  product_group?: string;
  name: string;
  category: string;
  unit: string;
  qty: number;
  hpp_per_unit: number;
  margin_pct: number;
  selling_price_per_unit: number;
  /** Diskon % dari total jual baris ini. */
  item_discount_pct: number;
  /** Diskon nominal (Rp) dari total jual baris setelah diskon %. */
  item_discount_amount: number;
  /** Item bonus — ditampilkan tapi tidak dihitung ke total jual. */
  is_bonus: boolean;
  /** Centang = masuk total estimasi; tidak centang = tetap ada tapi diabaikan dari total. */
  included: boolean;
  total_hpp: number;
  total_selling: number;
  total_profit: number;
  sort_order: number;
  notes: string;
  /** Ekspresi dimensi segmen (misal "2+2", "2.4+1.8" untuk bentuk L). Kosong jika total biasa. */
  dimension_expr?: string;
}

export interface EstimationImageDraft {
  storagePath: string | null;
  caption: string;
  previewUrl: string | null;
  pendingFile?: File;
  uploading?: boolean;
  compressInfo?: { before: number; after: number };
}

export interface EstimationFormDraft {
  code: string;
  title: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  project_id: string | null;
  overhead_pct: number;
  margin_pct: number;
  discount_pct: number;
  /** Diskon total nominal (Rp), di luar diskon %. */
  discount_amount: number;
  /** Baris pengurangan dengan keterangan (nego, voucher, dll). */
  adjustments: EstimationAdjustment[];
  tax_pct: number;
  notes: string;
  terms_conditions: string;
  validity_days: number;
  status: EstimationStatus;
  pdf_template: PdfTemplate;
  pdf_invoice_template: PdfTemplate;
  pdf_primary_color: string;
  pdf_secondary_color: string;
  pdf_show_images: boolean;
  pdf_show_bank: boolean;
  pdf_show_signature: boolean;
  pdf_show_logo: boolean;
  pdf_show_stamp: boolean;
  pdf_show_footer: boolean;
  images: EstimationImageDraft[];
  items: EstimationItemDraft[];
  billing_config: EstimationBillingConfig;
}

export const PDF_TEMPLATE_OPTIONS: Array<{
  value: PdfTemplate;
  label: string;
  desc: string;
  tags: string[];
  accent: string;
}> = [
  { value: 'wellness', label: '1. Wellness', desc: 'Teal natural, pill elegan, calm & clean', tags: ['Wellness', 'Klinik', 'Natural'], accent: '#5E9C98' },
  { value: 'realestate', label: '2. Real Estate', desc: 'Navy & teal geometris, gold accent', tags: ['Properti', 'Korporat', 'Arsitek'], accent: '#0F2744' },
  { value: 'cardblue', label: '3. Biru Kartu', desc: 'Floating card, navy banner, yellow pill', tags: ['Agency', 'Fintech', 'Modern'], accent: '#1B67AE' },
  { value: 'greenpoly', label: '4. Hijau Poligon', desc: 'Poligon multi-green, modern tech', tags: ['Eco', 'Landscape', 'Kreatif'], accent: '#0E7C66' },
  { value: 'yellowblock', label: '5. Kuning Blok', desc: 'Blok kuning hangat, header charcoal', tags: ['Studio', 'Desain', 'Retail'], accent: '#FCE26B' },
  { value: 'navyorange', label: '6. Navy Oranye', desc: 'Header selang-seling, dinamis & tegas', tags: ['Konstruksi', 'Teknik', 'B2B'], accent: '#F5A623' },
  { value: 'bluepill', label: '7. Biru Pill', desc: 'Banner navy maritim, baris zebra pill', tags: ['Maritim', 'Logistik', 'Konsultan'], accent: '#1B4F8A' },
  { value: 'innovagreen', label: '8. Innova Hijau', desc: 'Header two-tone hijau cerah & dark', tags: ['Digital', 'Startup', 'Workshop'], accent: '#1F9D55' },
  { value: 'atlasblue', label: '9. Atlas Biru', desc: 'Biru langit, zebra soft, footer bar', tags: ['Engineering', 'SaaS', 'Arsitektur'], accent: '#2C9AD3' },
  { value: 'yellowcharcoal', label: '10. Kuning Charcoal', desc: 'Strip emas, header charcoal berbingkai', tags: ['Luxury', 'Workshop', 'Interior'], accent: '#FFC52E' },
  { value: 'formal', label: 'Formal', desc: 'Korporat, garis ganda, stamp', tags: ['B2B', 'Pemerintah'], accent: '#1e3a8a' },
  { value: 'modern', label: 'Modern', desc: 'Kartu rounded, gaya startup', tags: ['Agency', 'Interior'], accent: '#6d28d9' },
  { value: 'clean', label: 'Clean', desc: 'Minimalis, banyak whitespace', tags: ['Arsitek', 'High-end'], accent: '#111111' },
  { value: 'fullcolor', label: 'Full Color', desc: 'Gradient, badge, playful', tags: ['Kreatif', 'Kitchen set'], accent: '#059669' },
  { value: 'futuristic', label: 'Futuristic', desc: 'Dark mode, aksen neon', tags: ['Tech', 'Smart home'], accent: '#00c853' },
];

export interface EstimationSummary {
  subtotalHpp: number;
  subtotalSellingGross: number;
  itemDiscountTotal: number;
  subtotalSellingItems: number;
  overheadAmount: number;
  subtotalBeforeDiscount: number;
  discountAmountPct: number;
  discountAmountFixed: number;
  adjustmentTotal: number;
  discountAmount: number;
  afterDiscount: number;
  taxAmount: number;
  /** Total setelah PPN, sebelum potongan tagihan. */
  grossTotal: number;
  billingDiscountAmount: number;
  billingBonusNote: string;
  /** Total akhir (setelah potongan tagihan). */
  grandTotal: number;
  totalProfit: number;
  avgMarginPct: number;
}
