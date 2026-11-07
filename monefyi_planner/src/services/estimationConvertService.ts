import { supabase } from '../lib/supabase';
import { getProject } from './projectService';
import type { ConvertEstimationProjectInput } from '../lib/estimationConvert';
import type { Estimation } from '../types/estimator';

export interface ConvertEstimationResult {
  projectId: string;
}

export async function convertEstimationToProject(
  estimationId: string,
  projectData: ConvertEstimationProjectInput,
  selectedItemIds: string[],
): Promise<ConvertEstimationResult> {
  if (!selectedItemIds.length) {
    throw new Error('Pilih minimal satu item untuk RAP');
  }

  const { data, error } = await supabase.rpc('convert_estimation_to_project', {
    p_estimation_id: estimationId,
    p_name: projectData.name.trim(),
    p_client_name: projectData.clientName.trim(),
    p_client_phone: projectData.clientPhone.trim(),
    p_location: projectData.location.trim(),
    p_start_date: projectData.startDate,
    p_end_date: projectData.endDate,
    p_description: projectData.description.trim(),
    p_selected_item_ids: selectedItemIds,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Gagal membuat proyek');

  const projectId = String(data);

  // Jembatan otomatis: migrasikan DP/pembayaran yang sudah diterima di Estimasi & buat Work Items awal dari Grup Produk
  try {
    const [{ data: authData }, { data: estPayments }, { data: estRow }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('planner_estimation_payments')
        .select('*')
        .eq('estimation_id', estimationId)
        .order('payment_date', { ascending: true }),
      supabase
        .from('planner_estimations')
        .select('products, billing_config')
        .eq('id', estimationId)
        .maybeSingle(),
    ]);

    const currentUserId = authData?.user?.id || '';

    if (estPayments && estPayments.length > 0 && currentUserId) {
      const { createProjectIncome } = await import('./incomeService');
      for (const pay of estPayments) {
        const amt = Number(pay.amount) || 0;
        if (amt <= 0) continue;
        await createProjectIncome({
          project_id: projectId,
          date: (pay.payment_date as string) || projectData.startDate || new Date().toISOString().slice(0, 10),
          amount: amt,
          category: 'dp',
          description: (pay.notes as string) || 'Pembayaran DP / Termin dari Estimasi',
          payment_method: (pay.payment_method as string) || null,
          status: 'received',
          recorded_by: (pay.created_by as string) || currentUserId,
        });
      }
    }

    const rawProducts = Array.isArray(estRow?.products)
      ? (estRow.products as Array<{ name?: string }>)
      : [];
    const validProducts = rawProducts.filter(p => p?.name && String(p.name).trim());
    if (validProducts.length > 0) {
      const { createWorkItem } = await import('./workItemService');
      const equalWeight = Math.max(1, Math.round(100 / validProducts.length));
      for (let i = 0; i < validProducts.length; i++) {
        await createWorkItem({
          project_id: projectId,
          name: String(validProducts[i].name).trim(),
          planned_start: projectData.startDate,
          planned_end: projectData.endDate,
          progress_pct: 0,
          weight: equalWeight,
          status: 'pending',
          sort_order: i,
        });
      }
    }
  } catch (bridgeErr) {
    console.error('Post-conversion bridge (payments/workItems) warning:', bridgeErr);
  }

  return { projectId };
}

export interface SourceEstimationInfo {
  id: string;
  code: string;
  title: string;
}

export async function loadSourceEstimationForProject(
  projectId: string,
): Promise<SourceEstimationInfo | null> {
  const { data: project, error: projectErr } = await supabase
    .from('planner_projects')
    .select('source_estimation_id')
    .eq('id', projectId)
    .maybeSingle();
  if (projectErr) throw new Error(projectErr.message);

  const estimationId = project?.source_estimation_id as string | null;
  if (!estimationId) return null;

  const { data: est, error: estErr } = await supabase
    .from('planner_estimations')
    .select('id, code, title')
    .eq('id', estimationId)
    .maybeSingle();
  if (estErr) throw new Error(estErr.message);
  if (!est) return null;

  return {
    id: est.id as string,
    code: est.code as string,
    title: est.title as string,
  };
}

export async function loadConvertedProjectSummary(
  projectId: string,
  currency = 'IDR',
): Promise<{ id: string; name: string } | null> {
  const project = await getProject(projectId, currency);
  if (!project) return null;
  return { id: project.id, name: project.name };
}

export interface LinkEstimationToExistingProjectOptions {
  estimationId: string;
  projectId: string;
  copyItemsToRap?: boolean;
  selectedItemIds?: string[];
}

export async function linkEstimationToExistingProject({
  estimationId,
  projectId,
  copyItemsToRap = true,
  selectedItemIds = [],
}: LinkEstimationToExistingProjectOptions): Promise<{ projectId: string; rapItemCount: number; rapBudgetTotal: number }> {
  const now = new Date().toISOString();

  // 1. Ambil data estimasi dan proyek untuk validasi & bridge
  const [{ data: est, error: estErr }, { data: project, error: projErr }] = await Promise.all([
    supabase
      .from('planner_estimations')
      .select('id, org_id, code, title, status, total_selling_price, products, billing_config')
      .eq('id', estimationId)
      .single(),
    supabase
      .from('planner_projects')
      .select('id, name, total_budget, settings')
      .eq('id', projectId)
      .single(),
  ]);

  if (estErr || !est) throw new Error(estErr?.message || 'Estimasi tidak ditemukan');
  if (projErr || !project) throw new Error(projErr?.message || 'Proyek tidak ditemukan');

  // 2. Hubungkan dua arah (planner_estimations & planner_projects)
  const currentSettings = typeof project.settings === 'object' && project.settings !== null ? project.settings : {};
  const updatedSettings = {
    ...currentSettings,
    contract_value: Number(est.total_selling_price) || (currentSettings as Record<string, unknown>).contract_value || 0,
  };

  const [{ error: updateEstErr }, { error: updateProjErr }] = await Promise.all([
    supabase
      .from('planner_estimations')
      .update({
        project_id: projectId,
        converted_project_id: projectId,
        status: 'converted',
        converted_at: now,
        updated_at: now,
      })
      .eq('id', estimationId),
    supabase
      .from('planner_projects')
      .update({
        source_estimation_id: estimationId,
        settings: updatedSettings,
        updated_at: now,
      })
      .eq('id', projectId),
  ]);

  if (updateEstErr) throw new Error(`Gagal memperbarui status estimasi: ${updateEstErr.message}`);
  if (updateProjErr) throw new Error(`Gagal menghubungkan proyek: ${updateProjErr.message}`);

  let insertedCount = 0;
  let addedBudget = 0;

  // 3. Jika dipilih salin item ke RAP
  if (copyItemsToRap && selectedItemIds.length > 0) {
    const { data: estItems, error: itemsErr } = await supabase
      .from('planner_estimation_items')
      .select('*')
      .eq('estimation_id', estimationId)
      .in('id', selectedItemIds)
      .order('sort_order', { ascending: true });

    if (itemsErr) throw new Error(`Gagal memuat item estimasi: ${itemsErr.message}`);

    if (estItems && estItems.length > 0) {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;

      // Ambil max sort_order yang sudah ada di RAP proyek tujuan
      const { data: existingRap } = await supabase
        .from('planner_rap_items')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1);

      let currentSort = Number(existingRap?.[0]?.sort_order ?? 0);

      const rapRows = estItems.map(item => {
        currentSort += 1;
        const rawCategory = (item.category || 'material').toLowerCase();
        const rapType = rawCategory === 'material'
          ? 'material'
          : rawCategory === 'upah' || rawCategory === 'borongan'
            ? 'labor'
            : rawCategory === 'alat'
              ? 'equipment'
              : 'other';

        const qty = Number(item.qty) || 0;
        const unitPrice = Number(item.hpp_per_unit) || 0;
        addedBudget += qty * unitPrice;

        return {
          project_id: projectId,
          type: rapType,
          name: item.name,
          unit: item.unit?.trim() || 'pcs',
          quantity: qty,
          unit_price: unitPrice,
          notes: item.notes || null,
          sort_order: currentSort,
          updated_by: currentUserId,
          source_estimation_item_id: item.id,
        };
      });

      const { error: rapInsertErr } = await supabase
        .from('planner_rap_items')
        .insert(rapRows);

      if (rapInsertErr) {
        console.error('Peringatan: Gagal menambahkan item ke RAP:', rapInsertErr);
      } else {
        insertedCount = rapRows.length;
      }
    }
  }

  // 4. Jembatan pembayaran (DP / Termin)
  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id || '';
    const { data: estPayments } = await supabase
      .from('planner_estimation_payments')
      .select('*')
      .eq('estimation_id', estimationId)
      .order('payment_date', { ascending: true });

    if (estPayments && estPayments.length > 0 && currentUserId) {
      const { createProjectIncome } = await import('./incomeService');
      for (const pay of estPayments) {
        const amt = Number(pay.amount) || 0;
        if (amt <= 0) continue;
        await createProjectIncome({
          project_id: projectId,
          date: (pay.payment_date as string) || new Date().toISOString().slice(0, 10),
          amount: amt,
          category: 'dp',
          description: (pay.notes as string) || `DP / Termin dari Estimasi ${est.code}`,
          payment_method: (pay.payment_method as string) || null,
          status: 'received',
          recorded_by: (pay.created_by as string) || currentUserId,
        });
      }
    }
  } catch (payErr) {
    console.error('Warning migrating estimation payments to existing project:', payErr);
  }

  return {
    projectId,
    rapItemCount: insertedCount,
    rapBudgetTotal: addedBudget,
  };
}

export function assertEstimationConvertible(est: Estimation, activeProjects?: Array<{ id: string; deleted_at?: string | null }>): void {
  if (est.status === 'converted' || est.converted_project_id) {
    const targetProjId = est.converted_project_id || est.project_id;
    // Jika ada daftar activeProjects, periksa apakah proyek tersebut benar-benar aktif
    if (activeProjects && targetProjId) {
      const match = activeProjects.find(p => p.id === targetProjId && !p.deleted_at);
      if (match) {
        throw new Error('Estimasi sudah menjadi proyek aktif');
      }
      // Jika tidak ditemukan di activeProjects, berarti proyek sudah terhapus/diarsipkan -> izinkan convert ulang!
    } else {
      throw new Error('Estimasi sudah menjadi proyek');
    }
  }
  const namedItems = (est.items || []).filter(i => i.name.trim());
  if (!namedItems.length) {
    throw new Error('Estimasi tidak punya item — tidak bisa dijadikan proyek');
  }
}
