import type { BillingMilestone } from './estimationBillingSchedule';
import type { EstimationFormDraft } from '../types/estimator';
import {
  defaultKwitansiDescription,
  suggestKwitansiAmount,
  type KwitansiPaymentCategory,
} from './pdf/generateKwitansiPdf';

export type KwitansiPreviewChoice = {
  id: string;
  label: string;
  category: KwitansiPaymentCategory;
  amount: number;
  customAmount?: boolean;
  description?: string;
};

function categoryFromMilestone(m: BillingMilestone): KwitansiPaymentCategory {
  if (m.category === 'dp') return 'dp';
  if (m.category === 'pelunasan') return 'pelunasan';
  return 'termin';
}

/** Opsi bukti pembayaran sebelum preview kwitansi. */
export function buildKwitansiPreviewChoices(
  draft: EstimationFormDraft,
  milestones: BillingMilestone[],
  contractTotal: number,
): KwitansiPreviewChoice[] {
  const fromSchedule = milestones.map(m => ({
    id: m.id,
    label: m.label,
    category: categoryFromMilestone(m),
    amount: m.amount > 0 ? m.amount : suggestKwitansiAmount(draft, categoryFromMilestone(m)),
    description: `Pembayaran ${m.label} — ${draft.title || draft.code}`,
  }));

  return [
    ...fromSchedule,
    {
      id: 'total-all',
      label: 'Total kontrak (semua)',
      category: 'pelunasan',
      amount: contractTotal,
      description: defaultKwitansiDescription(draft, 'pelunasan'),
    },
    {
      id: 'custom',
      label: 'Kustom',
      category: 'other',
      amount: suggestKwitansiAmount(draft, 'dp'),
      customAmount: true,
      description: defaultKwitansiDescription(draft, 'other'),
    },
  ];
}
