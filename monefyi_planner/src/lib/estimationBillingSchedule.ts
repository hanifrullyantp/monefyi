import type { ProjectIncome } from '../services/estimationPaymentService';
import type { BillingMilestoneKey, EstimationBillingConfig } from '../types/estimator';

export type BillingMilestoneStatus = 'paid' | 'partial' | 'pending';

export type BillingMilestone = {
  id: BillingMilestoneKey;
  label: string;
  category: 'dp' | 'termin' | 'pelunasan';
  pct: number;
  amount: number;
  paidAmount: number;
  status: BillingMilestoneStatus;
  dueAmount: number;
};

export type EstimationBillingSnapshot = {
  contractTotal: number;
  baseTotal: number;
  billingDiscount: number;
  totalReceived: number;
  remaining: number;
  progressPct: number;
  milestones: BillingMilestone[];
  nextDue: BillingMilestone | null;
  pctValidation: { totalPct: number; isExact: boolean; isOver: boolean; isUnder: boolean };
};

function milestoneStatus(amount: number, paidAmount: number): BillingMilestoneStatus {
  if (paidAmount <= 0) return 'pending';
  if (paidAmount >= amount) return 'paid';
  return 'partial';
}

function categoryForKey(key: BillingMilestoneKey): BillingMilestone['category'] {
  if (key === 'dp') return 'dp';
  if (key === 'pelunasan') return 'pelunasan';
  return 'termin';
}

function distributeCategoryPaid(
  category: 'dp' | 'termin' | 'pelunasan',
  totalPaid: number,
  milestoneKeys: BillingMilestoneKey[],
  milestones: BillingMilestone[],
): void {
  let remaining = totalPaid;
  for (const key of milestoneKeys) {
    const m = milestones.find(x => x.id === key);
    if (!m || m.category !== category) continue;
    const applied = Math.min(m.amount, remaining);
    m.paidAmount = applied;
    m.status = milestoneStatus(m.amount, applied);
    m.dueAmount = Math.max(0, m.amount - applied);
    remaining -= applied;
  }
}

/** Bangun snapshot tagihan dari konfigurasi estimasi + pembayaran lokal/proyek. */
export function buildEstimationBillingSnapshot(
  baseGrandTotal: number,
  billingConfig: EstimationBillingConfig,
  projectPayments: ProjectIncome[] = [],
): EstimationBillingSnapshot {
  const billingDiscount = Math.max(0, Math.round(billingConfig.billing_discount_amount));
  const contractTotal = Math.max(0, Math.round(baseGrandTotal - billingDiscount));

  const enabled = billingConfig.milestones.filter(m => m.enabled && m.pct > 0);
  const totalPct = enabled.reduce((s, m) => s + m.pct, 0);

  const milestones: BillingMilestone[] = enabled.map(m => {
    const amount = contractTotal > 0 ? Math.round(contractTotal * (m.pct / 100)) : 0;
    return {
      id: m.key,
      label: m.label,
      category: categoryForKey(m.key),
      pct: m.pct,
      amount,
      paidAmount: 0,
      status: 'pending' as BillingMilestoneStatus,
      dueAmount: amount,
    };
  });

  if (contractTotal > 0 && milestones.length > 0) {
    const sum = milestones.reduce((s, m) => s + m.amount, 0);
    const diff = contractTotal - sum;
    if (diff !== 0) {
      milestones[milestones.length - 1].amount += diff;
      milestones[milestones.length - 1].dueAmount = milestones[milestones.length - 1].amount;
    }
  }

  const localPayments = projectPayments.length > 0 ? [] : billingConfig.payments;
  const receivedProject = projectPayments
    .filter(p => p.status === 'received')
    .reduce((s, p) => s + p.amount, 0);

  const byCategory = projectPayments
    .filter(p => p.status === 'received')
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.amount;
      return acc;
    }, {});

  if (receivedProject > 0) {
    distributeCategoryPaid('dp', byCategory.dp || 0, ['dp'], milestones);
    distributeCategoryPaid(
      'termin',
      byCategory.termin || 0,
      ['termin_1', 'termin_2', 'termin_3'],
      milestones,
    );
    distributeCategoryPaid('pelunasan', byCategory.pelunasan || 0, ['pelunasan'], milestones);
  } else {
    for (const p of localPayments) {
      const m = milestones.find(x => x.id === p.milestone_key);
      if (!m) continue;
      m.paidAmount += p.amount;
    }
  }

  for (const m of milestones) {
    m.dueAmount = Math.max(0, m.amount - m.paidAmount);
    m.status = milestoneStatus(m.amount, m.paidAmount);
  }

  const localReceived = localPayments.reduce((s, p) => s + p.amount, 0);
  const totalReceived = Math.min(contractTotal, localReceived + receivedProject);
  const remaining = Math.max(0, contractTotal - totalReceived);
  const progressPct = contractTotal > 0 ? Math.min(100, Math.round((totalReceived / contractTotal) * 100)) : 0;
  const nextDue = milestones.find(m => m.status !== 'paid') ?? null;

  return {
    contractTotal,
    baseTotal: baseGrandTotal,
    billingDiscount,
    totalReceived,
    remaining,
    progressPct,
    milestones,
    nextDue,
    pctValidation: {
      totalPct,
      isExact: totalPct === 100,
      isOver: totalPct > 100,
      isUnder: totalPct < 100 && totalPct > 0,
    },
  };
}
