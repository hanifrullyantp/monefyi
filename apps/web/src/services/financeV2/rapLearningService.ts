import {
  computeRapCompletionFeedback,
  generateRapDraftFromHistory,
  type CategoryAmountMap,
  type CompletedProjectHistoryRecord,
  type RapCompletionFeedback,
  type RapDraftProposal,
} from '@domain/rapLearning';
import { supabase } from '../../lib/supabase';
import { buildProfitLossFromLines } from '../../lib/financeV2/reports/profitLossReport';
import { loadEnrichedJournalLines } from '../../lib/financeV2/reports/loadReportData';
import { createRapItem, loadRapItems } from '../rapService';

/**
 * Mengumpulkan histori proyek selesai (`completed`/`finance_closed`) beserta realisasi buku besar
 * dan menghasilkan draf RAP rentang (low/mid/high) dengan provenance + kewajiban approval pemilik.
 */
export async function proposeRapDraftForProject(input: {
  orgId: string;
  projectType: string;
  volume: number;
  volumeUnit?: string;
  estimatorCatalogRates?: Partial<CategoryAmountMap>;
}): Promise<RapDraftProposal> {
  const [{ data: projRows }, allLines] = await Promise.all([
    supabase
      .from('planner_projects')
      .select('id, name, status, finance_status, settings')
      .eq('org_id', input.orgId)
      .in('status', ['completed'])
      .is('deleted_at', null),
    loadEnrichedJournalLines({ orgId: input.orgId, dateFrom: '2000-01-01', dateTo: '2099-12-31' }),
  ]);

  const projectRows = projRows || [];
  const completedIds = projectRows.map((p) => p.id as string).filter(Boolean);
  const { data: rapRows } = completedIds.length
    ? await supabase
        .from('planner_rap_items')
        .select('project_id, type, quantity, unit_price')
        .in('project_id', completedIds)
    : { data: [] as Record<string, unknown>[] };

  const plannedByProject = new Map<string, Partial<CategoryAmountMap>>();
  for (const r of rapRows || []) {
    const pid = r.project_id as string;
    const type = String(r.type || 'other') as keyof CategoryAmountMap;
    if (!pid) continue;
    const lineBudget = (Number(r.quantity) || 0) * (Number(r.unit_price) || 0);
    const bucket = plannedByProject.get(pid) || {};
    bucket[type] = (bucket[type] || 0) + lineBudget;
    plannedByProject.set(pid, bucket);
  }

  const history: CompletedProjectHistoryRecord[] = [];
  for (const p of projectRows) {
    const pid = p.id as string;
    const settings = (p.settings || {}) as Record<string, unknown>;
    const volume = Number(settings.volume) || 100;
    const volumeUnit = String(settings.volume_unit || 'm2');
    const pType = String(settings.project_type || 'renovasi_rumah');

    const projLines = allLines.filter((l) => l.projectId === pid);
    const pl = buildProfitLossFromLines(projLines, {}, {}, {}, {});
    const byType = pl.hppByRapType || {
      material: 0,
      labor: 0,
      equipment: 0,
      overhead: 0,
      other: 0,
      uncategorized: 0,
    };

    history.push({
      projectId: pid,
      projectName: p.name as string,
      projectType: pType,
      status: p.finance_status === 'finance_closed' ? 'finance_closed' : 'completed',
      volume,
      volumeUnit,
      plannedByCategory: plannedByProject.get(pid) || {},
      actualByCategory: {
        material: byType.material,
        labor: byType.labor,
        equipment: byType.equipment,
        overhead: byType.overhead,
        other: byType.other + byType.uncategorized,
      },
    });
  }

  return generateRapDraftFromHistory({
    projectType: input.projectType,
    volume: input.volume,
    volumeUnit: input.volumeUnit,
    history,
    estimatorCatalogRates: input.estimatorCatalogRates,
  });
}

/**
 * Menyimpan draf RAP AI menjadi item RAP aktif HANYA setelah pemilik menyetujui (`ownerApproved === true`).
 */
export async function approveRapDraft(input: {
  orgId: string;
  projectId: string;
  proposal: RapDraftProposal;
  tierChoice?: 'low' | 'mid' | 'high';
  ownerApproved: boolean;
  approvedBy?: string;
}): Promise<{ insertedCount: number }> {
  if (!input.ownerApproved) {
    throw new Error('Draf RAP wajib disetujui pemilik sebelum diaktifkan.');
  }
  const tier = input.tierChoice || 'mid';
  let insertedCount = 0;
  for (let i = 0; i < input.proposal.lines.length; i += 1) {
    const line = input.proposal.lines[i];
    const amount = line[tier];
    if (amount <= 0) continue;
    await createRapItem({
      project_id: input.projectId,
      name: `RAP ${line.category.toUpperCase()} (${input.proposal.provenance})`,
      type: line.category,
      unit: input.proposal.volumeUnit,
      quantity: input.proposal.volume,
      unit_price: Math.round(amount / Math.max(1, input.proposal.volume)),
      sort_order: i + 1,
      updated_by: input.approvedBy || null,
      notes: `Draf AI tier=${tier}; rentang Rp${line.low.toLocaleString('id-ID')} - Rp${line.high.toLocaleString('id-ID')}`,
    });
    insertedCount += 1;
  }
  return { insertedCount };
}

/**
 * Mengevaluasi selisih RAP vs realisasi buku besar saat proyek ditutup sebagai umpan balik belajar.
 */
export async function recordProjectRapCompletionFeedback(input: {
  orgId: string;
  projectId: string;
  projectType: string;
  volume: number;
  volumeUnit?: string;
}): Promise<RapCompletionFeedback> {
  const [rapItems, lines] = await Promise.all([
    loadRapItems(input.projectId),
    loadEnrichedJournalLines({
      orgId: input.orgId,
      dateFrom: '2000-01-01',
      dateTo: '2099-12-31',
      projectId: input.projectId,
    }),
  ]);

  const planned: Partial<CategoryAmountMap> = {};
  for (const item of rapItems) {
    const t = (item.type || 'other') as keyof CategoryAmountMap;
    planned[t] = (planned[t] || 0) + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
  }
  const pl = buildProfitLossFromLines(lines, {}, {}, {}, {});
  const act = pl.hppByRapType || {
    material: 0,
    labor: 0,
    equipment: 0,
    overhead: 0,
    other: 0,
    uncategorized: 0,
  };

  return computeRapCompletionFeedback({
    projectId: input.projectId,
    projectType: input.projectType,
    volume: input.volume,
    volumeUnit: input.volumeUnit,
    plannedByCategory: planned,
    actualByCategory: {
      material: act.material,
      labor: act.labor,
      equipment: act.equipment,
      overhead: act.overhead,
      other: act.other + act.uncategorized,
    },
  });
}

