import { supabase } from '../../lib/supabase';
import { extraPiutangBeyondContract } from '../../lib/projects/cashIdentity';
import { getProjectCashSummary } from '../projectTransferService';
import { loadProjectIncomes } from '../incomeService';
import { loadReceivablesByProject } from './receivableService';
import { loadPayablesByProject } from './payableService';
import { getOrCreateProjectKasAccount } from './kasService';

export type ProjectClosePreview = {
  projectId: string;
  projectName: string;
  totalReceived: number;
  totalSpent: number;
  finalProfit: number;
  /** Kas operasional proyek (dana masuk − realisasi ± transfer). */
  kasBalance: number;
  /** Saldo akun Kas Proyek di buku finance-v2, jika ada. */
  ledgerKasBalance: number | null;
  transfersNet: number;
  interProjectDebt: number;
  openReceivables: number;
  openPayables: number;
  openRetention: number;
  extraReceivables: number;
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
    .select('id, name, total_received, total_spent, finance_status, total_budget, settings')
    .eq('id', projectId)
    .eq('org_id', orgId)
    .single();

  if (error || !project) throw new Error('Proyek tidak ditemukan.');

  const totalReceived = Number(project.total_received) || 0;
  const totalSpent = Number(project.total_spent) || 0;
  const finalProfit = totalReceived - totalSpent;

  const [cashSummary, receivables, payables, incomes, kasAccount] = await Promise.all([
    getProjectCashSummary(projectId, orgId),
    loadReceivablesByProject(orgId, projectId),
    loadPayablesByProject(orgId, projectId),
    loadProjectIncomes(projectId),
    getOrCreateProjectKasAccount(orgId, projectId, project.name as string).catch(() => null),
  ]);

  const settings = (project.settings || {}) as Record<string, unknown>;
  const contractValue = Number(settings.contract_value) || Number(project.total_budget) || 0;
  const interProjectDebt = cashSummary.owedTo.reduce((s, d) => s + d.amount, 0);
  const openReceivables = receivables.reduce((s, r) => s + Math.max(0, r.amount - r.paid_amount), 0);
  const openPayables = payables.reduce((s, p) => s + Math.max(0, p.amount - p.paid_amount), 0);
  const openRetention = incomes
    .filter((i) => i.category === 'retensi' && i.status === 'pending')
    .reduce((s, i) => s + i.amount, 0);
  const extraReceivables = extraPiutangBeyondContract(openReceivables, contractValue, totalReceived);
  const transfersNet =
    cashSummary.loansIn + cashSummary.repaymentsIn - cashSummary.loansOut - cashSummary.repaymentsOut;
  const projectCash = cashSummary.surplus - extraReceivables;
  const ledgerKas = kasAccount ? Number(kasAccount.current_balance) || 0 : null;

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
  if (openRetention > 0) {
    warnings.push(`Masih ada retensi belum cair: Rp ${openRetention.toLocaleString('id-ID')}`);
  }
  if (openPayables > 0) {
    warnings.push(`Masih ada hutang proyek terbuka: Rp ${openPayables.toLocaleString('id-ID')}`);
  }
  if (finalProfit < 0) {
    warnings.push(`Proyek defisit (basis kas): Rp ${Math.abs(finalProfit).toLocaleString('id-ID')}`);
  }
  if (ledgerKas != null && Math.abs(ledgerKas - projectCash) > 1) {
    warnings.push(
      `Buku kas finance (Rp ${ledgerKas.toLocaleString('id-ID')}) belum sinkron dengan sisa kas operasional (Rp ${projectCash.toLocaleString('id-ID')}). Angka di kartu memakai kas operasional = Dana masuk − Realisasi − piutang ± transfer.`,
    );
  }

  const canClose = project.finance_status !== 'finance_closed';

  return {
    projectId,
    projectName: project.name as string,
    totalReceived,
    totalSpent,
    finalProfit,
    kasBalance: projectCash,
    ledgerKasBalance: ledgerKas,
    transfersNet,
    interProjectDebt,
    openReceivables,
    openPayables,
    openRetention,
    extraReceivables,
    financeStatus: (project.finance_status as string) || 'active',
    warnings,
    canClose,
  };
}
