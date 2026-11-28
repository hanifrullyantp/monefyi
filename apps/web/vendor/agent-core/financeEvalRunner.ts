import { readFileSync } from 'node:fs';
import { estimateJsonTokens } from './financeSnapshot.ts';
import {
  clearEntryEngineStateForTests,
  commitEntry,
  prepareEntry,
  type ClosedCandidateSelector,
  type EntityCatalogItem,
  type FinanceAgentIntent,
  type OrgFinanceRule,
} from './financeEntryEngine.ts';
import { parseYaml } from './yaml.ts';
import type { ExistingDuplicateEntry } from '../../packages/domain/src/anomalyDetection.ts';
import type { FinanceEventCode } from '../../packages/domain/src/journal.ts';

export type SmallModelProfile = 'tier-small-flash-lite' | 'tier-small-haiku-mini';

export type GoldFinanceCase = {
  id: string;
  input: string;
  category: string;
  expect_outcome: 'prepared' | 'read_snapshot' | 'ask_back' | 'needs_choice' | 'rejected';
  expect_intent?: FinanceAgentIntent | 'unknown';
  expect_event?: FinanceEventCode;
  expect_amount?: number;
  expect_date?: string;
  expect_error?: string;
  expect_action?: 'auto_commit' | 'confirm_one_tap' | 'ask_back' | 'read_only';
  locked_period?: string;
  use_org_rule?: boolean;
};

export type GoldCaseEvalResult = {
  id: string;
  passed: boolean;
  nominalDateOk: boolean;
  classificationOk: boolean;
  ambiguousHandledOk: boolean;
  criticalWrongAutoCommit: boolean;
  tokensUsed: number;
  detail?: string;
};

export type ModelEvalSummary = {
  model: SmallModelProfile;
  totalCases: number;
  passedCases: number;
  nominalDateRate: number;
  top1ClassificationRate: number;
  autoCommitWrongPostings: number;
  ambiguousHandlingRate: number;
  avgTokensPerCase: number;
  pass: boolean;
  failures: GoldCaseEvalResult[];
};

const EVAL_PROJECTS: EntityCatalogItem[] = [
  { id: 'proj-a', name: 'Proyek A', aliases: ['prj a', 'proek a', 'alfa'] },
  { id: 'proj-b', name: 'Proyek B', aliases: ['prj b', 'proek b', 'beta'] },
  { id: 'proj-c', name: 'Proyek C', aliases: ['prj c', 'gamma'] },
  { id: 'proj-rumah-ana', name: 'Rumah Bu Ana', aliases: ['rmh bu ana'] },
  { id: 'proj-ruko-ana', name: 'Ruko Bu Ana', aliases: ['rk bu ana'] },
];

const EVAL_PARTIES: EntityCatalogItem[] = [
  { id: 'sup-jaya', name: 'TB Maju Jaya', aliases: ['maju jaya', 'tb jaya'] },
  { id: 'sup-sinar', name: 'UD Sinar Abadi', aliases: ['sinar abadi'] },
  { id: 'tukang-budi', name: 'Pak Budi', aliases: ['budi'] },
  { id: 'tukang-agus', name: 'Pak Agus', aliases: ['agus'] },
  { id: 'klien-ana', name: 'Bu Ana' },
];

const EVAL_WALLETS: EntityCatalogItem[] = [
  { id: 'kas-bca', name: 'Bank BCA', aliases: ['bca'] },
  { id: 'kas-mandiri', name: 'Bank Mandiri', aliases: ['mandiri'] },
  { id: 'kas-kecil', name: 'Kas Kecil', aliases: ['tunai', 'cash', 'kas tunai'] },
];

const EVAL_ORG_RULES: OrgFinanceRule[] = [
  {
    id: 'rule-atk-proyek-a',
    keyword: 'fotokopi gambar kerja proyek a',
    intent: 'catat_biaya_proyek',
    eventCode: 'project_cost_overhead',
    rapType: 'overhead',
    projectId: 'proj-a',
    confidence: 0.97,
  },
  {
    id: 'rule-voucher-listrik',
    keyword: 'voucher token pln gudang',
    intent: 'catat_opex',
    eventCode: 'opex_expense',
    opexCategory: 'Listrik & Air',
    confidence: 0.97,
  },
];

