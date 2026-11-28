import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseYaml } from '@agent-core/yaml';
import {
  computeRapCompletionFeedback,
  evaluateRapPredictionMape,
  generateRapDraftFromHistory,
  type CompletedProjectHistoryRecord,
  type RapMapeCase,
} from '@domain/rapLearning';

const root = fileURLToPath(new URL('../../../../', import.meta.url));

function loadRapEvalYaml(): {
  history: CompletedProjectHistoryRecord[];
  holdouts: RapMapeCase[];
} {
  const raw = readFileSync(`${root}evals/finance/rap_historical_eval.yaml`, 'utf8');
  const doc = parseYaml(raw) as {
    history: Record<string, unknown>[];
    holdouts: Record<string, unknown>[];
  };

  const history: CompletedProjectHistoryRecord[] = (doc.history || []).map((row) => ({
    projectId: String(row.projectId),
    projectType: String(row.projectType),
    status: String(row.status) as CompletedProjectHistoryRecord['status'],
    volume: Number(row.volume),
    volumeUnit: String(row.volumeUnit),
    plannedByCategory: {
      material: Number(row.planned_material),
      labor: Number(row.planned_labor),
      equipment: Number(row.planned_equipment),
      overhead: Number(row.planned_overhead),
      other: Number(row.planned_other),
    },
    actualByCategory: {
      material: Number(row.actual_material),
      labor: Number(row.actual_labor),
      equipment: Number(row.actual_equipment),
      overhead: Number(row.actual_overhead),
      other: Number(row.actual_other),
    },
  }));

  const holdouts: RapMapeCase[] = (doc.holdouts || []).map((row) => ({
    id: String(row.id),
    projectType: String(row.projectType),
    volume: Number(row.volume),
    volumeUnit: String(row.volumeUnit),
    actualByCategory: {
      material: Number(row.actual_material),
      labor: Number(row.actual_labor),
      equipment: Number(row.actual_equipment),
      overhead: Number(row.actual_overhead),
      other: Number(row.actual_other),
    },
  }));

  return { history, holdouts };
}

describe('F4 — AI Belajar RAP dari Proyek Selesai & Evaluasi MAPE', () => {
  const { history, holdouts } = loadRapEvalYaml();

  it('menghasilkan rentang low/mid/high, provenance "Berdasarkan N proyek serupa" (N >= 3), dan wajib approval pemilik', () => {
    const draft = generateRapDraftFromHistory({
      projectType: 'renovasi_rumah',
      volume: 100,
      volumeUnit: 'm2',
      history,
    });

    expect(draft.source).toBe('historical');
    expect(draft.sampleSize).toBe(3);
    expect(draft.provenance).toBe('Berdasarkan 3 proyek serupa');
    expect(draft.requiresOwnerApproval).toBe(true);
    expect(draft.totalLow).toBeLessThan(draft.totalMid);
    expect(draft.totalMid).toBeLessThanOrEqual(draft.totalHigh);
    expect(draft.lines).toHaveLength(5);
  });

  it('otomatis fallback ke katalog Estimator saat N < 3 dan tetap mewajibkan approval pemilik', () => {
    const fallbackDraft = generateRapDraftFromHistory({
      projectType: 'interior_kafe',
      volume: 60,
      volumeUnit: 'm2',
      history,
      estimatorCatalogRates: {
        material: 1_800_000,
        labor: 700_000,
        equipment: 100_000,
        overhead: 120_000,
        other: 80_000,
      },
    });

    expect(fallbackDraft.source).toBe('estimator_catalog_fallback');
    expect(fallbackDraft.sampleSize).toBe(0);
    expect(fallbackDraft.provenance).toContain('Katalog Estimator');
    expect(fallbackDraft.requiresOwnerApproval).toBe(true);
    expect(fallbackDraft.totalMid).toBe(60 * 2_800_000);
  });

  it('menghitung feedback loop selisih RAP vs realisasi saat tutup proyek dan mengumpankannya ke pembelajaran', () => {
    const feedback = computeRapCompletionFeedback({
      projectId: 'proj-close-1',
      projectType: 'renovasi_rumah',
      volume: 100,
      volumeUnit: 'm2',
      plannedByCategory: {
        material: 200_000_000,
        labor: 90_000_000,
        equipment: 15_000_000,
        overhead: 15_000_000,
        other: 10_000_000,
      },
      actualByCategory: {
        material: 220_000_000,
        labor: 88_000_000,
        equipment: 15_000_000,
        overhead: 18_000_000,
        other: 9_000_000,
      },
    });

    expect(feedback.overrunCategories).toEqual(['material', 'overhead']);
    expect(feedback.totalVarianceAmount).toBe(20_000_000);
    expect(feedback.learnedRecord.status).toBe('finance_closed');

    // Sesudah 1 proyek selesai ditambahkan, sampel historis naik menjadi 4 proyek
    const nextDraft = generateRapDraftFromHistory({
      projectType: 'renovasi_rumah',
      volume: 100,
      volumeUnit: 'm2',
      history: [...history, feedback.learnedRecord],
    });
    expect(nextDraft.sampleSize).toBe(4);
    expect(nextDraft.provenance).toBe('Berdasarkan 4 proyek serupa');
  });

  it('mengevaluasi MAPE historis <= 10% per kategori dan keseluruhan', () => {
    const evalRes = evaluateRapPredictionMape({ history, holdouts });
    console.info('[F4-RAP-EVAL]', evalRes);
    expect(evalRes.sampleCount).toBe(3);
    expect(evalRes.overallMapePct).toBeLessThanOrEqual(10);
    for (const val of Object.values(evalRes.mapeByCategory)) {
      expect(val).toBeLessThanOrEqual(10);
    }
  });
});

