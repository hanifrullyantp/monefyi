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

  return { projectId: String(data) };
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

export function assertEstimationConvertible(est: Estimation): void {
  if (est.status === 'converted' || est.converted_project_id) {
    throw new Error('Estimasi sudah menjadi proyek');
  }
  const namedItems = (est.items || []).filter(i => i.name.trim());
  if (!namedItems.length) {
    throw new Error('Estimasi tidak punya item — tidak bisa dijadikan proyek');
  }
}
