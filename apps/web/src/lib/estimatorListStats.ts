import { countEstimationsByPipelineSummary } from './estimationStatus';
import type { Estimation } from '../types/estimator';

export function getEstimationListStats(rows: Estimation[]) {
  const pipeline = countEstimationsByPipelineSummary(rows);
  const activeOffers = pipeline.survei;
  const archiveCount = rows.filter(r => {
    const s = r.status;
    return s === 'rejected' || s === 'converted';
  }).length;

  return {
    total: rows.length,
    activeOffers,
    archiveCount,
  };
}