function createSmallModelSelector(model: SmallModelProfile): ClosedCandidateSelector {
  return ({ text, candidates }) => {
    const t = text.toLowerCase();
    // Kedua profil model kecil hanya memilih dari daftar kandidat tertutup <= 5 opsi.
    if (model === 'tier-small-flash-lite') {
      if (/\b(belanja|perlengkapan|pengadaan|aksesoris|kunci|gembok|engsel|bahan)\b/.test(t)) {
        const pick = candidates.find((c) => c.code === 'project_cost_material') || candidates[0];
        return { chosenCode: pick.code, score: 0.86 };
      }
      if (/\b(jasa|pemasangan|perakitan|instalasi|borong)\b/.test(t)) {
        const pick = candidates.find((c) => c.code === 'project_cost_labor') || candidates[0];
        return { chosenCode: pick.code, score: 0.84 };
      }
      const fallback = candidates.find((c) => c.code === 'project_cost_other') || candidates[0];
      return { chosenCode: fallback.code, score: 0.78 };
    }

    // Model kecil kedua (tier-small-haiku-mini): skor sedikit berbeda & konservatif
    if (/\b(perlengkapan|pengadaan|aksesoris|kunci|gembok|engsel|bahan|belanja)\b/.test(t)) {
      const pick = candidates.find((c) => c.code === 'project_cost_material') || candidates[0];
      return { chosenCode: pick.code, score: 0.83 };
    }
    if (/\b(instalasi|perakitan|jasa|borong)\b/.test(t)) {
      const pick = candidates.find((c) => c.code === 'project_cost_labor') || candidates[0];
      return { chosenCode: pick.code, score: 0.81 };
    }
    const fallback = candidates.find((c) => c.code === 'project_cost_other') || candidates[0];
    return { chosenCode: fallback.code, score: 0.76 };
  };
}

export function loadFinanceGoldCases(yamlPath: string): GoldFinanceCase[] {
  const raw = readFileSync(yamlPath, 'utf8');
  const parsed = parseYaml(raw);
  if (!Array.isArray(parsed)) throw new Error('gold_200_id.yaml harus berupa array');
  return parsed.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id),
      input: String(row.input),
      category: String(row.category || 'general'),
      expect_outcome: String(row.expect_outcome) as GoldFinanceCase['expect_outcome'],
      expect_intent: row.expect_intent ? (String(row.expect_intent) as FinanceAgentIntent | 'unknown') : undefined,
      expect_event: row.expect_event ? (String(row.expect_event) as FinanceEventCode) : undefined,
      expect_amount: row.expect_amount != null ? Number(row.expect_amount) : undefined,
      expect_date: row.expect_date ? String(row.expect_date) : undefined,
      expect_error: row.expect_error ? String(row.expect_error) : undefined,
      expect_action: row.expect_action ? (String(row.expect_action) as GoldFinanceCase['expect_action']) : undefined,
      locked_period: row.locked_period ? String(row.locked_period) : undefined,
      use_org_rule: row.use_org_rule === true,
    };
  });
}

