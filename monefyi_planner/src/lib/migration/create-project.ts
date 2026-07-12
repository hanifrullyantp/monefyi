import { createProject } from '../../services/projectService';
import { createRapItem, syncProjectBudgetFromRap } from '../../services/rapService';
import { createWorkItem } from '../../services/workItemService';
import { upsertMaterialFromRapLine } from '../../services/rpp/materialService';
import type { Project } from '../../store/appStore';
import { draftToCreatePayload, type ProjectDraft } from './suggestion-engine';

export type CreateProjectWithRapInput = {
  orgId: string;
  userId: string;
  currency: string;
  plan?: string;
  draft: ProjectDraft;
  meta: {
    name: string;
    client: string;
    startDate: string;
    endDate: string;
    contractValue: number;
    notes?: string;
    type?: string;
    location?: string;
  };
};

/**
 * Create planner project + RAP lines + work items + upsert rpp materials.
 */
export async function createProjectWithRap(input: CreateProjectWithRapInput): Promise<Project> {
  const payload = draftToCreatePayload(input.draft, {
    name: input.meta.name,
    client: input.meta.client,
    startDate: input.meta.startDate,
    endDate: input.meta.endDate,
    contractValue: input.meta.contractValue,
    notes: input.meta.notes,
    type: input.meta.type,
  });

  const project = await createProject(
    {
      name: payload.name,
      description: input.meta.notes || '',
      client_name: payload.client,
      location: input.meta.location || '',
      start_date: payload.startDate,
      end_date: payload.endDate,
      status: 'planning',
      type: input.meta.type || 'construction',
      org_id: input.orgId,
      created_by: input.userId,
      total_budget: payload.contractValue,
    },
    input.currency,
    input.plan,
  );

  let sortOrder = 0;
  for (const mat of payload.materials) {
    await createRapItem({
      project_id: project.id,
      type: 'material',
      name: mat.name,
      unit: mat.unit,
      quantity: mat.quantity,
      unit_price: mat.unitPrice,
      sort_order: sortOrder++,
    });
    await upsertMaterialFromRapLine(input.orgId, {
      name: mat.name,
      unit: mat.unit,
      unitPrice: mat.unitPrice,
    });
  }

  for (const worker of payload.workers) {
    await createRapItem({
      project_id: project.id,
      type: 'labor',
      name: worker.name,
      unit: worker.unit,
      quantity: worker.quantity,
      unit_price: worker.unitPrice,
      sort_order: sortOrder++,
    });
  }

  for (let i = 0; i < payload.timeline.length; i++) {
    const step = payload.timeline[i];
    await createWorkItem({
      project_id: project.id,
      name: step.name,
      planned_start: payload.startDate,
      planned_end: payload.endDate,
      weight: step.weight,
      progress_pct: 0,
      status: 'pending',
      sort_order: i,
    });
  }

  await syncProjectBudgetFromRap(project.id);
  return project;
}
