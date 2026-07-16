import { supabase } from '../../../lib/supabase';
import type {
  BudgetAnalysis,
  BudgetTemplate,
  BudgetTemplateCategory,
  BudgetUsahaDocument,
} from '../../../types/budgetUsaha';
import {
  SYSTEM_BUDGET_TEMPLATES,
  createEmptyDocument,
  documentFromTemplate,
} from '../../../types/budgetUsaha';
import { loadOpexCategories, upsertOpexBudget } from '../opexService';

type DbBudgetRow = {
  id: string;
  org_id: string;
  year: number;
  document_json: BudgetUsahaDocument;
  analysis_json: BudgetAnalysis | null;
  is_draft: boolean;
  updated_at: string;
};

type DbTemplateRow = {
  id: string;
  org_id: string | null;
  name: string;
  description: string | null;
  icon: string;
  is_system: boolean;
  categories_json: BudgetTemplateCategory[];
  used_count: number;
};

function mapTemplate(row: DbTemplateRow): BudgetTemplate {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    description: row.description ?? '',
    icon: row.icon,
    isSystem: row.is_system,
    categories: row.categories_json ?? [],
    usedCount: row.used_count ?? 0,
  };
}

/** Ensure system templates exist in DB (idempotent). */
export async function ensureSystemTemplates(): Promise<void> {
  const { data: existing } = await supabase
    .from('planner_budget_templates')
    .select('name')
    .eq('is_system', true);

  const names = new Set((existing ?? []).map(r => r.name));
  const toInsert = SYSTEM_BUDGET_TEMPLATES.filter(t => !names.has(t.name));
  if (!toInsert.length) return;

  const { error } = await supabase.from('planner_budget_templates').insert(
    toInsert.map(t => ({
      org_id: null,
      name: t.name,
      description: t.description,
      icon: t.icon,
      is_system: true,
      categories_json: t.categories,
    })),
  );
  if (error) throw new Error(error.message);
}

export async function loadBudgetTemplates(orgId: string): Promise<BudgetTemplate[]> {
  await ensureSystemTemplates();
  const { data, error } = await supabase
    .from('planner_budget_templates')
    .select('*')
    .or(`is_system.eq.true,org_id.eq.${orgId}`)
    .order('is_system', { ascending: false })
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []).map(r => mapTemplate(r as DbTemplateRow));
}

export async function loadBudgetDocument(
  orgId: string,
  year: number,
): Promise<{ doc: BudgetUsahaDocument; analysis: BudgetAnalysis | null } | null> {
  const { data, error } = await supabase
    .from('planner_budget_usaha')
    .select('*')
    .eq('org_id', orgId)
    .eq('year', year)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as DbBudgetRow;
  return {
    doc: { ...row.document_json, id: row.id, orgId: row.org_id },
    analysis: row.analysis_json,
  };
}

export async function saveBudgetDocument(
  orgId: string,
  doc: BudgetUsahaDocument,
  analysis: BudgetAnalysis | null,
): Promise<BudgetUsahaDocument> {
  const payload = {
    org_id: orgId,
    year: doc.period.year,
    document_json: doc,
    analysis_json: analysis,
    is_draft: doc.metadata.isDraft,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('planner_budget_usaha')
    .upsert(payload, { onConflict: 'org_id,year' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const row = data as DbBudgetRow;
  return { ...row.document_json, id: row.id, orgId: row.org_id };
}

export async function autoSave(
  orgId: string,
  doc: BudgetUsahaDocument,
  analysis: BudgetAnalysis,
): Promise<void> {
  if (!doc.metadata.autoSaveEnabled) return;
  await saveBudgetDocument(orgId, doc, analysis);
}

export async function createBudgetFromTemplate(
  orgId: string,
  year: number,
  templateId: string,
): Promise<BudgetUsahaDocument> {
  const templates = await loadBudgetTemplates(orgId);
  const template = templates.find(t => t.id === templateId);
  if (!template) throw new Error('Template tidak ditemukan');

  const doc = documentFromTemplate(orgId, year, template);
  await supabase
    .from('planner_budget_templates')
    .update({ used_count: template.usedCount + 1 })
    .eq('id', templateId);

  return saveBudgetDocument(orgId, doc, null);
}

export async function getOrCreateBudget(
  orgId: string,
  year: number,
): Promise<BudgetUsahaDocument> {
  const existing = await loadBudgetDocument(orgId, year);
  if (existing) return existing.doc;

  const templates = await loadBudgetTemplates(orgId);
  const advanced = templates.find(t => t.name === 'Konstruksi Advanced');
  if (advanced) {
    return createBudgetFromTemplate(orgId, year, advanced.id);
  }

  const doc = createEmptyDocument(orgId, year);
  return saveBudgetDocument(orgId, doc, null);
}

export async function saveAsTemplate(
  orgId: string,
  doc: BudgetUsahaDocument,
  name: string,
  description: string,
): Promise<BudgetTemplate> {
  const categories: BudgetTemplateCategory[] = doc.categories.map(cat => ({
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    order: cat.order,
    items: cat.items.map(item => ({
      name: item.name,
      icon: item.icon,
      suggestedAmount: item.amount,
      frequency: item.frequency,
      autoLink: item.linkedTo?.detailKey ?? null,
    })),
  }));

  const { data, error } = await supabase
    .from('planner_budget_templates')
    .insert({
      org_id: orgId,
      name: name.trim(),
      description: description.trim(),
      icon: 'file-text',
      is_system: false,
      categories_json: categories,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapTemplate(data as DbTemplateRow);
}

/** Sync OPERASIONAL manual/HR items to planner_opex_budgets. */
export async function syncOpexFromBudget(
  orgId: string,
  doc: BudgetUsahaDocument,
): Promise<number> {
  const opCat = doc.categories.find(c => c.name === 'OPERASIONAL');
  if (!opCat?.items.length) return 0;

  const opexCategories = await loadOpexCategories(orgId);
  let synced = 0;
  const year = doc.period.year;

  for (let month = doc.period.startMonth; month <= doc.period.endMonth; month++) {
    for (const item of opCat.items) {
      if (item.isAutoLinked && item.linkedTo?.source === 'rap') continue;
      const match = opexCategories.find(
        c => c.name.toLowerCase() === item.name.toLowerCase(),
      );
      if (!match) continue;

      const amount =
        item.manualOverride ??
        (item.isAutoLinked ? item.autoAmount : item.amount) ??
        0;
      const monthly =
        item.frequency === 'yearly'
          ? amount / 12
          : item.frequency === 'one-time'
            ? month === doc.period.startMonth
              ? amount
              : 0
            : amount;

      if (monthly <= 0) continue;
      await upsertOpexBudget({
        orgId,
        categoryId: match.id,
        month,
        year,
        plannedAmount: monthly,
        notes: `Sinkron dari Budget Usaha`,
      });
      synced++;
    }
  }
  return synced;
}
