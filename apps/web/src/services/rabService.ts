import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import type { EstimationBillingConfig, EstimationItem, EstimationItemDraft, EstimationFormDraft } from '../types/estimator';

const EDGE_BASE = config.supabaseUrl.replace(/\/$/, '') + '/functions/v1/rab-api';

async function bearerToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function rabRequest(path: string, init: RequestInit = {}): Promise<{ data: unknown; error?: string | null }> {
  const token = await bearerToken();
  const res = await fetch(`${EDGE_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // ignore parse errors
  }
  if (!res.ok) {
    return {
      data,
      error: (data as { error?: string } | null)?.error ?? `HTTP ${res.status}`,
    };
  }
  return { data, error: null };
}

export interface RabRecord {
  id?: string;
  [key: string]: unknown;
}

export const rabService = {
  list: (table: string) => rabRequest(`/rab/${table}`),
  get: (table: string, id: string) => rabRequest(`/rab/${table}/${id}`),
  create: (table: string, body: unknown) =>
    rabRequest(`/rab/${table}`, { method: 'POST', body: JSON.stringify(body) }),
  update: (table: string, id: string, body: unknown) =>
    rabRequest(`/rab/${table}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (table: string, id: string) =>
    rabRequest(`/rab/${table}/${id}`, { method: 'DELETE' }),
};

/* ---------- Adaptor Supabase langsung (tabel rab_app_state) via rabService ---------- */

export interface RabAppState {
  schemaVersion?: number;
  [key: string]: unknown;
}

export const rabAppState = {
  load: async (): Promise<RabAppState | null> => {
    const { data, error } = await supabase
      .from("rab_app_state")
      .select("state")
      .eq("app_key", "app-state")
      .maybeSingle();
    if (error || !data) return null;
    return (data.state as RabAppState) ?? null;
  },
  save: async (state: RabAppState): Promise<void> => {
    await supabase
      .from("rab_app_state")
      .upsert({ app_key: "app-state", state, updated_at: new Date().toISOString() });
  },
};

/* ---------- B5: 'Buat penawaran' <-> 'Buka sebagai RAB' ---------- */

export interface RabCatalogItem {
  kode: string;
  uraian: string;
  jenis: "tenaga" | "bahan" | "alat";
  satuan: string;
  harga: number;
  wilayah?: string;
}

export interface RabPackageItem {
  workItemId: string;
  paket: string;
  uraian: string;
  satuan: string;
  volume: number;
  unitPrice: number;
  amount: number;
}

export interface RabProjectSummary {
  id: string;
  name: string;
  customerName?: string | null;
  location?: string | null;
}

const DEFAULT_MARGIN_PCT = 0.1;

function money(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Dari proyek RAB -> estimasi lama (planner_estimations host).
 * Item dari paket RAB dijadikan EstimationItemDraft. Pelanggan, logo, nomor dokumen,
 * template PDF = milik host (pdfmake), hanya disiapkan sebagai draft di sini.
 */
export function rabProjectToEstimationDraft(project: RabProjectSummary, items: RabCatalogItem[]): EstimationFormDraft {
  const estimationItems = rabCatalogItemsToEstimationDrafts(items);
  const subtotalHpp = estimationItems.reduce((s, it) => s + it.total_hpp, 0);
  return {
    code: `RAB-${project.id.slice(0, 8)}`,
    title: project.name,
    customer_name: project.customerName ?? "",
    customer_phone: "",
    customer_address: "",
    project_id: null,
    overhead_pct: 0,
    margin_pct: DEFAULT_MARGIN_PCT,
    discount_pct: 0,
    discount_amount: 0,
    adjustments: [],
    tax_pct: 0,
    notes: `Dibuat dari proyek RAB ${project.name} (${project.id}).`,
    terms_conditions: "",
    validity_days: 30,
    status: "penawaran",
    pdf_template: "modern",
    pdf_invoice_template: "modern",
    pdf_primary_color: "#0F2744",
    pdf_secondary_color: "#F5A623",
    pdf_show_images: false,
    pdf_show_bank: true,
    pdf_show_signature: true,
    pdf_show_logo: true,
    pdf_show_stamp: false,
    pdf_show_footer: true,
    images: [],
    items: estimationItems,
    billing_config: { milestones: [], billing_discount_amount: 0, billing_bonus_note: "", payments: [] } as EstimationBillingConfig,
  };
}

export function rabCatalogItemsToEstimationDrafts(items: RabCatalogItem[], marginPct = DEFAULT_MARGIN_PCT): EstimationItemDraft[] {
  return items.map((it, i) => {
    const hpp = money(it.harga);
    const selling = money(hpp * (1 + marginPct));
    return {
      name: it.uraian,
      category: it.jenis,
      unit: it.satuan,
      qty: 1,
      hpp_per_unit: hpp,
      margin_pct: marginPct,
      selling_price_per_unit: selling,
      item_discount_pct: 0,
      item_discount_amount: 0,
      is_bonus: false,
      included: true,
      total_hpp: hpp,
      total_selling: selling,
      total_profit: money(selling - hpp),
      sort_order: i,
      notes: `RAB paket: ${it.kode}` + (it.wilayah ? ` (${it.wilayah})` : ""),
    };
  });
}

/**
 * Sebaliknya: estimasi lama dapat "Dibuka sebagai RAB" jika memungkinkan.
 * Mengembalikan ringkasan paket RAB dari item estimasi (data siap dikirim ke edge function).
 */
export function estimationItemsToRabPackageItems(items: EstimationItem[]): RabPackageItem[] {
  return items
    .filter((it) => it.included !== false)
    .map((it) => ({
      workItemId: it.pricelist_item_id ?? it.id,
      paket: it.category ?? "umum",
      uraian: it.name,
      satuan: it.unit,
      volume: it.qty,
      unitPrice: it.hpp_per_unit,
      amount: it.total_hpp,
    }));
}

/** Payload siap kirim ke edge function /api/rab/* untuk menyimpan katalog RAB dari estimasi lama. */
export function rabProjectPayload(projectId: string, name: string, packageItems: RabPackageItem[]) {
  return {
    project_id: projectId,
    name,
    items: packageItems,
    created_at: new Date().toISOString(),
  };
}
