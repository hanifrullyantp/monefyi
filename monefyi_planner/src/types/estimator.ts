export type PricelistCategory = 'material' | 'upah' | 'alat' | 'jasa' | 'borongan' | 'other';
export type EstimationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
export type PdfTemplate = 'modern' | 'classic' | 'minimal' | 'bold';

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
  notes: string | null;
  terms_conditions: string | null;
  validity_days: number;
  status: EstimationStatus;
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
  pdf_primary_color: string;
  pdf_secondary_color: string;
  pdf_show_images: boolean;
  pdf_show_bank: boolean;
  pdf_show_signature: boolean;
  images: EstimationImageDraft[];
  items: EstimationItemDraft[];
}

export const PDF_TEMPLATE_OPTIONS: Array<{ value: PdfTemplate; label: string; desc: string }> = [
  { value: 'modern', label: 'Modern', desc: 'Gradient header, grid foto' },
  { value: 'classic', label: 'Classic', desc: 'Formal, garis & border' },
  { value: 'minimal', label: 'Minimal', desc: 'Bersih, banyak whitespace' },
  { value: 'bold', label: 'Bold', desc: 'Typography kuat, CTA box' },
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
  grandTotal: number;
  totalProfit: number;
  avgMarginPct: number;
}
