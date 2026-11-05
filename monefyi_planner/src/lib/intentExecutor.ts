import { formatCurrency, todayStr } from './adapters';
import type { ParsedCommand } from './commandParser';
import { commitRecordCost, prepareRecordCost } from '../../../agent-core/src/prepare';
import { createCostRealization } from '../services/costService';
import { loadRapItems, createRapItem, syncProjectBudgetFromRap, type RapItem } from '../services/rapService';
import type { ParsedCostLine } from './costParser';
import { createProjectIncome } from '../services/incomeService';
import { createDailyLog } from '../services/dailyLogService';
import { createWorkItem, updateWorkItem, loadWorkItems, updateProjectProgressFromWorkItems } from '../services/workItemService';
import { analyzeProject } from '../services/analyzeService';
import { createOpexRealization, loadOpexCategories } from '../services/financeV2/opexService';
import type { Project } from '../store/appStore';
import type { WorkItem } from '../services/workItemService';
import { buildLeadNotes, parseSizeEstimate, type LeadTarget } from './leadFormParser';
import { calcItemRow, emptyItem } from './estimatorCalc';
import { createEstimation, generateEstimationCode, loadEstimation, loadEstimations, newEstimationDraft } from '../services/estimatorService';
import { convertEstimationToProject } from '../services/estimationConvertService';
import { createProject } from '../services/projectService';
import { createProjectTransfer } from '../services/projectTransferService';
import { createHrMemberQuick } from '../services/createHrMemberQuick';
import { listMembers } from '../services/memberService';
import { recordAdminAttendance } from '../services/attendanceService';
import { generatePayrollForOrg, listBonRequests, reviewBonRequest } from '../services/payrollService';
import { createTodo } from '../services/todoService';
import { calcPricelistSelling, createPricelistItem, loadPricelistItems, updatePricelistItem } from '../services/pricelistService';
import type { PricelistCategory } from '../types/estimator';
import type { PlannerTodo } from '../types/plannerTodo';

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
      const now = Date.now();
      const committed = params.prepareToken
        ? commitRecordCost({
          prepareToken: String(params.prepareToken),
          idempotencyKey: String(params.idempotencyKey || ''),
          now,
        })
        : (() => {
          const prepared = prepareRecordCost({
            projectId: project.id,
            item: String(params.item || 'Pembelian'),
            total: Number(params.total) || 0,
            qty: params.qty != null ? Number(params.qty) : null,
            unit: params.unit ? String(params.unit) : null,
            unitPrice: params.unitPrice != null ? Number(params.unitPrice) : null,
            entryDate: todayStr(),
            now,
          });
          if (!prepared.ok) return prepared;
          return commitRecordCost({
            prepareToken: prepared.token,
            idempotencyKey: `ui-${prepared.expiresAt}`,
            now,
          });
        })();
      if (!committed.ok) {
        return { success: false, message: committed.error.fix_hint };
      }
      if (committed.cost.projectId !== project.id) {
        return { success: false, message: 'Perintah ini untuk proyek lain. Siapkan ulang.' };
      }
      const locked = committed.cost;
      const rapItems = await loadRapItems(project.id).catch(() => []);
      const rapMatch = fuzzyMatchRapItem(locked.item, rapItems);

      await createCostRealization({
        project_id: project.id,
        rap_item_id: rapMatch?.id ?? null,
        date: locked.entryDate,
        description: locked.item,
        quantity: locked.qty,
        unit_price: locked.unitPrice,
        total_amount: locked.total,
        recorded_by: ctx.userId,
      });

      const detail =
        locked.qty && locked.unitPrice
          ? `${locked.item} ${locked.qty} × ${formatCurrency(locked.unitPrice)} = ${formatCurrency(locked.total)}`
          : `${locked.item} = ${formatCurrency(locked.total)}`;

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

    case 'create_lead': {
      const target = (params.target as LeadTarget) || 'estimation';
      const customerName = String(params.customer_name || '').trim();
      const customerPhone = String(params.customer_phone || '').trim();
      if (!customerName || !customerPhone) {
        return { success: false, message: 'Nama dan WhatsApp wajib diisi untuk lead.' };
      }

      const need = String(params.need || params.interest || 'Konsultasi').trim();
      const sizeText = params.size_text ? String(params.size_text) : undefined;
      const size = parseSizeEstimate(sizeText);
      const qty = Number(params.qty) || size.qty || 1;
      const unit = String(params.unit || size.unit || 'ls');
      const notes = buildLeadNotes(params);

      if (target === 'project') {
        const end = new Date();
        end.setMonth(end.getMonth() + 3);
        const projectName =
          need.length > 50 ? `${need.slice(0, 47)}… — ${customerName}` : `${need} — ${customerName}`;

        const created = await createProject({
          org_id: ctx.orgId,
          created_by: ctx.userId,
          name: projectName,
          client_name: customerName,
          location: String(params.customer_address || ''),
          description: notes,
          start_date: todayStr(),
          end_date: end.toISOString().slice(0, 10),
          status: 'planning',
        });
        await ctx.onRefreshProjects();

        return {
          success: true,
          message: `Proyek "${created.name}" dibuat dari data lead.`,
          details: `${customerName} · ${customerPhone}`,
          navigateTo: `/app/projects/${created.id}`,
          refreshProjects: true,
        };
      }

      const code = await generateEstimationCode(ctx.orgId);
      const base = emptyItem(0);
      const itemDraft = {
        ...base,
        name: need,
        category: 'jasa',
        unit,
        qty,
        margin_pct: 20,
      };
      const itemWithCalc = { ...itemDraft, ...calcItemRow(itemDraft, 'margin') };

      const est = await createEstimation(ctx.orgId, ctx.userId, {
        ...newEstimationDraft(code),
        title: need,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: String(params.customer_address || ''),
        notes,
        items: [itemWithCalc],
      });

      return {
        success: true,
        message: `Estimasi ${est.code} dibuat untuk ${customerName}.`,
        details: `${need}${sizeText ? ` · ${sizeText}` : ''}`,
        navigateTo: `/app/estimator/${est.id}`,
      };
    }

    case 'add_project': {
      const name = String(params.name || params.projectName || '').trim();
      if (!name) {
        return { success: false, message: 'Nama proyek wajib diisi.' };
      }
      const end = new Date();
      end.setMonth(end.getMonth() + 3);
      const created = await createProject({
        org_id: ctx.orgId,
        created_by: ctx.userId,
        name,
        client_name: String(params.client || params.clientName || ''),
        location: String(params.location || ''),
        description: String(params.description || ''),
        start_date: String(params.startDate || todayStr()),
        end_date: String(params.endDate || end.toISOString().slice(0, 10)),
        status: 'planning',
      });
      await ctx.onRefreshProjects();
      return {
        success: true,
        message: `Proyek "${created.name}" berhasil dibuat!`,
        details: created.client_name ? `Klien: ${created.client_name}` : undefined,
        navigateTo: `/app/projects/${created.id}`,
        refreshProjects: true,
      };
    }

    case 'add_rap_item': {
      if (!project) {
        return { success: false, message: 'Sebutkan atau buka proyek terlebih dahulu.' };
      }
      const name = String(params.name || params.item || '').trim();
      const qty = Math.max(1, Number(params.qty ?? params.quantity) || 1);
      const unitPrice = Number(params.unitPrice ?? params.unit_price ?? params.total) || 0;
      if (!name || unitPrice <= 0) {
        return { success: false, message: 'Nama item RAP dan harga satuan wajib diisi.' };
      }
      const typeRaw = String(params.type || params.category || 'material').toLowerCase();
      const validTypes = ['material', 'labor', 'equipment', 'subcontract', 'other'];
      const rapType = validTypes.includes(typeRaw) ? typeRaw : 'material';
      await createRapItem({
        project_id: project.id,
        type: rapType,
        name,
        unit: String(params.unit || 'ls'),
        quantity: qty,
        unit_price: unitPrice,
        supplier: params.supplier ? String(params.supplier) : null,
        notes: params.notes ? String(params.notes) : null,
        updated_by: ctx.userId,
      });
      await syncProjectBudgetFromRap(project.id).catch(() => {});
      await ctx.onRefreshProjects();
      return {
        success: true,
        message: `Item RAP "${name}" ditambahkan!`,
        details: `${qty} ${params.unit || 'ls'} × ${formatCurrency(unitPrice)} → ${project.name}`,
        refreshProjects: true,
      };
    }

    case 'add_work_item': {
      if (!project) {
        return { success: false, message: 'Sebutkan atau buka proyek terlebih dahulu.' };
      }
      const name = String(params.name || params.workItem || '').trim();
      if (!name) {
        return { success: false, message: 'Nama item pekerjaan wajib diisi.' };
      }
      const start = String(params.plannedStart || params.startDate || todayStr());
      const defaultEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const end = String(params.plannedEnd || params.endDate || defaultEnd);
      await createWorkItem({
        project_id: project.id,
        name,
        description: params.description ? String(params.description) : null,
        planned_start: start,
        planned_end: end,
        weight: params.weight != null ? Number(params.weight) : 10,
        progress_pct: Number(params.progress) || 0,
        status: 'not_started',
      });
      await ctx.onRefreshProjects();
      return {
        success: true,
        message: `Pekerjaan "${name}" ditambahkan ke jadwal!`,
        details: `${start} s/d ${end} → ${project.name}`,
        refreshProjects: true,
      };
    }

    case 'record_transfer': {
      const amount = Number(params.amount ?? params.total) || 0;
      if (amount <= 0) {
        return { success: false, message: 'Nominal transfer harus lebih dari 0.' };
      }
      const fromProj = fuzzyMatchProject(String(params.fromProject || ''), ctx.projects) || project;
      const toProj = fuzzyMatchProject(String(params.toProject || ''), ctx.projects);
      const transferType = String(params.transferType || params.type || 'loan') === 'repayment' ? 'repayment' : 'loan';
      if (fromProj && toProj && fromProj.id !== toProj.id) {
        await createProjectTransfer({
          org_id: ctx.orgId,
          source_type: 'project',
          from_project_id: fromProj.id,
          to_project_id: toProj.id,
          amount,
          type: transferType,
          date: todayStr(),
          description: String(params.description || `Transfer ${fromProj.name} → ${toProj.name}`),
          recorded_by: ctx.userId,
        });
        await ctx.onRefreshProjects();
        return {
          success: true,
          message: 'Transfer antar proyek tercatat!',
          details: `${formatCurrency(amount)}: ${fromProj.name} → ${toProj.name}`,
          refreshProjects: true,
        };
      }
      const counterparty = String(params.counterparty || params.toProject || params.fromProject || 'Kas Kantor').trim();
      const targetProj = toProj || fromProj;
      if (!targetProj) {
        return { success: false, message: 'Proyek sumber/tujuan transfer tidak ditemukan.' };
      }
      await createProjectTransfer({
        org_id: ctx.orgId,
        source_type: 'external',
        from_project_id: transferType === 'repayment' ? targetProj.id : null,
        to_project_id: transferType === 'loan' ? targetProj.id : null,
        counterparty_name: counterparty,
        amount,
        type: transferType,
        date: todayStr(),
        description: String(params.description || `Transfer eksternal (${counterparty})`),
        recorded_by: ctx.userId,
      });
      await ctx.onRefreshProjects();
      return {
        success: true,
        message: 'Mutasi talangan/transfer tercatat!',
        details: `${formatCurrency(amount)} · ${targetProj.name} ↔ ${counterparty}`,
        refreshProjects: true,
      };
    }

    case 'convert_estimation': {
      const estRef = String(params.estimation || params.code || params.title || '').trim().toLowerCase();
      const list = await loadEstimations(ctx.orgId);
      const found = list.find(
        e => e.id === estRef || e.code.toLowerCase() === estRef || e.title.toLowerCase().includes(estRef),
      );
      if (!found) {
        return { success: false, message: 'Estimasi yang dimaksud tidak ditemukan.' };
      }
      const full = await loadEstimation(found.id);
      const itemIds = (full?.items || []).map(i => i.id);
      if (!itemIds.length) {
        return { success: false, message: `Estimasi ${found.code} belum memiliki item RAB.` };
      }
      const end = new Date();
      end.setMonth(end.getMonth() + 3);
      const conv = await convertEstimationToProject(
        found.id,
        {
          name: String(params.projectName || found.title),
          clientName: String(params.clientName || found.customer_name || 'Klien'),
          clientPhone: String(params.clientPhone || found.customer_phone || '-'),
          location: String(params.location || found.customer_address || '-'),
          startDate: todayStr(),
          endDate: end.toISOString().slice(0, 10),
          description: `Konversi dari estimasi ${found.code}`,
        },
        itemIds,
      );
      await ctx.onRefreshProjects();
      return {
        success: true,
        message: `Estimasi ${found.code} dikonversi menjadi proyek aktif!`,
        details: `${itemIds.length} item RAP & jadwal kerja disinkronkan`,
        navigateTo: `/app/projects/${conv.projectId}`,
        refreshProjects: true,
      };
    }

    case 'add_employee': {
      const name = String(params.name || '').trim();
      if (!name) return { success: false, message: 'Nama karyawan/tukang wajib diisi.' };
      const roleRaw = String(params.role || 'worker').toLowerCase();
      const role = (['owner', 'admin', 'manager', 'staff', 'worker'].includes(roleRaw) ? roleRaw : 'worker') as 'worker' | 'staff' | 'manager';
      const res = await createHrMemberQuick({
        orgId: ctx.orgId,
        name,
        phone: params.phone ? String(params.phone) : undefined,
        role,
        canDirectCreate: true,
      });
      if (!res.ok && !res.fallbackWorkerId) {
        return { success: false, message: res.error };
      }
      return {
        success: true,
        message: `Anggota tim "${name}" ditambahkan oleh HRD!`,
        details: res.ok ? `Role: ${role}` : res.error,
        navigateTo: '/app/hr/employees',
      };
    }

    case 'record_attendance': {
      const memberName = String(params.employee || params.name || '').trim().toLowerCase();
      const members = await listMembers(ctx.orgId);
      const m = members.find(x => (x.profile?.name || '').toLowerCase().includes(memberName));
      if (!m) {
        return { success: false, message: `Karyawan "${params.employee || params.name}" tidak ditemukan di HRD.` };
      }
      const attType = String(params.type || 'check_in') === 'check_out' ? 'check_out' : 'check_in';
      await recordAdminAttendance({
        org_id: ctx.orgId,
        user_id: m.user_id,
        user_name: m.profile?.name,
        type: attType,
        recorded_at: new Date().toISOString(),
        project_id: project?.id,
        project_name: project?.name,
        note: params.note ? String(params.note) : 'Dicatat via AI Manager',
      });
      return {
        success: true,
        message: `Absensi ${attType === 'check_in' ? 'masuk' : 'pulang'} tercatat!`,
        details: `${m.profile?.name || 'Karyawan'}${project ? ` · ${project.name}` : ''}`,
      };
    }

    case 'approve_bon':
    case 'reject_bon': {
      const pending = await listBonRequests(ctx.orgId, 'pending');
      const targetName = String(params.employee || params.bon || '').trim().toLowerCase();
      const bon = pending.find(
        b => b.id === targetName || (b.profiles?.name || '').toLowerCase().includes(targetName),
      ) || pending[0];
      if (!bon) {
        return { success: false, message: 'Tidak ada pengajuan kasbon yang menunggu.' };
      }
      const status = intent === 'approve_bon' ? 'approved' : 'rejected';
      await reviewBonRequest(bon.id, status, ctx.userId, params.reason ? String(params.reason) : undefined, {
        orgId: ctx.orgId,
        actorId: ctx.userId,
      });
      return {
        success: true,
        message: `Kasbon ${bon.profiles?.name || ''} ${formatCurrency(bon.amount)} ${status === 'approved' ? 'disetujui' : 'ditolak'}!`,
      };
    }

    case 'assign_todo': {
      if (!project) {
        return { success: false, message: 'Sebutkan proyek untuk tugas tim ini.' };
      }
      const title = String(params.title || params.task || '').trim();
      if (!title) return { success: false, message: 'Judul tugas wajib diisi.' };
      const members = await listMembers(ctx.orgId);
      const assigneeRaw = String(params.assignee || '').trim().toLowerCase();
      const member = assigneeRaw
        ? members.find(m => (m.profile?.name || '').toLowerCase().includes(assigneeRaw))
        : undefined;
      const prioRaw = String(params.priority || 'medium').toLowerCase();
      const prio = (['low', 'medium', 'high', 'urgent'].includes(prioRaw) ? prioRaw : 'medium') as PlannerTodo['priority'];
      await createTodo({
        org_id: ctx.orgId,
        project_id: project.id,
        title,
        priority: prio,
        assigned_member_id: member?.id ?? null,
        assigned_user_id: member?.user_id ?? null,
        due_date: params.due ? String(params.due).slice(0, 10) : null,
        created_by: ctx.userId,
      });
      return {
        success: true,
        message: `Tugas "${title}" didelegasikan!`,
        details: `${member?.profile?.name ? `Ke: ${member.profile.name} · ` : ''}${project.name}`,
      };
    }

    case 'generate_payroll': {
      const members = await listMembers(ctx.orgId);
      const rows = await generatePayrollForOrg(
        ctx.orgId,
        members.map(m => ({ id: m.id, user_id: m.user_id, role: m.role })),
      );
      return {
        success: true,
        message: `Rekap draf payroll dibuat untuk ${rows.length} anggota tim!`,
        navigateTo: '/app/hr/payroll',
      };
    }

    case 'upsert_pricelist_item': {
      const name = String(params.name || params.item || '').trim();
      const baseCost = Number(params.baseCost ?? params.price ?? params.total) || 0;
      if (!name || baseCost <= 0) {
        return { success: false, message: 'Nama material/item dan harga modal wajib diisi.' };
      }
      const margin = params.marginPct != null ? Number(params.marginPct) : 20;
      const selling = calcPricelistSelling(baseCost, margin);
      const existing = (await loadPricelistItems(ctx.orgId, false)).find(
        i => i.name.toLowerCase() === name.toLowerCase(),
      );
      if (existing) {
        await updatePricelistItem(existing.id, {
          base_cost: baseCost,
          default_margin_pct: margin,
          selling_price: selling,
        });
        return {
          success: true,
          message: `Harga master "${name}" diperbarui!`,
          details: `HPP ${formatCurrency(baseCost)} · Jual ${formatCurrency(selling)}`,
        };
      }
      const cats: PricelistCategory[] = ['material', 'upah', 'alat', 'jasa', 'borongan', 'other'];
      const catRaw = String(params.category || 'material').toLowerCase() as PricelistCategory;
      await createPricelistItem({
        org_id: ctx.orgId,
        name,
        product: null,
        category: cats.includes(catRaw) ? catRaw : 'material',
        unit: String(params.unit || 'ls'),
        base_cost: baseCost,
        default_margin_pct: margin,
        selling_price: selling,
        notes: null,
        is_active: true,
        created_by: ctx.userId,
      });
      return {
        success: true,
        message: `Item master "${name}" ditambahkan ke Pricelist!`,
        details: `HPP ${formatCurrency(baseCost)}/${params.unit || 'ls'}`,
      };
    }

    default:
      return {
        success: false,
        message: 'Perintah tidak dikenali.',
        details: `"${result.raw}"`,
      };
  }
}
