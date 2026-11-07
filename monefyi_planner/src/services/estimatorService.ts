import { supabase } from '../lib/supabase';
import { buildStatusUpdatePayload, isStatusTransitionAllowed, normalizeEstimationStatus } from '../lib/estimationStatus';
import {
  billingConfigFromOrgDefaults,
  billingConfigToDb,
  emptyBillingConfig,
  normalizeBillingConfig,
} from '../lib/estimationBillingConfig';
import { calcEstimationSummary, countedEstimationItems, normalizeEstimationItem, summaryOptsFromDraft } from '../lib/estimatorCalc';
import { nextEstimationCode } from '../lib/estimatorFormat';
import { emptyImageDrafts, hydrateImageDrafts, imagesToDbFields } from './estimationImageService';
import { normalizePdfTemplate } from '../types/estimator';
import type {
  BillingMilestoneConfig,
  Estimation,
  EstimationFormDraft,
  EstimationItem,
  EstimationItemDraft,
  EstimationStatus,
} from '../types/estimator';

function mapItemsToDb(
  estimationId: string,
  items: EstimationItemDraft[],
) {
  return items
    .filter(i => i.name.trim())
    .map((item, idx) => {
      const normalized = normalizeEstimationItem(item);
      return {
        estimation_id: estimationId,
        pricelist_item_id: normalized.pricelist_item_id || null,
        name: normalized.name.trim(),
        category: normalized.category || null,
        unit: normalized.unit || 'pcs',
        qty: normalized.qty,
        hpp_per_unit: normalized.hpp_per_unit,
        margin_pct: normalized.margin_pct,
        selling_price_per_unit: normalized.selling_price_per_unit,
        item_discount_pct: normalized.item_discount_pct ?? 0,
        item_discount_amount: normalized.item_discount_amount ?? 0,
        is_bonus: normalized.is_bonus ?? false,
        included: normalized.included !== false,
        total_hpp: normalized.total_hpp,
        total_selling: normalized.total_selling,
        total_profit: normalized.total_profit,
        sort_order: idx,
        notes: normalized.notes || null,
      };
    });
}

function summaryToHeader(
  draft: EstimationFormDraft,
  items: EstimationItemDraft[],
) {
  const s = calcEstimationSummary(
    countedEstimationItems(items),
    draft.overhead_pct,
    draft.discount_pct,
    draft.tax_pct,
    summaryOptsFromDraft(draft),
  );
  return {
    subtotal_hpp: s.subtotalHpp,
    total_selling_price: s.grandTotal,
    total_profit: s.totalProfit,
    margin_pct: s.avgMarginPct,
  };
}

export async function generateEstimationCode(orgId: string): Promise<string> {
  const { data, error } = await supabase
    .from('planner_estimations')
    .select('code')
    .eq('org_id', orgId);
  if (error) throw new Error(error.message);
  return nextEstimationCode((data || []).map(r => r.code as string));
}

export async function loadEstimations(
  orgId: string,
  opts?: { status?: EstimationStatus; search?: string; includeArchived?: boolean },
): Promise<Estimation[]> {
  let q = supabase
    .from('planner_estimations')
    .select('*')
    .eq('org_id', orgId);

  // Default: sembunyikan yang sudah di-soft delete (deleted_at IS NULL)
  if (!opts?.includeArchived) {
    q = q.is('deleted_at', null);
  }

  q = q.order('updated_at', { ascending: false });

  if (opts?.status) q = q.eq('status', opts.status);

  const { data, error } = await q;
  if (error) {
    // Graceful fallback jika kolom deleted_at belum ada di schema database
    if (error.message.includes('deleted_at') || error.code === '42703') {
      let retryQ = supabase
        .from('planner_estimations')
        .select('*')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false });
      if (opts?.status) retryQ = retryQ.eq('status', opts.status);
      const { data: retryData, error: retryErr } = await retryQ;
      if (retryErr) throw new Error(retryErr.message);
      return processEstimationRows(retryData, opts?.search);
    }
    throw new Error(error.message);
  }

  return processEstimationRows(data, opts?.search);
}

function processEstimationRows(data: any[] | null, search?: string): Estimation[] {
  let rows = (data || []).map(row => ({
    ...(row as Estimation),
    status: normalizeEstimationStatus((row as Estimation).status),
    sort_order: Number((row as any).sort_order ?? 0),
  }));

  const cleanSearch = search?.toLowerCase().trim();
  if (cleanSearch) {
    rows = rows.filter(
      e =>
        e.code.toLowerCase().includes(cleanSearch) ||
        e.title.toLowerCase().includes(cleanSearch) ||
        (e.customer_name || '').toLowerCase().includes(cleanSearch),
    );
  }
  return rows;
}

