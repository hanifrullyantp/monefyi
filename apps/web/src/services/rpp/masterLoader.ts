import { loadMaterials } from './materialService';
import { loadWorkers } from './workerService';
import { loadJobTemplates, loadDatabaseMeta } from './templateService';
import type { JobTemplate, RppMaterial, RppWorker } from '../../types/rpp';
import type { DatabaseMeta } from '../../types/rpp';

export type RppMasterPayload = {
  materials: RppMaterial[];
  workers: RppWorker[];
  templates: JobTemplate[];
  meta: DatabaseMeta;
};

export async function loadRppMaster(orgId: string): Promise<RppMasterPayload> {
  const [materials, workers, templates, meta] = await Promise.all([
    loadMaterials(orgId),
    loadWorkers(orgId),
    loadJobTemplates(orgId),
    loadDatabaseMeta(orgId),
  ]);
  return { materials, workers, templates, meta };
}
