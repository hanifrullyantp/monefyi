import { formatCurrency, todayStr } from './adapters';
import type { ParsedCommand } from './commandParser';
import { createCostRealization } from '../services/costService';
import { loadRapItems, type RapItem } from '../services/rapService';
import type { ParsedCostLine } from './costParser';
import { createProjectIncome } from '../services/incomeService';
import { createDailyLog } from '../services/dailyLogService';
import { updateWorkItem, loadWorkItems, updateProjectProgressFromWorkItems } from '../services/workItemService';
import { analyzeProject } from '../services/analyzeService';
import { createOpexRealization, loadOpexCategories } from '../services/financeV2/opexService';
import type { Project } from '../store/appStore';
import type { WorkItem } from '../services/workItemService';

export interface IntentResult {
  success: boolean;
  message: string;
  details?: string;
  navigateTo?: string;
  refreshProjects?: boolean;
}

export interface IntentContext {
  userId: string;
  orgId: string;
  projects: Project[];
  currentProject: Project | null;
  workItems: WorkItem[];
  onNavigate: (path: string) => void;
  onRefreshProjects: () => Promise<void>;
  loadWorkItemsForProject: (projectId: string) => Promise<WorkItem[]>;
}

function fuzzyMatchProject(name: string | null | undefined, projects: Project[]) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return (
    projects.find(p => p.name.toLowerCase().includes(lower)) ||
    projects.find(p => lower.includes(p.name.toLowerCase())) ||
    null
  );
}

function fuzzyMatchRapItem(name: string, items: RapItem[]): { id: string; confidence: number } | null {
  const lower = name.toLowerCase().trim();
  if (!lower) return null;
  let best: { id: string; score: number } | null = null;
  for (const item of items) {
    const n = item.name.toLowerCase();
    if (n === lower) return { id: item.id, confidence: 1 };
    if (n.includes(lower) || lower.includes(n)) {
      const score = Math.min(n.length, lower.length) / Math.max(n.length, lower.length);
      if (!best || score > best.score) best = { id: item.id, score };
    }
  }
  if (best && best.score >= 0.85) return { id: best.id, confidence: best.score };
  return null;
}

function fuzzyMatchWorkItem(name: string | null | undefined, items: WorkItem[]) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return (
    items.find(wi => wi.name.toLowerCase().includes(lower)) ||
    items.find(wi => lower.includes(wi.name.toLowerCase())) ||
    null
  );
}