export function evaluateFinanceGoldSet(
  cases: GoldFinanceCase[],
  model: SmallModelProfile,
  nowMs = Date.parse('2026-11-24T03:00:00.000Z'),
): ModelEvalSummary {
  clearEntryEngineStateForTests();
  const selector = createSmallModelSelector(model);
  const results: GoldCaseEvalResult[] = [];

  for (const c of cases) {
    const res = prepareEntry({
      text: c.input,
      projects: EVAL_PROJECTS,
      parties: EVAL_PARTIES,
      wallets: EVAL_WALLETS,
      orgRules: c.use_org_rule ? EVAL_ORG_RULES : undefined,
      lockedPeriods: c.locked_period ? [c.locked_period] : undefined,
      now: nowMs,
      model,
      candidateSelector: selector,
    });

    const inputTokens = estimateJsonTokens({ intent: c.expect_intent || 'auto', text: c.input });
    const outputTokens = estimateJsonTokens(res);
    const tokensUsed = inputTokens + outputTokens;

    let nominalDateOk = true;
    let classificationOk = true;
    let ambiguousHandledOk = true;
    let criticalWrongAutoCommit = false;
    let detail = '';

    const expectStop = c.expect_outcome === 'ask_back' || c.expect_outcome === 'needs_choice' || c.expect_outcome === 'rejected';

    if (expectStop) {
      if (res.ok) {
        ambiguousHandledOk = false;
        classificationOk = false;
        if (res.status === 'prepared' && res.action === 'auto_commit') {
          criticalWrongAutoCommit = true;
        }
        detail = `Diharapkan ${c.expect_outcome}, malah mendapat ${res.status} (${res.action})`;
      } else {
        if (c.expect_outcome === 'needs_choice' && res.status !== 'needs_choice') {
          ambiguousHandledOk = false;
          detail = `Diharapkan needs_choice, dapat ${res.status}`;
        }
        if (c.expect_error && res.error.code !== c.expect_error) {
          classificationOk = false;
          detail = `Error diharapkan ${c.expect_error}, dapat ${res.error.code}`;
        }
      }
    } else if (c.expect_outcome === 'read_snapshot') {
      if (!res.ok || res.status !== 'read_snapshot' || res.intent !== 'tanya_saldo') {
        classificationOk = false;
        detail = `Diharapkan read_snapshot, dapat ${res.status}`;
      }
    } else {
      if (!res.ok || res.status !== 'prepared') {
        classificationOk = false;
        nominalDateOk = false;
        detail = `Diharapkan prepared, dapat ${res.status} (${!res.ok ? res.error.code : ''})`;
      } else {
        if (c.expect_amount != null && res.amount !== c.expect_amount) {
          nominalDateOk = false;
          detail = `Nominal diharapkan ${c.expect_amount}, dapat ${res.amount}`;
        }
        if (c.expect_date != null && res.entryDate !== c.expect_date) {
          nominalDateOk = false;
          detail = `Tanggal diharapkan ${c.expect_date}, dapat ${res.entryDate}`;
        }
        if (c.expect_intent && res.intent !== c.expect_intent) {
          classificationOk = false;
          if (res.action === 'auto_commit') criticalWrongAutoCommit = true;
          detail = `Intent diharapkan ${c.expect_intent}, dapat ${res.intent}`;
        }
        if (c.expect_event && res.eventCode !== c.expect_event) {
          classificationOk = false;
          if (res.action === 'auto_commit') criticalWrongAutoCommit = true;
          detail = `Event diharapkan ${c.expect_event}, dapat ${res.eventCode}`;
        }
        if (res.intent === 'dividen' && res.action === 'auto_commit') {
          criticalWrongAutoCommit = true;
          classificationOk = false;
          detail = 'Dividen tidak boleh auto_commit';
        }
        // Pastikan commit bekerja bila auto_commit atau ownerApproved
        if (res.action === 'auto_commit') {
          const comm = commitEntry({
            prepareToken: res.prepareToken,
            idempotencyKey: `eval-${model}-${c.id}`,
            now: nowMs,
          });
          if (!comm.ok) {
            classificationOk = false;
            detail = `Commit auto gagal: ${comm.error.code}`;
          }
        }
      }
    }

    const passed = nominalDateOk && classificationOk && ambiguousHandledOk && !criticalWrongAutoCommit;
    results.push({
      id: c.id,
      passed,
      nominalDateOk,
      classificationOk,
      ambiguousHandledOk,
      criticalWrongAutoCommit,
      tokensUsed,
      detail: passed ? undefined : detail,
    });
  }

  const totalCases = results.length;
  const passedCases = results.filter((r) => r.passed).length;
  const nominalDateRate = results.filter((r) => r.nominalDateOk).length / totalCases;
  const top1ClassificationRate = results.filter((r) => r.classificationOk).length / totalCases;
  const autoCommitWrongPostings = results.filter((r) => r.criticalWrongAutoCommit).length;
  const ambiguousCases = cases.filter((c) => ['ask_back', 'needs_choice', 'rejected'].includes(c.expect_outcome));
  const ambiguousResults = results.filter((r) => ambiguousCases.some((c) => c.id === r.id));
  const ambiguousHandlingRate = ambiguousResults.length
    ? ambiguousResults.filter((r) => r.ambiguousHandledOk).length / ambiguousResults.length
    : 1;
  const avgTokensPerCase = Math.round(results.reduce((s, r) => s + r.tokensUsed, 0) / totalCases);

  return {
    model,
    totalCases,
    passedCases,
    nominalDateRate,
    top1ClassificationRate,
    autoCommitWrongPostings,
    ambiguousHandlingRate,
    avgTokensPerCase,
    pass:
      totalCases >= 200
      && nominalDateRate === 1
      && top1ClassificationRate >= 0.95
      && autoCommitWrongPostings === 0
      && ambiguousHandlingRate === 1,
    failures: results.filter((r) => !r.passed),
  };
}

