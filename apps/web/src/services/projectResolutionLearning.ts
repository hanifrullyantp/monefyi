import { upsertAlias } from './commandAliasService';
import { recordCorrection } from './commandMemoryService';
import type { ProjectResolution } from '../lib/batchProjectDetector';

export async function learnFromProjectResolution(
  mentionedName: string,
  resolution: ProjectResolution,
  tenantId: string,
  userId: string,
): Promise<void> {
  if (!tenantId || !mentionedName) return;

  switch (resolution.action) {
    case 'map_existing':
      if (resolution.addAsAlias && resolution.projectId) {
        await upsertAlias({
          orgId: tenantId,
          userId,
          alias: mentionedName,
          label: resolution.projectName || mentionedName,
          entityType: 'project',
          entityId: resolution.projectId,
          entityName: resolution.projectName,
        }).catch(() => {});
      }
      break;

    case 'created_new':
      if (resolution.projectId) {
        await upsertAlias({
          orgId: tenantId,
          userId,
          alias: mentionedName,
          label: resolution.projectName || mentionedName,
          entityType: 'project',
          entityId: resolution.projectId,
          entityName: resolution.projectName,
        }).catch(() => {});
      }
      break;

    case 'mark_operational':
    case 'org_operational':
      await upsertAlias({
        orgId: tenantId,
        userId,
        alias: mentionedName,
        label: resolution.orgLabel || 'org_operational',
        entityType: 'other',
        entityName: resolution.whatIsThis || resolution.action,
      }).catch(() => {});
      break;

    case 'ignore':

    case 'not_project_keyword':
      if (resolution.recontextText) {
        await recordCorrection({
          orgId: tenantId,
          userId,
          rawInput: resolution.recontextText,
          intent: 'record_cost_batch',
          params: { note: 'recontext', keyword: mentionedName },
          source: 'user',
        }).catch(() => {});
      }
      await upsertAlias({
        orgId: tenantId,
        userId,
        alias: mentionedName,
        label: 'not_project_keyword',
        entityType: 'other',
        entityName: resolution.whatIsThis || 'phrase_fragment',
      }).catch(() => {});
      break;

    case 'assign_anyway':
      if (resolution.addAsAlias && resolution.projectId) {
        await upsertAlias({
          orgId: tenantId,
          userId,
          alias: mentionedName,
          label: resolution.projectName || mentionedName,
          entityType: 'project',
          entityId: resolution.projectId,
          entityName: resolution.projectName,
        }).catch(() => {});
      }
      break;
  }
}
