import type { ProjectIncome } from '../services/estimationPaymentService';

export type BillingMilestoneStatus = 'paid' | 'partial' | 'pending';

export type BillingMilestone = {
  id: string;
  label: string;
  category: 'dp' | 'termin' | 'pelunasan';
  pct: number;
  amount: number;
  paidAmount: number;
  status: BillingMilestoneStatus;
};

export type EstimationBillingSnapshot = {
  contractTotal: number;
  totalReceived: number;
  remaining: number;
  progressPct: number;
  milestones: BillingMilestone[];
  nextDue: BillingMilestone | null;
};

const DEFAULT_MILESTONES: Array<{ id: string; label: string; category: BillingMilestone['category']; pct: number }> = [
  { id: 'dp', label: 'DP / Uang Muka', category: 'dp', pct: 30 },
  { id: 'termin', label: 'Termin Pekerjaan', category: 'termin', pct: 40 },
  { id: 'pelunasan', label: 'Pelunasan', category: 'pelunasan', pct: 30 },
];

function milestoneStatus(amount: number, paidAmount: number): BillingMilestoneStatus {
  if (paidAmount <= 0) return 'pending';
  if (paidAmount >= amount) return 'paid';
  return 'partial';
}

/** Bangun jadwal tagih standar DP–Termin–Pelunasan dan cocokkan dengan pembayaran tercatat. */
export function buildEstimationBillingSnapshot(
  contractTotal: number,
  payments: ProjectIncome[] = [],
): EstimationBillingSnapshot {
  const safeTotal = Math.max(0, Math.round(contractTotal));
  const received = payments
    .filter(p => p.status === 'received')
    .reduce((sum, p) => sum + p.amount, 0);

  const byCategory = payments
    .filter(p => p.status === 'received')
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.amount;
      return acc;
    }, {});

  const milestones: BillingMilestone[] = DEFAULT_MILESTONES.map(m => {
    const amount = safeTotal > 0 ? Math.round(safeTotal * (m.pct / 100)) : 0;
    const categoryPaid = byCategory[m.category] || 0;
    const paidAmount = Math.min(amount, categoryPaid);
    return {
      ...m,
      amount,
      paidAmount,
      status: milestoneStatus(amount, paidAmount),
    };
  });

  if (safeTotal > 0) {
    const milestoneSum = milestones.reduce((s, m) => s + m.amount, 0);
    const diff = safeTotal - milestoneSum;
    if (diff !== 0) {
      const last = milestones[milestones.length - 1];
      last.amount += diff;
      last.status = milestoneStatus(last.amount, last.paidAmount);
    }
  }

  const remaining = Math.max(0, safeTotal - received);
  const progressPct = safeTotal > 0 ? Math.min(100, Math.round((received / safeTotal) * 100)) : 0;
  const nextDue = milestones.find(m => m.status !== 'paid') ?? null;

  return {
    contractTotal: safeTotal,
    totalReceived: received,
    remaining,
    progressPct,
    milestones,
    nextDue,
  };
}
