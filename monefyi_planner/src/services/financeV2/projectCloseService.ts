import { supabase } from '../../lib/supabase';
import { getProjectCashSummary } from '../projectTransferService';
import { loadReceivablesByProject } from './receivableService';
import { getOrCreateProjectKasAccount } from './kasService';

export type ProjectClosePreview = {
  projectId: string;
  projectName: string;
  totalReceived: number;
  totalSpent: number;
  finalProfit: number;
  kasBalance: number;
  interProjectDebt: number;
  openReceivables: number;
  financeStatus: string;
  warnings: string[];
  canClose: boolean;
};

export async function buildProjectClosePreview(
  orgId: string,
  projectId: string,
): Promise<ProjectClosePreview> {
  const { data: project, error } = await supabase
    .from('planner_projects')
    .select('id, name, total_received, total_spent, finance_status')
    .eq('id', projectId)
    .eq('org_id', orgId)
    .single();

  if (error || !project) throw new Error('Proyek tidak ditemukan.');

  const totalReceived = Number(project.total_received) || 0;
  const totalSpent = Number(project.total_spent) || 0;
  const finalProfit = totalReceived - totalSpent;

  const [cashSummary, receivables, kasAccount] = await Promise.all([
    getProjectCashSummary(projectId, orgId),
    loadReceivablesByProject(orgId, projectId),
    getOrCreateProjectKasAccount(orgId, projectId, project.name as string).catch(() => null),
  ]);

  const interProjectDebt = cashSummary.owedTo.reduce((s, d) => s + d.amount, 0);
  const openReceivables = receivables.reduce((s, r) => s + (r.amount - r.paid_amount), 0);

  const warnings: string[] = [];
  if (project.finance_status === 'finance_closed') {
    warnings.push('Keuangan proyek sudah ditutup sebelumnya.');
  }
  if (interProjectDebt > 0) {
    warnings.push(`Masih ada hutang antar-proyek: Rp ${interProjectDebt.toLocaleString('id-ID')}`);
  }
  if (openReceivables > 0) {
    warnings.push(`Masih ada piutang terbuka: Rp ${openReceivables.toLocaleString('id-ID')}`);
  }
  if (finalProfit < 0) {
    warnings.push(`Proyek defisit (basis kas): Rp ${Math.abs(finalProfit).toLocaleString('id-ID')}`);
  }

  const canClose = project.finance_status !== 'finance_closed';

  return {
    projectId,
    projectName: project.name as string,
    totalReceived,
    totalSpent,
    finalProfit,
    kasBalance: kasAccount?.current_balance ?? cashSummary.surplus,
    interProjectDebt,
    openReceivables,
    financeStatus: (project.finance_status as string) || 'active',
    warnings,
    canClose,
  };
}