export async function executeIntent(
  result: ParsedCommand,
  ctx: IntentContext,
): Promise<IntentResult> {
  const { intent, params } = result;
  let project = ctx.currentProject;

  if (params.projectName && !project) {
    project = fuzzyMatchProject(String(params.projectName), ctx.projects);
  }
  if (!project && ctx.projects.length === 1) {
    project = ctx.projects[0];
  }

  switch (intent) {
    case 'record_cost_batch': {
      const groups = params.groups as Array<{
        projectId: string;
        projectName?: string;
        items: ParsedCostLine[];
      }> | undefined;
      const orgGroups = params.orgGroups as Array<{
        label: string;
        opexCategoryId?: string;
        items: ParsedCostLine[];
      }> | undefined;

      let recorded = 0;
      let totalAmount = 0;
      const summaries: string[] = [];

      if (groups?.length) {
        for (const group of groups) {
          const groupProject = ctx.projects.find(p => p.id === group.projectId);
          if (!groupProject) continue;

          const rapItems = await loadRapItems(groupProject.id);
          let groupCount = 0;
          let groupTotal = 0;

          for (const line of group.items || []) {
            const total = Number(line.total) || 0;
            if (total <= 0) continue;
            const qty = Number(line.quantity) || 1;
            const unitPrice = Number(line.unitPrice) || total;
            const rapMatch = fuzzyMatchRapItem(line.item, rapItems);
            await createCostRealization({
              project_id: groupProject.id,
              rap_item_id: rapMatch?.id ?? null,
              date: line.date || todayStr(),
              description: line.item,
              quantity: qty,
              unit_price: unitPrice,
              total_amount: total,
              supplier: line.supplier ?? null,
              recorded_by: ctx.userId,
            });
            groupCount += 1;
            groupTotal += total;
          }

          if (groupCount > 0) {
            recorded += groupCount;
            totalAmount += groupTotal;
            summaries.push(`${groupProject.name}: ${groupCount}`);
          }
        }
      }

      if (orgGroups?.length) {
        const categories = await loadOpexCategories(ctx.orgId);
        const defaultCat =
          categories.find(c => /operasional|opex|umum/i.test(c.name)) || categories[0];

        for (const orgGroup of orgGroups) {
          const catId = orgGroup.opexCategoryId || defaultCat?.id;
          if (!catId) continue;

          let orgCount = 0;
          let orgTotal = 0;
          for (const line of orgGroup.items || []) {
            const total = Number(line.total) || 0;
            if (total <= 0) continue;
            await createOpexRealization({
              orgId: ctx.orgId,
              categoryId: catId,
              amount: total,
              paidDate: line.date || todayStr(),
              notes: line.supplier ? `${line.item} (${line.supplier})` : line.item,
              createdBy: ctx.userId,
              withJournal: true,
            });
            orgCount += 1;
            orgTotal += total;
          }

          if (orgCount > 0) {
            recorded += orgCount;
            totalAmount += orgTotal;
            summaries.push(`${orgGroup.label}: ${orgCount}`);
          }
        }
      }

      if (recorded > 0) {
        await ctx.onRefreshProjects();
        return {
          success: true,
          message: `${recorded} biaya tercatat!`,
          details: `Total ${formatCurrency(totalAmount)} · ${summaries.join(' · ')}`,
          refreshProjects: true,
        };
      }

      if (!project) {
        return {
          success: false,
          message: 'Proyek tidak ditemukan',
          details: 'Buka proyek terlebih dahulu atau sebutkan nama proyek.',
        };
      }
      const rawItems = (params.items as ParsedCostLine[]) || [];
      if (!rawItems.length) {
        return { success: false, message: 'Tidak ada baris biaya untuk dicatat.' };
      }

      const rapItems = await loadRapItems(project.id);
      recorded = 0;
      totalAmount = 0;

      for (const line of rawItems) {
        const total = Number(line.total) || 0;
        if (total <= 0) continue;
        const qty = Number(line.quantity) || 1;
        const unitPrice = Number(line.unitPrice) || total;
        const rapMatch = fuzzyMatchRapItem(line.item, rapItems);
        await createCostRealization({
          project_id: project.id,
          rap_item_id: rapMatch?.id ?? null,
          date: line.date || todayStr(),
          description: line.item,
          quantity: qty,
          unit_price: unitPrice,
          total_amount: total,
          supplier: line.supplier ?? null,
          recorded_by: ctx.userId,
        });
        recorded += 1;
        totalAmount += total;
      }

      await ctx.onRefreshProjects();
      return {
        success: true,
        message: `${recorded} biaya tercatat!`,
        details: `Total ${formatCurrency(totalAmount)} → ${project.name}`,
        refreshProjects: true,
      };
    }

    case 'record_cost': {
      if (!project) {
        return {
          success: false,
          message: 'Proyek tidak ditemukan',
          details: 'Buka proyek terlebih dahulu atau sebutkan nama proyek.',
        };
      }
      const total = Number(params.total) || 0;
      const qty = params.qty != null ? Number(params.qty) : null;
      const unitPrice = params.unitPrice != null ? Number(params.unitPrice) : null;

      await createCostRealization({
        project_id: project.id,
        date: todayStr(),
        description: String(params.item || 'Pembelian'),
        quantity: qty,
        unit_price: unitPrice,
        total_amount: total,
        recorded_by: ctx.userId,
      });

      const detail =
        qty && unitPrice
          ? `${params.item} ${qty} × ${formatCurrency(unitPrice)} = ${formatCurrency(total)}`
          : `${params.item} = ${formatCurrency(total)}`;

      await ctx.onRefreshProjects();
      return {
        success: true,
        message: 'Tercatat!',
        details: `${detail} → ${project.name}`,
        refreshProjects: true,
      };
    }

    case 'record_income': {
      if (!project) {
        return {
          success: false,
          message: 'Proyek tidak ditemukan',
          details: 'Buka proyek terlebih dahulu atau sebutkan nama proyek.',
        };
      }
      const amount = Number(params.total) || Number(params.amount) || 0;
      if (!amount || amount <= 0) {
        return { success: false, message: 'Nominal uang masuk tidak valid.' };
      }
      const category = String(params.category || 'other').toLowerCase();
      const validCategories = ['dp', 'termin', 'pelunasan', 'retensi', 'other'];
      await createProjectIncome({
        project_id: project.id,
        date: todayStr(),
        amount,
        category: (validCategories.includes(category) ? category : 'other') as 'dp' | 'termin' | 'pelunasan' | 'retensi' | 'other',
        description: String(params.item || params.description || 'Penerimaan klien'),
        payment_method: params.paymentMethod ? String(params.paymentMethod) : null,
        status: 'received',
        recorded_by: ctx.userId,
      }).then(r => r.income);
      await ctx.onRefreshProjects();
      return {
        success: true,
        message: 'Uang masuk tercatat!',
        details: `${formatCurrency(amount)} → ${project.name}`,
        refreshProjects: true,
      };
    }

    case 'update_progress': {
      if (!project) {
        return { success: false, message: 'Buka proyek terlebih dahulu.' };
      }
      const items = ctx.workItems.length
        ? ctx.workItems
        : await ctx.loadWorkItemsForProject(project.id);
      const wi = fuzzyMatchWorkItem(String(params.workItem), items);
      if (!wi) {
        return {
          success: false,
          message: `Pekerjaan "${params.workItem}" tidak ditemukan di proyek ${project.name}.`,
        };
      }
      const newProgress = Math.min(Number(params.progress) || 0, 100);
      await updateWorkItem(wi.id, {
        progress_pct: newProgress,
        status: newProgress >= 100 ? 'completed' : 'in_progress',
      });
      await createDailyLog({
        project_id: project.id,
        work_item_id: wi.id,
        date: todayStr(),
        description: `Update progress ${wi.name} → ${newProgress}%`,
        progress_increment: newProgress - (Number(wi.progress_pct) || 0),
        recorded_by: ctx.userId,
      });
      await updateProjectProgressFromWorkItems(project.id);
      await ctx.onRefreshProjects();
      return {
        success: true,
        message: 'Progress diupdate!',
        details: `${wi.name}: ${wi.progress_pct || 0}% → ${newProgress}%`,
        refreshProjects: true,
      };
    }

    case 'check_budget': {
      if (!project) {
        const totalBudget = ctx.projects.reduce((s, p) => s + p.total_budget_planned, 0);
        const totalSpent = ctx.projects.reduce((s, p) => s + p.spent_amount, 0);
        return {
          success: true,
          message: 'Ringkasan Budget',
          details: `Total RAP: ${formatCurrency(totalBudget)} | Terpakai: ${formatCurrency(totalSpent)} | Sisa: ${formatCurrency(totalBudget - totalSpent)}`,
        };
      }
      return {
        success: true,
        message: `Budget ${project.name}`,
        details: `RAP: ${formatCurrency(project.total_budget_planned)} | Terpakai: ${formatCurrency(project.spent_amount)} | Sisa: ${formatCurrency(project.total_budget_planned - project.spent_amount)}`,
      };
    }

    case 'check_progress': {
      if (!project) {
        const avg = ctx.projects.length
          ? (ctx.projects.reduce((s, p) => s + p.progress_percentage, 0) / ctx.projects.length).toFixed(1)
          : '0';
        return {
          success: true,
          message: `Rata-rata progress: ${avg}%`,
          details: ctx.projects.map(p => `${p.name}: ${p.progress_percentage.toFixed(0)}%`).join(' | '),
        };
      }
      return {
        success: true,
        message: `Progress ${project.name}: ${project.progress_percentage.toFixed(1)}%`,
      };
    }

    case 'open_project': {
      const found = fuzzyMatchProject(String(params.projectName), ctx.projects);
      if (found) {
        return {
          success: true,
          message: `Membuka ${found.name}`,
          navigateTo: `/app/projects/${found.id}`,
        };
      }
      return { success: false, message: `Proyek "${params.projectName}" tidak ditemukan.` };
    }

    case 'add_worker_log': {
      if (!project) {
        return { success: false, message: 'Buka proyek terlebih dahulu.' };
      }
      await createDailyLog({
        project_id: project.id,
        date: todayStr(),
        description: `${params.workers} pekerja hadir`,
        workers_present: Number(params.workers) || 0,
        recorded_by: ctx.userId,
      });
      return {
        success: true,
        message: `Dicatat: ${params.workers} pekerja hadir hari ini.`,
      };
    }

    case 'ask_recommendation': {
      const target = project || ctx.currentProject;
      if (!target) {
        return { success: true, message: 'Buka proyek untuk melihat rekomendasi.' };
      }
      const analysis = await analyzeProject(target.id);
      if (!analysis?.recommendations?.length) {
        return { success: true, message: 'Belum ada rekomendasi untuk proyek ini.' };
      }
      const top = analysis.recommendations[0];
      return {
        success: true,
        message: top.title,
        details: top.message,
      };
    }

    case 'open_report': {
      if (project || ctx.currentProject) {
        const p = project || ctx.currentProject!;
        return {
          success: true,
          message: 'Membuka laporan proyek',
          navigateTo: `/app/projects/${p.id}`,
        };
      }
      return { success: false, message: 'Buka proyek terlebih dahulu.' };
    }

    default:
      return {
        success: false,
        message: 'Perintah tidak dikenali.',
        details: `"${result.raw}"`,
      };
  }
}
