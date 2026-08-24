import {
  createProjectIncome,
  loadProjectIncomes,
  type IncomeCategory,
  type ProjectIncome,
} from './incomeService';
import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';

export type { IncomeCategory, ProjectIncome };

/** Muat pembayaran proyek (semua — sinkron dengan halaman proyek). */
export async function loadEstimationProjectPayments(
  projectId: string,
): Promise<ProjectIncome[]> {
  return loadProjectIncomes(projectId);
}

/** Catat pembayaran dari estimator → tersimpan di planner_project_incomes proyek. */
export async function recordEstimationPayment(input: {
  projectId: string;
  estimationId: string;
  userId: string;
  orgId: string;
  date: string;
  amount: number;
  category: IncomeCategory;
  description: string;
  payment_method?: string | null;
  receiptNumber?: string | null;
}): Promise<ProjectIncome> {
  const { income } = await createProjectIncome(
    {
      project_id: input.projectId,
      date: input.date,
      amount: input.amount,
      category: input.category,
      description: input.description.trim(),
      payment_method: input.payment_method?.trim() || null,
      client_ref: input.estimationId,
      invoice_ref: input.receiptNumber?.trim() || null,
      status: 'received',
      recorded_by: input.userId,
    },
    { orgId: input.orgId, actorId: input.userId },
  );
  return income;
}

/** Tandai nomor kwitansi pada pembayaran yang sudah tercatat. */
export async function attachReceiptToIncome(
  incomeId: string,
  receiptNumber: string,
): Promise<void> {
  const { error } = await supabase
    .from('planner_project_incomes')
    .update({
      invoice_ref: receiptNumber.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', incomeId);
  assertNoDbError(error);
}