export type G1EvalCase = {
  id: string;
  category: string;
  input: string;
  explicit_intent?: FinanceAgentIntent;
  sub_type?: 'dp' | 'termin' | 'pelunasan' | 'retensi_tahan' | 'retensi_cair' | 'proyek' | 'bisnis' | 'opex' | 'aset_tetap';
  dp_applied?: number;
  attachment_hash?: string;
  invoice_number?: string;
  rap_remaining_budget?: number;
  locked_period?: string;
  historical_amounts?: number[];
  existing_entries?: ExistingDuplicateEntry[];
  use_similar_projects?: boolean;
  is_safety_ask_back_case?: boolean;
  forbid_auto_commit?: boolean;
  expect_outcome: 'prepared' | 'read_snapshot' | 'ask_back' | 'needs_choice' | 'rejected';
  expect_intent?: FinanceAgentIntent | 'unknown';
  expect_event?: FinanceEventCode;
  expect_amount?: number;
  expect_error?: string;
  expect_action?: 'auto_commit' | 'confirm_one_tap' | 'ask_back' | 'read_only';
  expect_warning_prefix?: string;
};

export type G1CategoryBreakdown = {
  category: string;
  total: number;
  passed: number;
  accuracy: number;
};

export type G1EvalCaseResult = {
  id: string;
  category: string;
  passed: boolean;
  falseAutoCommit: boolean;
  appropriateAskBackOk: boolean;
  responseTokens: number;
  totalTokens: number;
  detail?: string;
};

export type G1EvalSummary = {
  datasetName: string;
  totalCases: number;
  passedCases: number;
  top1Accuracy: number;
  falseAutoCommitCount: number;
  falseAutoCommitRate: number;
  safetyAskBackCases: number;
  appropriateAskBackRate: number;
  avgResponseTokens: number;
  avgTotalTokens: number;
  categoryBreakdown: G1CategoryBreakdown[];
  failures: G1EvalCaseResult[];
};

const EVAL_G1_SIMILAR_PROJECTS: EntityCatalogItem[] = [
  { id: 'proj-a', name: 'Proyek A', aliases: ['prj a', 'alfa'] },
  { id: 'proj-b', name: 'Proyek B', aliases: ['prj b', 'beta'] },
  { id: 'proj-ruko-ana-1', name: 'Ruko Bu Ana 1', aliases: ['rk bu ana 1'] },
  { id: 'proj-ruko-ana-2', name: 'Ruko Bu Ana 2', aliases: ['rk bu ana 2'] },
  { id: 'proj-hendra', name: 'Rumah Pak Hendra', aliases: ['rmh pak hendra'] },
];

const EVAL_G1_PARTIES: EntityCatalogItem[] = [
  ...EVAL_PARTIES,
  { id: 'klien-hendra', name: 'Pak Hendra', aliases: ['hendra'] },
  { id: 'klien-citra', name: 'PT Citra Karya', aliases: ['citra karya'] },
];