export async function countLifetimeEstimations(orgId: string): Promise<number> {
  const { data, error } = await supabase
    .from('planner_estimation_usage')
    .select('created_count')
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      const { count, error: countError } = await supabase
        .from('planner_estimations')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId);
      if (countError) throw new Error(countError.message);
      return count ?? 0;
    }
    throw new Error(error.message);
  }
  return Number(data?.created_count ?? 0);
}

export async function countEstimationsInLast30Days(orgId: string): Promise<{
  count: number;
  totalAmount: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data, error } = await supabase
    .from('planner_estimations')
    .select('total_selling_price, created_at')
    .eq('org_id', orgId)
    .gte('created_at', since.toISOString());

  if (error) throw new Error(error.message);

  const rows = data || [];
  const totalAmount = rows.reduce(
    (sum, row) => sum + Number(row.total_selling_price || 0),
    0,
  );
  return { count: rows.length, totalAmount };
}

export async function loadEstimation(id: string): Promise<Estimation | null> {
  const { data: est, error } = await supabase
    .from('planner_estimations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!est) return null;

  const { data: items, error: itemsErr } = await supabase
    .from('planner_estimation_items')
    .select('*')
    .eq('estimation_id', id)
    .order('sort_order', { ascending: true });
  if (itemsErr) throw new Error(itemsErr.message);

  return {
    ...(est as Estimation),
    status: normalizeEstimationStatus((est as Estimation).status),
    items: (items || []) as EstimationItem[],
  };
}

export async function createEstimation(
  orgId: string,
  userId: string,
  draft: EstimationFormDraft,
): Promise<Estimation> {
  const items = draft.items.filter(i => i.name.trim());
  const header = summaryToHeader(draft, items);

  const { data: est, error } = await supabase
    .from('planner_estimations')
    .insert({
      org_id: orgId,
      code: draft.code,
      title: draft.title,
      customer_name: draft.customer_name || null,
      customer_phone: draft.customer_phone || null,
      customer_address: draft.customer_address || null,
      project_id: draft.project_id,
      overhead_pct: draft.overhead_pct,
      discount_pct: draft.discount_pct,
      discount_amount: draft.discount_amount,
      adjustments: draft.adjustments.filter(a => a.label.trim() && a.amount > 0),
      tax_pct: draft.tax_pct,
      notes: draft.notes || null,
      terms_conditions: draft.terms_conditions || null,
      validity_days: draft.validity_days,
      status: draft.status,
      pdf_template: normalizePdfTemplate(draft.pdf_template),
      pdf_invoice_template: normalizePdfTemplate(draft.pdf_invoice_template),
      pdf_primary_color: draft.pdf_primary_color || null,
      pdf_secondary_color: draft.pdf_secondary_color || null,
      billing_config: billingConfigToDb(draft.billing_config),
      created_by: userId,
      ...imagesToDbFields(draft.images),
      ...header,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const estimationId = (est as Estimation).id;
  const dbItems = mapItemsToDb(estimationId, items);
  if (dbItems.length) {
    const { error: itemsErr } = await supabase.from('planner_estimation_items').insert(dbItems);
    if (itemsErr) throw new Error(itemsErr.message);
  }

  return (await loadEstimation(estimationId)) as Estimation;
}

export async function updateEstimation(
  id: string,
  draft: EstimationFormDraft,
): Promise<Estimation> {
  const existing = await loadEstimation(id);
  if (!existing) throw new Error('Estimasi tidak ditemukan');
  if (existing.status === 'converted') {
    throw new Error('Estimasi sudah menjadi proyek dan tidak bisa diedit');
  }

  const items = draft.items.filter(i => i.name.trim());
  const header = summaryToHeader(draft, items);

  const { error } = await supabase
    .from('planner_estimations')
    .update({
      code: draft.code,
      title: draft.title,
      customer_name: draft.customer_name || null,
      customer_phone: draft.customer_phone || null,
      customer_address: draft.customer_address || null,
      project_id: draft.project_id,
      overhead_pct: draft.overhead_pct,
      discount_pct: draft.discount_pct,
      discount_amount: draft.discount_amount,
      adjustments: draft.adjustments.filter(a => a.label.trim() && a.amount > 0),
      tax_pct: draft.tax_pct,
      notes: draft.notes || null,
      terms_conditions: draft.terms_conditions || null,
      validity_days: draft.validity_days,
      status: draft.status,
      pdf_template: normalizePdfTemplate(draft.pdf_template),
      pdf_invoice_template: normalizePdfTemplate(draft.pdf_invoice_template),
      pdf_primary_color: draft.pdf_primary_color || null,
      pdf_secondary_color: draft.pdf_secondary_color || null,
      billing_config: billingConfigToDb(draft.billing_config),
      updated_at: new Date().toISOString(),
      ...imagesToDbFields(draft.images),
      ...header,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  const { error: delErr } = await supabase
    .from('planner_estimation_items')
    .delete()
    .eq('estimation_id', id);
  if (delErr) throw new Error(delErr.message);

  const dbItems = mapItemsToDb(id, items);
  if (dbItems.length) {
    const { error: insErr } = await supabase.from('planner_estimation_items').insert(dbItems);
    if (insErr) throw new Error(insErr.message);
  }

  return (await loadEstimation(id)) as Estimation;
}

export async function deleteEstimation(id: string, userId?: string): Promise<void> {
  const now = new Date();
  const purgeAt = new Date();
  purgeAt.setDate(purgeAt.getDate() + 30);

  // Soft-delete ke arsip 30 hari
  const updatePayload: Record<string, unknown> = {
    deleted_at: now.toISOString(),
    archive_purge_at: purgeAt.toISOString(),
    status: 'rejected',
    updated_at: now.toISOString(),
  };
  if (userId) {
    updatePayload.deleted_by = userId;
  }

  const { error } = await supabase
    .from('planner_estimations')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    // Jika kolom deleted_at belum ada di DB, fallback ke status rejected / hard delete jika perlu
    if (error.message.includes('deleted_at') || error.code === '42703') {
      const { error: fallbackErr } = await supabase
        .from('planner_estimations')
        .update({ status: 'rejected', updated_at: now.toISOString() })
        .eq('id', id);
      if (fallbackErr) throw new Error(fallbackErr.message);
      return;
    }
    throw new Error(error.message);
  }
}

/** Hard delete langsung (misal saat purge permanen setelah 30 hari atau pembersihan) */
export async function hardDeleteEstimation(id: string): Promise<void> {
  const { error } = await supabase.from('planner_estimations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Pulihkan estimasi yang diarsipkan */
export async function restoreArchivedEstimation(id: string): Promise<Estimation> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('planner_estimations')
    .update({
      deleted_at: null,
      deleted_by: null,
      archive_purge_at: null,
      status: 'wa',
      updated_at: now,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  return (await loadEstimation(id)) as Estimation;
}

/** Simpan urutan drag & drop kartu estimasi */
export async function updateEstimationOrder(
  items: Array<{ id: string; sort_order: number }>,
): Promise<void> {
  if (!items.length) return;
  try {
    const promises = items.map(item =>
      supabase
        .from('planner_estimations')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id),
    );
    await Promise.all(promises);
  } catch (err) {
    console.error('Peringatan: Gagal memperbarui urutan estimasi:', err);
  }
}

export async function updateEstimationStatus(
  id: string,
  newStatus: EstimationStatus,
): Promise<Estimation> {
  const current = await loadEstimation(id);
  if (!current) throw new Error('Estimasi tidak ditemukan');
  const fromStatus = normalizeEstimationStatus(current.status);
  if (fromStatus === 'converted') {
    throw new Error('Estimasi sudah menjadi proyek');
  }
  const toStatus = normalizeEstimationStatus(newStatus);
  if (!isStatusTransitionAllowed(fromStatus, toStatus)) {
    throw new Error('Transisi status tidak valid');
  }

  const payload = buildStatusUpdatePayload(fromStatus, toStatus);
  const { error } = await supabase
    .from('planner_estimations')
    .update(payload)
    .eq('id', id);
  if (error) throw new Error(error.message);

  return (await loadEstimation(id)) as Estimation;
}

export async function duplicateEstimation(
  id: string,
  orgId: string,
  userId: string,
): Promise<Estimation> {
  const source = await loadEstimation(id);
  if (!source) throw new Error('Estimasi tidak ditemukan');

  const code = await generateEstimationCode(orgId);
  const draft: EstimationFormDraft = {
    code,
    title: `${source.title} (salinan)`,
    customer_name: source.customer_name || '',
    customer_phone: source.customer_phone || '',
    customer_address: source.customer_address || '',
    project_id: source.project_id,
    overhead_pct: Number(source.overhead_pct),
    margin_pct: Number(source.margin_pct),
    discount_pct: Number(source.discount_pct),
    discount_amount: Number(source.discount_amount ?? 0),
    adjustments: Array.isArray(source.adjustments) ? source.adjustments : [],
    tax_pct: Number(source.tax_pct),
    notes: source.notes || '',
    terms_conditions: source.terms_conditions || '',
    validity_days: source.validity_days,
    status: 'wa',
    pdf_template: normalizePdfTemplate(source.pdf_template),
    pdf_invoice_template: normalizePdfTemplate(source.pdf_invoice_template || source.pdf_template),
    pdf_primary_color: source.pdf_primary_color || '#059669',
    pdf_secondary_color: source.pdf_secondary_color || '#1e293b',
    pdf_show_images: true,
    pdf_show_bank: true,
    pdf_show_signature: true,
    pdf_show_logo: true,
    pdf_show_stamp: true,
    pdf_show_footer: true,
    images: emptyImageDrafts(),
    billing_config: {
      ...normalizeBillingConfig(source.billing_config),
      payments: [],
    },
    items: (source.items || []).map((item, idx) => ({
      pricelist_item_id: item.pricelist_item_id,
      name: item.name,
      category: item.category || 'material',
      unit: item.unit,
      qty: Number(item.qty),
      hpp_per_unit: Number(item.hpp_per_unit),
      margin_pct: Number(item.margin_pct),
      selling_price_per_unit: Number(item.selling_price_per_unit),
      item_discount_pct: Number(item.item_discount_pct ?? 0),
      item_discount_amount: Number(item.item_discount_amount ?? 0),
      is_bonus: Boolean(item.is_bonus),
      included: item.included !== false,
      total_hpp: Number(item.total_hpp),
      total_selling: Number(item.total_selling),
      total_profit: Number(item.total_profit),
      sort_order: idx,
      notes: item.notes || '',
    })),
  };
  return createEstimation(orgId, userId, draft);
}

export async function estimationToFormDraft(est: Estimation): Promise<EstimationFormDraft> {
  const images = await hydrateImageDrafts(est);
  return {
    code: est.code,
    title: est.title,
    customer_name: est.customer_name || '',
    customer_phone: est.customer_phone || '',
    customer_address: est.customer_address || '',
    project_id: est.project_id,
    overhead_pct: Number(est.overhead_pct),
    margin_pct: Number(est.margin_pct),
    discount_pct: Number(est.discount_pct),
    discount_amount: Number(est.discount_amount ?? 0),
    adjustments: Array.isArray(est.adjustments) ? est.adjustments : [],
    tax_pct: Number(est.tax_pct),
    notes: est.notes || '',
    terms_conditions: est.terms_conditions || '',
    validity_days: est.validity_days,
    status: est.status,
    pdf_template: normalizePdfTemplate(est.pdf_template),
    pdf_invoice_template: normalizePdfTemplate(est.pdf_invoice_template || est.pdf_template),
    pdf_primary_color: est.pdf_primary_color || '#059669',
    pdf_secondary_color: est.pdf_secondary_color || '#1e293b',
    pdf_show_images: true,
    pdf_show_bank: true,
    pdf_show_signature: true,
    pdf_show_logo: true,
    pdf_show_stamp: true,
    pdf_show_footer: true,
    images,
    billing_config: normalizeBillingConfig(est.billing_config),
    items: (est.items || []).map(item =>
      normalizeEstimationItem({
        id: item.id,
        pricelist_item_id: item.pricelist_item_id,
        name: item.name,
        category: item.category || 'material',
        unit: item.unit,
        qty: Number(item.qty),
        hpp_per_unit: Number(item.hpp_per_unit),
        margin_pct: Number(item.margin_pct),
        selling_price_per_unit: Number(item.selling_price_per_unit),
        item_discount_pct: Number(item.item_discount_pct ?? 0),
        item_discount_amount: Number(item.item_discount_amount ?? 0),
        is_bonus: Boolean(item.is_bonus),
        included: item.included !== false,
        total_hpp: Number(item.total_hpp),
        total_selling: Number(item.total_selling),
        total_profit: Number(item.total_profit),
        sort_order: item.sort_order,
        notes: item.notes || '',
      }),
    ),
  };
}

export function newEstimationDraft(
  code: string,
  defaultDpPct = 50,
  defaultMilestones?: BillingMilestoneConfig[] | null,
): EstimationFormDraft {
  const billing_config = billingConfigFromOrgDefaults(defaultMilestones, defaultDpPct);
  return {
    code,
    title: '',
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    project_id: null,
    overhead_pct: 0,
    margin_pct: 20,
    discount_pct: 0,
    discount_amount: 0,
    adjustments: [],
    tax_pct: 0,
    notes: '',
    terms_conditions: '',
    validity_days: 14,
    status: 'wa',
    pdf_template: 'modern',
    pdf_invoice_template: 'modern',
    pdf_primary_color: '#059669',
    pdf_secondary_color: '#1e293b',
    pdf_show_images: true,
    pdf_show_bank: true,
    pdf_show_signature: true,
    pdf_show_logo: true,
    pdf_show_stamp: true,
    pdf_show_footer: true,
    images: emptyImageDrafts(),
    billing_config,
    items: [],
  };
}
