import type {
  BillingMilestoneConfig,
  BillingMilestoneKey,
  EstimationBillingConfig,
  EstimationLocalPayment,
} from '../types/estimator';

export const BILLING_MILESTONE_KEYS: BillingMilestoneKey[] = [
  'dp', 'termin_1', 'termin_2', 'termin_3', 'pelunasan',
];

const MILESTONE_LABELS: Record<BillingMilestoneKey, string> = {
  dp: 'DP / Uang Muka',
  termin_1: 'Termin 1',
  termin_2: 'Termin 2',
  termin_3: 'Termin 3',
  pelunasan: 'Pelunasan',
};

/** Bangun jadwal default dari % DP global (sisanya dibagi termin + pelunasan). */
export function defaultBillingMilestones(defaultDpPct = 50): BillingMilestoneConfig[] {
  const dp = Math.min(100, Math.max(0, Math.round(defaultDpPct)));
  const rest = Math.max(0, 100 - dp);
  const t1 = rest > 0 ? Math.round(rest * 0.4) : 0;
  const t2 = rest > t1 ? Math.round((rest - t1) * 0.55) : 0;
  const pelunasan = Math.max(0, rest - t1 - t2);

  return [
    { key: 'dp', label: MILESTONE_LABELS.dp, pct: dp, enabled: dp > 0 },
    { key: 'termin_1', label: MILESTONE_LABELS.termin_1, pct: t1, enabled: t1 > 0 },
    { key: 'termin_2', label: MILESTONE_LABELS.termin_2, pct: t2, enabled: t2 > 0 },
    { key: 'termin_3', label: MILESTONE_LABELS.termin_3, pct: 0, enabled: false },
    { key: 'pelunasan', label: MILESTONE_LABELS.pelunasan, pct: pelunasan, enabled: pelunasan > 0 },
  ];
}

export function emptyBillingConfig(defaultDpPct = 50): EstimationBillingConfig {
  return {
    milestones: defaultBillingMilestones(defaultDpPct),
    billing_discount_amount: 0,
    billing_bonus_note: '',
    payments: [],
  };
}

/** Milestone default org → config tagihan estimasi baru (tanpa pembayaran). */
export function billingConfigFromOrgDefaults(
  milestones: BillingMilestoneConfig[] | null | undefined,
  defaultDpPct = 50,
): EstimationBillingConfig {
  const base = emptyBillingConfig(defaultDpPct);
  if (!milestones?.length) return base;
  return {
    ...base,
    milestones: milestones.map(m => ({
      key: m.key,
      label: m.label || MILESTONE_LABELS[m.key] || m.key,
      pct: Math.max(0, Math.round(Number(m.pct) || 0)),
      enabled: m.enabled !== false,
    })),
  };
}

export function normalizeBillingConfig(
  raw: unknown,
  defaultDpPct = 50,
): EstimationBillingConfig {
  if (!raw || typeof raw !== 'object') return emptyBillingConfig(defaultDpPct);
  const o = raw as Partial<EstimationBillingConfig>;
  const milestones = Array.isArray(o.milestones) && o.milestones.length > 0
    ? o.milestones.map(m => ({
        key: m.key,
        label: m.label || MILESTONE_LABELS[m.key] || m.key,
        pct: Number(m.pct) || 0,
        enabled: m.enabled !== false,
      }))
    : defaultBillingMilestones(defaultDpPct);

  return {
    milestones,
    billing_discount_amount: Math.max(0, Number(o.billing_discount_amount) || 0),
    billing_bonus_note: String(o.billing_bonus_note || ''),
    payments: Array.isArray(o.payments)
      ? o.payments.map(p => ({
          id: p.id || crypto.randomUUID(),
          milestone_key: p.milestone_key,
          date: p.date,
          amount: Number(p.amount) || 0,
          payment_method: p.payment_method ?? null,
          note: p.note,
        }))
      : [],
  };
}

export type BillingPctValidation = {
  totalPct: number;
  isExact: boolean;
  isOver: boolean;
  isUnder: boolean;
};

/** Validasi total % milestone yang aktif. */
export function validateBillingMilestonePcts(milestones: BillingMilestoneConfig[]): BillingPctValidation {
  const totalPct = milestones
    .filter(m => m.enabled && m.pct > 0)
    .reduce((s, m) => s + m.pct, 0);
  return {
    totalPct,
    isExact: totalPct === 100,
    isOver: totalPct > 100,
    isUnder: totalPct < 100 && totalPct > 0,
  };
}

export function newLocalPayment(
  milestoneKey: BillingMilestoneKey,
  amount: number,
  date: string,
): EstimationLocalPayment {
  return {
    id: crypto.randomUUID(),
    milestone_key: milestoneKey,
    date,
    amount,
    payment_method: null,
  };
}

export function billingConfigToDb(config: EstimationBillingConfig): EstimationBillingConfig {
  return {
    milestones: config.milestones.map(m => ({
      key: m.key,
      label: m.label.trim() || MILESTONE_LABELS[m.key],
      pct: Math.max(0, Math.round(m.pct)),
      enabled: m.enabled,
    })),
    billing_discount_amount: Math.max(0, Math.round(config.billing_discount_amount)),
    billing_bonus_note: config.billing_bonus_note.trim(),
    payments: config.payments.filter(p => p.amount > 0),
  };
}