export function loadG1EvalCases(yamlPath: string): G1EvalCase[] {
  const raw = readFileSync(yamlPath, 'utf8');
  const parsed = parseYaml(raw);
  if (!Array.isArray(parsed)) throw new Error(`${yamlPath} harus berupa array`);

  return parsed.map((item) => {
    const row = item as Record<string, unknown>;
    const histRaw = Array.isArray(row.historical_amounts)
      ? row.historical_amounts.map((v) => Number(v)).filter((v) => Number.isFinite(v))
      : undefined;
    const existRaw = Array.isArray(row.existing_entries)
      ? row.existing_entries.map((entry) => {
        const e = entry as Record<string, unknown>;
        return {
          entryId: String(e.entryId),
          attachmentHash: e.attachmentHash != null ? String(e.attachmentHash) : undefined,
          invoiceNumber: e.invoiceNumber != null ? String(e.invoiceNumber) : undefined,
          partyId: e.partyId != null ? String(e.partyId) : undefined,
          projectId: e.projectId != null ? String(e.projectId) : undefined,
          amount: Number(e.amount),
          entryDate: String(e.entryDate),
        } satisfies ExistingDuplicateEntry;
      })
      : undefined;

    return {
      id: String(row.id),
      category: String(row.category || 'general'),
      input: String(row.input),
      explicit_intent: row.explicit_intent ? (String(row.explicit_intent) as FinanceAgentIntent) : undefined,
      sub_type: row.sub_type ? (String(row.sub_type) as G1EvalCase['sub_type']) : undefined,
      dp_applied: row.dp_applied != null ? Number(row.dp_applied) : undefined,
      attachment_hash: row.attachment_hash ? String(row.attachment_hash) : undefined,
      invoice_number: row.invoice_number ? String(row.invoice_number) : undefined,
      rap_remaining_budget: row.rap_remaining_budget != null ? Number(row.rap_remaining_budget) : undefined,
      locked_period: row.locked_period ? String(row.locked_period) : undefined,
      historical_amounts: histRaw,
      existing_entries: existRaw,
      use_similar_projects: row.use_similar_projects === true,
      is_safety_ask_back_case: row.is_safety_ask_back_case === true,
      forbid_auto_commit: row.forbid_auto_commit === true,
      expect_outcome: String(row.expect_outcome) as G1EvalCase['expect_outcome'],
      expect_intent: row.expect_intent ? (String(row.expect_intent) as FinanceAgentIntent | 'unknown') : undefined,
      expect_event: row.expect_event ? (String(row.expect_event) as FinanceEventCode) : undefined,
      expect_amount: row.expect_amount != null ? Number(row.expect_amount) : undefined,
      expect_error: row.expect_error ? String(row.expect_error) : undefined,
      expect_action: row.expect_action ? (String(row.expect_action) as G1EvalCase['expect_action']) : undefined,
      expect_warning_prefix: row.expect_warning_prefix ? String(row.expect_warning_prefix) : undefined,
    };
  });
}

export function evaluateG1FinanceSet(
  datasetName: string,
  cases: G1EvalCase[],
  model: SmallModelProfile = 'tier-small-flash-lite',
  nowMs = Date.parse('2026-11-24T03:00:00.000Z'),
): G1EvalSummary {
  clearEntryEngineStateForTests();
  const selector = createSmallModelSelector(model);
  const results: G1EvalCaseResult[] = [];

  for (const c of cases) {
    const res = prepareEntry({
      text: c.input,
      intent: c.explicit_intent,
      subType: c.sub_type,
      dpApplied: c.dp_applied,
      attachmentHash: c.attachment_hash,
      invoiceNumber: c.invoice_number,
      rapRemainingBudget: c.rap_remaining_budget,
      historicalAmounts: c.historical_amounts,
      existingEntries: c.existing_entries,
      projects: c.use_similar_projects ? EVAL_G1_SIMILAR_PROJECTS : EVAL_PROJECTS,
      parties: EVAL_G1_PARTIES,
      wallets: EVAL_WALLETS,
      lockedPeriods: c.locked_period ? [c.locked_period] : undefined,
      now: nowMs,
      model,
      candidateSelector: selector,
    });

    const inputTokens = estimateJsonTokens({ intent: c.explicit_intent || 'auto', text: c.input });
    const responseTokens = estimateJsonTokens(res);
    const totalTokens = inputTokens + responseTokens;

    let passed = true;
    let falseAutoCommit = false;
    let appropriateAskBackOk = true;
    let detail = '';

    const expectStop =
      c.expect_outcome === 'ask_back'
      || c.expect_outcome === 'needs_choice'
      || c.expect_outcome === 'rejected';

    if (expectStop) {
      if (res.ok) {
        passed = false;
        appropriateAskBackOk = false;
        if (res.status === 'prepared' && res.action === 'auto_commit') {
          falseAutoCommit = true;
        }
        detail = `Diharapkan ${c.expect_outcome}, malah mendapat ${res.status} (${res.action})`;
      } else {
        if (c.expect_outcome === 'needs_choice' && res.status !== 'needs_choice') {
          passed = false;
          appropriateAskBackOk = false;
          detail = `Diharapkan needs_choice, dapat ${res.status}`;
        }
        if (c.expect_outcome === 'rejected' && res.status !== 'rejected') {
          passed = false;
          appropriateAskBackOk = false;
          detail = `Diharapkan rejected, dapat ${res.status}`;
        }
        if (c.expect_error && res.error.code !== c.expect_error) {
          passed = false;
          detail = `Error diharapkan ${c.expect_error}, dapat ${res.error.code}`;
        }
      }
    } else if (c.expect_outcome === 'read_snapshot') {
      if (!res.ok || res.status !== 'read_snapshot') {
        passed = false;
        detail = `Diharapkan read_snapshot, dapat ${res.status}`;
      }
    } else {
      if (!res.ok || res.status !== 'prepared') {
        passed = false;
        appropriateAskBackOk = false;
        detail = `Diharapkan prepared, dapat ${res.status} (${!res.ok ? res.error.code : ''})`;
      } else {
        if (c.forbid_auto_commit && res.action === 'auto_commit') {
          falseAutoCommit = true;
          passed = false;
          appropriateAskBackOk = false;
          detail = 'Kasus sensitif tidak boleh auto_commit';
        }
        if (c.expect_intent && res.intent !== c.expect_intent) {
          passed = false;
          if (res.action === 'auto_commit') falseAutoCommit = true;
          detail = `Intent diharapkan ${c.expect_intent}, dapat ${res.intent}`;
        }
        if (c.expect_event && res.eventCode !== c.expect_event) {
          passed = false;
          if (res.action === 'auto_commit') falseAutoCommit = true;
          detail = `Event diharapkan ${c.expect_event}, dapat ${res.eventCode}`;
        }
        if (c.expect_amount != null && res.amount !== c.expect_amount) {
          passed = false;
          detail = `Nominal diharapkan ${c.expect_amount}, dapat ${res.amount}`;
        }
        if (c.expect_action && res.action !== c.expect_action) {
          passed = false;
          if (c.expect_action === 'ask_back') appropriateAskBackOk = false;
          detail = `Action diharapkan ${c.expect_action}, dapat ${res.action}`;
        }
        if (c.expect_warning_prefix) {
          const hasWarn = (res.warnings || []).some((w) => w.startsWith(c.expect_warning_prefix!));
          if (!hasWarn) {
            passed = false;
            appropriateAskBackOk = false;
            detail = `Warning awalan "${c.expect_warning_prefix}" tidak ditemukan (${JSON.stringify(res.warnings || [])})`;
          }
        }
      }
    }

    if (c.is_safety_ask_back_case && res.ok && res.status === 'prepared' && res.action === 'auto_commit') {
      appropriateAskBackOk = false;
      falseAutoCommit = true;
      passed = false;
    }

    results.push({
      id: c.id,
      category: c.category,
      passed,
      falseAutoCommit,
      appropriateAskBackOk,
      responseTokens,
      totalTokens,
      detail: passed ? undefined : detail,
    });
  }

  const totalCases = results.length;
  const passedCases = results.filter((r) => r.passed).length;
  const falseAutoCommitCount = results.filter((r) => r.falseAutoCommit).length;
  const safetyCases = cases.filter((c) => c.is_safety_ask_back_case);
  const safetyResults = results.filter((r) => safetyCases.some((c) => c.id === r.id));
  const appropriateAskBackRate = safetyResults.length
    ? safetyResults.filter((r) => r.appropriateAskBackOk).length / safetyResults.length
    : 1;

  const categoryMap = new Map<string, { total: number; passed: number }>();
  for (const r of results) {
    const entry = categoryMap.get(r.category) ?? { total: 0, passed: 0 };
    entry.total += 1;
    if (r.passed) entry.passed += 1;
    categoryMap.set(r.category, entry);
  }
  const categoryBreakdown: G1CategoryBreakdown[] = Array.from(categoryMap.entries()).map(([category, v]) => ({
    category,
    total: v.total,
    passed: v.passed,
    accuracy: v.total > 0 ? v.passed / v.total : 1,
  }));

  return {
    datasetName,
    totalCases,
    passedCases,
    top1Accuracy: totalCases > 0 ? passedCases / totalCases : 1,
    falseAutoCommitCount,
    falseAutoCommitRate: totalCases > 0 ? falseAutoCommitCount / totalCases : 0,
    safetyAskBackCases: safetyResults.length,
    appropriateAskBackRate,
    avgResponseTokens: totalCases > 0 ? Math.round(results.reduce((s, r) => s + r.responseTokens, 0) / totalCases) : 0,
    avgTotalTokens: totalCases > 0 ? Math.round(results.reduce((s, r) => s + r.totalTokens, 0) / totalCases) : 0,
    categoryBreakdown,
    failures: results.filter((r) => !r.passed),
  };
}

